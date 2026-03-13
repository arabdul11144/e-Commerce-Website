import { type Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import { type SellerAuthRequest } from '../middlewares/sellerAuth.middleware';
import {
  createSellerProduct,
  deleteSellerProduct,
  listSellerProducts,
  updateSellerProduct,
} from './sellerProduct.controller';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 8;

function parsePositiveInteger(value: unknown, fallback: number) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.trunc(parsedValue);
}

function buildPagination(totalItems: number, page: number, limit: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  return {
    page: safePage,
    limit,
    totalItems,
    totalPages,
    hasPrevPage: safePage > 1,
    hasNextPage: safePage < totalPages,
  };
}

function formatPercentChange(currentValue: number, previousValue: number) {
  if (previousValue === 0) {
    return currentValue === 0 ? 0 : 100;
  }

  return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
}

function formatDate(date: Date | string | undefined) {
  if (!date) {
    return '';
  }

  return new Date(date).toISOString().split('T')[0];
}

function getCustomerDetails(order: any) {
  const populatedUser = order.user as
    | { name?: string; email?: string }
    | null
    | undefined;

  return {
    customer:
      populatedUser?.name ||
      order.shippingAddress?.fullName ||
      order.contactEmail ||
      'Unknown Customer',
    email: populatedUser?.email || order.contactEmail || 'No email',
  };
}

function getIdString(value: unknown) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (typeof value === 'object' && value !== null) {
    const objectValue = value as { _id?: unknown; toString?: () => string };

    if (objectValue._id) {
      return getIdString(objectValue._id);
    }

    if (typeof objectValue.toString === 'function') {
      const stringValue = objectValue.toString();

      if (stringValue && stringValue !== '[object Object]') {
        return stringValue;
      }
    }
  }

  return '';
}

function getItemUnitPrice(item: any) {
  const storedPrice = Number(item?.price);

  if (Number.isFinite(storedPrice) && storedPrice >= 0) {
    return storedPrice;
  }

  return Number(item?.product?.discountPrice ?? item?.product?.price ?? 0) || 0;
}

function getSellerScopedItems(order: any, sellerId: string) {
  const orderItems = Array.isArray(order?.items) ? order.items : [];

  return orderItems.filter((item: any) => {
    const itemSellerId = getIdString(item?.seller);
    const productSellerId = getIdString(item?.product?.seller);

    return itemSellerId === sellerId || productSellerId === sellerId;
  });
}

function getSellerOrderTotal(order: any, sellerId: string) {
  return getSellerScopedItems(order, sellerId).reduce((sum: number, item: any) => {
    return sum + getItemUnitPrice(item) * (Number(item?.quantity) || 0);
  }, 0);
}

function getSellerOrderItemCount(order: any, sellerId: string) {
  return getSellerScopedItems(order, sellerId).reduce((count: number, item: any) => {
    return count + (Number(item?.quantity) || 0);
  }, 0);
}

function orderIncludesSeller(order: any, sellerId: string) {
  return getSellerScopedItems(order, sellerId).length > 0;
}

function getUserIdFromOrder(order: any) {
  return getIdString(order?.user);
}

async function loadSellerOrders(
  sellerId: string,
  filter: Record<string, unknown> = {}
) {
  const orders = await Order.find(filter)
    .populate('user', 'name email status role createdAt avatar')
    .populate('items.product', 'name category seller price discountPrice')
    .sort({ createdAt: -1 })
    .lean();

  return orders.filter((order) => orderIncludesSeller(order, sellerId));
}

function buildRevenueOverview(orders: any[], sellerId: string) {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - 6 + index, 1);
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);

    return {
      name: monthStart.toLocaleString('en-US', { month: 'short' }),
      total: Number(
        orders.reduce((sum, order) => {
          const createdAt = new Date(order.createdAt);

          if (
            order.paymentStatus !== 'paid' ||
            createdAt < monthStart ||
            createdAt >= nextMonthStart
          ) {
            return sum;
          }

          return sum + getSellerOrderTotal(order, sellerId);
        }, 0)
      ),
    };
  });
}

function buildCategorySales(orders: any[], sellerId: string) {
  const categoryMap = new Map<string, number>();

  orders.forEach((order) => {
    getSellerScopedItems(order, sellerId).forEach((item: any) => {
      const category = item?.product?.category || 'Uncategorized';
      const quantity = Number(item?.quantity) || 0;

      categoryMap.set(category, (categoryMap.get(category) || 0) + quantity);
    });
  });

  if (categoryMap.size === 0) {
    return [
      { name: 'Laptops', sales: 0 },
      { name: 'Accessories', sales: 0 },
    ];
  }

  return Array.from(categoryMap.entries())
    .sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])
    .map(([name, sales]) => ({ name, sales }));
}

