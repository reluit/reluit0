// Script to delete duplicate Stripe customers and keep only one per user_id
import Stripe from 'stripe';
import { readFileSync } from 'fs';

function loadEnv() {
  try {
    const envLocal = readFileSync('.env.local', 'utf8');
    envLocal.split('\n').forEach(line => {
      const [key, ...values] = line.split('=');
      if (key && values.length) {
        process.env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
  } catch (e) {}
  try {
    const env = readFileSync('.env', 'utf8');
    env.split('\n').forEach(line => {
      const [key, ...values] = line.split('=');
      if (key && values.length && !process.env[key.trim()]) {
        process.env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
  } catch (e) {}
}

loadEnv();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover',
});

async function cleanupDuplicates() {
  try {
    console.log('=== Cleaning Up Duplicate Stripe Customers ===\n');
    
    // List all customers
    console.log('Fetching all customers...');
    const allCustomers = await stripe.customers.list({
      limit: 100,
    });
    
    console.log(`Found ${allCustomers.data.length} total customers\n`);
    
    // Group by user_id
    const byUserId = new Map();
    const withoutUserId = [];
    
    for (const customer of allCustomers.data) {
      if (customer.metadata?.user_id) {
        const userId = customer.metadata.user_id;
        if (!byUserId.has(userId)) {
          byUserId.set(userId, []);
        }
        byUserId.get(userId).push(customer);
      } else {
        withoutUserId.push(customer);
      }
    }
    
    console.log(`Customers with user_id: ${byUserId.size} unique user_ids`);
    console.log(`Customers without user_id: ${withoutUserId.length}\n`);
    
    let deleted = 0;
    let kept = 0;
    
    // Process each user_id group
    for (const [userId, customers] of byUserId.entries()) {
      if (customers.length > 1) {
        console.log(`\nUser ID: ${userId} has ${customers.length} customers`);
        
        // Sort by created (oldest first)
        customers.sort((a, b) => a.created - b.created);
        const keep = customers[0];
        const toDelete = customers.slice(1);
        
        console.log(`  ✅ Keeping: ${keep.id} (oldest)`);
        kept++;
        
        // Delete duplicates
        for (const customer of toDelete) {
          console.log(`  🗑️  Deleting: ${customer.id}`);
          
          // Cancel subscriptions first
          const subs = await stripe.subscriptions.list({
            customer: customer.id,
            limit: 100,
          });
          for (const sub of subs.data) {
            try {
              await stripe.subscriptions.cancel(sub.id);
              console.log(`    Cancelled subscription: ${sub.id}`);
            } catch (e) {
              console.log(`    Error cancelling ${sub.id}: ${e.message}`);
            }
          }
          
          // Delete customer
          try {
            await stripe.customers.del(customer.id);
            console.log(`    ✅ Deleted customer: ${customer.id}`);
            deleted++;
          } catch (e) {
            console.log(`    ❌ Error: ${e.message}`);
          }
        }
      } else {
        console.log(`User ID: ${userId} has 1 customer (keeping: ${customers[0].id})`);
        kept++;
      }
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Kept: ${kept} customers`);
    console.log(`Deleted: ${deleted} duplicate customers`);
    console.log(`\n✅ Cleanup complete!`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run cleanup
cleanupDuplicates();

