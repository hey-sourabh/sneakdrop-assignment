/**
 * Concurrent Load Test — SneakDrop
 *
 * Simulates 100 users clicking "Buy" simultaneously.
 * Verifies that EXACTLY 20 succeed and 80 are rejected,
 * even under full concurrency. This proves the atomic Lua
 * stock decrement prevents overselling.
 *
 * Usage:
 *   node test-load.js
 *
 * Prerequisites:
 *   - Server running on localhost:3001
 *   - Redis running on localhost:6379
 *   - Run "Reset" first (or stock must be 20)
 */

const BASE_URL = 'http://localhost:3001/api';
const TOTAL_USERS = 100;
const EXPECTED_STOCK = 20;

async function resetSystem() {
  const res = await fetch(`${BASE_URL}/reset`, { method: 'POST' });
  const data = await res.json();
  if (!data.success) throw new Error('Reset failed');
  console.log('✅ System reset — stock=20\n');
}

async function buyAttempt(userId) {
  try {
    const res = await fetch(`${BASE_URL}/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    return { userId, success: data.success, reason: data.reason, outOfStock: data.outOfStock };
  } catch (err) {
    return { userId, success: false, reason: `Network error: ${err.message}` };
  }
}

async function getStock() {
  const res = await fetch(`${BASE_URL}/status/probe_user`);
  const data = await res.json();
  return data.stock;
}

async function runTest() {
  console.log('='.repeat(60));
  console.log('  SneakDrop — Concurrent Load Test');
  console.log('='.repeat(60));
  console.log(`  Simulating ${TOTAL_USERS} simultaneous "Buy" requests`);
  console.log(`  Expected: exactly ${EXPECTED_STOCK} succeed, ${TOTAL_USERS - EXPECTED_STOCK} fail`);
  console.log('='.repeat(60) + '\n');

  // Reset first
  await resetSystem();

  // Verify initial stock
  const stockBefore = await getStock();
  console.log(`Stock before test: ${stockBefore}`);
  if (stockBefore !== EXPECTED_STOCK) {
    console.error(`❌ Expected stock ${EXPECTED_STOCK}, got ${stockBefore}. Aborting.`);
    process.exit(1);
  }

  // Fire all 100 requests simultaneously
  console.log(`\n🚀 Firing ${TOTAL_USERS} concurrent requests...\n`);
  const startTime = Date.now();

  const promises = Array.from({ length: TOTAL_USERS }, (_, i) =>
    buyAttempt(`loadtest_user_${i}`)
  );
  const results = await Promise.all(promises);

  const elapsed = Date.now() - startTime;

  // Tally results
  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const outOfStock = results.filter((r) => r.outOfStock);
  const otherFailures = failed.filter((r) => !r.outOfStock);

  // Verify final Redis stock
  const stockAfter = await getStock();

  console.log('='.repeat(60));
  console.log('  Results');
  console.log('='.repeat(60));
  console.log(`  Total requests:     ${TOTAL_USERS}`);
  console.log(`  Succeeded (holds):  ${succeeded.length}`);
  console.log(`  Failed (no stock):  ${outOfStock.length}`);
  console.log(`  Other failures:     ${otherFailures.length}`);
  console.log(`  Stock after:        ${stockAfter}`);
  console.log(`  Time elapsed:       ${elapsed}ms`);
  console.log('='.repeat(60) + '\n');

  // Assertions
  let passed = true;

  if (succeeded.length !== EXPECTED_STOCK) {
    console.error(`❌ FAIL: Expected ${EXPECTED_STOCK} successful holds, got ${succeeded.length}`);
    console.error('   This means the system is OVERSELLING or UNDERSELLING!');
    passed = false;
  } else {
    console.log(`✅ PASS: Exactly ${EXPECTED_STOCK} holds granted (no overselling)`);
  }

  if (stockAfter !== 0) {
    console.error(`❌ FAIL: Expected Redis stock=0 after ${EXPECTED_STOCK} holds, got ${stockAfter}`);
    passed = false;
  } else {
    console.log(`✅ PASS: Redis stock correctly shows 0`);
  }

  if (otherFailures.length > 0) {
    console.error(`❌ FAIL: ${otherFailures.length} unexpected failures:`);
    otherFailures.forEach((r) => console.error(`   - ${r.userId}: ${r.reason}`));
    passed = false;
  } else {
    console.log(`✅ PASS: All failures were clean "out of stock" rejections`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(passed ? '  🎉 ALL TESTS PASSED' : '  ❌ TESTS FAILED');
  console.log('='.repeat(60) + '\n');

  // Cleanup
  await resetSystem();

  process.exit(passed ? 0 : 1);
}

runTest().catch((err) => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