function getUniqueUserIds(orders: any[]) {
  return Array.from(
    new Set(
      orders
        .map((order) => getUserIdFromOrder(order))
        .filter(Boolean)
    )
  );
}

function getActiveUsersCount(orders: any[]) {
  return new Set(
    orders
      .filter((order) => order?.user?.status === 'active')
      .map((order) => getUserIdFromOrder(order))
      .filter(Boolean)
  ).size;
}

function getOrderStatsForRange(orders: any[], sellerId: string, startDate: Date, endDate?: Date) {
  const scopedOrders = orders.filter((order) => {
    const createdAt = new Date(order.createdAt);

    if (createdAt < startDate) {
      return false;
    }

    if (endDate && createdAt >= endDate) {
      return false;
    }

    return true;
  });

  return {
    totalOrders: scopedOrders.length,
    revenue: scopedOrders.reduce((sum, order) => {
      if (order.paymentStatus !== 'paid') {
        return sum;
      }

      return sum + getSellerOrderTotal(order, sellerId);
    }, 0),
  };
}

function buildSellerUsers(orders: any[], sellerId: string) {
  const userMap = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      role: 'user' | 'admin';
      status: 'active' | 'blocked';
      joined: string;
      avatar: string;
      orders: number;
      spent: number;
    }
  >();

  orders.forEach((order) => {
    const userId = getUserIdFromOrder(order);
    const user = order.user as any;

    if (!userId || !user) {
      return;
    }

    const currentEntry = userMap.get(userId) || {
      id: userId,
      name: user.name || 'Unknown User',
      email: user.email || 'No email',
      role: user.role === 'admin' ? 'admin' : 'user',
      status: user.status === 'blocked' ? 'blocked' : 'active',
      joined: formatDate(user.createdAt),
      avatar: user.avatar || '',
      orders: 0,
      spent: 0,
    };

    currentEntry.orders += 1;
    currentEntry.spent += getSellerOrderTotal(order, sellerId);

    userMap.set(userId, currentEntry);
  });

  return Array.from(userMap.values()).sort((leftUser, rightUser) => {
    return rightUser.orders - leftUser.orders || rightUser.spent - leftUser.spent;
  });
}

