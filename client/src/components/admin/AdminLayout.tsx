import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Send,
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

function getThreadKey(message: Pick<SellerMessage, 'customer' | 'product'>) {
  return `${message.customer.id}:${message.product?.id || 'general'}`;
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [messages, setMessages] = useState<SellerMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [drawerView, setDrawerView] = useState<'list' | 'chat'>('list');
  const [selectedMessage, setSelectedMessage] = useState<SellerMessage | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const messagePanelRef = useRef<HTMLDivElement | null>(null);
  const notificationDrawerRef = useRef<HTMLDivElement | null>(null);
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
    setDrawerView('list');
    setSelectedMessage(null);
    setReplyMessage('');
  }, [location.pathname, isMobile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        isMessagesOpen &&
        messagePanelRef.current &&
        !messagePanelRef.current.contains(target) &&
        notificationDrawerRef.current &&
        !notificationDrawerRef.current.contains(target)
      ) {
        setIsMessagesOpen(false);
        setDrawerView('list');
        setSelectedMessage(null);
        setReplyMessage('');
      }

      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMessagesOpen]);

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

  const activeThreadMessages = useMemo(() => {
    if (!selectedMessage) {
      return [];
    }

    const selectedThreadKey = getThreadKey(selectedMessage);

    return [...messages]
      .filter((message) => getThreadKey(message) === selectedThreadKey)
      .sort(
        (firstMessage, secondMessage) =>
          new Date(firstMessage.createdAt).getTime() -
          new Date(secondMessage.createdAt).getTime()
      );
  }, [messages, selectedMessage]);

  const adminName = seller?.businessName || 'Seller Account';
  const adminInitial = (seller?.businessName || seller?.name || 'S')
    .charAt(0)
    .toUpperCase();
  const profileImage = resolveApiUrl(seller?.profileImage || '');
  const contentShiftClass = isMessagesOpen
    ? 'lg:pr-[clamp(320px,25vw,420px)]'
    : '';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleMessagesToggle = async () => {
    const nextOpenState = !isMessagesOpen;
    setIsMessagesOpen(nextOpenState);
    setIsProfileMenuOpen(false);

    if (!nextOpenState) {
      setDrawerView('list');
      setSelectedMessage(null);
      setReplyMessage('');
      return;
    }

    setDrawerView('list');
    setSelectedMessage(null);
    setReplyMessage('');
    await loadMessages();
  };

  const markThreadAsRead = useCallback(
    async (threadMessages: SellerMessage[]) => {
      if (!token || threadMessages.length === 0) {
        return;
      }

      try {
        const results = await Promise.all(
          threadMessages.map(async (message) => {
            try {
              return await markSellerMessageRead(token, message.id);
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
        setUnreadCount((currentCount) =>
          Math.max(0, currentCount - updatedMessages.length)
        );
      } catch (error) {
        console.error(getErrorMessage(error));
      }
    },
    [token]
  );

  const handleMessageSelect = async (message: SellerMessage) => {
    setSelectedMessage(message);
    setDrawerView('chat');
    setReplyMessage('');

    const unreadThreadMessages = messages.filter(
      (currentMessage) =>
        getThreadKey(currentMessage) === getThreadKey(message) &&
        currentMessage.senderType === 'customer' &&
        !currentMessage.isRead
    );

    await markThreadAsRead(unreadThreadMessages);
  };

  const handleReplySubmit = async () => {
    if (!token || !selectedMessage) {
      return;
    }

    const trimmedReply = replyMessage.trim();

    if (!trimmedReply) {
      toast.error('Please enter a reply message');
      return;
    }

    try {
      setIsSendingReply(true);
      const reply = await replyToCustomerMessage(token, selectedMessage.id, trimmedReply);
      setMessages((currentMessages) => [reply, ...currentMessages]);
      setSelectedMessage(reply);
      setReplyMessage('');
      toast.success('Reply sent');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSendingReply(false);
    }
  };

  const getPageTitle = () => {
    if (location.pathname === '/admin/account') {
      return 'Account Details';
    }

    const currentItem = navItems.find((item) => item.path === location.pathname);
    return currentItem ? currentItem.name : 'Admin Panel';
  };

  const renderNotificationDrawer = () => {
    if (drawerView === 'chat' && selectedMessage) {
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
                {selectedMessage.customer.name}
              </p>
              <p className="mt-1 text-xs text-body">
                {selectedMessage.product?.name
                  ? `Re: ${selectedMessage.product.name}`
                  : selectedMessage.customer.email}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 custom-scrollbar">
            {activeThreadMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderType === 'customer' ? 'justify-start' : 'justify-end'}`}
              >
                <div className="max-w-[88%]">
                  <div
                    className={`rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${getMessageBubbleClass(message)}`}
                  >
                    {message.message}
                  </div>
                  <p
                    className={`mt-1 text-[11px] text-muted ${
                      message.senderType === 'customer' ? 'text-left' : 'text-right'
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
                placeholder="Reply to this customer..."
                className="min-w-0 flex-1 rounded-xl border border-subtle/40 bg-background px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11"
                isLoading={isSendingReply}
                aria-label="Send reply"
              >
                {!isSendingReply && <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </>
      );
    }

    return (
      <>
        <div className="border-b border-subtle/30 bg-surface px-5 py-4">
          <p className="text-sm font-semibold text-primary">Customer Messages</p>
          <p className="mt-1 text-xs text-body">
            Messages for {seller?.businessName || 'your store'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
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
              <button
                key={message.id}
                type="button"
                onClick={() => {
                  handleMessageSelect(message).catch(() => undefined);
                }}
                className={`w-full border-b border-subtle/20 px-5 py-4 text-left transition-colors last:border-b-0 ${
                  !message.isRead && message.senderType === 'customer'
                    ? 'bg-accent-blue/5'
                    : 'bg-transparent hover:bg-elevated/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary">
                      {message.customer.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-body">
                      {message.product?.name
                        ? `Re: ${message.product.name}`
                        : message.customer.email}
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
        </div>
      </motion.aside>

      <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-[padding-right] duration-300 ${contentShiftClass}`}>
        <header className="sticky top-0 z-30 transition-all duration-300 glass-panel">
          <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-full text-primary transition-colors hover:text-accent-gold"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="hidden text-xl font-bold text-primary sm:block">
                {getPageTitle()}
              </h1>
            </div>

            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="relative" ref={messagePanelRef}>
                <button
                  type="button"
                  onClick={handleMessagesToggle}
                  className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                    isMessagesOpen ? 'text-accent-gold hover:text-accent-gold' : 'text-primary hover:text-accent-gold'
                  }`}
                >
                  <Bell className="w-[22px] h-[22px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-accent-gold text-background text-[10px] font-bold flex items-center justify-center rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="h-8 w-px bg-subtle/30" />

              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen((currentState) => !currentState);
                    setIsMessagesOpen(false);
                    setDrawerView('list');
                    setSelectedMessage(null);
                    setReplyMessage('');
                  }}
                  className="flex items-center gap-3"
                >
                  <div className="hidden h-10 sm:flex flex-col items-end justify-center text-right">
                    <p className="text-sm font-medium text-primary leading-tight">{adminName}</p>
                    <p className="text-xs text-muted leading-tight">Seller</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-[#926C15] font-bold text-lg shadow-lg shadow-background/20 overflow-hidden">
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
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>

      <AnimatePresence>
        {isMessagesOpen && (
          <>
            {isMobile && (
              <motion.button
                type="button"
                aria-label="Close customer messages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMessagesOpen(false)}
                className="fixed inset-0 z-[38] bg-black/45 lg:hidden"
              />
            )}

            <motion.div
              ref={notificationDrawerRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed bottom-0 right-0 top-20 z-[39] w-full sm:w-[420px] lg:w-[clamp(320px,25vw,420px)]"
            >
              <div className="flex h-full flex-col border-l border-subtle/30 bg-surface shadow-2xl shadow-black/40">
                {renderNotificationDrawer()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
