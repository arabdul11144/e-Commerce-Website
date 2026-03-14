import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, getErrorMessage } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.95,
        }}
        whileInView={{
          opacity: 1,
          scale: 1,
        }}
        viewport={{
          once: true,
        }}
        className="bg-gradient-to-br from-surface to-elevated border border-subtle/30 rounded-3xl p-8 md:p-16 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent-gold/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-subtle/20">
            <Mail className="w-8 h-8 text-accent-gold" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Stay in the Loop
          </h2>
          <p className="text-lg text-body mb-8">
            Get exclusive deals, new arrivals, and tech insights delivered
            directly to your inbox.
          </p>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              className="sm:w-auto"
            >
              Subscribe
            </Button>
          </form>
          {feedback && (
            <p
              aria-live="polite"
              className={`mt-4 text-sm ${
                feedback.type === 'success' ? 'text-status-success' : 'text-status-error'
              }`}
            >
              {feedback.message}
            </p>
          )}
          <p className="text-xs text-muted mt-4">
            By subscribing, you agree to our Privacy Policy and consent to
            receive updates.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
