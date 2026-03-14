import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';
import { formatCurrency } from '../utils/product';

export function Checkout() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const total = 3914.92;

  const handlePlaceOrder = (e: FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      toast.success('Order placed successfully!');
      navigate('/');
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-primary mb-8">Checkout</h1>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <form
            id="checkout-form"
            onSubmit={handlePlaceOrder}
            className="space-y-8"
          >
            <div className="bg-surface border border-subtle/30 rounded-xl p-6">
              <h2 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-gold text-background flex items-center justify-center text-sm">
                  1
                </span>
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="First Name" placeholder="John" required />
                <Input label="Last Name" placeholder="Doe" required />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="john@example.com"
                  className="md:col-span-2"
                  required
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+94 77 123 4567"
                  className="md:col-span-2"
                  required
                />
              </div>
            </div>

            <div className="bg-surface border border-subtle/30 rounded-xl p-6">
              <h2 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-gold text-background flex items-center justify-center text-sm">
                  2
                </span>
                Shipping Address
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Street Address"
                  placeholder="123 Main St"
                  className="md:col-span-2"
                  required
                />

                <Input
                  label="Apartment, suite, etc. (optional)"
                  placeholder="Apt 4B"
                  className="md:col-span-2"
                />

                <Input label="City" placeholder="Colombo" required />
                <Input label="State / Province" placeholder="Western" required />
                <Input label="Postal Code" placeholder="00100" required />
                <Input label="Country" placeholder="Sri Lanka" required />
              </div>
            </div>

            <div className="bg-surface border border-subtle/30 rounded-xl p-6">
              <h2 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-gold text-background flex items-center justify-center text-sm">
                  3
                </span>
                Payment Method
              </h2>

              <div className="border border-accent-blue bg-accent-blue/5 rounded-lg p-4 mb-6 flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-4 h-4 rounded-full border-4 border-accent-blue bg-background"></div>
                </div>
                <div>
                  <h3 className="text-primary font-medium flex items-center gap-2">
                    Credit Card <CreditCard className="w-4 h-4 text-muted" />
                  </h3>
                  <p className="text-sm text-body mt-1">
                    Safe and secure payment via Stripe.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Card Number"
                  placeholder="0000 0000 0000 0000"
                  className="md:col-span-2"
                  required
                />

                <Input label="Expiration Date" placeholder="MM/YY" required />
                <Input label="CVC" placeholder="123" required />
                <Input
                  label="Name on Card"
                  placeholder="John Doe"
                  className="md:col-span-2"
                  required
                />
              </div>
            </div>
          </form>
        </div>

        <div className="lg:w-96 flex-shrink-0">
          <div className="bg-surface border border-subtle/30 rounded-xl p-6 sticky top-24">
            <h2 className="text-xl font-bold text-primary mb-6">
              Order Summary
            </h2>

            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded bg-elevated flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=200"
                    alt="MacBook"
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-primary line-clamp-1">
                    MacBook Pro 16\" M3 Max
                  </h4>
                  <p className="text-xs text-muted">Qty: 1</p>
                  <p className="text-sm font-medium text-primary mt-1">
                    {formatCurrency(3499, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded bg-elevated flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=200"
                    alt="Mouse"
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-primary line-clamp-1">
                    Logitech MX Master 3S
                  </h4>
                  <p className="text-xs text-muted">Qty: 1</p>
                  <p className="text-sm font-medium text-primary mt-1">
                    {formatCurrency(99, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-subtle/30 pt-4 mb-6 space-y-3">
              <div className="flex justify-between text-sm text-body">
                <span>Subtotal</span>
                <span className="text-primary font-medium">
                  {formatCurrency(3598, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm text-body">
                <span>Shipping</span>
                <span className="text-primary font-medium">Free</span>
              </div>
              <div className="flex justify-between text-sm text-body">
                <span>Estimated Tax</span>
                <span className="text-primary font-medium">
                  {formatCurrency(316.92, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="border-t border-subtle/30 pt-4 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-primary">Total</span>
                <span className="text-2xl font-bold text-accent-gold">
                  {formatCurrency(total, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              form="checkout-form"
              size="lg"
              className="w-full"
              isLoading={isProcessing}
              leftIcon={<ShieldCheck className="w-5 h-5" />}
            >
              Place Order
            </Button>

            <p className="text-xs text-center text-muted mt-4 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Payments are secure and
              encrypted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

