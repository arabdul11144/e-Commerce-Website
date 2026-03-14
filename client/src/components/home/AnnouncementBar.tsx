import { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/product';

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{
          height: 0,
          opacity: 0,
        }}
        animate={{
          height: 'auto',
          opacity: 1,
        }}
        exit={{
          height: 0,
          opacity: 0,
        }}
        className="bg-accent-gold text-background relative z-10"
      >
        <div className="max-w-7xl mx-auto px-4 pr-10 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-4 relative text-center">
          <p className="text-sm font-medium">
            Unlock premium gear: Free express shipping over {formatCurrency(99)} & 30-day hassle-free returns.
          </p>
          <Link
            to="/shop"
            className="text-sm font-bold bg-black/10 hover:bg-black/20 px-3 py-1 rounded-full transition-colors flex items-center gap-1 shrink-0"
          >
            Shop Best Deals
          </Link>
          <button
            onClick={() => setIsVisible(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-black/10 rounded-full transition-colors"
            aria-label="Dismiss announcement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
