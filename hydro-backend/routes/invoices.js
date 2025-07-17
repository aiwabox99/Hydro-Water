const express = require('express');
const { body, validationResult } = require('express-validator');
const sgMail = require('@sendgrid/mail');
const db = require('../config/database');

const router = express.Router();

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Validation middleware
const validateInvoice = [
  body('order_id').isUUID().withMessage('Valid order ID is required')
];

// Helper function to generate invoice HTML
const generateInvoiceHTML = (invoice, order, customer, address) => {
  const nextDeliveryDate = order.subscription_id 
    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() // Next week for subscriptions
    : null;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { background: #007BFF; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .invoice-details { background: #f8f9fa; padding: 15px; margin: 20px 0; }
        .order-summary { border: 1px solid #ddd; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; }
        .total { font-size: 18px; font-weight: bold; color: #007BFF; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚰 Hydro Purified Water</h1>
        <p>Premium RO Purified, Mineral-Enhanced Water Delivery</p>
      </div>
      
      <div class="content">
        <h2>Invoice ${invoice.invoice_number}</h2>
        
        <div class="invoice-details">
          <p><strong>Date:</strong> ${new Date(invoice.created_at).toLocaleDateString()}</p>
          <p><strong>Customer:</strong> ${customer.name || 'Valued Customer'}</p>
          <p><strong>Phone:</strong> ${customer.phone}</p>
          <p><strong>Email:</strong> ${customer.email}</p>
        </div>
        
        <div class="order-summary">
          <h3>Order Summary</h3>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Delivery Address:</strong> ${address.full_address}</p>
          <p><strong>Volume:</strong> ${order.volume} liters</p>
          <p><strong>Price per liter:</strong> R${(order.price_zar / order.volume).toFixed(2)}</p>
          <p><strong>Payment Method:</strong> ${order.payment_method.toUpperCase()}</p>
          <p><strong>Delivery Date:</strong> ${order.delivered_at ? new Date(order.delivered_at).toLocaleDateString() : 'Pending'}</p>
          ${nextDeliveryDate ? `<p><strong>Next Delivery:</strong> ${nextDeliveryDate}</p>` : ''}
        </div>
        
        <div class="total">
          <p>Total Amount: R${parseFloat(invoice.amount_zar).toFixed(2)}</p>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing Hydro Purified Water!</p>
          <p>For support, contact us at support@hydropurified.co.za</p>
          <p>🌊 Pure Water, Pure Life 🌊</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// POST /api/invoices - Send invoice
router.post('/', validateInvoice, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { order_id } = req.body;

    // Get order details with customer and address info
    const orderResult = await db.query(
      `SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
              a.full_address, a.latitude, a.longitude
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN addresses a ON o.delivery_address_id = a.id
       WHERE o.id = $1`,
      [order_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check if invoice already exists
    const existingInvoice = await db.query(
      'SELECT * FROM invoices WHERE order_id = $1',
      [order_id]
    );

    let invoice;
    if (existingInvoice.rows.length > 0) {
      invoice = existingInvoice.rows[0];
    } else {
      // Generate invoice number
      const invoiceNumber = await db.query('SELECT generate_invoice_number()');
      
      // Create invoice
      const invoiceResult = await db.query(
        'INSERT INTO invoices (order_id, customer_id, invoice_number, amount_zar) VALUES ($1, $2, $3, $4) RETURNING *',
        [order_id, order.customer_id, invoiceNumber.rows[0].generate_invoice_number, order.price_zar]
      );
      
      invoice = invoiceResult.rows[0];
    }

    // Generate invoice HTML
    const customer = {
      name: order.customer_name,
      phone: order.customer_phone,
      email: order.customer_email
    };

    const address = {
      full_address: order.full_address,
      latitude: order.latitude,
      longitude: order.longitude
    };

    const invoiceHTML = generateInvoiceHTML(invoice, order, customer, address);

    // Send email via SendGrid
    const msg = {
      to: customer.email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `Invoice ${invoice.invoice_number} - Hydro Purified Water`,
      html: invoiceHTML,
      text: `Invoice ${invoice.invoice_number} for R${parseFloat(invoice.amount_zar).toFixed(2)} - ${order.volume} liters of purified water delivered to ${address.full_address}.`
    };

    try {
      await sgMail.send(msg);
      
      // Update invoice as sent
      await db.query(
        'UPDATE invoices SET email_sent = true, email_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
        [invoice.id]
      );

      console.log(`📧 Invoice ${invoice.invoice_number} sent to ${customer.email}`);

      res.json({
        message: 'Invoice sent successfully',
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          amount_zar: invoice.amount_zar,
          email_sent: true,
          email_sent_at: new Date().toISOString()
        }
      });

    } catch (emailError) {
      console.error('SendGrid error:', emailError);
      res.status(500).json({ error: 'Failed to send invoice email' });
    }

  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices - Get all invoices
router.get('/', async (req, res) => {
  try {
    const { customer_id, email_sent, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             o.volume, o.delivered_at
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN orders o ON i.order_id = o.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (customer_id) {
      paramCount++;
      query += ` AND i.customer_id = $${paramCount}`;
      params.push(customer_id);
    }

    if (email_sent !== undefined) {
      paramCount++;
      query += ` AND i.email_sent = $${paramCount}`;
      params.push(email_sent === 'true');
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      invoices: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices/:id - Get specific invoice
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
              o.volume, o.delivered_at, o.payment_method, a.full_address
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       JOIN orders o ON i.order_id = o.id
       JOIN addresses a ON o.delivery_address_id = a.id
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ invoice: result.rows[0] });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invoices/:id/resend - Resend invoice
router.post('/:id/resend', async (req, res) => {
  try {
    const { id } = req.params;

    // Get invoice details
    const invoiceResult = await db.query(
      `SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
              o.*, a.full_address, a.latitude, a.longitude
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       JOIN orders o ON i.order_id = o.id
       JOIN addresses a ON o.delivery_address_id = a.id
       WHERE i.id = $1`,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoiceData = invoiceResult.rows[0];

    // Prepare data for HTML generation
    const invoice = {
      id: invoiceData.id,
      invoice_number: invoiceData.invoice_number,
      amount_zar: invoiceData.amount_zar,
      created_at: invoiceData.created_at
    };

    const order = {
      id: invoiceData.order_id,
      volume: invoiceData.volume,
      price_zar: invoiceData.price_zar,
      payment_method: invoiceData.payment_method,
      delivered_at: invoiceData.delivered_at,
      subscription_id: invoiceData.subscription_id
    };

    const customer = {
      name: invoiceData.customer_name,
      phone: invoiceData.customer_phone,
      email: invoiceData.customer_email
    };

    const address = {
      full_address: invoiceData.full_address,
      latitude: invoiceData.latitude,
      longitude: invoiceData.longitude
    };

    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML(invoice, order, customer, address);

    // Send email via SendGrid
    const msg = {
      to: customer.email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `Invoice ${invoice.invoice_number} - Hydro Purified Water (Resent)`,
      html: invoiceHTML,
      text: `Invoice ${invoice.invoice_number} for R${parseFloat(invoice.amount_zar).toFixed(2)} - ${order.volume} liters of purified water delivered to ${address.full_address}.`
    };

    try {
      await sgMail.send(msg);
      
      // Update invoice as sent
      await db.query(
        'UPDATE invoices SET email_sent = true, email_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );

      console.log(`📧 Invoice ${invoice.invoice_number} resent to ${customer.email}`);

      res.json({
        message: 'Invoice resent successfully',
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          amount_zar: invoice.amount_zar,
          email_sent: true,
          email_sent_at: new Date().toISOString()
        }
      });

    } catch (emailError) {
      console.error('SendGrid error:', emailError);
      res.status(500).json({ error: 'Failed to resend invoice email' });
    }

  } catch (error) {
    console.error('Resend invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices/stats/summary - Get invoice statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Total invoices and revenue
    const totalResult = await db.query(
      `SELECT COUNT(*) as total_invoices, SUM(amount_zar) as total_revenue
       FROM invoices 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'`
    );

    // Email sent statistics
    const emailResult = await db.query(
      `SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN email_sent = true THEN 1 ELSE 0 END) as emails_sent,
        SUM(CASE WHEN email_sent = false THEN 1 ELSE 0 END) as emails_pending
       FROM invoices 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'`
    );

    // Daily invoice stats
    const dailyResult = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as invoice_count,
        SUM(amount_zar) as daily_revenue
       FROM invoices 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );

    res.json({
      summary: {
        total_invoices: parseInt(totalResult.rows[0].total_invoices),
        total_revenue: parseFloat(totalResult.rows[0].total_revenue || 0),
        emails_sent: parseInt(emailResult.rows[0].emails_sent),
        emails_pending: parseInt(emailResult.rows[0].emails_pending),
        email_success_rate: totalResult.rows[0].total_invoices > 0 
          ? ((emailResult.rows[0].emails_sent / totalResult.rows[0].total_invoices) * 100).toFixed(2)
          : 0
      },
      daily_stats: dailyResult.rows,
      period_days: days
    });

  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;