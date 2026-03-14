import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Ticket,
  Image as ImageIcon,
  BarChart3,
  Star,
  LogOut,
  Menu,
  X,
  Bell,
  ArrowLeft,
  User,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useSellerAuth } from '../../contexts/SellerAuthContext';
import { getErrorMessage, resolveApiUrl } from '../../lib/api';
import {
  fetchSellerMessages,
  markSellerMessageRead,
  replyToCustomerMessage,
} from '../../lib/messages';
import type { SellerMessage } from '../../types';

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

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [messages, setMessages] = useState<SellerMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);

  const messagePanelRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { seller, token, logout } = useSellerAuth();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);

      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }

    setIsMessagesOpen(false);
    setIsProfileMenuOpen(false);
    setReplyTargetId(null);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        messagePanelRef.current &&
        !messagePanelRef.current.contains(event.target as Node)
      ) {
        setIsMessagesOpen(false);
        setReplyTargetId(null);
      }

      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin',
    },
    {
      name: 'Products',
      icon: Package,
      path: '/admin/products',
    },
    {
      name: 'Orders',
      icon: ShoppingBag,
      path: '/admin/orders',
    },
    {
      name: 'Coupons',
      icon: Ticket,
      path: '/admin/coupons',
      disabled: true,
    },
    {
      name: 'Banners',
      icon: ImageIcon,
      path: '/admin/banners',
      disabled: true,
    },
    {
      name: 'Reports',
      icon: BarChart3,
      path: '/admin/reports',
      disabled: true,
    },
    {
      name: 'Reviews',
      icon: Star,
      path: '/admin/reviews',
      disabled: true,
    },
  ];

  const loadMessages = useCallback(async () => {
    if (!token || !seller) {
      setMessages([]);
      setUnreadCount(0);
      setReplyTargetId(null);
      return;
    }

    setIsLoadingMessages(true);

    try {
      const response = await fetchSellerMessages(token);
      setMessages(response.items);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoadingMessages(false);
    }
  }, [seller, token]);

  useEffect(() => {
    loadMessages().catch(() => undefined);
  }, [loadMessages]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleMessagesToggle = async () => {
    const nextOpenState = !isMessagesOpen;
    setIsMessagesOpen(nextOpenState);
    setIsProfileMenuOpen(false);

    if (!nextOpenState) {
      setReplyTargetId(null);
    }

    if (nextOpenState) {
      await loadMessages();
    }
  };

  const handleMarkRead = async (messageId: string) => {
    if (!token) {
      return;
    }

    try {
      const updatedMessage = await markSellerMessageRead(token, messageId);
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === updatedMessage.id ? updatedMessage : message
        )
      );
      setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleReplyChange = (messageId: string, value: string) => {
    setReplyDrafts((currentDrafts) => ({
      ...currentDrafts,
      [messageId]: value,
    }));
  };

  const handleReplySubmit = async (messageId: string) => {
    if (!token) {
      return;
    }

    const replyMessage = replyDrafts[messageId]?.trim();

    if (!replyMessage) {
      toast.error('Please enter a reply message');
      return;
    }

    try {
      setReplyingMessageId(messageId);
      const reply = await replyToCustomerMessage(token, messageId, replyMessage);
      setMessages((currentMessages) => [reply, ...currentMessages]);
      setReplyDrafts((currentDrafts) => ({
        ...currentDrafts,
        [messageId]: '',
      }));
      setReplyTargetId(null);
      toast.success('Reply sent');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setReplyingMessageId(null);
    }
  };

  const getPageTitle = () => {
    if (location.pathname === '/admin/account') {
      return 'Account Details';
    }

    const currentItem = navItems.find((item) => item.path === location.pathname);
    return currentItem ? currentItem.name : 'Admin Panel';
  };

  const adminName = seller?.businessName || 'Seller Account';
  const adminInitial = (seller?.businessName || seller?.name || 'S')
    .charAt(0)
    .toUpperCase();
  const profileImage = resolveApiUrl(seller?.profileImage || '');

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -280, width: 280 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        className="fixed lg:static inset-y-0 left-0 z-50 bg-[#1c2128] border-r border-subtle/30 flex flex-col h-screen"
      >
        <div className="h-20 flex items-center px-6 border-b border-subtle/30 justify-between">
          <Link to="/admin" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-accent-gold flex items-center justify-center overflow-hidden">
              <img src="/laplab.png" alt="LapLab logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold text-primary tracking-tight">
              LapLab{' '}
              <span className="text-accent-gold text-sm font-medium ml-1">
                Admin
              </span>
            </span>
          </Link>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-muted hover:text-primary"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;

              if (item.disabled) {
                return (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted opacity-50 cursor-not-allowed"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-wider bg-surface px-2 py-0.5 rounded">
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-accent-gold/10 text-accent-gold border-l-2 border-accent-gold'
                      : 'text-body hover:bg-surface hover:text-primary border-l-2 border-transparent'
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 ${isActive ? 'text-accent-gold' : 'text-muted'}`}
                  />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-subtle/30 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-body hover:bg-surface hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted" />
            <span className="font-medium">Back to Store</span>
          </Link>
          <Link
            to="/admin/account"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-body hover:bg-surface hover:text-primary transition-colors"
          >
            <User className="w-5 h-5 text-muted" />
            <span className="font-medium">Account Details</span>
          </Link>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-20 bg-surface/50 backdrop-blur-md border-b border-subtle/30 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-muted hover:text-primary rounded-lg hover:bg-elevated transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-primary hidden sm:block">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative" ref={messagePanelRef}>
              <button
                type="button"
                onClick={handleMessagesToggle}
                className="relative p-2 text-muted hover:text-primary rounded-full hover:bg-elevated transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-status-error text-background text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-surface">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isMessagesOpen && (
                <div className="absolute right-0 mt-3 w-[360px] max-w-[calc(100vw-2rem)] bg-surface border border-subtle/30 rounded-xl shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-subtle/30 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-primary">Customer Messages</p>
                      <p className="text-xs text-muted">
                        Messages for {seller?.businessName || 'your store'}
                      </p>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {isLoadingMessages && (
                      <div className="p-6 text-sm text-muted text-center">
                        Loading messages...
                      </div>
                    )}

                    {!isLoadingMessages && messages.length === 0 && (
                      <div className="p-6 text-sm text-muted text-center">
                        No customer messages yet.
                      </div>
                    )}

                    {!isLoadingMessages &&
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`px-4 py-4 border-b border-subtle/20 last:border-b-0 ${
                            !message.isRead && message.senderType === 'customer'
                              ? 'bg-accent-blue/5'
                              : 'bg-transparent'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-primary truncate">
                                {message.senderType === 'customer'
                                  ? message.customer.name
                                  : seller?.businessName || 'You'}
                              </p>
                              <p className="text-xs text-muted truncate">
                                {message.senderType === 'customer'
                                  ? message.customer.email
                                  : 'Reply sent from your store'}
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

                          {message.senderType === 'customer' && (
                            <div className="mt-3 flex items-center gap-4">
                              {!message.isRead && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkRead(message.id)}
                                  className="text-xs text-accent-gold hover:text-accent-goldHover transition-colors"
                                >
                                  Mark as read
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setReplyTargetId((currentId) =>
                                    currentId === message.id ? null : message.id
                                  )
                                }
                                className="text-xs text-accent-blue hover:text-accent-blueHover transition-colors"
                              >
                                Reply
                              </button>
                            </div>
                          )}

                          {replyTargetId === message.id && (
                            <div className="mt-3 space-y-3">
                              <textarea
                                value={replyDrafts[message.id] || ''}
                                onChange={(event) =>
                                  handleReplyChange(message.id, event.target.value)
                                }
                                rows={3}
                                className="w-full bg-background border border-subtle/50 rounded-lg text-primary px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all"
                                placeholder="Reply to this customer..."
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setReplyTargetId(null)}
                                  className="text-xs text-muted hover:text-primary transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReplySubmit(message.id)}
                                  disabled={replyingMessageId === message.id}
                                  className="text-xs text-accent-gold hover:text-accent-goldHover transition-colors disabled:opacity-50"
                                >
                                  {replyingMessageId === message.id ? 'Sending...' : 'Send reply'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-subtle/30" />

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen((currentState) => !currentState);
                  setIsMessagesOpen(false);
                  setReplyTargetId(null);
                }}
                className="flex items-center gap-3"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-primary">{adminName}</p>
                  <p className="text-xs text-muted">Seller</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-accent-gold flex items-center justify-center text-background font-bold text-lg shadow-lg shadow-accent-gold/20 overflow-hidden">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={adminName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    adminInitial
                  )}
                </div>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-surface border border-subtle/30 rounded-xl shadow-xl overflow-hidden">
                  <Link
                    to="/admin/account"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-body hover:bg-elevated transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Account Details</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-status-error hover:bg-status-error/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>

      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: '#2d333b',
            border: '1px solid rgba(92, 98, 105, 0.3)',
            color: '#e7eaed',
          },
        }}
      />
    </div>
  );
}





