import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, User, Search, Menu, X, Heart, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { getErrorMessage } from '../../lib/api';
import {
  fetchCustomerMessages,
  markCustomerMessageRead,
} from '../../lib/messages';
import type { SellerMessage } from '../../types';
import { normalizeCategoryValue } from '../../utils/product';
import { Button } from '../ui/Button';

function formatMessageDate(value: string) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getMessageBubbleClass(message: SellerMessage) {
  return message.senderType === 'customer'
    ? 'bg-white text-slate-900 border border-subtle/20'
    : 'bg-elevated text-body border border-subtle/20';
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [messages, setMessages] = useState<SellerMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();
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
    setIsSearchOpen(false);
    setIsNotificationsOpen(false);

    if (location.pathname === '/search') {
      const params = new URLSearchParams(location.search);
      setSearchQuery(params.get('q') || '');
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchPanelRef.current &&
        !searchPanelRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }

      if (
        notificationsPanelRef.current &&
        !notificationsPanelRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadMessages = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setMessages([]);
      setUnreadCount(0);
      return;
    }

    setIsLoadingMessages(true);

    try {
      const response = await fetchCustomerMessages(token);
      setMessages(response.items);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error(getErrorMessage(error));
    } finally {
      setIsLoadingMessages(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    loadMessages().catch(() => undefined);
  }, [loadMessages]);

  const navLinks = [
    {
      name: 'Home',
      path: '/',
    },
    {
      name: 'Shop',
      path: '/shop',
    },
    {
      name: 'Laptops',
      path: '/shop?category=laptops',
    },
    {
      name: 'Accessories',
      path: '/shop?category=accessories',
    },
  ];

  const isLinkActive = (path: string) => {
    const currentParams = new URLSearchParams(location.search);
    const currentCategory = normalizeCategoryValue(currentParams.get('category'));
    const linkUrl = new URL(path, 'https://laplab.local');
    const linkCategory = normalizeCategoryValue(linkUrl.searchParams.get('category'));

    if (linkUrl.pathname !== location.pathname) {
      return false;
    }

    if (linkCategory) {
      return currentCategory === linkCategory;
    }

    return !currentCategory && linkUrl.pathname === location.pathname;
  };

  const handleSearchSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      navigate('/shop');
    } else {
      navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }

    setIsSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const handleNotificationsToggle = async () => {
    const nextOpenState = !isNotificationsOpen;
    setIsNotificationsOpen(nextOpenState);
    setIsSearchOpen(false);

    if (nextOpenState && isAuthenticated && token) {
      await loadMessages();
    }
  };

  const handleMarkMessageRead = async (messageId: string) => {
    if (!token) {
      return;
    }

    try {
      const updatedMessage = await markCustomerMessageRead(token, messageId);
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === updatedMessage.id ? updatedMessage : message
        )
      );
      setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
    } catch (error) {
      console.error(getErrorMessage(error));
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[75] transition-all duration-300 ${isScrolled ? 'glass-panel py-4' : 'bg-transparent py-5'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-accent-gold flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
              <img src="/laplab.png" alt="LapLab logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-[1.35rem] font-bold text-primary tracking-tight">
              LapLab
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-10 lg:gap-12">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-[15px] font-medium transition-colors hover:text-primary ${isLinkActive(link.path) ? 'text-primary' : 'text-body'}`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="relative flex items-center gap-3 sm:gap-5">
            <div className="relative" ref={searchPanelRef}>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex w-11 h-11"
                aria-label="Search"
                onClick={() => {
                  setIsSearchOpen((currentState) => !currentState);
                  setIsNotificationsOpen(false);
                }}
              >
                <Search className="w-[22px] h-[22px]" />
              </Button>

              {isSearchOpen && (
                <div className="absolute right-0 mt-3 w-[320px] max-w-[calc(100vw-2rem)] bg-surface border border-subtle/30 rounded-xl shadow-xl overflow-hidden">
                  <form onSubmit={handleSearchSubmit} className="p-4 flex items-center gap-3">
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search products..."
                      className="flex-1 bg-background border border-subtle/50 rounded-lg px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all"
                    />
                    <Button type="submit" size="sm">
                      Search
                    </Button>
                  </form>
                </div>
              )}
            </div>

            <div className="relative" ref={notificationsPanelRef}>
              <Button
                variant="ghost"
                size="icon"
                className="w-11 h-11 relative"
                aria-label="Notifications"
                onClick={handleNotificationsToggle}
              >
                <Bell className="w-[22px] h-[22px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-accent-gold text-background text-[10px] font-bold flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-[360px] max-w-[calc(100vw-2rem)] bg-surface border border-subtle/30 rounded-xl shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-subtle/30">
                    <p className="text-sm font-semibold text-primary">Messages</p>
                    <p className="text-xs text-muted">
                      Seller replies and conversation updates
                    </p>
                  </div>

                  {!isAuthenticated && (
                    <div className="p-6 text-center space-y-3">
                      <p className="text-sm text-muted">Sign in to view your message notifications.</p>
                      <Link to="/auth" onClick={() => setIsNotificationsOpen(false)}>
                        <Button variant="outline" className="w-full justify-center">
                          Sign In
                        </Button>
                      </Link>
                    </div>
                  )}

                  {isAuthenticated && (
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      {isLoadingMessages && (
                        <div className="p-6 text-sm text-muted text-center">
                          Loading messages...
                        </div>
                      )}

                      {!isLoadingMessages && messages.length === 0 && (
                        <div className="p-6 text-sm text-muted text-center">
                          No messages yet.
                        </div>
                      )}

                      {!isLoadingMessages &&
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`px-4 py-4 border-b border-subtle/20 last:border-b-0 ${
                              !message.isRead && message.senderType === 'seller'
                                ? 'bg-accent-blue/5'
                                : 'bg-transparent'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-primary truncate">
                                  {message.senderType === 'seller'
                                    ? message.seller?.name || 'Seller'
                                    : 'You'}
                                </p>
                                <p className="text-xs text-muted truncate">
                                  {message.senderType === 'seller'
                                    ? message.seller?.email || 'Seller reply'
                                    : 'Your message'}
                                </p>
                              </div>
                              <span className="text-[11px] text-muted whitespace-nowrap">
                                {formatMessageDate(message.createdAt)}
                              </span>
                            </div>

                            {message.product?.name && (
                              <p className="text-xs text-accent-blue mt-2">
                                Re: {message.product.name}
                              </p>
                            )}

                            <div className={`mt-2 rounded-xl px-3 py-2.5 text-sm leading-relaxed ${getMessageBubbleClass(message)}`}>
                              {message.message}
                            </div>

                            {message.senderType === 'seller' && !message.isRead && (
                              <button
                                type="button"
                                onClick={() => handleMarkMessageRead(message.id)}
                                className="text-xs text-accent-gold hover:text-accent-goldHover mt-3 transition-colors"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link to={isAuthenticated ? '/account' : '/auth'}>
              <Button variant="ghost" size="icon" className="w-11 h-11" aria-label="Account">
                <User className="w-[22px] h-[22px]" />
              </Button>
            </Link>

            <Link to="/wishlist">
              <Button variant="ghost" size="icon" className="w-11 h-11" aria-label="Wishlist">
                <Heart className="w-[22px] h-[22px]" />
              </Button>
            </Link>

            <Link to="/cart">
              <Button
                variant="ghost"
                size="icon"
                className="relative w-11 h-11"
                aria-label="Cart"
              >
                <ShoppingCart className="w-[22px] h-[22px]" />
                {cartCount > 0 &&
                  <span className="absolute top-1 right-1 w-4 h-4 bg-accent-gold text-background text-[10px] font-bold flex items-center justify-center rounded-full">
                    {cartCount}
                  </span>
                }
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden w-11 h-11"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                setIsSearchOpen(false);
                setIsNotificationsOpen(false);
              }}
            >
              {mobileMenuOpen ?
                <X className="w-6 h-6" /> :
                <Menu className="w-6 h-6" />
              }
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen &&
          <motion.div
            initial={{
              opacity: 0,
              height: 0,
            }}
            animate={{
              opacity: 1,
              height: 'auto',
            }}
            exit={{
              opacity: 0,
              height: 0,
            }}
            className="md:hidden bg-surface border-b border-subtle/30 overflow-hidden"
          >
            <div className="px-4 py-6 flex flex-col gap-4">
              {navLinks.map((link) =>
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-lg font-medium text-primary py-2 border-b border-subtle/20"
                >
                  {link.name}
                </Link>
              )}
              <form onSubmit={handleSearchSubmit} className="pt-2 flex items-center gap-3">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search products..."
                  className="flex-1 bg-background border border-subtle/50 rounded-lg px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all"
                />
                <Button type="submit" size="sm">
                  Search
                </Button>
              </form>
              <div className="pt-2">
                <Link to={isAuthenticated ? '/account' : '/auth'}>
                  <Button variant="primary" className="w-full justify-center">
                    {isAuthenticated ? 'My Account' : 'Sign In'}
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </header>
  );
}
