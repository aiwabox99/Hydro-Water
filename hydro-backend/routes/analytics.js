const express = require('express');
const db = require('../config/database');

const router = express.Router();

// GET /api/analytics/orders - Get order analytics
router.get('/orders', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Daily order count and revenue for the last N days
    const dailyResult = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(price_zar) as daily_revenue,
        AVG(volume) as avg_volume,
        SUM(volume) as total_volume
       FROM orders 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      []
    );

    // Order status distribution
    const statusResult = await db.query(
      `SELECT 
        status,
        COUNT(*) as count,
        SUM(price_zar) as revenue
       FROM orders 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY status
       ORDER BY count DESC`
    );

    // Payment method distribution
    const paymentResult = await db.query(
      `SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(price_zar) as revenue
       FROM orders 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY payment_method
       ORDER BY count DESC`
    );

    // Top customers by order count
    const topCustomersResult = await db.query(
      `SELECT 
        c.name,
        c.phone,
        COUNT(o.id) as order_count,
        SUM(o.price_zar) as total_spent,
        AVG(o.volume) as avg_volume
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY c.id, c.name, c.phone
       ORDER BY order_count DESC
       LIMIT 10`
    );

    // Overall summary
    const summaryResult = await db.query(
      `SELECT 
        COUNT(*) as total_orders,
        SUM(price_zar) as total_revenue,
        AVG(price_zar) as avg_order_value,
        SUM(volume) as total_volume,
        AVG(volume) as avg_volume
       FROM orders 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'`
    );

    res.json({
      summary: summaryResult.rows[0],
      daily_stats: dailyResult.rows,
      status_distribution: statusResult.rows,
      payment_methods: paymentResult.rows,
      top_customers: topCustomersResult.rows,
      period_days: parseInt(days)
    });

  } catch (error) {
    console.error('Get order analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/subscriptions - Get subscription analytics
router.get('/subscriptions', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Daily subscription sign-ups for the last N days
    const dailyResult = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as subscription_count,
        SUM(volume) as total_volume
       FROM subscriptions 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      []
    );

    // Subscription status distribution
    const statusResult = await db.query(
      `SELECT 
        status,
        COUNT(*) as count,
        AVG(volume) as avg_volume
       FROM subscriptions 
       GROUP BY status
       ORDER BY count DESC`
    );

    // Subscription frequency distribution
    const frequencyResult = await db.query(
      `SELECT 
        frequency,
        COUNT(*) as count,
        SUM(volume) as total_volume
       FROM subscriptions 
       WHERE status = 'active'
       GROUP BY frequency
       ORDER BY count DESC`
    );

    // Monthly recurring revenue (MRR) calculation
    const mrrResult = await db.query(
      `SELECT 
        frequency,
        COUNT(*) as active_subscriptions,
        SUM(volume * $1) as monthly_revenue
       FROM subscriptions 
       WHERE status = 'active'
       GROUP BY frequency`,
      [parseFloat(process.env.WATER_PRICE_PER_LITER) || 1.20]
    );

    // Calculate total MRR
    let totalMRR = 0;
    mrrResult.rows.forEach(row => {
      const multiplier = row.frequency === 'weekly' ? 4.33 : 
                       row.frequency === 'biweekly' ? 2.17 : 1;
      totalMRR += parseFloat(row.monthly_revenue) * multiplier;
    });

    // Subscription churn analysis
    const churnResult = await db.query(
      `SELECT 
        DATE_TRUNC('month', updated_at) as month,
        COUNT(*) as churned_subscriptions
       FROM subscriptions 
       WHERE status = 'cancelled' 
       AND updated_at >= CURRENT_DATE - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', updated_at)
       ORDER BY month DESC`
    );

    // Overall subscription summary
    const summaryResult = await db.query(
      `SELECT 
        COUNT(*) as total_subscriptions,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
        SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused_subscriptions,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subscriptions,
        AVG(volume) as avg_volume
       FROM subscriptions`
    );

    res.json({
      summary: {
        ...summaryResult.rows[0],
        monthly_recurring_revenue: totalMRR.toFixed(2)
      },
      daily_signups: dailyResult.rows,
      status_distribution: statusResult.rows,
      frequency_distribution: frequencyResult.rows,
      mrr_breakdown: mrrResult.rows,
      churn_analysis: churnResult.rows,
      period_days: parseInt(days)
    });

  } catch (error) {
    console.error('Get subscription analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/drivers - Get driver analytics
router.get('/drivers', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Driver performance metrics
    const driverPerformance = await db.query(
      `SELECT 
        d.name,
        d.phone,
        COUNT(o.id) as orders_delivered,
        SUM(o.price_zar) as total_revenue,
        AVG(o.volume) as avg_volume,
        COUNT(DISTINCT DATE(o.delivered_at)) as active_days
       FROM drivers d
       LEFT JOIN orders o ON d.id = o.driver_id 
       WHERE o.status = 'delivered' 
       AND o.delivered_at >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY d.id, d.name, d.phone
       ORDER BY orders_delivered DESC`
    );

    // Daily delivery stats
    const dailyDeliveries = await db.query(
      `SELECT 
        DATE(delivered_at) as date,
        COUNT(*) as deliveries,
        COUNT(DISTINCT driver_id) as active_drivers
       FROM orders 
       WHERE status = 'delivered' 
       AND delivered_at >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY DATE(delivered_at)
       ORDER BY date DESC`
    );

    // Driver status distribution
    const statusResult = await db.query(
      `SELECT 
        status,
        COUNT(*) as count
       FROM drivers 
       GROUP BY status
       ORDER BY count DESC`
    );

    // Route efficiency metrics
    const routeEfficiency = await db.query(
      `SELECT 
        AVG(total_distance_km) as avg_distance,
        AVG(estimated_duration_minutes) as avg_duration,
        COUNT(*) as total_routes
       FROM driver_routes 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'`
    );

    res.json({
      driver_performance: driverPerformance.rows,
      daily_deliveries: dailyDeliveries.rows,
      status_distribution: statusResult.rows,
      route_efficiency: routeEfficiency.rows[0],
      period_days: parseInt(days)
    });

  } catch (error) {
    console.error('Get driver analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/inventory - Get inventory analytics
router.get('/inventory', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Daily inventory levels
    const dailyInventory = await db.query(
      `SELECT 
        DATE(last_updated) as date,
        AVG(water_volume) as avg_volume,
        MIN(water_volume) as min_volume,
        MAX(water_volume) as max_volume,
        COUNT(*) as updates
       FROM inventory 
       WHERE last_updated >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY DATE(last_updated)
       ORDER BY date DESC`
    );

    // Consumption vs stock analysis
    const consumptionAnalysis = await db.query(
      `SELECT 
        DATE(o.created_at) as date,
        SUM(o.volume) as consumed,
        (SELECT water_volume FROM inventory WHERE DATE(last_updated) = DATE(o.created_at) ORDER BY last_updated DESC LIMIT 1) as stock_level
       FROM orders o
       WHERE o.status = 'delivered' 
       AND o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY DATE(o.created_at)
       ORDER BY date DESC`
    );

    // Current inventory status
    const currentInventory = await db.query(
      `SELECT 
        water_volume,
        last_updated,
        updated_by
       FROM inventory 
       ORDER BY last_updated DESC 
       LIMIT 1`
    );

    // Low stock events
    const lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 200;
    const lowStockEvents = await db.query(
      `SELECT 
        DATE(last_updated) as date,
        COUNT(*) as low_stock_events,
        MIN(water_volume) as lowest_stock
       FROM inventory 
       WHERE water_volume < $1 
       AND last_updated >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY DATE(last_updated)
       ORDER BY date DESC`,
      [lowStockThreshold]
    );

    res.json({
      current_inventory: currentInventory.rows[0],
      daily_inventory: dailyInventory.rows,
      consumption_analysis: consumptionAnalysis.rows,
      low_stock_events: lowStockEvents.rows,
      low_stock_threshold: lowStockThreshold,
      period_days: parseInt(days)
    });

  } catch (error) {
    console.error('Get inventory analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/revenue - Get revenue analytics
router.get('/revenue', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Daily revenue breakdown
    const dailyRevenue = await db.query(
      `SELECT 
        DATE(created_at) as date,
        SUM(price_zar) as total_revenue,
        COUNT(*) as order_count,
        AVG(price_zar) as avg_order_value,
        SUM(CASE WHEN payment_method = 'yoco' THEN price_zar ELSE 0 END) as card_revenue,
        SUM(CASE WHEN payment_method = 'cash' THEN price_zar ELSE 0 END) as cash_revenue
       FROM orders 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
       AND status = 'delivered'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );

    // Monthly revenue comparison
    const monthlyRevenue = await db.query(
      `SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(price_zar) as monthly_revenue,
        COUNT(*) as order_count
       FROM orders 
       WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
       AND status = 'delivered'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC`
    );

    // Revenue by customer segment
    const customerSegments = await db.query(
      `SELECT 
        CASE 
          WHEN order_count = 1 THEN 'One-time'
          WHEN order_count BETWEEN 2 AND 5 THEN 'Regular'
          WHEN order_count > 5 THEN 'Frequent'
        END as segment,
        COUNT(*) as customers,
        SUM(total_revenue) as segment_revenue
       FROM (
         SELECT 
           c.id,
           COUNT(o.id) as order_count,
           SUM(o.price_zar) as total_revenue
         FROM customers c
         JOIN orders o ON c.id = o.customer_id
         WHERE o.status = 'delivered'
         GROUP BY c.id
       ) customer_stats
       GROUP BY segment
       ORDER BY segment_revenue DESC`
    );

    res.json({
      daily_revenue: dailyRevenue.rows,
      monthly_revenue: monthlyRevenue.rows,
      customer_segments: customerSegments.rows,
      period_days: parseInt(days)
    });

  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/dashboard - Get dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    // Key metrics for dashboard
    const todayStats = await db.query(
      `SELECT 
        COUNT(*) as orders_today,
        SUM(price_zar) as revenue_today,
        SUM(volume) as volume_today
       FROM orders 
       WHERE DATE(created_at) = CURRENT_DATE`
    );

    const activeSubscriptions = await db.query(
      `SELECT COUNT(*) as active_subscriptions
       FROM subscriptions 
       WHERE status = 'active'`
    );

    const activeDrivers = await db.query(
      `SELECT COUNT(*) as active_drivers
       FROM drivers 
       WHERE status = 'active'`
    );

    const currentInventory = await db.query(
      `SELECT water_volume
       FROM inventory 
       ORDER BY last_updated DESC 
       LIMIT 1`
    );

    const pendingOrders = await db.query(
      `SELECT COUNT(*) as pending_orders
       FROM orders 
       WHERE status IN ('pending', 'assigned')`
    );

    // Weekly comparison
    const weeklyComparison = await db.query(
      `SELECT 
        SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN price_zar ELSE 0 END) as this_week_revenue,
        SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days' THEN price_zar ELSE 0 END) as last_week_revenue,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as this_week_orders,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_week_orders
       FROM orders 
       WHERE status = 'delivered'`
    );

    const lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 200;
    const currentStock = currentInventory.rows[0]?.water_volume || 0;

    res.json({
      today: {
        orders: parseInt(todayStats.rows[0].orders_today),
        revenue: parseFloat(todayStats.rows[0].revenue_today || 0),
        volume: parseInt(todayStats.rows[0].volume_today || 0)
      },
      active_subscriptions: parseInt(activeSubscriptions.rows[0].active_subscriptions),
      active_drivers: parseInt(activeDrivers.rows[0].active_drivers),
      current_inventory: {
        volume: currentStock,
        is_low_stock: currentStock < lowStockThreshold,
        threshold: lowStockThreshold
      },
      pending_orders: parseInt(pendingOrders.rows[0].pending_orders),
      weekly_comparison: {
        this_week_revenue: parseFloat(weeklyComparison.rows[0].this_week_revenue || 0),
        last_week_revenue: parseFloat(weeklyComparison.rows[0].last_week_revenue || 0),
        this_week_orders: parseInt(weeklyComparison.rows[0].this_week_orders),
        last_week_orders: parseInt(weeklyComparison.rows[0].last_week_orders)
      }
    });

  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;