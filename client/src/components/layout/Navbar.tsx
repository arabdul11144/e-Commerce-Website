import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, User, Search, Menu, X, Laptop, Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { Button } from '../ui/Button';
export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { cartCount } = useCart();
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);
  const navLinks = [
  {
    name: 'Home',
    path: '/'
  },
  {
    name: 'Shop',
    path: '/shop'
  },
  {
    name: 'Laptops',
    path: '/shop?category=laptops'
  },
  {
    name: 'Accessories',
    path: '/shop?category=accessories'
  }];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass-panel py-3' : 'bg-transparent py-5'}`}>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-accent-gold flex items-center justify-center text-background group-hover:scale-105 transition-transform">
              <Laptop className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-primary tracking-tight">
              TechVault
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) =>
            <Link
              key={link.name}
              to={link.path}
              className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === link.path && !location.search ? 'text-primary' : 'text-body'}`}>

                {link.name}
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex"
              aria-label="Search">

              <Search className="w-5 h-5" />
            </Button>

            <Link to={isAuthenticated ? "/account" : "/auth"}>
              <Button variant="ghost" size="icon" aria-label="Account">
                <User className="w-5 h-5" />
              </Button>
            </Link>

            <Link to="/wishlist">
              <Button variant="ghost" size="icon" aria-label="Wishlist">
                <Heart className="w-5 h-5" />
              </Button>
            </Link>

            <Link to="/cart">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Cart">

                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 &&
                <span className="absolute top-1 right-1 w-4 h-4 bg-accent-gold text-background text-[10px] font-bold flex items-center justify-center rounded-full">
                    {cartCount}
                  </span>
                }
              </Button>
            </Link>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>

              {mobileMenuOpen ?
              <X className="w-6 h-6" /> :

              <Menu className="w-6 h-6" />
              }
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen &&
        <motion.div
          initial={{
            opacity: 0,
            height: 0
          }}
          animate={{
            opacity: 1,
            height: 'auto'
          }}
          exit={{
            opacity: 0,
            height: 0
          }}
          className="md:hidden bg-surface border-b border-subtle/30 overflow-hidden">

            <div className="px-4 py-6 flex flex-col gap-4">
              {navLinks.map((link) =>
            <Link
              key={link.name}
              to={link.path}
              className="text-lg font-medium text-primary py-2 border-b border-subtle/20">

                  {link.name}
                </Link>
            )}
              <div className="pt-4">
                <Link to="/auth">
                  <Button variant="primary" className="w-full justify-center">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </header>);

}
