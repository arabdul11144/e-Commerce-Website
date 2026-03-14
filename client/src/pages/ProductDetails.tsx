import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star,
  ShoppingCart,
  Heart,
  MessageSquareMore,
  ShieldCheck,
  Truck,
  ArrowLeft,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { getErrorMessage } from '../lib/api';
import { sendSellerMessage } from '../lib/messages';
import { fetchProductBySlug } from '../lib/products';
import { formatCurrency, getProductRatingMeta } from '../utils/product';
import { Button } from '../components/ui/Button';

export function ProductDetails() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart, isMutating: isCartMutating } = useCart();
  const { isFavorite, isMutating, toggleWishlist } = useWishlist();
  const { token, isAuthenticated } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [sellerMessage, setSellerMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  useEffect(() => {
    if (!slug) {
      setProduct(null);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    fetchProductBySlug(slug)
      .then((nextProduct) => {
        if (!isCancelled) {
          setProduct(nextProduct);
          setActiveImage(0);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setProduct(null);
          console.error(getErrorMessage(error));
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
  }, [slug]);

  if (isLoading) {
    return <div className="p-20 text-center text-primary">Loading product...</div>;
  }

  if (!product) {
    return <div className="p-20 text-center text-primary">Product not found</div>;
  }

  const { rating, ratingLabel, reviewsCount } = getProductRatingMeta(product);
  const favorite = isFavorite(product.id);
  const cartPending = isCartMutating(product.id);
  const wishlistPending = isMutating(product.id);

  const handleAddToCart = async () => {
    await addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    toast.success('Proceeding to checkout...');
  };

  const handleWishlist = async () => {
    await toggleWishlist(product);
  };

  const openSellerMessageModal = () => {
    if (!product.sellerId) {
      toast.error('Seller information is not available for this product');
      return;
    }

    if (!isAuthenticated || !token) {
      toast.error('Sign in to message the seller');
      return;
    }

    setIsMessageModalOpen(true);
  };

  const closeSellerMessageModal = () => {
    if (isSendingMessage) {
      return;
    }

    setIsMessageModalOpen(false);
    setSellerMessage('');
  };

  const resetSellerMessageModal = () => {
    setIsMessageModalOpen(false);
    setSellerMessage('');
  };

  const handleSellerMessageSubmit = async () => {
    if (!token || !product.sellerId) {
      return;
    }

    if (!sellerMessage.trim()) {
      toast.error('Please enter a message for the seller');
      return;
    }

    try {
      setIsSendingMessage(true);
      await sendSellerMessage(token, {
        sellerId: product.sellerId,
        productId: product.id,
        message: sellerMessage.trim(),
      });
      toast.success('Message sent to seller');
      resetSellerMessageModal();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        to="/shop"
        className="inline-flex items-center text-sm text-muted hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shop
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-square bg-elevated rounded-2xl overflow-hidden border border-subtle/20 relative"
          >
            <img
              src={product.images[activeImage] ?? product.images[0] ?? ''}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </motion.div>

          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
                    activeImage === idx
                      ? 'border-accent-gold'
                      : 'border-transparent hover:border-subtle'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} thumbnail`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-medium tracking-wider uppercase text-accent-blue">
            {product.brand}
          </span>

          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-4 leading-tight">
            {product.name}
          </h1>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.floor(rating)
                      ? 'fill-accent-gold text-accent-gold'
                      : 'text-subtle'
                  }`}
                />
              ))}
            </div>

            <span className="text-sm text-primary font-medium">
              {ratingLabel} Rating
            </span>

            <span className="text-sm text-muted">
              ({reviewsCount} Reviews)
            </span>
          </div>

          <div className="mb-8">
            {product.discountPrice ? (
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-primary">
                  {formatCurrency(product.discountPrice)}
                </span>
                <span className="text-xl text-muted line-through mb-1">
                  {formatCurrency(product.price)}
                </span>
              </div>
            ) : (
              <span className="text-4xl font-bold text-primary">
                {formatCurrency(product.price)}
              </span>
            )}

            <p className="text-sm text-status-success mt-2 font-medium">
              {product.stock > 0
                ? `In Stock (${product.stock} available)`
                : 'Out of Stock'}
            </p>
          </div>

          <p className="text-body text-lg mb-8 leading-relaxed">
            {product.fullDescription || product.shortDescription}
          </p>

          <div className="bg-surface border border-subtle/30 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-primary">
                Quantity
              </span>

              <div className="flex items-center border border-subtle/50 rounded-lg bg-background">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 text-muted hover:text-primary"
                >
                  -
                </button>

                <span className="w-8 text-center text-primary font-medium">
                  {quantity}
                </span>

                <button
                  onClick={() =>
                    setQuantity(Math.min(product.stock, quantity + 1))
                  }
                  className="px-4 py-2 text-muted hover:text-primary"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="flex-1" onClick={handleBuyNow}>
                Buy Now
              </Button>

              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                leftIcon={<ShoppingCart className="w-5 h-5" />}
                onClick={handleAddToCart}
                disabled={cartPending}
              >
                Add to Cart
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12"
                onClick={handleWishlist}
                disabled={wishlistPending}
              >
                <Heart
                  className={`w-5 h-5 ${
                    favorite ? 'fill-status-error text-status-error' : ''
                  }`}
                />
              </Button>
            </div>

            {product.sellerId && (
              <div className="pt-4 mt-4 border-t border-subtle/30">
                <Button
                  variant="outline"
                  className="w-full"
                  leftIcon={<MessageSquareMore className="w-5 h-5" />}
                  onClick={openSellerMessageModal}
                >
                  Message Seller
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="flex items-center gap-3 text-sm text-body">
              <ShieldCheck className="w-5 h-5 text-accent-blue" />
              <span>1 Year Warranty</span>
            </div>

            <div className="flex items-center gap-3 text-sm text-body">
              <Truck className="w-5 h-5 text-accent-blue" />
              <span>Free Fast Delivery</span>
            </div>
          </div>

          <div className="border-t border-subtle/30 pt-8">
            <h3 className="text-xl font-bold text-primary mb-6">
              Technical Specifications
            </h3>

            <div className="space-y-4">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div
                  key={key}
                  className="grid grid-cols-3 gap-4 py-3 border-b border-subtle/20 last:border-0"
                >
                  <span className="text-muted font-medium">{key}</span>
                  <span className="col-span-2 text-primary">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isMessageModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl border border-subtle/30 bg-surface shadow-2xl shadow-black/50 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-subtle/30">
              <div>
                <h2 className="text-xl font-bold text-primary">Message Seller</h2>
                <p className="text-sm text-muted mt-1">
                  Send a product-specific message for {product.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={closeSellerMessageModal}
                disabled={isSendingMessage}
                className="p-2 rounded-lg text-muted hover:text-primary hover:bg-elevated transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <textarea
                value={sellerMessage}
                onChange={(event) => setSellerMessage(event.target.value)}
                rows={6}
                placeholder="Write your message to the seller..."
                className="w-full bg-surface border border-subtle/50 rounded-lg text-primary px-4 py-3 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all"
              />
            </div>

            <div className="px-6 py-5 border-t border-subtle/30 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeSellerMessageModal}
                disabled={isSendingMessage}
              >
                Cancel
              </Button>
              <Button onClick={handleSellerMessageSubmit} isLoading={isSendingMessage}>
                Send Message
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
