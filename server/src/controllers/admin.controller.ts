import { Request, Response } from 'express';
import Product from '../models/Product';
import Order from '../models/Order';
import User from '../models/User';

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

function formatOrderDate(date: Date | string | undefined) {
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

async function getMonthlyRevenueOverview() {
  const today = new Date();
  const rangeStart = new Date(today.getFullYear(), today.getMonth() - 6, 1);

  const revenueByMonth = await Order.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        createdAt: { $gte: rangeStart },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        total: { $sum: '$total' },
      },
    },
  ]);

  const revenueMap = new Map(
    revenueByMonth.map((entry: any) => [
      `${entry._id.year}-${entry._id.month}`,
      Number(entry.total) || 0,
    ])
  );

  return Array.from({ length: 7 }, (_, index) => {
    const currentMonth = new Date(today.getFullYear(), today.getMonth() - 6 + index, 1);
    const key = `${currentMonth.getFullYear()}-${currentMonth.getMonth() + 1}`;

    return {
      name: currentMonth.toLocaleString('en-US', { month: 'short' }),
      total: revenueMap.get(key) ?? 0,
    };
  });
}

async function getSalesByCategory() {
  const categorySales = await Order.aggregate([
    {
      $match: {
        status: { $ne: 'cancelled' },
      },
    },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productData',
      },
    },
    {
      $addFields: {
        productData: { $arrayElemAt: ['$productData', 0] },
      },
    },
    {
      $group: {
        _id: {
          $ifNull: ['$productData.category', 'Uncategorized'],
        },
        sales: { $sum: '$items.quantity' },
      },
    },
    { $sort: { sales: -1 } },
  ]);

  if (categorySales.length === 0) {
    return [
      { name: 'Laptops', sales: 0 },
      { name: 'Accessories', sales: 0 },
    ];
  }

  return categorySales.map((entry: any) => ({
    name: String(entry._id || 'Uncategorized'),
    sales: Number(entry.sales) || 0,
  }));
}

async function getRecentOrders() {
  const orders = await Order.find({})
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(5);

  return orders.map((order: any) => {
    const { customer } = getCustomerDetails(order);

    return {
      id: order._id.toString(),
      customer,
      date: formatOrderDate(order.createdAt),
      total: Number(order.total) || 0,
      status: order.status || 'pending',
    };
  });
}

async function getOrderStatsForMonthRange(startDate: Date, endDate?: Date) {
  const filter: Record<string, unknown> = {
    createdAt: endDate ? { $gte: startDate, $lt: endDate } : { $gte: startDate },
  };

  return {
    totalOrders: await Order.countDocuments(filter),
    revenue: Number(
      (
        await Order.aggregate([
          {
            $match: {
              ...filter,
              paymentStatus: 'paid',
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$total' },
            },
          },
        ])
      )[0]?.totalRevenue ?? 0
    ),
  };
}

// Dashboard Stats
export const getStats = async (_req: Request, res: Response) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });

    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    const totalRevenue = Number(revenueResult[0]?.total ?? 0);
    const revenueOverview = await getMonthlyRevenueOverview();
    const salesByCategory = await getSalesByCategory();
    const recentOrders = await getRecentOrders();

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = currentMonthStart;

    const currentOrderStats = await getOrderStatsForMonthRange(currentMonthStart);
    const previousOrderStats = await getOrderStatsForMonthRange(
      previousMonthStart,
      previousMonthEnd
    );

    const currentMonthProducts = await Product.countDocuments({
      createdAt: { $gte: currentMonthStart },
    });
    const previousMonthProducts = await Product.countDocuments({
      createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd },
    });

    const currentMonthActiveUsers = await User.countDocuments({
      status: 'active',
      createdAt: { $gte: currentMonthStart },
    });
    const previousMonthActiveUsers = await User.countDocuments({
      status: 'active',
      createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd },
    });

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

// Products
export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
    const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category =
      typeof req.query.category === 'string' ? req.query.category.trim() : '';

    const filter: Record<string, unknown> = {};

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { brand: regex }];
    }

    if (category && category !== 'All Categories') {
      filter.category = category;
    }

    const totalItems = await Product.countDocuments(filter);
    const pagination = buildPagination(totalItems, page, limit);
    const skip = (pagination.page - 1) * pagination.limit;

    const items = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pagination.limit);

    const [totalProducts, inStock, lowStock, outOfStock] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ stock: { $gt: 0 } }),
      Product.countDocuments({ stock: { $gt: 0, $lt: 10 } }),
      Product.countDocuments({ stock: { $lte: 0 } }),
    ]);

    res.json({
      items,
      summary: {
        totalProducts,
        inStock,
        lowStock,
        outOfStock,
      },
      pagination,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
    const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';

    const userFilter: Record<string, unknown> = {};

    if (role && role !== 'all') {
      userFilter.role = role;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      userFilter.$or = [{ name: regex }, { email: regex }];
    }

    const users = await User.find(userFilter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const userOrders = await Order.aggregate([
      {
        $group: {
          _id: '$user',
          orders: { $sum: 1 },
          spent: { $sum: '$total' },
        },
      },
    ]);

    const orderMap = new Map(
      userOrders
        .filter((entry: any) => entry._id)
        .map((entry: any) => [
          entry._id.toString(),
          {
            orders: Number(entry.orders) || 0,
            spent: Number(entry.spent) || 0,
          },
        ])
    );

    const enrichedUsers = users.map((user: any) => {
      const stats = orderMap.get(user._id.toString()) || { orders: 0, spent: 0 };

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status || 'active',
        joined: formatOrderDate(user.createdAt),
        orders: stats.orders,
        spent: stats.spent,
        avatar: user.avatar || '',
      };
    });

    const totalItems = enrichedUsers.length;
    const pagination = buildPagination(totalItems, page, limit);
    const startIndex = (pagination.page - 1) * pagination.limit;
    const items = enrichedUsers.slice(startIndex, startIndex + pagination.limit);

    res.json({
      items,
      pagination,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update User (role, status)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      if (req.body.role) {
        user.role = req.body.role;
      }

      if (req.body.status) {
        user.status = req.body.status;
      }

      const updatedUser = await user.save();

      res.json({
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Orders
export const getOrders = async (req: Request, res: Response) => {
  try {
    const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
    const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const paymentStatus =
      typeof req.query.paymentStatus === 'string' ? req.query.paymentStatus.trim() : '';

    const filter: Record<string, unknown> = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus;
    }

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const normalizedOrders = orders
      .map((order: any) => {
        const { customer, email } = getCustomerDetails(order);

        return {
          id: order._id.toString(),
          customer,
          email,
          date: formatOrderDate(order.createdAt),
          total: Number(order.total) || 0,
          items: Array.isArray(order.items)
            ? order.items.reduce(
                (count: number, item: any) => count + (Number(item.quantity) || 0),
                0
              )
            : 0,
          status: order.status || 'pending',
          payment: order.paymentStatus || 'pending',
        };
      })
      .filter((order) => {
        if (!search) {
          return true;
        }

        const normalizedSearch = search.toLowerCase();

        return (
          order.id.toLowerCase().includes(normalizedSearch) ||
          order.customer.toLowerCase().includes(normalizedSearch) ||
          order.email.toLowerCase().includes(normalizedSearch)
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

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = req.body.status || order.status;
      order.paymentStatus = req.body.paymentStatus || order.paymentStatus;

      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Products
export const createProduct = async (req: Request, res: Response) => {
  try {
    const product = new Product(req.body);
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      await product.deleteOne();
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
