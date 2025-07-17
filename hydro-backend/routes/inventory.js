const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validateInventoryUpdate = [
  body('water_volume').isInt({ min: 0 }).withMessage('Water volume must be a non-negative integer'),
  body('updated_by').optional().isLength({ min: 1, max: 255 }).withMessage('Updated by must be 1-255 characters')
];

// GET /api/inventory - Get current inventory
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM inventory ORDER BY last_updated DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No inventory record found' });
    }

    const inventory = result.rows[0];
    const lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 200;

    res.json({
      inventory: {
        id: inventory.id,
        water_volume: inventory.water_volume,
        last_updated: inventory.last_updated,
        updated_by: inventory.updated_by,
        is_low_stock: inventory.water_volume < lowStockThreshold,
        low_stock_threshold: lowStockThreshold
      }
    });

  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory - Update inventory
router.post('/', validateInventoryUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { water_volume, updated_by = 'admin' } = req.body;

    // Get current inventory
    const currentResult = await db.query(
      'SELECT water_volume FROM inventory ORDER BY last_updated DESC LIMIT 1'
    );

    const currentVolume = currentResult.rows[0]?.water_volume || 0;

    // Insert new inventory record
    const result = await db.query(
      'INSERT INTO inventory (water_volume, updated_by) VALUES ($1, $2) RETURNING *',
      [water_volume, updated_by]
    );

    const inventory = result.rows[0];
    const lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 200;

    // Check for low stock alert
    if (water_volume < lowStockThreshold) {
      console.warn(`⚠️  LOW STOCK ALERT: Stock updated to ${water_volume} liters (threshold: ${lowStockThreshold})`);
      // TODO: Implement Firebase notification or email alert
    }

    // Log inventory change
    console.log(`📦 Inventory updated: ${currentVolume} → ${water_volume} liters by ${updated_by}`);

    res.json({
      message: 'Inventory updated successfully',
      inventory: {
        id: inventory.id,
        water_volume: inventory.water_volume,
        last_updated: inventory.last_updated,
        updated_by: inventory.updated_by,
        is_low_stock: inventory.water_volume < lowStockThreshold,
        low_stock_threshold: lowStockThreshold,
        previous_volume: currentVolume,
        change: water_volume - currentVolume
      }
    });

  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory/add - Add to inventory (stock replenishment)
router.post('/add', [
  body('volume_to_add').isInt({ min: 1 }).withMessage('Volume to add must be a positive integer'),
  body('updated_by').optional().isLength({ min: 1, max: 255 }).withMessage('Updated by must be 1-255 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { volume_to_add, updated_by = 'admin' } = req.body;

    // Get current inventory
    const currentResult = await db.query(
      'SELECT water_volume FROM inventory ORDER BY last_updated DESC LIMIT 1'
    );

    const currentVolume = currentResult.rows[0]?.water_volume || 0;
    const newVolume = currentVolume + volume_to_add;

    // Insert new inventory record
    const result = await db.query(
      'INSERT INTO inventory (water_volume, updated_by) VALUES ($1, $2) RETURNING *',
      [newVolume, updated_by]
    );

    const inventory = result.rows[0];
    const lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 200;

    console.log(`📦 Stock replenished: +${volume_to_add} liters (${currentVolume} → ${newVolume}) by ${updated_by}`);

    res.json({
      message: 'Stock replenished successfully',
      inventory: {
        id: inventory.id,
        water_volume: inventory.water_volume,
        last_updated: inventory.last_updated,
        updated_by: inventory.updated_by,
        is_low_stock: inventory.water_volume < lowStockThreshold,
        low_stock_threshold: lowStockThreshold,
        previous_volume: currentVolume,
        volume_added: volume_to_add
      }
    });

  } catch (error) {
    console.error('Add inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/inventory/history - Get inventory history
router.get('/history', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const result = await db.query(
      'SELECT * FROM inventory ORDER BY last_updated DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    // Calculate changes between records
    const historyWithChanges = result.rows.map((record, index) => {
      const nextRecord = result.rows[index + 1];
      const change = nextRecord ? record.water_volume - nextRecord.water_volume : 0;
      
      return {
        ...record,
        change: change
      };
    });

    res.json({
      history: historyWithChanges,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get inventory history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/inventory/alerts - Get low stock alerts
router.get('/alerts', async (req, res) => {
  try {
    const lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 200;
    
    const result = await db.query(
      'SELECT * FROM inventory WHERE water_volume < $1 ORDER BY last_updated DESC LIMIT 10',
      [lowStockThreshold]
    );

    const currentInventory = await db.query(
      'SELECT water_volume FROM inventory ORDER BY last_updated DESC LIMIT 1'
    );

    const currentVolume = currentInventory.rows[0]?.water_volume || 0;

    res.json({
      current_stock: currentVolume,
      is_low_stock: currentVolume < lowStockThreshold,
      low_stock_threshold: lowStockThreshold,
      recent_low_stock_events: result.rows,
      alert_message: currentVolume < lowStockThreshold 
        ? `⚠️ LOW STOCK: Only ${currentVolume} liters remaining (threshold: ${lowStockThreshold})`
        : null
    });

  } catch (error) {
    console.error('Get inventory alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/inventory/stats - Get inventory statistics
router.get('/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Get inventory changes over the specified period
    const result = await db.query(
      `SELECT 
        DATE(last_updated) as date,
        MIN(water_volume) as min_volume,
        MAX(water_volume) as max_volume,
        COUNT(*) as updates_count
       FROM inventory 
       WHERE last_updated >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY DATE(last_updated)
       ORDER BY date DESC`,
      []
    );

    // Get total consumption (orders) for the period
    const consumptionResult = await db.query(
      `SELECT 
        DATE(created_at) as date,
        SUM(volume) as total_consumed
       FROM orders 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
       AND status = 'delivered'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      []
    );

    // Current inventory
    const currentResult = await db.query(
      'SELECT water_volume FROM inventory ORDER BY last_updated DESC LIMIT 1'
    );

    const currentVolume = currentResult.rows[0]?.water_volume || 0;
    const lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 200;

    res.json({
      current_volume: currentVolume,
      low_stock_threshold: lowStockThreshold,
      is_low_stock: currentVolume < lowStockThreshold,
      daily_inventory: result.rows,
      daily_consumption: consumptionResult.rows,
      period_days: days
    });

  } catch (error) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;