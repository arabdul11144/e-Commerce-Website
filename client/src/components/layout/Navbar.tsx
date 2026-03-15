import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  Heart,
  Menu,
  Search,
  Send,
  ShoppingCart,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { getErrorMessage } from '../../lib/api';
import {
  fetchCustomerMessages,
  markCustomerMessageRead,
  sendSellerMessage,
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

function getThreadKey(message: Pick<SellerMessage, 'seller' | 'product'>) {
  return `${message.seller?.id || 'seller'}:${message.product?.id || 'general'}`;
}

function isChatNotification(message: SellerMessage | null) {
  if (!message) {
    return false;
  }

  return Boolean(message.seller?.id || message.customer?.id);
}

interface NavbarProps {
  isNotificationDrawerOpen: boolean;
  onNotificationDrawerOpenChange: (isOpen: boolean) => void;
}

export function Navbar({
  isNotificationDrawerOpen,
  onNotificationDrawerOpenChange,
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<SellerMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [drawerView, setDrawerView] = useState<'list' | 'chat' | 'detail'>('list');
  const [selectedNotification, setSelectedNotification] = useState<SellerMessage | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null);
  const notificationDrawerRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();
  const { cartCount } = useCart();
  const headerShiftClass = isNotificationDrawerOpen
    ? 'lg:pr-[clamp(320px,25vw,420px)]'
    : '';
  const searchIconActive = isSearchOpen || Boolean(searchQuery.trim());
  const accountIconActive = location.pathname === '/account';
  const wishlistIconActive = location.pathname === '/wishlist';
  const cartIconActive =
    location.pathname === '/cart' || location.pathname === '/checkout';

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
    onNotificationDrawerOpenChange(false);
    setDrawerView('list');
    setSelectedNotification(null);
    setReplyMessage('');
  }, [location.pathname, onNotificationDrawerOpenChange]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('q') || '');
  }, [location.search]);

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
        !notificationsPanelRef.current.contains(event.target as Node) &&
        notificationDrawerRef.current &&
        !notificationDrawerRef.current.contains(event.target as Node)
      ) {
        onNotificationDrawerOpenChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onNotificationDrawerOpenChange]);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

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

  const syncSearchQuery = useCallback(
    (value: string) => {
      setSearchQuery(value);

      const params = new URLSearchParams(location.search);
      const trimmedValue = value.trim();

      if (trimmedValue) {
        params.set('q', value);
      } else {
        params.delete('q');
      }

      navigate(
        {
          pathname: location.pathname,
          search: params.toString() ? `?${params.toString()}` : '',
        },
        { replace: true }
      );
    },
    [location.pathname, location.search, navigate]
  );

  const markMessagesAsRead = useCallback(
    async (threadMessages: SellerMessage[]) => {
      if (!token || threadMessages.length === 0) {
        return;
      }

      try {
        const results = await Promise.all(
          threadMessages.map(async (message) => {
            try {
              return await markCustomerMessageRead(token, message.id);
            } catch (error) {
              console.error(getErrorMessage(error));
              return null;
            }
          })
        );

        const updatedMessages = results.filter(
          (message): message is SellerMessage => message !== null
        );

        if (updatedMessages.length === 0) {
          return;
        }

        const updatedMessageMap = new Map(
          updatedMessages.map((message) => [message.id, message])
        );

        setMessages((currentMessages) =>
          currentMessages.map(
            (message) => updatedMessageMap.get(message.id) ?? message
          )
        );
        setUnreadCount((currentCount) => Math.max(0, currentCount - updatedMessages.length));
      } catch (error) {
        console.error(getErrorMessage(error));
      }
    },
    [token]
  );

  const activeThreadMessages = useMemo(() => {
    if (!selectedNotification) {
      return [];
    }

    const selectedThreadKey = getThreadKey(selectedNotification);

    return [...messages]
      .filter((message) => getThreadKey(message) === selectedThreadKey)
      .sort(
        (firstMessage, secondMessage) =>
          new Date(firstMessage.createdAt).getTime() -
          new Date(secondMessage.createdAt).getTime()
      );
  }, [messages, selectedNotification]);

  const handleNotificationsToggle = async () => {
    const nextOpenState = !isNotificationDrawerOpen;
    onNotificationDrawerOpenChange(nextOpenState);
    setIsSearchOpen(false);
    setDrawerView('list');
    setSelectedNotification(null);
    setReplyMessage('');

    if (nextOpenState && isAuthenticated && token) {
      await loadMessages();
    }
  };

  const handleNotificationSelect = async (message: SellerMessage) => {
    setSelectedNotification(message);
    setReplyMessage('');

    if (isChatNotification(message)) {
      setDrawerView('chat');

      const unreadThreadMessages = messages.filter(
        (currentMessage) =>
          getThreadKey(currentMessage) === getThreadKey(message) &&
          currentMessage.senderType === 'seller' &&
          !currentMessage.isRead
      );

      await markMessagesAsRead(unreadThreadMessages);
      return;
    }

    setDrawerView('detail');
  };

  const handleReplySubmit = async () => {
    if (!token || !selectedNotification?.seller?.id) {
      return;
    }

    const trimmedReply = replyMessage.trim();

    if (!trimmedReply) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setIsSendingReply(true);
      const createdMessage = await sendSellerMessage(token, {
        sellerId: selectedNotification.seller.id,
        productId: selectedNotification.product?.id,
        message: trimmedReply,
      });
      setMessages((currentMessages) => [createdMessage, ...currentMessages]);
      setReplyMessage('');
      setSelectedNotification(createdMessage);
      toast.success('Message sent');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSendingReply(false);
    }
  };

  const renderDrawerContent = () => {
    if (!isAuthenticated) {
      return (
        <div className="flex h-full flex-col justify-center p-6 text-center space-y-3">
          <p className="text-sm text-muted">Sign in to view your notifications.</p>
          <Link to="/auth" onClick={() => onNotificationDrawerOpenChange(false)}>
            <Button variant="outline" className="w-full justify-center">
              Sign In
            </Button>
          </Link>
        </div>
      );
    }

    if (drawerView === 'chat' && selectedNotification) {
      return (
        <>
          <div className="border-b border-subtle/30 px-5 py-4">
            <button
              type="button"
              onClick={() => {
                setDrawerView('list');
                setReplyMessage('');
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-body transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="mt-3">
              <p className="text-sm font-semibold text-primary">
                {selectedNotification.seller?.name || 'Conversation'}
              </p>
              <p className="mt-1 text-xs text-body">
                {selectedNotification.product?.name
                  ? `Re: ${selectedNotification.product.name}`
                  : 'Seller conversation'}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 custom-scrollbar">
            {activeThreadMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderType === 'customer' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[88%]">
                  <div
                    className={`rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${getMessageBubbleClass(message)}`}
                  >
                    {message.message}
                  </div>
                  <p
                    className={`mt-1 text-[11px] text-muted ${
                      message.senderType === 'customer' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {formatMessageDate(message.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleReplySubmit().catch(() => undefined);
            }}
            className="border-t border-subtle/30 px-5 py-4"
          >
            <div className="flex items-end gap-3">
              <input
                type="text"
                value={replyMessage}
                onChange={(event) => setReplyMessage(event.target.value)}
                placeholder="Type your message..."
                className="min-w-0 flex-1 rounded-xl border border-subtle/40 bg-background px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11"
                isLoading={isSendingReply}
                aria-label="Send message"
              >
                {!isSendingReply && <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </>
      );
    }

    if (drawerView === 'detail' && selectedNotification) {
      return (
        <>
          <div className="border-b border-subtle/30 px-5 py-4">
            <button
              type="button"
              onClick={() => setDrawerView('list')}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-body transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="mt-3">
              <p className="text-sm font-semibold text-primary">Notification</p>
              <p className="mt-1 text-xs text-body">
                {formatMessageDate(selectedNotification.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
            <div className="rounded-2xl border border-subtle/30 bg-background px-4 py-4 text-sm leading-relaxed text-body">
              {selectedNotification.message}
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="border-b border-subtle/30 bg-surface px-5 py-4">
          <p className="text-sm font-semibold text-primary">Notifications</p>
          <p className="mt-1 text-xs text-body">
            Seller replies and conversation updates
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoadingMessages && (
            <div className="p-6 text-sm text-muted text-center">
              Loading notifications...
            </div>
          )}

          {!isLoadingMessages && messages.length === 0 && (
            <div className="p-6 text-sm text-muted text-center">
              No notifications yet.
            </div>
          )}

          {!isLoadingMessages &&
            messages.map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => {
                  handleNotificationSelect(message).catch(() => undefined);
                }}
                className={`w-full border-b border-subtle/20 px-5 py-4 text-left transition-colors last:border-b-0 ${
                  !message.isRead && message.senderType === 'seller'
                    ? 'bg-primary/5'
                    : 'bg-transparent hover:bg-elevated/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary">
                      {message.senderType === 'seller'
                        ? message.seller?.name || 'Seller'
                        : 'You'}
                    </p>
                    <p className="mt-1 truncate text-xs text-body">
                      {message.product?.name
                        ? `Re: ${message.product.name}`
                        : message.senderType === 'seller'
                          ? message.seller?.email || 'Seller reply'
                          : 'Your message'}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-[11px] text-muted">
                    {formatMessageDate(message.createdAt)}
                  </span>
                </div>

                <p className="mt-3 max-h-11 overflow-hidden text-sm leading-relaxed text-body">
                  {message.message}
                </p>
              </button>
            ))}
        </div>
      </>
    );
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[75] transition-all duration-300 ${isScrolled ? 'glass-panel py-4' : 'bg-transparent py-5'} ${headerShiftClass}`}
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
                  className={`text-[15px] font-medium transition-colors ${
                    isLinkActive(link.path)
                      ? 'text-accent-gold'
                      : 'text-body hover:text-primary'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="relative" ref={searchPanelRef}>
                <div className="hidden sm:flex items-center gap-2">
                  <AnimatePresence initial={false}>
                    {isSearchOpen && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 224, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <div className="flex w-56 items-center gap-2 rounded-full border border-subtle/30 bg-surface/95 px-3 py-2 shadow-lg">
                          <Search className="h-4 w-4 flex-shrink-0 text-primary" />
                          <input
                            ref={searchInputRef}
                            type="search"
                            value={searchQuery}
                            onChange={(event) => syncSearchQuery(event.target.value)}
                            placeholder="Search products..."
                            className="min-w-0 flex-1 bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={`w-11 h-11 ${searchIconActive ? 'text-accent-gold hover:text-accent-gold' : ''}`}
                    aria-label="Search"
                    onClick={() => {
                      setIsSearchOpen((currentState) => !currentState);
                      onNotificationDrawerOpenChange(false);
                    }}
                  >
                    <Search className="w-[22px] h-[22px]" />
                  </Button>
                </div>
              </div>

              <div className="relative" ref={notificationsPanelRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-11 h-11 relative ${
                    isNotificationDrawerOpen ? 'text-accent-gold hover:text-accent-gold' : ''
                  }`}
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
              </div>

              <Link to="/wishlist">
                <Button variant="ghost" size="icon" className={`w-11 h-11 ${wishlistIconActive ? 'text-accent-gold hover:text-accent-gold' : ''}`} aria-label="Wishlist">
                  <Heart className="w-[22px] h-[22px]" />
                </Button>
              </Link>

              <Link to="/cart">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`relative w-11 h-11 ${
                    cartIconActive ? 'text-accent-gold hover:text-accent-gold' : ''
                  }`}
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

              <Link to={isAuthenticated ? '/account' : '/auth'}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-11 h-11 ${accountIconActive ? 'text-accent-gold hover:text-accent-gold' : ''}`}
                  aria-label="Account"
                >
                  <User className="w-[22px] h-[22px]" />
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                className="md:hidden w-11 h-11"
                onClick={() => {
                  setMobileMenuOpen(!mobileMenuOpen);
                  setIsSearchOpen(false);
                  onNotificationDrawerOpenChange(false);
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
                    className={`text-lg font-medium py-2 border-b border-subtle/20 ${
                      isLinkActive(link.path) ? 'text-accent-gold' : 'text-primary'
                    }`}
                  >
                    {link.name}
                  </Link>
                )}
                <div className="pt-2">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => syncSearchQuery(event.target.value)}
                    placeholder="Search products..."
                    className="w-full bg-background border border-subtle/50 rounded-lg px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  />
                </div>
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

      <AnimatePresence>
        {isNotificationDrawerOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close notifications"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onNotificationDrawerOpenChange(false)}
              className="fixed inset-0 z-[68] bg-black/45 lg:hidden"
            />

            <motion.div
              ref={notificationDrawerRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed bottom-0 right-0 top-20 z-[70] w-full sm:w-[420px] lg:w-[clamp(320px,25vw,420px)]"
            >
              <div className="flex h-full flex-col border-l border-subtle/30 bg-surface shadow-2xl shadow-black/40">
                {renderDrawerContent()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

