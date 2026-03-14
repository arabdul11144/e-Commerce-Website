import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { formatCurrency } from '../utils/product';

export function Wishlist() {
  const { isAuthenticated } = useAuth();
  const { addToCart, isMutating: isCartMutating } = useCart();
  const { wishlistItems, isLoading, isMutating, removeFromWishlist } =
    useWishlist();

  const handleAddToCart = async (productId: string) => {
    const product = wishlistItems.find((wishlistProduct) => wishlistProduct.id === productId);

    if (!product) {
      toast.error('Product not found.');
      return;
    }

    await addToCart(product);
  };

  const handleRemove = async (productId: string) => {
    await removeFromWishlist(productId);
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
          <Heart className="w-10 h-10 text-muted" />
        </div>

        <h2 className="text-3xl font-bold text-primary mb-4">
          Sign in to view your wishlist
        </h2>

        <p className="text-body mb-8">
          Your saved favorites are tied to your account so they stay in sync.
        </p>

        <Link to="/auth">
          <Button size="lg">Sign In</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <p className="text-body">Loading wishlist...</p>
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
          <Heart className="w-10 h-10 text-muted" />
        </div>

        <h2 className="text-3xl font-bold text-primary mb-4">
          Your wishlist is empty
        </h2>

        <p className="text-body mb-8">
          Save items you love to your wishlist to review them later.
        </p>

        <Link to="/shop">
          <Button size="lg">Explore Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-primary mb-8">My Wishlist</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {wishlistItems.map((product) => {
          const price = product.discountPrice || product.price;

          return (
            <Card key={product.id} className="flex flex-col h-full group">
              <div className="aspect-[4/3] overflow-hidden bg-elevated relative">
                <button
                  type="button"
                  onClick={() => handleRemove(product.id)}
                  disabled={isMutating(product.id)}
                  className="absolute top-3 right-3 z-10 p-2 rounded-full bg-surface/80 backdrop-blur text-status-error hover:bg-surface transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <img
                  src={product.images[0] ?? ''}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="p-5 flex flex-col flex-1">
                <Link
                  to={`/product/${product.slug}`}
                  className="text-primary font-semibold text-lg mb-2 line-clamp-2 hover:text-accent-blue transition-colors"
                >
                  {product.name}
                </Link>

                <div className="mt-auto pt-4 flex items-center justify-between">
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(price)}
                  </span>

                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => handleAddToCart(product.id)}
                    disabled={isCartMutating(product.id)}
                    className="rounded-full w-10 h-10"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
