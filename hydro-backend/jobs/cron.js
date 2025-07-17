const cron = require('node-cron');
const db = require('../config/database');

// Helper function to calculate price
const calculatePrice = (volume) => {
  const pricePerLiter = parseFloat(process.env.WATER_PRICE_PER_LITER) || 1.20;
  return (volume * pricePerLiter).toFixed(2);
};

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

// Process subscription orders
const processSubscriptionOrders = async () => {
  try {
    console.log('🔄 Starting subscription order processing...');
    
    // Get all active subscriptions that are due for delivery
    const subscriptions = await db.query(
      `SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
       FROM subscriptions s
       JOIN customers c ON s.customer_id = c.id
       WHERE s.status = 'active' 
       AND s.next_delivery_date <= CURRENT_DATE
       ORDER BY s.created_at`
    );

    console.log(`📋 Found ${subscriptions.rows.length} subscriptions due for processing`);

    let processedCount = 0;
    let errorCount = 0;

    for (const subscription of subscriptions.rows) {
      try {
        // Check if order already exists for today
        const existingOrder = await db.query(
          'SELECT id FROM orders WHERE subscription_id = $1 AND DATE(created_at) = CURRENT_DATE',
          [subscription.id]
        );

        if (existingOrder.rows.length > 0) {
          console.log(`⚠️  Order already exists for subscription ${subscription.id} today`);
          continue;
        }

        // Calculate price
        const price = calculatePrice(subscription.volume);

        // Create order
        const orderResult = await db.query(
          'INSERT INTO orders (customer_id, delivery_address_id, volume, price_zar, payment_method, subscription_id, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
          [
            subscription.customer_id,
            subscription.delivery_address_id,
            subscription.volume,
            price,
            'cash', // Default to cash for subscription orders
            subscription.id,
            `Automated order from ${subscription.frequency} subscription`
          ]
        );

        const order = orderResult.rows[0];

        // Update inventory
        await db.query(
          'UPDATE inventory SET water_volume = water_volume - $1, last_updated = CURRENT_TIMESTAMP, updated_by = $2 WHERE id = (SELECT id FROM inventory ORDER BY last_updated DESC LIMIT 1)',
          [subscription.volume, 'subscription_cron']
        );

        // Calculate next delivery date
        const nextDeliveryDate = calculateNextDeliveryDate(subscription.frequency);

        // Update subscription with next delivery date
        await db.query(
          'UPDATE subscriptions SET next_delivery_date = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [nextDeliveryDate, subscription.id]
        );

        console.log(`✅ Created order ${order.id} for subscription ${subscription.id} (${subscription.customer_name}, ${subscription.volume}L, R${price})`);
        processedCount++;

      } catch (orderError) {
        console.error(`❌ Error processing subscription ${subscription.id}:`, orderError);
        errorCount++;
      }
    }

    // Check inventory levels and log warnings
    const inventoryResult = await db.query(
      'SELECT water_volume FROM inventory ORDER BY last_updated DESC LIMIT 1'
    );

    const currentStock = inventoryResult.rows[0]?.water_volume || 0;
    const lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 200;

    if (currentStock < lowStockThreshold) {
      console.warn(`⚠️  LOW STOCK ALERT: Current stock is ${currentStock} liters (threshold: ${lowStockThreshold})`);
      // TODO: Send Firebase notification or email alert
    }

    console.log(`🎉 Subscription processing completed: ${processedCount} orders created, ${errorCount} errors`);
    
    return {
      processed: processedCount,
      errors: errorCount,
      current_stock: currentStock,
      low_stock_alert: currentStock < lowStockThreshold
    };

  } catch (error) {
    console.error('❌ Error in subscription processing:', error);
    throw error;
  }
};

// Clean up old OTP records
const cleanupOldOTPs = async () => {
  try {
    console.log('🧹 Cleaning up expired OTP records...');
    
    const result = await db.query(
      'DELETE FROM otp_verifications WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL \'1 hour\''
    );

    console.log(`🗑️  Cleaned up ${result.rowCount} expired OTP records`);
    
  } catch (error) {
    console.error('❌ Error cleaning up OTPs:', error);
  }
};

// Update driver statuses (reset busy drivers to active if no active routes)
const updateDriverStatuses = async () => {
  try {
    console.log('👨‍💼 Updating driver statuses...');
    
    const result = await db.query(
      `UPDATE drivers 
       SET status = 'active', updated_at = CURRENT_TIMESTAMP 
       WHERE status = 'busy' 
       AND id NOT IN (
         SELECT driver_id FROM driver_routes 
         WHERE status IN ('planned', 'in_progress')
       )`
    );

    if (result.rowCount > 0) {
      console.log(`🔄 Updated ${result.rowCount} drivers from busy to active`);
    }
    
  } catch (error) {
    console.error('❌ Error updating driver statuses:', error);
  }
};

