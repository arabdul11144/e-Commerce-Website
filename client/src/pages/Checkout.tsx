import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { apiRequest, getErrorMessage } from '../lib/api';
import type { CartItem } from '../types';
import { formatCurrency } from '../utils/product';

interface CheckoutFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetAddress: string;
  apartment: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  cardNumber: string;
  expirationDate: string;
  cvc: string;
  cardName: string;
}

interface CheckoutLocationState {
  buyNowItem?: CartItem;
}

interface CreatedOrderResponse {
  _id: string;
  total: number;
  status: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
}

export function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, isAuthenticated } = useAuth();
  const { cartItems, isLoading: isCartLoading, refreshCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [formState, setFormState] = useState<CheckoutFormState>({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    streetAddress: '',
    apartment: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Sri Lanka',
    cardNumber: '',
    expirationDate: '',
    cvc: '',
    cardName: user?.name ?? '',
  });

  const checkoutState = location.state as CheckoutLocationState | null;
  const buyNowItem = checkoutState?.buyNowItem ?? null;
  const checkoutItems = useMemo(
    () => (buyNowItem ? [buyNowItem] : cartItems),
    [buyNowItem, cartItems]
  );
  const isBuyNowCheckout = Boolean(buyNowItem);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Sign in to continue checkout');
      navigate('/auth', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const updateField =
    (field: keyof CheckoutFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setFormState((currentState) => ({
        ...currentState,
        [field]: event.target.value,
      }));
    };

  const subtotal = useMemo(
    () =>
      checkoutItems.reduce((sum, item) => {
        const price = item.product.discountPrice ?? item.product.price;
        return sum + price * item.quantity;
      }, 0),
    [checkoutItems]
  );
  const shipping = subtotal > 500 ? 0 : 25;
  const total = subtotal + shipping;

  const handlePlaceOrder = async (event: FormEvent) => {
    event.preventDefault();

    if (isProcessing) {
      return;
    }

    if (!token || !isAuthenticated) {
      toast.error('Please sign in to place your order');
      navigate('/auth', { replace: true });
      return;
    }

    if (checkoutItems.length === 0) {
      toast.error('Your checkout is empty');
      return;
    }

    setIsProcessing(true);

    try {
      const createdOrder = await apiRequest<CreatedOrderResponse>('/api/orders', {
        method: 'POST',
        token,
        body: JSON.stringify({
          items: checkoutItems.map((item) => ({
            product: item.product.id,
            quantity: item.quantity,
          })),
          total: Number(total.toFixed(2)),
          contactEmail: formState.email.trim(),
          shippingAddress: {
            fullName: `${formState.firstName.trim()} ${formState.lastName.trim()}`.trim(),
            street: [formState.streetAddress.trim(), formState.apartment.trim()]
              .filter(Boolean)
              .join(', '),
            city: formState.city.trim(),
            state: formState.province.trim(),
            zip: formState.postalCode.trim(),
            country: formState.country.trim(),
            phone: formState.phone.trim(),
          },
          paymentStatus: 'paid',
          clearCart: !isBuyNowCheckout,
        }),
      });

      await refreshCart();
      toast.success('Order placed successfully!');
      navigate(`/order-success?orderId=${encodeURIComponent(createdOrder._id)}`, {
        replace: true,
        state: {
          order: createdOrder,
        },
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (!isBuyNowCheckout && isCartLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <p className="text-body">Loading checkout...</p>
      </div>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-primary mb-8">Checkout</h1>
        <div className="bg-surface border border-subtle/30 rounded-xl p-10 text-center">
          <p className="text-body mb-6">No items are ready for checkout.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/cart">
              <Button variant="outline" size="lg">
                Back to Cart
              </Button>
            </Link>
            <Link to="/shop">
              <Button size="lg">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-primary mb-8">Checkout</h1>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-8">
            <div className="bg-surface border border-subtle/30 rounded-xl p-6">
              <h2 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-gold text-background flex items-center justify-center text-sm">
                  1
                </span>
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  placeholder="John"
                  value={formState.firstName}
                  onChange={updateField('firstName')}
                  required
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={formState.lastName}
                  onChange={updateField('lastName')}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="john@example.com"
                  className="md:col-span-2"
                  value={formState.email}
                  onChange={updateField('email')}
                  required
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+94 77 123 4567"
                  className="md:col-span-2"
                  value={formState.phone}
                  onChange={updateField('phone')}
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
                  value={formState.streetAddress}
                  onChange={updateField('streetAddress')}
                  required
                />

                <Input
                  label="Apartment, suite, etc. (optional)"
                  placeholder="Apt 4B"
                  className="md:col-span-2"
                  value={formState.apartment}
                  onChange={updateField('apartment')}
                />

                <Input
                  label="City"
                  placeholder="Colombo"
                  value={formState.city}
                  onChange={updateField('city')}
                  required
                />
                <Input
                  label="State / Province"
                  placeholder="Western"
                  value={formState.province}
                  onChange={updateField('province')}
                  required
                />
                <Input
                  label="Postal Code"
                  placeholder="00100"
                  value={formState.postalCode}
                  onChange={updateField('postalCode')}
                  required
                />
                <Input
                  label="Country"
                  placeholder="Sri Lanka"
                  value={formState.country}
                  onChange={updateField('country')}
                  required
                />
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
                  value={formState.cardNumber}
                  onChange={updateField('cardNumber')}
                  required
                />

                <Input
                  label="Expiration Date"
                  placeholder="MM/YY"
                  value={formState.expirationDate}
                  onChange={updateField('expirationDate')}
                  required
                />
                <Input
                  label="CVC"
                  placeholder="123"
                  value={formState.cvc}
                  onChange={updateField('cvc')}
                  required
                />
                <Input
                  label="Name on Card"
                  placeholder="John Doe"
                  className="md:col-span-2"
                  value={formState.cardName}
                  onChange={updateField('cardName')}
                  required
                />
              </div>
            </div>
          </form>
        </div>

        <div className="lg:w-96 flex-shrink-0">
          <div className="bg-surface border border-subtle/30 rounded-xl p-6 sticky top-24">
            <h2 className="text-xl font-bold text-primary mb-6">Order Summary</h2>

            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {checkoutItems.map((item) => {
                const productPrice = item.product.discountPrice ?? item.product.price;

                return (
                  <div key={`${item.product.id}-${item.quantity}`} className="flex gap-4">
                    <div className="w-16 h-16 rounded bg-elevated flex-shrink-0">
                      <img
                        src={item.product.images[0] ?? ''}
                        alt={item.product.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-primary line-clamp-1">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-muted">Qty: {item.quantity}</p>
                      <p className="text-sm font-medium text-primary mt-1">
                        {formatCurrency(productPrice * item.quantity, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-subtle/30 pt-4 mb-6 space-y-3">
              <div className="flex justify-between text-sm text-body">
                <span>Subtotal</span>
                <span className="text-primary font-medium">
                  {formatCurrency(subtotal, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm text-body">
                <span>Shipping</span>
                <span className="text-primary font-medium">
                  {shipping === 0
                    ? 'Free'
                    : formatCurrency(shipping, {
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
              <ShieldCheck className="w-3 h-3" /> Payments are secure and encrypted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
