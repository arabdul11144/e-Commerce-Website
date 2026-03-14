import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Github, Linkedin, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, getErrorMessage } from '../../lib/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Footer() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleNewsletterSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      const message = 'Please enter your email address.';
      setFeedback({ type: 'error', message });
      toast.error(message);
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      const message = 'Please enter a valid email address.';
      setFeedback({ type: 'error', message });
      toast.error(message);
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await apiRequest<{ message: string }>('/api/auth/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail }),
      });
      setFeedback({ type: 'success', message: response.message });
      toast.success(response.message);
      setEmail('');
    } catch (error) {
      const message = getErrorMessage(error);
      setFeedback({ type: 'error', message });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-surface border-t border-subtle/30 pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent-gold flex items-center justify-center overflow-hidden">
                <img src="/laplab.png" alt="LapLab logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold text-primary tracking-tight">
                LapLab
              </span>
            </Link>
            <p className="text-body text-sm mb-6 leading-relaxed">
              Premium laptops and accessories for professionals, creators, and
              gamers. Engineered for excellence.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="text-muted hover:text-primary transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-muted hover:text-primary transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-muted hover:text-primary transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-primary font-semibold mb-4">Shop</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/shop?category=laptops"
                  className="text-body hover:text-accent-gold transition-colors text-sm"
                >
                  All Laptops
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?category=accessories"
                  className="text-body hover:text-accent-gold transition-colors text-sm"
                >
                  Accessories
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?sort=newest"
                  className="text-body hover:text-accent-gold transition-colors text-sm"
                >
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?sort=deals"
                  className="text-body hover:text-accent-gold transition-colors text-sm"
                >
                  Best Deals
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-primary font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="#"
                  className="text-body hover:text-accent-gold transition-colors text-sm"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-body hover:text-accent-gold transition-colors text-sm"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-body hover:text-accent-gold transition-colors text-sm"
                >
                  Shipping & Returns
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-body hover:text-accent-gold transition-colors text-sm"
                >
                  Warranty
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-primary font-semibold mb-4">Stay Updated</h3>
            <p className="text-body text-sm mb-4">
              Subscribe to get special offers, free giveaways, and
              once-in-a-lifetime deals.
            </p>
            <form className="flex gap-2" onSubmit={handleNewsletterSubmit}>
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-background border border-subtle/50 rounded-lg py-2 pl-9 pr-4 text-sm text-primary focus:outline-none focus:border-accent-gold transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-accent-gold text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-goldHover transition-colors disabled:opacity-60"
              >
                Join
              </button>
            </form>
            {feedback && (
              <p
                aria-live="polite"
                className={`mt-3 text-xs ${
                  feedback.type === 'success' ? 'text-status-success' : 'text-status-error'
                }`}
              >
                {feedback.message}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-subtle/30 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted text-sm">
            © {new Date().getFullYear()} LapLab. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              to="#"
              className="text-muted hover:text-primary text-sm transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="#"
              className="text-muted hover:text-primary text-sm transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}


