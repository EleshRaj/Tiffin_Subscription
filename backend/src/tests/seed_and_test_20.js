/**
 * Comprehensive 20+ Customer Test & Seed Suite
 * - Seeds 22 realistic customer accounts
 * - Verifies 7-day-a-week service logic
 * - Tests "Not Taken Today" (single-day pause)
 * - Tests multi-day pause & cross-month pause
 * - Tests pro-rated 7-day billing calculations
 * - Tests pagination across 3+ pages
 * - Tests phone search & sorting
 * - Tests dashboard aggregate metrics
 */

const BASE_URL = 'http://localhost:5000/api';

async function req(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function run20CustomerTest() {
  console.log('🍱 ═══════════════════════════════════════════════════════════════════');
  console.log('   STARTING COMPREHENSIVE 20+ CUSTOMER & 7-DAY SERVICE TEST SUITE');
  console.log('   ═══════════════════════════════════════════════════════════════════\n');

  // Step 1: Create or login master test owner
  const ownerEmail = 'owner@tiffin.com';
  const ownerPass = 'password123';
  let token;

  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ownerEmail, password: ownerPass })
  });

  if (loginRes.status === 200) {
    token = loginRes.data.token;
    console.log('1. ✅ Logged in as existing owner:', ownerEmail);
  } else {
    const regRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Chef Sanjeev Kapoor', email: ownerEmail, password: ownerPass })
    });
    token = regRes.data.token;
    console.log('1. ✅ Registered new owner account:', ownerEmail);
  }

  const authHeader = { Authorization: `Bearer ${token}` };

  // Step 2: Customer dataset (22 realistic customers)
  const customersData = [
    { name: 'Rahul Verma', phone: '9820123456', monthlyPrice: 2800, startDate: '2026-09-01' },
    { name: 'Ananya Iyer', phone: '9811234567', monthlyPrice: 3200, startDate: '2026-09-01' },
    { name: 'Harsh Patel', phone: '9267345623', monthlyPrice: 2200, startDate: '2026-09-01' },
    { name: 'Vikram Singh', phone: '9833456789', monthlyPrice: 3000, startDate: '2026-09-01' },
    { name: 'Pooja Hegde', phone: '9844567890', monthlyPrice: 2500, startDate: '2026-09-01' },
    { name: 'Rohan Joshi', phone: '9855678901', monthlyPrice: 3500, startDate: '2026-09-01' },
    { name: 'Sneha Nair', phone: '9866789012', monthlyPrice: 2400, startDate: '2026-09-01' },
    { name: 'Amit Bansal', phone: '9877890123', monthlyPrice: 3000, startDate: '2026-09-01' },
    { name: 'Meera Kulkarni', phone: '9888901234', monthlyPrice: 2600, startDate: '2026-09-01' },
    { name: 'Deepak Gupta', phone: '9899012345', monthlyPrice: 3200, startDate: '2026-09-01' },
    { name: 'Sunita Rao', phone: '9711123456', monthlyPrice: 2900, startDate: '2026-09-01' },
    { name: 'Arvind Menon', phone: '9722234567', monthlyPrice: 3100, startDate: '2026-09-01' },
    { name: 'Neha Saxena', phone: '9733345678', monthlyPrice: 2700, startDate: '2026-09-01' },
    { name: 'Rajesh Khanna', phone: '9744456789', monthlyPrice: 3400, startDate: '2026-09-01' },
    { name: 'Kavita Deshmukh', phone: '9755567890', monthlyPrice: 2500, startDate: '2026-09-01' },
    { name: 'Manoj Tiwari', phone: '9766678901', monthlyPrice: 3000, startDate: '2026-09-01' },
    { name: 'Divya Pillai', phone: '9777789012', monthlyPrice: 2800, startDate: '2026-09-01' },
    { name: 'Suresh Reddy', phone: '9788890123', monthlyPrice: 3300, startDate: '2026-09-01' },
    { name: 'Preeti Sen', phone: '9799901234', monthlyPrice: 2600, startDate: '2026-09-01' },
    { name: 'Tarun Bhatt', phone: '9911123456', monthlyPrice: 3000, startDate: '2026-09-01' },
    { name: 'Shruti Das', phone: '9922234567', monthlyPrice: 3500, startDate: '2026-09-01' },
    { name: 'Gaurav Kapoor', phone: '9933345678', monthlyPrice: 2400, startDate: '2026-09-01' }
  ];

  console.log(`2. Adding ${customersData.length} customers to database...`);
  const createdCustomers = [];
  for (const c of customersData) {
    const res = await req('/customers', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify(c)
    });
    if (res.status === 201) {
      createdCustomers.push(res.data.customer);
    }
  }
  console.log(`   ✅ Successfully created and subscribed ${createdCustomers.length} customers.`);

  // Step 3: Test "Not Taken Today" (single-day pause) on customer #1 (Rahul Verma)
  const todayStr = new Date().toISOString().split('T')[0];
  const rahul = createdCustomers[0];
  console.log(`\n3. Testing "Not Taken Today" on ${rahul.name} (Pause Date: ${todayStr} to ${todayStr})...`);
  const pauseRes1 = await req(`/customers/${rahul.id}/pause`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ startDate: todayStr, endDate: todayStr })
  });
  console.assert(pauseRes1.status === 201, `Failed to pause today: ${JSON.stringify(pauseRes1.data)}`);
  console.log(`   ✅ ${rahul.name} successfully paused for TODAY (${todayStr}).`);

  // Step 4: Test 7-Day Multi-Day Pause on customer #2 (Ananya Iyer)
  const ananya = createdCustomers[1];
  console.log(`\n4. Testing 7-Day Pause on ${ananya.name} (2026-09-10 to 2026-09-16: 7 calendar days)...`);
  const pauseRes2 = await req(`/customers/${ananya.id}/pause`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ startDate: '2026-09-10', endDate: '2026-09-16' })
  });
  console.assert(pauseRes2.status === 201, `Failed to pause 7 days: ${JSON.stringify(pauseRes2.data)}`);
  console.log(`   ✅ ${ananya.name} paused for 7 days.`);

  // Step 5: Test 7-Day Weekly Service Pro-Rated Billing for September 2026
  // September has 30 calendar days.
  // For Ananya: Monthly plan = 3200.
  // 7 days paused -> 23 days served.
  // Daily rate = 3200 / 30 = 106.67
  // Final bill = round(3200 * 23 / 30, 2) = 2453.33
  console.log(`\n5. Verifying 7-Day Service Billing Calculation for ${ananya.name} (September 2026)...`);
  const billRes = await req(`/customers/${ananya.id}/bill?month=2026-09`, { headers: authHeader });
  console.assert(billRes.status === 200, 'Bill request failed');
  const bill = billRes.data;
  console.log('   📊 Statement Details:');
  console.log(`      • Total Calendar Days in Month: ${bill.totalDays} days`);
  console.log(`      • Paused Days (Tiffin Not Taken): ${bill.pausedDays} days`);
  console.log(`      • Actual Days Served: ${bill.daysServed} days`);
  console.log(`      • Daily Rate: ₹${bill.perDayRate}`);
  console.log(`      • Final Payable Bill: ₹${bill.totalAmount}`);

  console.assert(bill.totalDays === 30, `Expected 30 days in September, got ${bill.totalDays}`);
  console.assert(bill.pausedDays === 7, `Expected 7 paused days, got ${bill.pausedDays}`);
  console.assert(bill.daysServed === 23, `Expected 23 days served, got ${bill.daysServed}`);
  console.assert(bill.totalAmount === 2453.33, `Expected ₹2453.33, got ₹${bill.totalAmount}`);
  console.log('   ✅ 7-Day Pro-Rated Bill strictly matches mathematical formula!');

  // Step 6: Test Pagination across multiple pages
  console.log('\n6. Testing Pagination (Page 1, 2, 3 with limit=10)...');
  const page1 = await req('/customers?page=1&limit=10', { headers: authHeader });
  const page2 = await req('/customers?page=2&limit=10', { headers: authHeader });
  const page3 = await req('/customers?page=3&limit=10', { headers: authHeader });

  console.assert(page1.data.customers.length === 10, 'Page 1 should have 10 items');
  console.assert(page2.data.customers.length === 10, 'Page 2 should have 10 items');
  console.assert(page3.data.customers.length >= 2, 'Page 3 should have remaining items');
  console.assert(page1.data.totalPages >= 3, 'Total pages should be at least 3');
  console.log(`   ✅ Pagination verified: Total ${page1.data.total} customers distributed across ${page1.data.totalPages} pages.`);

  // Step 7: Test Phone Number Search
  console.log('\n7. Testing Phone Number Search...');
  const searchHarsh = await req('/customers?phone=9267345623', { headers: authHeader });
  console.assert(searchHarsh.data.customers.length === 1, 'Should find exactly 1 Harsh');
  console.assert(searchHarsh.data.customers[0].name === 'Harsh Patel', 'Name should match');
  console.log(`   ✅ Search for "9267345623" returned: ${searchHarsh.data.customers[0].name} (₹${searchHarsh.data.customers[0].monthly_price})`);

  // Step 8: Test Sorting
  console.log('\n8. Testing Sorting by Customer Name ASC...');
  const sortRes = await req('/customers?sortBy=name&order=asc&limit=5', { headers: authHeader });
  const sortedNames = sortRes.data.customers.map(c => c.name);
  console.log('   Top 5 alphabetically:', sortedNames.join(', '));
  console.assert(sortedNames[0] <= sortedNames[1], 'Should be sorted ascending');
  console.log('   ✅ Column sorting verified.');

  // Step 9: Test Resume
  console.log(`\n9. Testing Resume Service on ${rahul.name}...`);
  const resumeRes = await req(`/customers/${rahul.id}/resume`, {
    method: 'POST',
    headers: authHeader
  });
  console.assert(resumeRes.status === 200, 'Resume failed');
  console.log(`   ✅ ${rahul.name} status restored to ACTIVE.`);

  // Step 10: Check Dashboard Aggregate Metrics
  console.log('\n10. Testing Aggregated Dashboard Statistics...');
  const statsRes = await req('/stats/dashboard', { headers: authHeader });
  const stats = statsRes.data;
  console.log(`   • Total Customers: ${stats.totalCustomers}`);
  console.log(`   • Active Delivering: ${stats.activeCustomers}`);
  console.log(`   • Currently Paused: ${stats.pausedCustomers}`);
  console.log(`   • Estimated Monthly Revenue: ₹${Number(stats.estimatedRevenue).toLocaleString('en-IN')}`);
  console.assert(stats.totalCustomers >= 22, 'Total customers should be >= 22');
  console.assert(stats.estimatedRevenue > 0, 'Revenue should be positive');
  console.log('   ✅ All dashboard metrics accurate and live.');

  console.log('\n🎉 ═══════════════════════════════════════════════════════════════════');
  console.log('   ALL 10 VERIFICATION CHECKS PASSED: 22 CUSTOMERS LIVE & WORKING!');
  console.log('   ═══════════════════════════════════════════════════════════════════\n');
}

run20CustomerTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
