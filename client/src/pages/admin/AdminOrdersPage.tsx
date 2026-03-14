import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Eye, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useSellerAuth } from '../../contexts/SellerAuthContext';
import { getErrorMessage } from '../../lib/api';
import {
  fetchAdminOrderDetails,
  fetchAdminOrders,
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
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [ordersResponse, setOrdersResponse] = useState<AdminOrdersResponse>(EMPTY_ORDERS);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [activeTab, paymentFilter, searchTerm]);

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
      paymentStatus: paymentFilter,
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
  }, [activeTab, page, paymentFilter, searchTerm, seller, token]);

  const paymentFilterLabel = useMemo(() => {
    switch (paymentFilter) {
      case 'paid':
        return 'Payment: Paid';
      case 'pending':
        return 'Payment: Pending';
      case 'failed':
        return 'Payment: Failed';
      case 'refunded':
        return 'Payment: Refunded';
      default:
        return 'Payment: All';
    }
  }, [paymentFilter]);

  const pageNumbers = useMemo(
    () => buildPageNumbers(ordersResponse.pagination.page, ordersResponse.pagination.totalPages),
    [ordersResponse.pagination.page, ordersResponse.pagination.totalPages]
  );

  const cyclePaymentFilter = () => {
    setPaymentFilter((currentFilter) => {
      switch (currentFilter) {
        case 'all':
          return 'paid';
        case 'paid':
          return 'pending';
        case 'pending':
          return 'failed';
        case 'failed':
          return 'refunded';
        default:
          return 'all';
      }
    });
  };

  const handleExport = () => {
    downloadCsv(ordersResponse.items);
  };

  const handleView = async (orderId: string) => {
    if (!token) {
      return;
    }

    try {
      const order = await fetchAdminOrderDetails(token, orderId);
      const itemCount = Array.isArray(order.items)
        ? order.items.reduce(
            (count: number, item: { quantity?: number }) =>
              count + (Number(item.quantity) || 0),
            0
          )
        : 0;

      window.alert(
        [
          `Order ID: ${order.id || order._id || orderId}`,
          `Status: ${order.status || 'pending'}`,
          `Payment: ${order.paymentStatus || 'pending'}`,
          `Total: ${formatCurrency(Number(order.total || 0), {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          `Items: ${itemCount}`,
          `Contact: ${order.contactEmail || order.shippingAddress?.fullName || 'N/A'}`,
        ].join('\n')
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

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
          <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />} onClick={cyclePaymentFilter}>
            {paymentFilterLabel}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-elevated/50 text-muted text-xs uppercase tracking-wider border-b border-subtle/30">
                <th className="p-4 font-medium">Order ID</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Items</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium">Payment</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/20">
              {!isLoading &&
                ordersResponse.items.map((order) => (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={order.id}
                    className="hover:bg-elevated/30 transition-colors group"
                  >
                    <td className="p-4">
                      <span className="text-sm font-medium text-primary">
                        {order.id}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium text-primary">
                        {order.customer}
                      </p>
                      <p className="text-xs text-muted">{order.email}</p>
                    </td>
                    <td className="p-4 text-sm text-body">{order.date}</td>
                    <td className="p-4 text-sm text-body">{order.items} items</td>
                    <td className="p-4 text-sm font-medium text-primary">
                      {formatCurrency(order.total, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-4">{getPaymentBadge(order.payment)}</td>
                    <td className="p-4">{getStatusBadge(order.status)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleView(order.id)}
                        className="p-1.5 text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded transition-colors inline-flex items-center gap-1 text-xs font-medium"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </motion.tr>
                ))}
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
    </div>
  );
}
