const express = require('express');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validateRouteOptimization = [
  body('driver_id').isUUID().withMessage('Valid driver ID is required'),
  body('order_ids').isArray({ min: 1 }).withMessage('Order IDs array is required'),
  body('order_ids.*').isUUID().withMessage('Each order ID must be valid')
];

// Helper function to get order addresses
const getOrderAddresses = async (orderIds) => {
  const result = await db.query(
    `SELECT o.id, a.latitude, a.longitude, a.full_address, c.name as customer_name
     FROM orders o
     JOIN addresses a ON o.delivery_address_id = a.id
     JOIN customers c ON o.customer_id = c.id
     WHERE o.id = ANY($1)`,
    [orderIds]
  );
  
  return result.rows;
};

// Helper function to call Google Maps Directions API
const optimizeRoute = async (addresses) => {
  try {
    if (addresses.length === 0) {
      throw new Error('No addresses provided');
    }

    if (addresses.length === 1) {
      // Single destination, no optimization needed
      return {
        waypoints: [addresses[0]],
        total_distance: 0,
        total_duration: 0,
        optimized_order: [0]
      };
    }

    // For multiple destinations, use Google Maps Directions API
    const origin = addresses[0];
    const destination = addresses[addresses.length - 1];
    const waypoints = addresses.slice(1, -1);

    const waypointString = waypoints.map(addr => `${addr.latitude},${addr.longitude}`).join('|');
    
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&waypoints=optimize:true|${waypointString}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const response = await axios.get(url);

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const route = response.data.routes[0];
    const optimizedOrder = route.waypoint_order || [];
    
    // Calculate total distance and duration
    let totalDistance = 0;
    let totalDuration = 0;
    
    route.legs.forEach(leg => {
      totalDistance += leg.distance.value; // in meters
      totalDuration += leg.duration.value; // in seconds
    });

    // Reorder addresses based on optimization
    const optimizedAddresses = [origin];
    optimizedOrder.forEach(index => {
      optimizedAddresses.push(waypoints[index]);
    });
    optimizedAddresses.push(destination);

    return {
      waypoints: optimizedAddresses,
      total_distance: Math.round(totalDistance / 1000), // convert to km
      total_duration: Math.round(totalDuration / 60), // convert to minutes
      optimized_order: [0, ...optimizedOrder.map(i => i + 1), addresses.length - 1],
      google_response: route
    };

  } catch (error) {
    console.error('Route optimization error:', error);
    throw error;
  }
};

// POST /api/routes/optimize - Optimize delivery route
router.post('/optimize', validateRouteOptimization, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { driver_id, order_ids } = req.body;

    // Verify driver exists
    const driverResult = await db.query(
      'SELECT id, name FROM drivers WHERE id = $1',
      [driver_id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Get order addresses
    const addresses = await getOrderAddresses(order_ids);

    if (addresses.length !== order_ids.length) {
      return res.status(400).json({ error: 'Some orders not found or invalid' });
    }

    // Optimize route
    const optimizedRoute = await optimizeRoute(addresses);

    // Save route to database
    const routeResult = await db.query(
      'INSERT INTO driver_routes (driver_id, order_ids, optimized_path, total_distance_km, estimated_duration_minutes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        driver_id,
        order_ids,
        JSON.stringify(optimizedRoute),
        optimizedRoute.total_distance,
        optimizedRoute.total_duration
      ]
    );

    // Update driver status to busy
    await db.query(
      'UPDATE drivers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['busy', driver_id]
    );

    // Update order statuses to assigned
    await db.query(
      'UPDATE orders SET status = $1, driver_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($3)',
      ['assigned', driver_id, order_ids]
    );

    res.json({
      message: 'Route optimized successfully',
      route: {
        id: routeResult.rows[0].id,
        driver_id: driver_id,
        order_ids: order_ids,
        waypoints: optimizedRoute.waypoints,
        total_distance_km: optimizedRoute.total_distance,
        estimated_duration_minutes: optimizedRoute.total_duration,
        optimized_order: optimizedRoute.optimized_order
      }
    });

  } catch (error) {
    console.error('Route optimization error:', error);
    
    if (error.message.includes('Google Maps API')) {
      return res.status(502).json({ error: 'Route optimization service unavailable' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/routes/:id - Get specific route
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM driver_routes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const route = result.rows[0];

    res.json({
      route: {
        id: route.id,
        driver_id: route.driver_id,
        order_ids: route.order_ids,
        optimized_path: route.optimized_path,
        total_distance_km: route.total_distance_km,
        estimated_duration_minutes: route.estimated_duration_minutes,
        status: route.status,
        created_at: route.created_at,
        completed_at: route.completed_at
      }
    });

  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/routes/:id - Update route status
router.patch('/:id', [
  body('status').isIn(['planned', 'in_progress', 'completed']).withMessage('Status must be planned, in_progress, or completed')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const result = await db.query(
      'UPDATE driver_routes SET status = $1, completed_at = CASE WHEN $1 = $2 THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE id = $3 RETURNING *',
      [status, 'completed', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json({
      message: 'Route status updated successfully',
      route: result.rows[0]
    });

  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/routes - Get all routes (admin)
router.get('/', async (req, res) => {
  try {
    const { driver_id, status, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT r.*, d.name as driver_name
      FROM driver_routes r
      JOIN drivers d ON r.driver_id = d.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (driver_id) {
      paramCount++;
      query += ` AND r.driver_id = $${paramCount}`;
      params.push(driver_id);
    }

    if (status) {
      paramCount++;
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      routes: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/routes/:id/start - Start route (driver)
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const { driver_id } = req.body;

    // Verify route belongs to driver
    const routeResult = await db.query(
      'SELECT * FROM driver_routes WHERE id = $1 AND driver_id = $2',
      [id, driver_id]
    );

    if (routeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found or not assigned to this driver' });
    }

    // Update route status to in_progress
    await db.query(
      'UPDATE driver_routes SET status = $1 WHERE id = $2',
      ['in_progress', id]
    );

    // Update associated orders to in_transit
    const route = routeResult.rows[0];
    await db.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2)',
      ['in_transit', route.order_ids]
    );

    res.json({ message: 'Route started successfully' });

  } catch (error) {
    console.error('Start route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;