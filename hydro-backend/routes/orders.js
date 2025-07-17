const express = require('express');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validateOrder = [
  body('customer_id').isUUID().withMessage('Valid customer ID is required'),
  body('delivery_address_id').isUUID().withMessage('Valid delivery address ID is required'),
  body('volume').isInt({ min: 20 }).withMessage('Volume must be at least 20 liters'),
  body('payment_method').isIn(['yoco', 'cash']).withMessage('Payment method must be yoco or cash')
];

// Helper function to calculate price
const calculatePrice = (volume) => {
  const pricePerLiter = parseFloat(process.env.WATER_PRICE_PER_LITER) || 1.20;
  return (volume * pricePerLiter).toFixed(2);
};

// POST /api/orders - Create new order
router.post('/', validateOrder, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_id, delivery_address_id, volume, payment_method, subscription_id, notes } = req.body;

    // Verify customer exists
    const customerResult = await db.query(
      'SELECT id FROM customers WHERE id = $1 AND is_verified = true',
      [customer_id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found or not verified' });
    }

    // Verify address exists and belongs to customer
    const addressResult = await db.query(
      'SELECT id FROM addresses WHERE id = $1 AND customer_id = $2',
      [delivery_address_id, customer_id]
    );

    if (addressResult.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found or does not belong to customer' });
    }

    // Calculate price
    const price = calculatePrice(volume);

    // Create order
    const result = await db.query(
      'INSERT INTO orders (customer_id, delivery_address_id, volume, price_zar, payment_method, subscription_id, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [customer_id, delivery_address_id, volume, price, payment_method, subscription_id, notes]
    );

    const order = result.rows[0];

    // Update inventory
    await db.query(
      'UPDATE inventory SET water_volume = water_volume - $1, last_updated = CURRENT_TIMESTAMP, updated_by = $2 WHERE id = (SELECT id FROM inventory ORDER BY last_updated DESC LIMIT 1)',
      [volume, 'order_creation']
    );

    // Check for low stock
    const inventoryResult = await db.query(
      'SELECT water_volume FROM inventory ORDER BY last_updated DESC LIMIT 1'
    );

    const currentStock = inventoryResult.rows[0]?.water_volume || 0;
    const lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 200;

    if (currentStock < lowStockThreshold) {
      console.warn(`⚠️  LOW STOCK ALERT: Current stock is ${currentStock} liters (threshold: ${lowStockThreshold})`);
      // TODO: Implement Firebase notification or email alert
    }

    res.status(201).json({
      message: 'Order created successfully',
      order: order
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders - Get orders (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { customer_id, status, driver_id, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT o.*, c.name as customer_name, c.phone as customer_phone, 
             a.full_address, a.latitude, a.longitude,
             d.name as driver_name, d.phone as driver_phone
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN addresses a ON o.delivery_address_id = a.id
      LEFT JOIN drivers d ON o.driver_id = d.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (customer_id) {
      paramCount++;
      query += ` AND o.customer_id = $${paramCount}`;
      params.push(customer_id);
    }

    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    if (driver_id) {
      paramCount++;
      query += ` AND o.driver_id = $${paramCount}`;
      params.push(driver_id);
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      orders: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/:id - Get specific order
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
              a.full_address, a.latitude, a.longitude,
              d.name as driver_name, d.phone as driver_phone
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN addresses a ON o.delivery_address_id = a.id
       LEFT JOIN drivers d ON o.driver_id = d.id
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: result.rows[0] });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/orders/:id - Update order (assign driver, update status)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { driver_id, status, notes } = req.body;

    // Verify order exists
    const orderResult = await db.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // If assigning driver, verify driver exists
    if (driver_id) {
      const driverResult = await db.query(
        'SELECT id FROM drivers WHERE id = $1 AND status = $2',
        [driver_id, 'active']
      );

      if (driverResult.rows.length === 0) {
        return res.status(404).json({ error: 'Driver not found or inactive' });
      }
    }

    // Update order
    const result = await db.query(
      'UPDATE orders SET driver_id = COALESCE($1, driver_id), status = COALESCE($2, status), notes = COALESCE($3, notes), delivered_at = CASE WHEN $2 = $4 THEN CURRENT_TIMESTAMP ELSE delivered_at END, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [driver_id, status, notes, 'delivered', id]
    );

    res.json({
      message: 'Order updated successfully',
      order: result.rows[0]
    });

  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders/:id/pay - Process payment
router.post('/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_token, amount } = req.body;

    // Get order details
    const orderResult = await db.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.payment_status === 'completed') {
      return res.status(400).json({ error: 'Order already paid' });
    }

    if (order.payment_method === 'yoco') {
      try {
        // Process Yoco payment
        const yocoResponse = await axios.post('https://online.yoco.com/v1/charges/', {
          token: payment_token,
          amountInCents: Math.round(parseFloat(amount) * 100),
          currency: 'ZAR'
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.YOCO_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (yocoResponse.data.status === 'successful') {
          // Update order payment status
          await db.query(
            'UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['completed', id]
          );

          res.json({
            message: 'Payment processed successfully',
            payment_id: yocoResponse.data.id,
            status: 'completed'
          });
        } else {
          await db.query(
            'UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['failed', id]
          );

          res.status(400).json({ error: 'Payment failed' });
        }

      } catch (yocoError) {
        console.error('Yoco payment error:', yocoError);
        await db.query(
          'UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['failed', id]
        );

        res.status(500).json({ error: 'Payment processing failed' });
      }
    } else {
      // Cash payment - mark as completed when driver confirms
      await db.query(
        'UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', id]
      );

      res.json({
        message: 'Cash payment recorded',
        status: 'completed'
      });
    }

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/:id/track - Track order (placeholder for WebSocket implementation)
router.get('/:id/track', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT o.status, o.created_at, o.delivered_at,
              d.name as driver_name, d.phone as driver_phone, d.current_location
       FROM orders o
       LEFT JOIN drivers d ON o.driver_id = d.id
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    res.json({
      order_id: id,
      status: order.status,
      driver: order.driver_name ? {
        name: order.driver_name,
        phone: order.driver_phone,
        location: order.current_location
      } : null,
      timeline: {
        created_at: order.created_at,
        delivered_at: order.delivered_at
      }
    });

  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;