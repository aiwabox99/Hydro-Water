const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validateSubscription = [
  body('customer_id').isUUID().withMessage('Valid customer ID is required'),
  body('delivery_address_id').isUUID().withMessage('Valid delivery address ID is required'),
  body('volume').isInt({ min: 20 }).withMessage('Volume must be at least 20 liters'),
  body('frequency').isIn(['weekly', 'biweekly', 'monthly']).withMessage('Frequency must be weekly, biweekly, or monthly')
];

// Helper function to calculate next delivery date
const calculateNextDeliveryDate = (frequency, currentDate = new Date()) => {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }
  
  return nextDate;
};

// POST /api/subscriptions - Create new subscription
router.post('/', validateSubscription, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_id, delivery_address_id, volume, frequency } = req.body;

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

    // Check if customer already has an active subscription
    const existingSubscription = await db.query(
      'SELECT id FROM subscriptions WHERE customer_id = $1 AND status = $2',
      [customer_id, 'active']
    );

    if (existingSubscription.rows.length > 0) {
      return res.status(409).json({ error: 'Customer already has an active subscription' });
    }

    // Calculate next delivery date
    const nextDeliveryDate = calculateNextDeliveryDate(frequency);

    // Create subscription
    const result = await db.query(
      'INSERT INTO subscriptions (customer_id, delivery_address_id, volume, frequency, next_delivery_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [customer_id, delivery_address_id, volume, frequency, nextDeliveryDate]
    );

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription: result.rows[0]
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/subscriptions - Get subscriptions (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { customer_id, status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             a.full_address, a.latitude, a.longitude
      FROM subscriptions s
      JOIN customers c ON s.customer_id = c.id
      JOIN addresses a ON s.delivery_address_id = a.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (customer_id) {
      paramCount++;
      query += ` AND s.customer_id = $${paramCount}`;
      params.push(customer_id);
    }

    if (status) {
      paramCount++;
      query += ` AND s.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      subscriptions: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/subscriptions/:id - Get specific subscription
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
              a.full_address, a.latitude, a.longitude
       FROM subscriptions s
       JOIN customers c ON s.customer_id = c.id
       JOIN addresses a ON s.delivery_address_id = a.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ subscription: result.rows[0] });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/subscriptions/:id - Update subscription (pause, resume, cancel)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, volume, frequency, delivery_address_id } = req.body;

    // Verify subscription exists
    const subscriptionResult = await db.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [id]
    );

    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = subscriptionResult.rows[0];

    // Validate status change
    if (status && !['active', 'paused', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // If changing frequency, recalculate next delivery date
    let nextDeliveryDate = subscription.next_delivery_date;
    if (frequency && frequency !== subscription.frequency) {
      nextDeliveryDate = calculateNextDeliveryDate(frequency);
    }

    // If changing address, verify it belongs to customer
    if (delivery_address_id) {
      const addressResult = await db.query(
        'SELECT id FROM addresses WHERE id = $1 AND customer_id = $2',
        [delivery_address_id, subscription.customer_id]
      );

      if (addressResult.rows.length === 0) {
        return res.status(404).json({ error: 'Address not found or does not belong to customer' });
      }
    }

    // Update subscription
    const result = await db.query(
      'UPDATE subscriptions SET status = COALESCE($1, status), volume = COALESCE($2, volume), frequency = COALESCE($3, frequency), delivery_address_id = COALESCE($4, delivery_address_id), next_delivery_date = COALESCE($5, next_delivery_date), updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [status, volume, frequency, delivery_address_id, nextDeliveryDate, id]
    );

    res.json({
      message: 'Subscription updated successfully',
      subscription: result.rows[0]
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/subscriptions/:id - Cancel subscription
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['cancelled', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ message: 'Subscription cancelled successfully' });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/subscriptions/:id/orders - Get orders for a subscription
router.get('/:id/orders', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const result = await db.query(
      `SELECT o.*, c.name as customer_name, c.phone as customer_phone,
              a.full_address, d.name as driver_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN addresses a ON o.delivery_address_id = a.id
       LEFT JOIN drivers d ON o.driver_id = d.id
       WHERE o.subscription_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    res.json({
      orders: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get subscription orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;