import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Package, Calendar, CreditCard } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest, getErrorMessage } from '../lib/api';
import { formatCurrency } from '../utils/product';

interface OrderSuccessItem {
  quantity?: number;
}

interface OrderSuccessOrder {
  _id: string;
  total: number;
  status: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
  items: OrderSuccessItem[];
}

interface OrderSuccessLocationState {
  order?: OrderSuccessOrder;
}

const accountOrdersState = {
  activeTab: 'orders' as const,
};

function formatShortDate(value: Date) {
  return value.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getEstimatedDelivery(createdAt?: string) {
  if (!createdAt) {
    return 'We will confirm by email';
  }

  const startDate = new Date(createdAt);
  const endDate = new Date(createdAt);
  startDate.setDate(startDate.getDate() + 2);
  endDate.setDate(endDate.getDate() + 4);

  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
}

export function OrderSuccess() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const locationState = location.state as OrderSuccessLocationState | null;
  const orderId = searchParams.get('orderId') || '';
  const [order, setOrder] = useState<OrderSuccessOrder | null>(locationState?.order ?? null);
  const [isLoading, setIsLoading] = useState(Boolean(orderId && !locationState?.order));

  useEffect(() => {
    if (locationState?.order || !orderId || !token) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    apiRequest<OrderSuccessOrder>(`/api/orders/${encodeURIComponent(orderId)}`, { token })
      .then((response) => {
        if (!isCancelled) {
          setOrder(response);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error(getErrorMessage(error));
          setOrder(null);
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
  }, [locationState?.order, orderId, token]);

  const itemCount = useMemo(
    () => order?.items.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0) ?? 0,
    [order]
  );

  const paymentStatusClass =
    order?.paymentStatus === 'failed'
      ? 'text-status-error'
      : order?.paymentStatus === 'paid'
        ? 'text-status-success'
        : 'text-status-warning';
  const paymentStatusLabel = order?.paymentStatus
    ? `${order.paymentStatus.charAt(0).toUpperCase()}${order.paymentStatus.slice(1)}`
    : 'Processing';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <motion.div
        initial={{
          scale: 0,
          opacity: 0,
        }}
        animate={{
          scale: 1,
          opacity: 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 20,
        }}
        className="w-24 h-24 bg-status-success/20 rounded-full flex items-center justify-center mx-auto mb-8"
      >
        <CheckCircle2 className="w-12 h-12 text-status-success" />
      </motion.div>

      <h1 className="text-4xl font-bold text-primary mb-4">Thank you for your order!</h1>
      <p className="text-lg text-body mb-8">
        {isLoading
          ? 'Loading your order confirmation...'
          : 'Your order has been placed successfully. We\'ll send you an email confirmation shortly.'}
      </p>

      <Card className="p-8 text-left mb-8">
        <h2 className="text-xl font-bold text-primary mb-6 border-b border-subtle/30 pb-4">
          Order Summary
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-accent-blue mt-0.5" />
            <div>
              <p className="text-sm text-muted">Order Number</p>
              <p className="font-medium text-primary">{order?._id || orderId || 'Unavailable'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-accent-blue mt-0.5" />
            <div>
              <p className="text-sm text-muted">Estimated Delivery</p>
              <p className="font-medium text-primary">{getEstimatedDelivery(order?.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-accent-blue mt-0.5" />
            <div>
              <p className="text-sm text-muted">Payment Status</p>
              <p className={`font-medium ${paymentStatusClass}`}>
                {paymentStatusLabel}
                {order && (
                  <>
                    {' '}
                    ({formatCurrency(order.total, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })})
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-elevated rounded-lg p-4 flex items-center justify-between gap-4">
          <span className="text-body">
            {itemCount > 0
              ? `We\'ll notify you when your ${itemCount} item(s) ship.`
              : "We\'ll notify you when your items ship."}
          </span>
          <Link
            to="/account"
            state={accountOrdersState}
            className="text-accent-gold hover:text-accent-goldHover font-medium text-sm"
          >
            Track Order
          </Link>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to="/account" state={accountOrdersState}>
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            View Order
          </Button>
        </Link>
        <Link to="/shop">
          <Button size="lg" className="w-full sm:w-auto">
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}