export const getStats = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const sellerId = req.seller._id.toString();

    const [sellerProducts, sellerOrders] = await Promise.all([
      Product.find({ seller: req.seller._id }).select('category createdAt').lean(),
      loadSellerOrders(sellerId),
    ]);

    const totalRevenue = sellerOrders.reduce((sum, order) => {
      if (order.paymentStatus !== 'paid') {
        return sum;
      }

      return sum + getSellerOrderTotal(order, sellerId);
    }, 0);

    const totalOrders = sellerOrders.length;
    const totalProducts = sellerProducts.length;
    const totalUsers = getUniqueUserIds(sellerOrders).length;
    const activeUsers = getActiveUsersCount(sellerOrders);

    const revenueOverview = buildRevenueOverview(sellerOrders, sellerId);
    const salesByCategory = buildCategorySales(sellerOrders, sellerId);
    const recentOrders = sellerOrders.slice(0, 5).map((order) => {
      const { customer } = getCustomerDetails(order);

      return {
        id: getIdString(order._id),
        customer,
        date: formatDate(order.createdAt),
        total: Number(getSellerOrderTotal(order, sellerId) || 0),
        status: order.status || 'pending',
      };
    });

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = currentMonthStart;

    const currentOrderStats = getOrderStatsForRange(
      sellerOrders,
      sellerId,
      currentMonthStart
    );
    const previousOrderStats = getOrderStatsForRange(
      sellerOrders,
      sellerId,
      previousMonthStart,
      previousMonthEnd
    );

    const currentMonthProducts = sellerProducts.filter((product: any) => {
      return new Date(product.createdAt) >= currentMonthStart;
    }).length;
    const previousMonthProducts = sellerProducts.filter((product: any) => {
      const createdAt = new Date(product.createdAt);
      return createdAt >= previousMonthStart && createdAt < previousMonthEnd;
    }).length;

    const currentMonthActiveUsers = getActiveUsersCount(
      sellerOrders.filter((order) => new Date(order.createdAt) >= currentMonthStart)
    );
    const previousMonthActiveUsers = getActiveUsersCount(
      sellerOrders.filter((order) => {
        const createdAt = new Date(order.createdAt);
        return createdAt >= previousMonthStart && createdAt < previousMonthEnd;
      })
    );

    res.json({
      totalRevenue,
      totalOrders,
      totalProducts,
      totalUsers,
      activeUsers,
      trends: {
        revenue: formatPercentChange(
          currentOrderStats.revenue,
          previousOrderStats.revenue
        ),
        orders: formatPercentChange(
          currentOrderStats.totalOrders,
          previousOrderStats.totalOrders
        ),
        products: formatPercentChange(currentMonthProducts, previousMonthProducts),
        activeUsers: formatPercentChange(
          currentMonthActiveUsers,
          previousMonthActiveUsers
        ),
      },
      revenueOverview,
      salesByCategory,
      recentOrders,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUsers = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
    const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT);
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
    const sellerId = req.seller._id.toString();

    const sellerOrders = await loadSellerOrders(sellerId);
    const sellerUsers = buildSellerUsers(sellerOrders, sellerId).filter((user) => {
      if (role && role !== 'all' && user.role !== role) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    });

    const totalItems = sellerUsers.length;
    const pagination = buildPagination(totalItems, page, limit);
    const startIndex = (pagination.page - 1) * pagination.limit;
    const items = sellerUsers.slice(startIndex, startIndex + pagination.limit);

    res.json({
      items,
      pagination,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const sellerOrders = await loadSellerOrders(req.seller._id.toString(), {
      user: targetUser._id,
    });

    if (sellerOrders.length === 0) {
      res.status(403).json({ message: 'Not authorized to manage this user' });
      return;
    }

    if (req.body.role) {
      targetUser.role = req.body.role === 'admin' ? 'admin' : 'user';
    }

    if (req.body.status) {
      targetUser.status = req.body.status === 'blocked' ? 'blocked' : 'active';
    }

    const updatedUser = await targetUser.save();

    res.json({
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrders = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
    const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT);
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const paymentStatus =
      typeof req.query.paymentStatus === 'string' ? req.query.paymentStatus.trim() : '';
    const sellerId = req.seller._id.toString();

    const filter: Record<string, unknown> = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus;
    }

    const sellerOrders = await loadSellerOrders(sellerId, filter);

    const normalizedOrders = sellerOrders
      .map((order) => {
        const { customer, email } = getCustomerDetails(order);

        return {
          id: getIdString(order._id),
          customer,
          email,
          date: formatDate(order.createdAt),
          total: Number(getSellerOrderTotal(order, sellerId) || 0),
          items: getSellerOrderItemCount(order, sellerId),
          status: order.status || 'pending',
          payment: order.paymentStatus || 'pending',
        };
      })
      .filter((order) => {
        if (!search) {
          return true;
        }

        return (
          order.id.toLowerCase().includes(search) ||
          order.customer.toLowerCase().includes(search) ||
          order.email.toLowerCase().includes(search)
        );
      });

    const statusCounts = normalizedOrders.reduce<Record<string, number>>(
      (counts, order) => {
        counts.all += 1;
        counts[order.status] = (counts[order.status] || 0) + 1;
        return counts;
      },
      {
        all: 0,
        pending: 0,
        processing: 0,
        confirmed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      }
    );

    const totalItems = normalizedOrders.length;
    const pagination = buildPagination(totalItems, page, limit);
    const startIndex = (pagination.page - 1) * pagination.limit;
    const items = normalizedOrders.slice(startIndex, startIndex + pagination.limit);

    res.json({
      items,
      statusCounts,
      pagination,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrderDetails = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const order = await Order.findById(req.params.id)
      .populate('user', 'name email status role createdAt avatar')
      .populate('items.product', 'name category seller price discountPrice');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (!orderIncludesSeller(order.toObject(), req.seller._id.toString())) {
      res.status(403).json({ message: 'Not authorized to view this order' });
      return;
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const order = await Order.findById(req.params.id)
      .populate('items.product', 'seller');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (!orderIncludesSeller(order.toObject(), req.seller._id.toString())) {
      res.status(403).json({ message: 'Not authorized to update this order' });
      return;
    }

    order.status = req.body.status || order.status;
    order.paymentStatus = req.body.paymentStatus || order.paymentStatus;

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProducts = listSellerProducts;
export const createProduct = createSellerProduct;
export const updateProduct = updateSellerProduct;
export const deleteProduct = deleteSellerProduct;
