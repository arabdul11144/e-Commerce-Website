import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useSellerAuth } from '../contexts/SellerAuthContext';
import { getErrorMessage } from '../lib/api';
import { fetchAdminStats, type AdminDashboardStats } from '../lib/admin';

function createEmptyStats(): AdminDashboardStats {
  const today = new Date();

  return {
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    activeUsers: 0,
    trends: {
      revenue: 0,
      orders: 0,
      products: 0,
      activeUsers: 0,
    },
    revenueOverview: Array.from({ length: 7 }, (_, index) => ({
      name: new Date(today.getFullYear(), today.getMonth() - 6 + index, 1).toLocaleString(
        'en-US',
        { month: 'short' }
      ),
      total: 0,
    })),
    salesByCategory: [
      { name: 'Laptops', sales: 0 },
      { name: 'Accessories', sales: 0 },
    ],
    recentOrders: [],
  };
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString()}`;
}

function formatTrend(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function getStatusBadgeVariant(
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'gold' | 'blue' {
  switch (status) {
    case 'delivered':
      return 'success';
    case 'shipped':
    case 'confirmed':
      return 'blue';
    case 'processing':
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

export function AdminDashboard() {
  const { token, seller } = useSellerAuth();
  const [stats, setStats] = useState<AdminDashboardStats>(() => createEmptyStats());

  useEffect(() => {
    if (!token || !seller) {
      setStats(createEmptyStats());
      return;
    }

    let isCancelled = false;

    fetchAdminStats(token)
      .then((response) => {
        if (!isCancelled) {
          const emptyStats = createEmptyStats();
          setStats({
            ...emptyStats,
            ...response,
            revenueOverview:
              response.revenueOverview.length > 0
                ? response.revenueOverview
                : emptyStats.revenueOverview,
            salesByCategory:
              response.salesByCategory.length > 0
                ? response.salesByCategory
                : emptyStats.salesByCategory,
            recentOrders: response.recentOrders ?? [],
          });
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error(getErrorMessage(error));
          setStats(createEmptyStats());
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [seller, token]);

  const statCards = useMemo(
    () => [
      {
        title: 'Total Revenue',
        value: formatCurrency(stats.totalRevenue),
        icon: DollarSign,
        trend: formatTrend(stats.trends.revenue),
        color: 'text-accent-gold',
      },
      {
        title: 'Total Orders',
        value: stats.totalOrders.toLocaleString(),
        icon: ShoppingBag,
        trend: formatTrend(stats.trends.orders),
        color: 'text-accent-blue',
      },
      {
        title: 'Total Products',
        value: stats.totalProducts.toLocaleString(),
        icon: Package,
        trend: formatTrend(stats.trends.products),
        color: 'text-status-success',
      },
      {
        title: 'Active Users',
        value: stats.activeUsers.toLocaleString(),
        icon: Users,
        trend: formatTrend(stats.trends.activeUsers),
        color: 'text-primary',
      },
    ],
    [stats]
  );

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Dashboard Overview
          </h1>
          <p className="text-body text-sm mt-1">
            Welcome back, {seller?.businessName || 'Seller'}. Here's what's happening today.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <Card key={i} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-muted">{stat.title}</p>
                <h3 className="text-2xl font-bold text-primary mt-1">
                  {stat.value}
                </h3>
              </div>
              <div className={`p-3 rounded-lg bg-elevated ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-status-success mr-1" />
              <span className="text-status-success font-medium">
                {stat.trend}
              </span>
              <span className="text-muted ml-2">vs last month</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-primary mb-6">
            Revenue Overview
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.revenueOverview}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e3b341" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#e3b341" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#373e47"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#8f959c"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#8f959c"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#2d333b',
                    borderColor: '#5c6269',
                    color: '#e7eaed',
                  }}
                  itemStyle={{
                    color: '#e3b341',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#e3b341"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-primary mb-6">
            Sales by Category
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.salesByCategory}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#373e47"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#8f959c"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis stroke="#8f959c" axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{
                    fill: '#373e47',
                  }}
                  contentStyle={{
                    backgroundColor: '#2d333b',
                    borderColor: '#5c6269',
                    color: '#e7eaed',
                  }}
                />
                <Bar dataKey="sales" fill="#539bf5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-6 border-b border-subtle/30 flex justify-between items-center">
          <h3 className="text-lg font-bold text-primary">Recent Orders</h3>
          <button className="text-sm text-accent-blue hover:text-accent-blueHover font-medium transition-colors">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-elevated/50 text-muted text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Order ID</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/20">
              {stats.recentOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-elevated/30 transition-colors"
                >
                  <td className="p-4 text-primary font-medium">{order.id}</td>
                  <td className="p-4 text-body">{order.customer}</td>
                  <td className="p-4 text-body">{order.date}</td>
                  <td className="p-4 text-primary font-medium">
                    ${order.total.toLocaleString()}
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={getStatusBadgeVariant(order.status)}
                      className="capitalize"
                    >
                      {order.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stats.recentOrders.length === 0 && (
          <div className="p-8 text-center text-muted">No recent orders found.</div>
        )}
      </Card>
    </div>
  );
}
