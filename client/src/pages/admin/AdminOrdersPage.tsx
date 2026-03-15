import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Eye, Download, Package, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useSellerAuth } from '../../contexts/SellerAuthContext';
import { getErrorMessage, resolveApiUrl } from '../../lib/api';
import {
  fetchAdminOrderDetails,
  fetchAdminOrders,
  type AdminOrderDetailsResponse,
  type AdminOrderRow,
  type AdminOrdersResponse,
} from '../../lib/admin';
import { formatCurrency } from '../../utils/product';

const EMPTY_ORDERS: AdminOrdersResponse = {
  items: [],
  statusCounts: {
    all: 0,
    pending: 0,
    processing: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  },
  pagination: {
    page: 1,
    limit: 8,
    totalItems: 0,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
  },
};

function getStatusBadge(status: string) {
  switch (status) {
    case 'delivered':
      return <Badge variant="success">Delivered</Badge>;
    case 'shipped':
    case 'confirmed':
      return <Badge variant="blue">{status === 'confirmed' ? 'Confirmed' : 'Shipped'}</Badge>;
    case 'processing':
      return <Badge variant="warning">Processing</Badge>;
    case 'pending':
      return <Badge variant="gold">Pending</Badge>;
    case 'cancelled':
      return <Badge variant="error">Cancelled</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function getPaymentBadge(status: string) {
  switch (status) {
    case 'paid':
      return <Badge variant="success">Paid</Badge>;
    case 'refunded':
      return <Badge variant="default">Refunded</Badge>;
    case 'failed':
      return <Badge variant="error">Failed</Badge>;
    case 'pending':
      return <Badge variant="warning">Pending</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function buildPageNumbers(currentPage: number, totalPages: number) {
  const maxButtons = Math.min(3, totalPages);
  const startPage = Math.max(1, Math.min(currentPage - 1, totalPages - maxButtons + 1));

  return Array.from({ length: maxButtons }, (_, index) => startPage + index);
}

function splitOrderIdForDisplay(orderId: string) {
  const midpoint = Math.ceil(orderId.length / 2);

  return {
    firstLine: orderId.slice(0, midpoint),
    secondLine: orderId.slice(midpoint),
  };
}

function formatOrderTotalForTable(value: number) {
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function getOrderLineItems(
  order: AdminOrderRow | null,
  orderDetails: AdminOrderDetailsResponse | null
) {
  if (Array.isArray(orderDetails?.items) && orderDetails.items.length > 0) {
    return orderDetails.items.map((item, index) => ({
      id: `${item.product?.name || 'item'}-${index}`,
      name: item.product?.name || 'Product unavailable',
      image:
        Array.isArray(item.product?.images) && typeof item.product.images[0] === 'string'
          ? item.product.images[0]
          : '',
      quantity: Math.max(1, Number(item.quantity) || 1),
      secondaryText: 'Order item',
    }));
  }

  return (order?.products ?? []).map((product, index) => ({
    id: product.id || `${product.name}-${index}`,
    name: product.name,
    image: product.image || '',
    quantity: Math.max(1, Number(product.quantity) || 1),
    secondaryText: product.brand || 'Order item',
  }));
}

function downloadCsv(rows: AdminOrderRow[]) {
  const header = ['Order ID', 'Customer', 'Email', 'Date', 'Items', 'Total (LKR)', 'Payment', 'Status'];
  const csvRows = rows.map((row) =>
    [
      row.id,
      row.customer,
      row.email,
      row.date,
      String(row.items),
      row.total.toFixed(2),
      row.payment,
      row.status,
    ].join(',')
  );

  const csvContent = [header.join(','), ...csvRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', 'admin-orders.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function AdminOrdersPage() {
  const { token, seller } = useSellerAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [ordersResponse, setOrdersResponse] = useState<AdminOrdersResponse>(EMPTY_ORDERS);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRow | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] =
    useState<AdminOrderDetailsResponse | null>(null);
  const [isOrderDetailsLoading, setIsOrderDetailsLoading] = useState(false);
  const activeOrderRequestRef = useRef<string | null>(null);

  const tabs = [
    { id: 'all', label: 'All Orders' },
    { id: 'pending', label: 'Pending' },
    { id: 'processing', label: 'Processing' },
    { id: 'shipped', label: 'Shipped' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm]);

  useEffect(() => {
    if (!token || !seller) {
      setOrdersResponse(EMPTY_ORDERS);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    fetchAdminOrders(token, {
      page,
      limit: 8,
      search: searchTerm,
      status: activeTab,
    })
      .then((response) => {
        if (!isCancelled) {
          setOrdersResponse(response);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error(getErrorMessage(error));
          setOrdersResponse(EMPTY_ORDERS);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTab, page, searchTerm, seller, token]);

  const pageNumbers = useMemo(
    () => buildPageNumbers(ordersResponse.pagination.page, ordersResponse.pagination.totalPages),
    [ordersResponse.pagination.page, ordersResponse.pagination.totalPages]
  );

  const handleExport = () => {
    downloadCsv(ordersResponse.items);
  };

  const closeOrderDetails = () => {
    activeOrderRequestRef.current = null;
    setSelectedOrder(null);
    setSelectedOrderDetails(null);
    setIsOrderDetailsLoading(false);
  };

  const handleView = async (order: AdminOrderRow) => {
    if (!token) {
      return;
    }

    activeOrderRequestRef.current = order.id;
    setSelectedOrder(order);
    setSelectedOrderDetails(null);
    setIsOrderDetailsLoading(true);

    try {
      const orderDetails = await fetchAdminOrderDetails(token, order.id);

      if (activeOrderRequestRef.current === order.id) {
        setSelectedOrderDetails(orderDetails);
      }
    } catch (error) {
      if (activeOrderRequestRef.current === order.id) {
        closeOrderDetails();
      }
      toast.error(getErrorMessage(error));
    } finally {
      if (activeOrderRequestRef.current === order.id) {
        setIsOrderDetailsLoading(false);
      }
    }
  };

  const orderLineItems = getOrderLineItems(selectedOrder, selectedOrderDetails);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Orders Management</h1>
          <p className="text-body text-sm mt-1">
            View and process customer orders.
          </p>
        </div>
        <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex overflow-x-auto custom-scrollbar border-b border-subtle/30">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id ? 'text-accent-gold' : 'text-muted hover:text-primary'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-gold"
                />
              )}
            </button>
          ))}
        </div>

        <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-elevated/20">
          <div className="w-full sm:w-96 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search by order ID or customer name..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full bg-background border border-subtle/50 rounded-lg py-2 pl-9 pr-4 text-sm text-primary focus:outline-none focus:border-accent-blue transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-elevated/50 text-muted text-xs uppercase tracking-wider border-b border-subtle/30">
                <th className="p-4 font-medium">Items</th>
                <th className="p-4 font-medium">Order ID</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium whitespace-nowrap">Date</th>
                <th className="p-4 font-medium">Total (LKR)</th>
                <th className="p-4 font-medium">Payment</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/20">
              {!isLoading &&
                ordersResponse.items.map((order) => {
                  const { firstLine, secondLine } = splitOrderIdForDisplay(order.id);

                  return (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={order.id}
                      className="hover:bg-elevated/30 transition-colors group"
                    >
                    <td className="p-4 align-top">
                      {order.products && order.products.length > 0 ? (
                        <div className="min-w-[220px] space-y-3">
                          {order.products.slice(0, 2).map((product) => (
                            <div key={`${order.id}-${product.id || product.name}`} className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-background border border-subtle/30 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {product.image ? (
                                  <img
                                    src={resolveApiUrl(product.image)}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="w-4 h-4 text-muted" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-primary line-clamp-1">
                                  {product.name}
                                </p>
                                <p className="text-xs text-muted line-clamp-1">
                                  {product.brand || 'Ordered product'} Â· Qty: {product.quantity}
                                </p>
                              </div>
                            </div>
                          ))}
                          {order.products.length > 2 && (
                            <p className="text-xs text-muted">
                              +{order.products.length - 2} more product(s)
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-body">{order.items} items</span>
                      )}
                    </td>
                    <td className="p-4 align-top">
                      <span className="inline-flex flex-col text-xs font-medium leading-tight text-primary">
                        <span>{firstLine}</span>
                        {secondLine ? <span>{secondLine}</span> : null}
                      </span>
                    </td>
                    <td className="p-4 align-top">
                      <p className="text-sm font-medium text-primary">
                        {order.customer}
                      </p>
                      <p className="text-xs text-muted">{order.email}</p>
                    </td>
                    <td className="p-4 align-top text-xs text-body whitespace-nowrap">
                      {order.date}
                    </td>
                    <td className="p-4 align-top text-sm font-medium text-primary">
                      {formatOrderTotalForTable(order.total)}
                    </td>
                    <td className="p-4 align-top">{getPaymentBadge(order.payment)}</td>
                    <td className="p-4 align-top">{getStatusBadge(order.status)}</td>
                    <td className="p-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => handleView(order)}
                        aria-haspopup="dialog"
                        aria-label={`View order ${order.id}`}
                        disabled={isOrderDetailsLoading && selectedOrder?.id === order.id}
                        className="p-1.5 text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded transition-colors inline-flex items-center gap-1 text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Eye className="w-4 h-4" />
                        {isOrderDetailsLoading && selectedOrder?.id === order.id ? 'Loading...' : 'View'}
                      </button>
                    </td>
                    </motion.tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {!isLoading && ordersResponse.items.length === 0 && (
          <div className="p-12 text-center text-muted">
            No orders found matching your criteria.
          </div>
        )}

        {isLoading && (
          <div className="p-12 text-center text-muted">Loading orders...</div>
        )}

        <div className="p-4 border-t border-subtle/30 flex items-center justify-between text-sm text-muted">
          <span>Showing {ordersResponse.items.length} orders</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={!ordersResponse.pagination.hasPrevPage}
              className="px-3 py-1 rounded border border-subtle/30 hover:bg-elevated disabled:opacity-50"
            >
              Prev
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                className={`px-3 py-1 rounded ${
                  pageNumber === ordersResponse.pagination.page
                    ? 'bg-accent-blue text-background font-medium'
                    : 'border border-subtle/30 hover:bg-elevated'
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={!ordersResponse.pagination.hasNextPage}
              className="px-3 py-1 rounded border border-subtle/30 hover:bg-elevated disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 py-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-subtle/30 bg-surface shadow-2xl shadow-black/50"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-subtle/30">
                <div>
                  <h2 className="text-xl font-bold text-primary">Order Details</h2>
                  <p className="text-sm text-muted mt-1">
                    Review order {selectedOrder.id} from {selectedOrder.date}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeOrderDetails}
                  className="p-2 rounded-lg text-muted hover:text-primary hover:bg-elevated transition-colors"
                  aria-label="Close order details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[calc(85vh-84px)] overflow-y-auto custom-scrollbar p-6 space-y-4">
                {isOrderDetailsLoading && (
                  <div className="py-12 text-center text-muted">Loading order details...</div>
                )}

                {!isOrderDetailsLoading && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card className="p-4">
                        <p className="text-xs uppercase tracking-wider text-muted">Customer</p>
                        <p className="mt-2 text-sm font-medium text-primary">
                          {selectedOrder.customer}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {selectedOrderDetails?.contactEmail || selectedOrder.email}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {selectedOrderDetails?.shippingAddress?.fullName || 'No delivery contact'}
                        </p>
                      </Card>

                      <Card className="p-4">
                        <p className="text-xs uppercase tracking-wider text-muted">Summary</p>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted">Total</span>
                            <span className="font-medium text-primary">
                              {formatCurrency(selectedOrder.total, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted">Items</span>
                            <span className="font-medium text-primary">{selectedOrder.items}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-muted">Payment</span>
                            {getPaymentBadge(selectedOrder.payment)}
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-muted">Status</span>
                            {getStatusBadge(selectedOrder.status)}
                          </div>
                        </div>
                      </Card>
                    </div>

                    <Card className="p-4">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-sm font-semibold text-primary">Order Items</h3>
                          <p className="text-xs text-muted mt-1">
                            Seller-scoped items included in this order.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {orderLineItems.length > 0 ? (
                          orderLineItems.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded bg-background border border-subtle/30 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {item.image ? (
                                  <img
                                    src={resolveApiUrl(item.image)}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="w-4 h-4 text-muted" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-primary line-clamp-1">
                                  {item.name}
                                </p>
                                <p className="text-xs text-muted line-clamp-1">
                                  {item.secondaryText}
                                </p>
                              </div>
                              <span className="text-xs font-medium text-primary whitespace-nowrap">
                                Qty: {item.quantity}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted">No order items available.</p>
                        )}
                      </div>
                    </Card>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
