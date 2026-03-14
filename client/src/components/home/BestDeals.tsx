import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { Product } from '../../types';
import { isBestDealProduct } from '../../utils/product';
import { ProductCard } from '../ProductCard';

interface BestDealsProps {
  products: Product[];
  withinContainer?: boolean;
  className?: string;
}

export function BestDeals({
  products,
  withinContainer = false,
  className = '',
}: BestDealsProps) {
  const deals = useMemo(
    () => products.filter((product) => isBestDealProduct(product)),
    [products]
  );

  const content = (
    <>
      <div className="flex items-end justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-2">Best Deals</h2>
          <p className="text-body">Featured picks and sale prices on premium tech.</p>
        </div>
        <Link
          to="/shop?deals=true"
          className="hidden sm:flex items-center text-accent-gold hover:text-accent-goldHover font-medium transition-colors"
        >
          View All Deals <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>

      {deals.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {deals.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{
                opacity: 0,
                y: 20,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
              }}
              transition={{
                delay: i * 0.1,
              }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-subtle/30 bg-surface p-8 text-center text-muted">
          Featured and sale products will appear here as they become available.
        </div>
      )}
    </>
  );

  if (withinContainer) {
    return <div className={className}>{content}</div>;
  }

  return (
    <section className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full ${className}`.trim()}>
      {content}
    </section>
  );
}