// Generate daily summary report
const generateDailySummary = async () => {
  try {
    console.log('📊 Generating daily summary...');
    
    const summary = await db.query(
      `SELECT 
        COUNT(*) as total_orders,
        SUM(price_zar) as total_revenue,
        SUM(volume) as total_volume,
        COUNT(DISTINCT customer_id) as unique_customers,
        COUNT(CASE WHEN payment_method = 'yoco' THEN 1 END) as card_payments,
        COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_payments
       FROM orders 
       WHERE DATE(created_at) = CURRENT_DATE`
    );

    const inventoryResult = await db.query(
      'SELECT water_volume FROM inventory ORDER BY last_updated DESC LIMIT 1'
    );

    const subscriptionResult = await db.query(
      'SELECT COUNT(*) as active_subscriptions FROM subscriptions WHERE status = \'active\''
    );

    const stats = summary.rows[0];
    const currentStock = inventoryResult.rows[0]?.water_volume || 0;
    const activeSubscriptions = subscriptionResult.rows[0]?.active_subscriptions || 0;

    console.log(`📈 Daily Summary (${new Date().toLocaleDateString()}):`);
    console.log(`   Orders: ${stats.total_orders}`);
    console.log(`   Revenue: R${parseFloat(stats.total_revenue || 0).toFixed(2)}`);
    console.log(`   Volume: ${stats.total_volume || 0} liters`);
    console.log(`   Customers: ${stats.unique_customers}`);
    console.log(`   Card/Cash: ${stats.card_payments}/${stats.cash_payments}`);
    console.log(`   Stock: ${currentStock} liters`);
    console.log(`   Active Subscriptions: ${activeSubscriptions}`);
    
  } catch (error) {
    console.error('❌ Error generating daily summary:', error);
  }
};

// Schedule cron jobs
console.log('⏰ Setting up cron jobs...');

// Every Monday at 00:00 - Process subscription orders
cron.schedule('0 0 * * 1', async () => {
  console.log('🗓️  Running weekly subscription processing (Monday 00:00)...');
  try {
    await processSubscriptionOrders();
  } catch (error) {
    console.error('❌ Weekly subscription processing failed:', error);
  }
}, {
  scheduled: true,
  timezone: "Africa/Johannesburg"
});

// Every day at 02:00 - Clean up old OTP records
cron.schedule('0 2 * * *', async () => {
  console.log('🧹 Running daily OTP cleanup (02:00)...');
  try {
    await cleanupOldOTPs();
  } catch (error) {
    console.error('❌ OTP cleanup failed:', error);
  }
}, {
  scheduled: true,
  timezone: "Africa/Johannesburg"
});

// Every day at 03:00 - Update driver statuses
cron.schedule('0 3 * * *', async () => {
  console.log('👨‍💼 Running driver status update (03:00)...');
  try {
    await updateDriverStatuses();
  } catch (error) {
    console.error('❌ Driver status update failed:', error);
  }
}, {
  scheduled: true,
  timezone: "Africa/Johannesburg"
});

// Every day at 23:00 - Generate daily summary
cron.schedule('0 23 * * *', async () => {
  console.log('📊 Running daily summary generation (23:00)...');
  try {
    await generateDailySummary();
  } catch (error) {
    console.error('❌ Daily summary generation failed:', error);
  }
}, {
  scheduled: true,
  timezone: "Africa/Johannesburg"
});

// Every hour - Check for due subscriptions (backup check)
cron.schedule('0 * * * *', async () => {
  try {
    const dueSubscriptions = await db.query(
      'SELECT COUNT(*) as due_count FROM subscriptions WHERE status = \'active\' AND next_delivery_date <= CURRENT_DATE'
    );
    
    const dueCount = parseInt(dueSubscriptions.rows[0].due_count);
    
    if (dueCount > 0) {
      console.log(`⏰ Hourly check: ${dueCount} subscriptions due for processing`);
      
      // If it's not Monday, still process due subscriptions
      const today = new Date().getDay();
      if (today !== 1) { // Not Monday
        console.log('🔄 Processing due subscriptions (not Monday)...');
        await processSubscriptionOrders();
      }
    }
  } catch (error) {
    console.error('❌ Hourly subscription check failed:', error);
  }
}, {
  scheduled: true,
  timezone: "Africa/Johannesburg"
});

console.log('✅ Cron jobs scheduled successfully');
console.log('   - Weekly subscription processing: Monday 00:00');
console.log('   - Daily OTP cleanup: 02:00');
console.log('   - Driver status update: 03:00');
console.log('   - Daily summary: 23:00');
console.log('   - Hourly subscription check: Every hour');

// Export functions for manual testing
module.exports = {
  processSubscriptionOrders,
  cleanupOldOTPs,
  updateDriverStatuses,
  generateDailySummary
};