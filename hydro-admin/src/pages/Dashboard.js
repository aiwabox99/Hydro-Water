import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { analyticsAPI, authAPI, handleApiError } from '../services/api';
import {
  UsersIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  TruckIcon,
  CubeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch both admin dashboard and analytics data
      const [adminResponse, analyticsResponse] = await Promise.all([
        authAPI.getDashboard(),
        analyticsAPI.getDashboard()
      ]);

      setDashboardData(adminResponse.data);
      setAnalyticsData(analyticsResponse.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data for orders
  const ordersChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Orders',
        data: [12, 19, 8, 15, 22, 18, 25], // This would come from API
        backgroundColor: '#007BFF',
        borderColor: '#007BFF',
        borderWidth: 1,
      },
    ],
  };

  // Prepare chart data for revenue
  const revenueChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Revenue (ZAR)',
        data: [288, 456, 192, 360, 528, 432, 600], // This would come from API
        backgroundColor: '#22c55e',
        borderColor: '#22c55e',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8 text-primary-600"></div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const revenue = dashboardData?.revenue || {};
  const inventory = stats.current_inventory || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
        <div className="text-sm text-secondary-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Today's Orders */}
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingBagIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <div className="stat-value">{stats.orders_today || 0}</div>
                <div className="stat-label">Orders Today</div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <div className="stat-value">{stats.total_customers || 0}</div>
                <div className="stat-label">Total Customers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-4">
                <div className="stat-value">R{revenue.today?.toFixed(2) || '0.00'}</div>
                <div className="stat-label">Today's Revenue</div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingBagIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <div className="stat-value">{stats.active_subscriptions || 0}</div>
                <div className="stat-label">Active Subscriptions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Drivers */}
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TruckIcon className="h-8 w-8 text-secondary-600" />
              </div>
              <div className="ml-4">
                <div className="stat-value">{stats.active_drivers || 0}</div>
                <div className="stat-label">Active Drivers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {inventory.is_low_stock ? (
                  <ExclamationTriangleIcon className="h-8 w-8 text-error-600" />
                ) : (
                  <CubeIcon className="h-8 w-8 text-success-600" />
                )}
              </div>
              <div className="ml-4">
                <div className="stat-value">{inventory.volume || 0}L</div>
                <div className="stat-label">
                  {inventory.is_low_stock ? 'Low Stock!' : 'Inventory'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {inventory.is_low_stock && (
        <div className="bg-error-50 border border-error-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-error-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-error-800">
                Low Stock Alert
              </h3>
              <div className="mt-2 text-sm text-error-700">
                Current inventory is {inventory.volume}L, which is below the threshold of {inventory.threshold}L.
                <Link to="/inventory" className="font-medium underline ml-1">
                  Manage inventory →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-secondary-900">
              Daily Orders (Last 7 Days)
            </h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <Bar data={ordersChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-secondary-900">
              Daily Revenue (Last 7 Days)
            </h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <Bar data={revenueChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-secondary-900">
                Recent Orders
              </h3>
              <Link to="/orders" className="text-sm text-primary-600 hover:text-primary-500">
                View all →
              </Link>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {dashboardData?.recent_activity?.orders?.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-b-0">
                  <div>
                    <div className="text-sm font-medium text-secondary-900">
                      {order.customer_name || 'Unknown Customer'}
                    </div>
                    <div className="text-xs text-secondary-500">
                      {order.volume}L • R{parseFloat(order.price_zar).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`badge ${
                      order.status === 'delivered' ? 'badge-success' :
                      order.status === 'pending' ? 'badge-warning' :
                      'badge-primary'
                    }`}>
                      {order.status}
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center text-secondary-500 py-4">
                  No recent orders
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Customers */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-secondary-900">
                Recent Customers
              </h3>
              <Link to="/customers" className="text-sm text-primary-600 hover:text-primary-500">
                View all →
              </Link>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {dashboardData?.recent_activity?.customers?.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-b-0">
                  <div>
                    <div className="text-sm font-medium text-secondary-900">
                      {customer.name || 'Unknown'}
                    </div>
                    <div className="text-xs text-secondary-500">
                      {customer.phone}
                    </div>
                  </div>
                  <div className="text-xs text-secondary-500">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </div>
                </div>
              )) || (
                <div className="text-center text-secondary-500 py-4">
                  No recent customers
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;