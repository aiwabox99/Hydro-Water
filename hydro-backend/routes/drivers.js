const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validateDriver = [
  body('name').isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('phone').matches(/^\+27\d{9}$/).withMessage('Phone must be in +27xxxxxxxxx format'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// POST /api/drivers - Create new driver (admin only)
router.post('/', validateDriver, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, email, password } = req.body;

    // Check if driver already exists
    const existingDriver = await db.query(
      'SELECT id FROM drivers WHERE phone = $1 OR email = $2',
      [phone, email]
    );

    if (existingDriver.rows.length > 0) {
      return res.status(409).json({ error: 'Driver with this phone or email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create driver
    const result = await db.query(
      'INSERT INTO drivers (name, phone, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, phone, email, status, created_at',
      [name, phone, email, passwordHash]
    );

    res.status(201).json({
      message: 'Driver created successfully',
      driver: result.rows[0]
    });

  } catch (error) {
    console.error('Create driver error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/drivers - Get all drivers
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT id, name, phone, email, current_location, status, created_at FROM drivers WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      drivers: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/drivers/:id - Get specific driver
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT id, name, phone, email, current_location, status, created_at FROM drivers WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json({ driver: result.rows[0] });

  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/drivers/:id - Update driver
router.put('/:id', [
  body('name').optional().isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('phone').optional().matches(/^\+27\d{9}$/).withMessage('Phone must be in +27xxxxxxxxx format'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('status').optional().isIn(['active', 'inactive', 'busy']).withMessage('Status must be active, inactive, or busy')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, phone, email, status } = req.body;

    const result = await db.query(
      'UPDATE drivers SET name = COALESCE($1, name), phone = COALESCE($2, phone), email = COALESCE($3, email), status = COALESCE($4, status), updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, name, phone, email, current_location, status, created_at',
      [name, phone, email, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json({
      message: 'Driver updated successfully',
      driver: result.rows[0]
    });

  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/drivers/:id/location - Update driver location
router.post('/:id/location', [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { latitude, longitude } = req.body;

    const location = JSON.stringify({ latitude, longitude, timestamp: new Date().toISOString() });

    const result = await db.query(
      'UPDATE drivers SET current_location = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, current_location',
      [location, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json({
      message: 'Driver location updated successfully',
      location: result.rows[0].current_location
    });

  } catch (error) {
    console.error('Update driver location error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/drivers/:driver_id/orders - Get orders assigned to driver
router.get('/:driver_id/orders', async (req, res) => {
  try {
    const { driver_id } = req.params;
    const { status, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT o.*, c.name as customer_name, c.phone as customer_phone,
             a.full_address, a.latitude, a.longitude
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN addresses a ON o.delivery_address_id = a.id
      WHERE o.driver_id = $1
    `;

    const params = [driver_id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      orders: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get driver orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/drivers/:order_id/confirm - Confirm order delivery
router.post('/:order_id/confirm', async (req, res) => {
  try {
    const { order_id } = req.params;
    const { driver_id, payment_received, notes } = req.body;

    // Verify order exists and is assigned to driver
    const orderResult = await db.query(
      'SELECT * FROM orders WHERE id = $1 AND driver_id = $2',
      [order_id, driver_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or not assigned to this driver' });
    }

    const order = orderResult.rows[0];

    // Update order status to delivered
    const result = await db.query(
      'UPDATE orders SET status = $1, delivered_at = CURRENT_TIMESTAMP, notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      ['delivered', notes, order_id]
    );

    // If cash payment, mark as completed
    if (order.payment_method === 'cash' && payment_received) {
      await db.query(
        'UPDATE orders SET payment_status = $1 WHERE id = $2',
        ['completed', order_id]
      );
    }

    // Update driver status back to active
    await db.query(
      'UPDATE drivers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['active', driver_id]
    );

    res.json({
      message: 'Order delivery confirmed successfully',
      order: result.rows[0]
    });

  } catch (error) {
    console.error('Confirm delivery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/drivers/:driver_id/routes - Get driver routes
router.get('/:driver_id/routes', async (req, res) => {
  try {
    const { driver_id } = req.params;
    const { status, limit = 10, offset = 0 } = req.query;

    let query = 'SELECT * FROM driver_routes WHERE driver_id = $1';
    const params = [driver_id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      routes: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get driver routes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/drivers/login - Driver login
router.post('/login', [
  body('phone').matches(/^\+27\d{9}$/).withMessage('Phone must be in +27xxxxxxxxx format'),
  body('password').isLength({ min: 6 }).withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, password } = req.body;

    // Find driver
    const result = await db.query(
      'SELECT id, name, phone, email, password_hash, status FROM drivers WHERE phone = $1',
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const driver = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, driver.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (driver.status !== 'active') {
      return res.status(403).json({ error: 'Driver account is inactive' });
    }

    // Return driver info (without password hash)
    res.json({
      message: 'Login successful',
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        status: driver.status
      }
    });

  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;