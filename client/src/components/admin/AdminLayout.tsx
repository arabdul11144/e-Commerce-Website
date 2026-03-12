import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Ticket,
  Image as ImageIcon,
  BarChart3,
  Star,
  LogOut,
  Menu,
  X,
  Bell,
  Laptop,
  ArrowLeft } from
'lucide-react';
import { Toaster } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
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
  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);
  const navItems = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    path: '/admin'
  },
  {
    name: 'Products',
    icon: Package,
    path: '/admin/products'
  },
  {
    name: 'Orders',
    icon: ShoppingBag,
    path: '/admin/orders'
  },
  {
    name: 'Users',
    icon: Users,
    path: '/admin/users'
  },
  {
    name: 'Coupons',
    icon: Ticket,
    path: '/admin/coupons',
    disabled: true
  },
  {
    name: 'Banners',
    icon: ImageIcon,
    path: '/admin/banners',
    disabled: true
  },
  {
    name: 'Reports',
    icon: BarChart3,
    path: '/admin/reports',
    disabled: true
  },
  {
    name: 'Reviews',
    icon: Star,
    path: '/admin/reviews',
    disabled: true
  }];

  const handleLogout = () => {
    navigate('/');
  };
  const getPageTitle = () => {
    const currentItem = navItems.find((item) => item.path === location.pathname);
    return currentItem ? currentItem.name : 'Admin Panel';
  };
  const adminName = user?.name || 'Admin User';
  const adminRole = user?.role === 'admin' ? 'Admin' : 'User';
  const adminInitial = (user?.firstName || user?.name || 'A').charAt(0).toUpperCase();
  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen &&
        <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" />

        }
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: sidebarOpen ? 0 : -280,
          width: 280
        }}
        transition={{
          type: 'spring',
          bounce: 0,
          duration: 0.3
        }}
        className="fixed lg:static inset-y-0 left-0 z-50 bg-[#1c2128] border-r border-subtle/30 flex flex-col h-screen">

        {/* Logo Area */}
        <div className="h-20 flex items-center px-6 border-b border-subtle/30 justify-between">
          <Link to="/admin" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-accent-gold flex items-center justify-center text-background">
              <Laptop className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-primary tracking-tight">
              TechVault{' '}
              <span className="text-accent-gold text-sm font-medium ml-1">
                Admin
              </span>
            </span>
          </Link>
          {isMobile &&
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-muted hover:text-primary">

              <X className="w-6 h-6" />
            </button>
          }
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return item.disabled ?
              <div
                key={item.name}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted opacity-50 cursor-not-allowed">

                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider bg-surface px-2 py-0.5 rounded">
                    Soon
                  </span>
                </div> :

              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? 'bg-accent-gold/10 text-accent-gold border-l-2 border-accent-gold' : 'text-body hover:bg-surface hover:text-primary border-l-2 border-transparent'}`}>

                  <item.icon
                  className={`w-5 h-5 ${isActive ? 'text-accent-gold' : 'text-muted'}`} />

                  <span className="font-medium">{item.name}</span>
                </Link>;

            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-subtle/30 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-body hover:bg-surface hover:text-primary transition-colors">

            <ArrowLeft className="w-5 h-5 text-muted" />
            <span className="font-medium">Back to Store</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-status-error hover:bg-status-error/10 transition-colors">

            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-20 bg-surface/50 backdrop-blur-md border-b border-subtle/30 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-muted hover:text-primary rounded-lg hover:bg-elevated transition-colors">

              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-primary hidden sm:block">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <button className="relative p-2 text-muted hover:text-primary rounded-full hover:bg-elevated transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-error rounded-full border-2 border-surface"></span>
            </button>
            <div className="h-8 w-px bg-subtle/30"></div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-primary">{adminName}</p>
                <p className="text-xs text-muted">{adminRole}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-accent-gold flex items-center justify-center text-background font-bold text-lg shadow-lg shadow-accent-gold/20">
                {adminInitial}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
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
            color: '#e7eaed'
          }
        }} />

    </div>);

}
