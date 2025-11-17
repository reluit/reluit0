// Test script to check invoices from Supabase user ID
import Stripe from 'stripe';
import { readFileSync } from 'fs';

// Load env vars manually
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

async function testInvoicesByUserId() {
  try {
    console.log('=== Testing Invoice Fetching by Supabase User ID ===\n');
    
    // Test 1: List all customers and show their metadata
    console.log('Test 1: Listing customers with user_id in metadata...\n');
    
    // First, try to find customers with user_id using Search API
    console.log('Searching for customers with user_id in metadata using Search API...\n');
    let customersWithUserId = [];
    
    try {
      // Search for any customer with user_id metadata (this is a bit tricky since we need a value)
      // Let's list all customers and filter
      const allCustomers = await stripe.customers.list({
        limit: 100, // Get more customers
      });
      
      console.log(`Found ${allCustomers.data.length} total customers\n`);
      
      customersWithUserId = allCustomers.data.filter(c => c.metadata?.user_id);
      console.log(`Found ${customersWithUserId.length} customers with user_id in metadata\n`);
      
      if (customersWithUserId.length === 0) {
        console.log('⚠️  No customers found with user_id in metadata.');
        console.log('   This might mean:');
        console.log('   1. Customers were created before user_id was added to metadata');
        console.log('   2. Customers need to be updated to include user_id');
        console.log('   3. There are more than 100 customers and we need to paginate\n');
        
        // Show first few customers without user_id
        console.log('Showing first 5 customers (without user_id):\n');
        allCustomers.data.slice(0, 5).forEach((customer, idx) => {
          console.log(`Customer ${idx + 1}: ${customer.id}`);
          console.log(`  Email: ${customer.email || 'N/A'}`);
          console.log(`  Name: ${customer.name || 'N/A'}`);
          console.log(`  Metadata:`, customer.metadata);
          console.log('');
        });
        
        return;
      }
    } catch (error) {
      console.error('Error listing customers:', error.message);
      return;
    }
    
    // Test with the first customer that has user_id
    const customer = customersWithUserId[0];
    
    console.log(`Testing with customer: ${customer.id}`);
    console.log(`  Email: ${customer.email || 'N/A'}`);
    console.log(`  Name: ${customer.name || 'N/A'}`);
    console.log(`  Metadata:`, customer.metadata);
    console.log(`  ✅ Has user_id in metadata: ${customer.metadata.user_id}\n`);
    
    // Test 2: Search for this customer using Search API
        console.log(`\n  Test 2: Searching for customer by user_id using Search API...`);
        try {
          const searchResults = await stripe.customers.search({
            query: `metadata['user_id']:'${customer.metadata.user_id}'`,
            limit: 10, // Get all customers with this user_id
          });
          
          if (searchResults.data.length > 0) {
            console.log(`  ✅ Found ${searchResults.data.length} customer(s) via Search API:`);
            searchResults.data.forEach((foundCustomer, idx) => {
              console.log(`    ${idx + 1}. Customer ID: ${foundCustomer.id}`);
              console.log(`       Email: ${foundCustomer.email || 'N/A'}`);
              console.log(`       Name: ${foundCustomer.name || 'N/A'}`);
              console.log(`       Created: ${new Date(foundCustomer.created * 1000).toISOString()}`);
            });
            
            // Check if the original customer is in the search results
            const foundOriginal = searchResults.data.find(c => c.id === customer.id);
            if (foundOriginal) {
              console.log(`  ✅ Original customer found in search results`);
            } else {
              console.log(`  ⚠️  Original customer NOT in search results (might be multiple customers with same user_id)`);
            }
          } else {
            console.log(`  ⚠️  Search API returned no results`);
          }
        } catch (searchError) {
          console.log(`  ⚠️  Search API error: ${searchError.message}`);
          console.log(`      This might mean Search API is not available or API version is too old`);
        }
        
        // Test 3: Fetch invoices for this customer
        console.log(`\n  Test 3: Fetching invoices for customer ${customer.id}...`);
        const invoices = await stripe.invoices.list({
          customer: customer.id,
          limit: 50, // Get more invoices
        });
        
        console.log(`  Found ${invoices.data.length} invoices:`);
        if (invoices.data.length > 0) {
          invoices.data.forEach((invoice, idx) => {
            console.log(`\n    Invoice ${idx + 1}:`);
            console.log(`      ID: ${invoice.id}`);
            console.log(`      Status: ${invoice.status}`);
            console.log(`      Amount Paid: ${invoice.amount_paid || 0} ${invoice.currency}`);
            console.log(`      Amount Due: ${invoice.amount_due || 0} ${invoice.currency}`);
            console.log(`      Created: ${new Date(invoice.created * 1000).toISOString()}`);
            console.log(`      Subscription: ${invoice.subscription || 'N/A'}`);
            console.log(`      Hosted URL: ${invoice.hosted_invoice_url || 'N/A'}`);
            console.log(`      Customer: ${invoice.customer}`);
            if (invoice.period_start && invoice.period_end) {
              console.log(`      Period: ${new Date(invoice.period_start * 1000).toISOString()} - ${new Date(invoice.period_end * 1000).toISOString()}`);
            }
          });
        } else {
          console.log(`    ⚠️  No invoices found for this customer`);
        }
        
        console.log(`\n  ✅ Successfully fetched ${invoices.data.length} invoices for user_id ${customer.metadata.user_id}`);
        
        // Test 4: Check if there are other customers with the same user_id and aggregate their invoices
        console.log(`\n  Test 4: Checking for other customers with same user_id...`);
        
        // Use Search API to find all customers with this user_id
        let allCustomersWithUserId = [customer];
        try {
          const searchResults = await stripe.customers.search({
            query: `metadata['user_id']:'${customer.metadata.user_id}'`,
            limit: 100,
          });
          
          allCustomersWithUserId = searchResults.data;
          console.log(`  Found ${allCustomersWithUserId.length} customer(s) with user_id ${customer.metadata.user_id}`);
        } catch (searchError) {
          console.log(`  ⚠️  Search API error, checking from list:`, searchError.message);
          // Fallback: filter from the list we already have
          const allCustomers = await stripe.customers.list({ limit: 100 });
          allCustomersWithUserId = allCustomers.data.filter(
            c => c.metadata?.user_id === customer.metadata.user_id
          );
        }
        
        if (allCustomersWithUserId.length > 1) {
          console.log(`  ⚠️  Found ${allCustomersWithUserId.length} customers with same user_id!`);
          console.log(`  This could cause invoice fragmentation. Aggregating invoices from all customers...`);
          
          let totalInvoices = invoices.data.length;
          for (const otherCustomer of allCustomersWithUserId) {
            if (otherCustomer.id === customer.id) continue;
            
            const otherInvoices = await stripe.invoices.list({
              customer: otherCustomer.id,
              limit: 50,
            });
            
            if (otherInvoices.data.length > 0) {
              console.log(`    Customer ${otherCustomer.id} has ${otherInvoices.data.length} invoices`);
              totalInvoices += otherInvoices.data.length;
            }
          }
          
          console.log(`  Total invoices across all customers with user_id ${customer.metadata.user_id}: ${totalInvoices}`);
        } else {
          console.log(`  ✅ Only one customer found with this user_id (good!)`);
        }
        
    console.log('\n' + '='.repeat(60));
    console.log('');
    
    // Test 5: Try searching for a specific user_id (if you want to test a specific one)
    const testUserId = process.env.TEST_USER_ID;
    if (testUserId) {
      console.log(`\nTest 4: Testing with specific user_id from TEST_USER_ID env var: ${testUserId}\n`);
      
      try {
        const searchResults = await stripe.customers.search({
          query: `metadata['user_id']:'${testUserId}'`,
          limit: 1,
        });
        
        if (searchResults.data.length > 0) {
          const customer = searchResults.data[0];
          console.log(`✅ Found customer: ${customer.id}`);
          console.log(`   Email: ${customer.email || 'N/A'}`);
          console.log(`   Name: ${customer.name || 'N/A'}`);
          
          // Fetch invoices
          const invoices = await stripe.invoices.list({
            customer: customer.id,
            limit: 50,
          });
          
          console.log(`\n   Found ${invoices.data.length} invoices for this customer:`);
          invoices.data.forEach((invoice, idx) => {
            console.log(`\n   Invoice ${idx + 1}: ${invoice.id}`);
            console.log(`     Status: ${invoice.status}`);
            console.log(`     Amount: ${invoice.amount_paid || invoice.amount_due || 0} ${invoice.currency}`);
            console.log(`     Created: ${new Date(invoice.created * 1000).toISOString()}`);
          });
        } else {
          console.log(`⚠️  No customer found with user_id: ${testUserId}`);
        }
      } catch (searchError) {
        console.log(`⚠️  Search API error: ${searchError.message}`);
        console.log(`   Falling back to list all customers...`);
        
        const allCustomers = await stripe.customers.list({ limit: 100 });
        const foundCustomer = allCustomers.data.find(
          c => c.metadata?.user_id === testUserId
        );
        
        if (foundCustomer) {
          console.log(`✅ Found customer via list: ${foundCustomer.id}`);
          const invoices = await stripe.invoices.list({
            customer: foundCustomer.id,
            limit: 50,
          });
          console.log(`   Found ${invoices.data.length} invoices`);
        } else {
          console.log(`⚠️  No customer found with user_id: ${testUserId}`);
        }
      }
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error testing invoices:');
    console.error('   Message:', error.message);
    console.error('   Type:', error.type);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    console.error('\n   Full error:', error);
    process.exit(1);
  }
}

testInvoicesByUserId();

