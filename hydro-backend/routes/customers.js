const express = require('express');
const { body, validationResult } = require('express-validator');
const twilio = require('twilio');
const db = require('../config/database');

const router = express.Router();

// Initialize Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Validation middleware
const validateCustomerRegistration = [
  body('phone').matches(/^\+27\d{9}$/).withMessage('Phone must be in +27xxxxxxxxx format'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('name').optional().isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters')
];

const validateOTP = [
  body('phone').matches(/^\+27\d{9}$/).withMessage('Phone must be in +27xxxxxxxxx format'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

// Helper function to generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /api/customers/register - Register new customer
router.post('/register', validateCustomerRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, email, name } = req.body;

    // Check if customer already exists
    const existingCustomer = await db.query(
      'SELECT id, is_verified FROM customers WHERE phone = $1 OR email = $2',
      [phone, email]
    );

    if (existingCustomer.rows.length > 0) {
      const customer = existingCustomer.rows[0];
      if (customer.is_verified) {
        return res.status(409).json({ error: 'Customer already exists and is verified' });
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save OTP to database
    await db.query(
      'INSERT INTO otp_verifications (phone, otp_code, expires_at) VALUES ($1, $2, $3)',
      [phone, otp, expiresAt]
    );

    // Send OTP via SMS
    try {
      await twilioClient.messages.create({
        body: `Your Hydro Purified Water verification code is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
    } catch (twilioError) {
      console.error('Twilio error:', twilioError);
      return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
    }

    // Insert or update customer
    if (existingCustomer.rows.length > 0) {
      await db.query(
        'UPDATE customers SET email = $1, name = $2, updated_at = CURRENT_TIMESTAMP WHERE phone = $3',
        [email, name, phone]
      );
    } else {
      await db.query(
        'INSERT INTO customers (phone, email, name) VALUES ($1, $2, $3)',
        [phone, email, name]
      );
    }

    res.status(200).json({
      message: 'OTP sent successfully',
      phone: phone
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/customers/verify-otp - Verify OTP and complete registration
router.post('/verify-otp', validateOTP, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, otp } = req.body;

    // Find valid OTP
    const otpResult = await db.query(
      'SELECT * FROM otp_verifications WHERE phone = $1 AND otp_code = $2 AND expires_at > CURRENT_TIMESTAMP AND is_verified = false ORDER BY created_at DESC LIMIT 1',
      [phone, otp]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as verified
    await db.query(
      'UPDATE otp_verifications SET is_verified = true WHERE id = $1',
      [otpResult.rows[0].id]
    );

    // Mark customer as verified
    const customerResult = await db.query(
      'UPDATE customers SET is_verified = true, updated_at = CURRENT_TIMESTAMP WHERE phone = $1 RETURNING *',
      [phone]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];

    res.status(200).json({
      message: 'Phone verified successfully',
      customer: {
        id: customer.id,
        phone: customer.phone,
        email: customer.email,
        name: customer.name,
        is_verified: customer.is_verified
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/customers - Get all customers (admin only)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, phone, email, name, is_verified, created_at FROM customers ORDER BY created_at DESC'
    );

    res.json({
      customers: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/customers/:id - Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT id, phone, email, name, is_verified, created_at FROM customers WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ customer: result.rows[0] });

  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', [
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('name').optional().isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { email, name } = req.body;

    const result = await db.query(
      'UPDATE customers SET email = COALESCE($1, email), name = COALESCE($2, name), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [email, name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({
      message: 'Customer updated successfully',
      customer: {
        id: result.rows[0].id,
        phone: result.rows[0].phone,
        email: result.rows[0].email,
        name: result.rows[0].name,
        is_verified: result.rows[0].is_verified
      }
    });

  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/customers/resend-otp - Resend OTP
router.post('/resend-otp', [
  body('phone').matches(/^\+27\d{9}$/).withMessage('Phone must be in +27xxxxxxxxx format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone } = req.body;

    // Check if customer exists
    const customerResult = await db.query(
      'SELECT id FROM customers WHERE phone = $1',
      [phone]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save new OTP
    await db.query(
      'INSERT INTO otp_verifications (phone, otp_code, expires_at) VALUES ($1, $2, $3)',
      [phone, otp, expiresAt]
    );

    // Send OTP via SMS
    try {
      await twilioClient.messages.create({
        body: `Your Hydro Purified Water verification code is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
    } catch (twilioError) {
      console.error('Twilio error:', twilioError);
      return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
    }

    res.json({ message: 'OTP resent successfully' });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;