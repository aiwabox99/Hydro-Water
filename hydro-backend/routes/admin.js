const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validateAdminLogin = [
  body('username').isLength({ min: 3, max: 100 }).withMessage('Username must be 3-100 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const validateAdminCreation = [
  body('username').isLength({ min: 3, max: 100 }).withMessage('Username must be 3-100 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'manager', 'support']).withMessage('Role must be admin, manager, or support')
];

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// POST /api/admin/login - Admin login
router.post('/login', validateAdminLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Find admin user
    const result = await db.query(
      'SELECT id, username, email, password_hash, role, is_active FROM admin_users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];

    // Check if admin is active
    if (!admin.is_active) {
      return res.status(403).json({ error: 'Admin account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin.id, 
        username: admin.username, 
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token: token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/create - Create new admin user (requires admin role)
router.post('/create', verifyToken, validateAdminCreation, async (req, res) => {
  try {
    // Check if requesting admin has permission
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, role = 'admin' } = req.body;

    // Check if admin already exists
    const existingAdmin = await db.query(
      'SELECT id FROM admin_users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingAdmin.rows.length > 0) {
      return res.status(409).json({ error: 'Admin with this username or email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const result = await db.query(
      'INSERT INTO admin_users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, is_active, created_at',
      [username, email, passwordHash, role]
    );

    res.status(201).json({
      message: 'Admin user created successfully',
      admin: result.rows[0]
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/profile - Get admin profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, username, email, role, is_active, created_at FROM admin_users WHERE id = $1',
      [req.admin.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ admin: result.rows[0] });

  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users - Get all admin users (admin only)
router.get('/users', verifyToken, async (req, res) => {
  try {
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await db.query(
      'SELECT id, username, email, role, is_active, created_at FROM admin_users ORDER BY created_at DESC'
    );

    res.json({
      admin_users: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id - Update admin user (admin only)
router.put('/users/:id', verifyToken, [
  body('username').optional().isLength({ min: 3, max: 100 }).withMessage('Username must be 3-100 characters'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['admin', 'manager', 'support']).withMessage('Role must be admin, manager, or support'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], async (req, res) => {
  try {
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { username, email, role, is_active } = req.body;

    // Prevent admin from deactivating themselves
    if (req.admin.id === id && is_active === false) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const result = await db.query(
      'UPDATE admin_users SET username = COALESCE($1, username), email = COALESCE($2, email), role = COALESCE($3, role), is_active = COALESCE($4, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, username, email, role, is_active, created_at',
      [username, email, role, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    res.json({
      message: 'Admin user updated successfully',
      admin: result.rows[0]
    });

  } catch (error) {
    console.error('Update admin user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/change-password - Change admin password
router.post('/change-password', verifyToken, [
  body('current_password').isLength({ min: 6 }).withMessage('Current password is required'),
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { current_password, new_password } = req.body;

    // Get current admin
    const adminResult = await db.query(
      'SELECT password_hash FROM admin_users WHERE id = $1',
      [req.admin.id]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = adminResult.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, admin.password_hash);

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await db.query(
      'UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.admin.id]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/dashboard - Get admin dashboard stats
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    // Get system overview stats
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM customers WHERE is_verified = true) as total_customers,
        (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE) as orders_today,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
        (SELECT COUNT(*) FROM drivers WHERE status = 'active') as active_drivers,
        (SELECT water_volume FROM inventory ORDER BY last_updated DESC LIMIT 1) as current_inventory,
        (SELECT COUNT(*) FROM orders WHERE status IN ('pending', 'assigned')) as pending_orders
    `);

    // Get recent activity
    const recentOrders = await db.query(
      `SELECT o.id, o.volume, o.price_zar, o.status, o.created_at,
              c.name as customer_name, c.phone as customer_phone
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       ORDER BY o.created_at DESC
       LIMIT 5`
    );

    const recentCustomers = await db.query(
      `SELECT id, name, phone, email, created_at
       FROM customers
       WHERE is_verified = true
       ORDER BY created_at DESC
       LIMIT 5`
    );

    // Get revenue summary
    const revenue = await db.query(`
      SELECT 
        SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN price_zar ELSE 0 END) as today_revenue,
        SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN price_zar ELSE 0 END) as week_revenue,
        SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN price_zar ELSE 0 END) as month_revenue
      FROM orders
      WHERE status = 'delivered'
    `);

    const lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 200;
    const currentStock = stats.rows[0]?.current_inventory || 0;

    res.json({
      stats: {
        total_customers: parseInt(stats.rows[0].total_customers),
        orders_today: parseInt(stats.rows[0].orders_today),
        active_subscriptions: parseInt(stats.rows[0].active_subscriptions),
        active_drivers: parseInt(stats.rows[0].active_drivers),
        current_inventory: {
          volume: currentStock,
          is_low_stock: currentStock < lowStockThreshold,
          threshold: lowStockThreshold
        },
        pending_orders: parseInt(stats.rows[0].pending_orders)
      },
      revenue: {
        today: parseFloat(revenue.rows[0].today_revenue || 0),
        week: parseFloat(revenue.rows[0].week_revenue || 0),
        month: parseFloat(revenue.rows[0].month_revenue || 0)
      },
      recent_activity: {
        orders: recentOrders.rows,
        customers: recentCustomers.rows
      }
    });

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/system-info - Get system information
router.get('/system-info', verifyToken, async (req, res) => {
  try {
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get database info
    const dbInfo = await db.query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_stat_user_tables
      ORDER BY schemaname, tablename
    `);

    // Get recent admin activity
    const adminActivity = await db.query(`
      SELECT 
        username,
        role,
        created_at,
        updated_at
      FROM admin_users
      WHERE is_active = true
      ORDER BY updated_at DESC
    `);

    res.json({
      system: {
        node_env: process.env.NODE_ENV,
        version: '1.0.0',
        uptime: process.uptime(),
        memory_usage: process.memoryUsage()
      },
      database: {
        tables: dbInfo.rows
      },
      admin_activity: adminActivity.rows
    });

  } catch (error) {
    console.error('Get system info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;