import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { AdminLayout } from './components/admin/AdminLayout';
import { SellerRouteGuard } from './components/admin/SellerRouteGuard';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetails } from './pages/ProductDetails';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Auth } from './pages/Auth';
import { Wishlist } from './pages/Wishlist';
import { OrderSuccess } from './pages/OrderSuccess';
import { Account } from './pages/Account';
import { SellerAuth } from './pages/SellerAuth';
import { SearchResults } from './pages/SearchResults';
import { NotFound } from './pages/NotFound';
// Admin Pages
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { SellerAccountPage } from './pages/admin/SellerAccountPage';
export function App() {
  return (
    <Router>
      <Routes>
        {/* Public & User Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="product/:slug" element={<ProductDetails />} />
          <Route path="search" element={<SearchResults />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order-success" element={<OrderSuccess />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="account" element={<Account />} />
          <Route path="auth" element={<Auth />} />
          <Route path="seller/auth" element={<SellerAuth />} />
          <Route path="seller/login" element={<SellerAuth initialMode="login" />} />
          <Route path="seller/register" element={<SellerAuth initialMode="register" />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <SellerRouteGuard>
              <AdminLayout />
            </SellerRouteGuard>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="account" element={<SellerAccountPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          {/* Placeholder routes for disabled items */}
          <Route
            path="coupons"
            element={
            <div className="p-8 text-center text-muted">Coming Soon</div>
            } />

          <Route
            path="banners"
            element={
            <div className="p-8 text-center text-muted">Coming Soon</div>
            } />

          <Route
            path="reports"
            element={
            <div className="p-8 text-center text-muted">Coming Soon</div>
            } />

          <Route
            path="reviews"
            element={
            <div className="p-8 text-center text-muted">Coming Soon</div>
            } />

        </Route>
      </Routes>
    </Router>);

}
