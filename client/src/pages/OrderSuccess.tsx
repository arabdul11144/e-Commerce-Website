import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Package, Calendar, CreditCard } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { formatCurrency } from '../utils/product';

export function OrderSuccess() {
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

      <h1 className="text-4xl font-bold text-primary mb-4">
        Thank you for your order!
      </h1>
      <p className="text-lg text-body mb-8">
        Your order has been placed successfully. We'll send you an email
        confirmation shortly.
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
              <p className="font-medium text-primary">#LPL-2026-0847</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-accent-blue mt-0.5" />
            <div>
              <p className="text-sm text-muted">Estimated Delivery</p>
              <p className="font-medium text-primary">Mar 15 - Mar 17, 2026</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-accent-blue mt-0.5" />
            <div>
              <p className="text-sm text-muted">Payment Status</p>
              <p className="font-medium text-status-success">
                Paid ({formatCurrency(3598, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })})
              </p>
            </div>
          </div>
        </div>

        <div className="bg-elevated rounded-lg p-4 flex items-center justify-between">
          <span className="text-body">
            We'll notify you when your items ship.
          </span>
          <Link
            to="/account"
            className="text-accent-gold hover:text-accent-goldHover font-medium text-sm"
          >
            Track Order
          </Link>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to="/account">
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            View My Orders
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
