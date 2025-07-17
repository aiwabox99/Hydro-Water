const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validateAddress = [
  body('customer_id').isUUID().withMessage('Valid customer ID is required'),
  body('label').isLength({ min: 1, max: 100 }).withMessage('Label must be 1-100 characters'),
  body('full_address').isLength({ min: 5, max: 500 }).withMessage('Full address must be 5-500 characters'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required')
];

// POST /api/addresses - Add new address
router.post('/', validateAddress, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_id, label, full_address, latitude, longitude, is_default } = req.body;

    // Verify customer exists
    const customerResult = await db.query(
      'SELECT id FROM customers WHERE id = $1',
      [customer_id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // If this is set as default, unset other default addresses
    if (is_default) {
      await db.query(
        'UPDATE addresses SET is_default = false WHERE customer_id = $1',
        [customer_id]
      );
    }

    // Insert new address
    const result = await db.query(
      'INSERT INTO addresses (customer_id, label, full_address, latitude, longitude, is_default) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [customer_id, label, full_address, latitude, longitude, is_default || false]
    );

    res.status(201).json({
      message: 'Address added successfully',
      address: result.rows[0]
    });

  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/addresses - Get addresses for a customer
router.get('/', async (req, res) => {
  try {
    const { customer_id } = req.query;

    if (!customer_id) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const result = await db.query(
      'SELECT * FROM addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC',
      [customer_id]
    );

    res.json({
      addresses: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/addresses/:id - Get specific address
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM addresses WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ address: result.rows[0] });

  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/addresses/:id - Update address
router.put('/:id', [
  body('label').optional().isLength({ min: 1, max: 100 }).withMessage('Label must be 1-100 characters'),
  body('full_address').optional().isLength({ min: 5, max: 500 }).withMessage('Full address must be 5-500 characters'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { label, full_address, latitude, longitude, is_default } = req.body;

    // Get current address to check customer_id
    const currentAddress = await db.query(
      'SELECT customer_id FROM addresses WHERE id = $1',
      [id]
    );

    if (currentAddress.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If setting as default, unset other default addresses
    if (is_default) {
      await db.query(
        'UPDATE addresses SET is_default = false WHERE customer_id = $1',
        [currentAddress.rows[0].customer_id]
      );
    }

    // Update address
    const result = await db.query(
      'UPDATE addresses SET label = COALESCE($1, label), full_address = COALESCE($2, full_address), latitude = COALESCE($3, latitude), longitude = COALESCE($4, longitude), is_default = COALESCE($5, is_default) WHERE id = $6 RETURNING *',
      [label, full_address, latitude, longitude, is_default, id]
    );

    res.json({
      message: 'Address updated successfully',
      address: result.rows[0]
    });

  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/addresses/:id - Delete address
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM addresses WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ message: 'Address deleted successfully' });

  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;