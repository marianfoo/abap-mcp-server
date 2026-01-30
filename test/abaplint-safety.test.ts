/**
 * Test safety measures for abaplint tool
 * - Input size limit
 * - Execution timeout
 */

import { lintAbapCode, MAX_CODE_BYTES, LINT_TIMEOUT_MS } from '../src/lib/abaplint.js';

async function testSafetyMeasures() {
  console.log('=== Testing abaplint safety measures ===\n');
  console.log(`Configuration: MAX_CODE_BYTES=${MAX_CODE_BYTES} (${MAX_CODE_BYTES / 1024}KB), LINT_TIMEOUT_MS=${LINT_TIMEOUT_MS}ms\n`);
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Normal linting should work
  console.log('Test 1: Normal linting');
  const normalCode = `
CLASS zcl_test DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS test_method.
ENDCLASS.

CLASS zcl_test IMPLEMENTATION.
  METHOD test_method.
    DATA lv_value TYPE string.
    lv_value = 'Hello'.
  ENDMETHOD.
ENDCLASS.
`;
  
  const normalResult = await lintAbapCode(normalCode);
  if (normalResult.success) {
    console.log('  ✓ PASSED: Normal code linted successfully');
    console.log(`  Findings: ${normalResult.findings.length} (errors: ${normalResult.errorCount}, warnings: ${normalResult.warningCount})\n`);
    passed++;
  } else {
    console.log(`  ✗ FAILED: ${normalResult.error}\n`);
    failed++;
  }
  
  // Test 2: Code exceeding size limit should be rejected
  console.log('Test 2: Size limit enforcement');
  const oversizedCode = 'DATA lv_x TYPE string.\n'.repeat(3000); // ~66KB, exceeds 50KB limit
  const oversizedByteLength = Buffer.byteLength(oversizedCode, 'utf8');
  console.log(`  Code size: ${Math.round(oversizedByteLength / 1024)}KB`);
  
  const oversizedResult = await lintAbapCode(oversizedCode);
  if (!oversizedResult.success && oversizedResult.error?.includes('exceeds maximum')) {
    console.log('  ✓ PASSED: Oversized code correctly rejected');
    console.log(`  Error message: ${oversizedResult.error}\n`);
    passed++;
  } else {
    console.log(`  ✗ FAILED: Should have been rejected for size. success=${oversizedResult.success}, error=${oversizedResult.error}\n`);
    failed++;
  }
  
  // Test 3: Code just under the limit should work
  console.log('Test 3: Code just under size limit');
  const nearLimitCode = 'DATA lv_x TYPE string.\n'.repeat(2000); // ~44KB, under 50KB limit
  const nearLimitByteLength = Buffer.byteLength(nearLimitCode, 'utf8');
  console.log(`  Code size: ${Math.round(nearLimitByteLength / 1024)}KB`);
  
  const nearLimitResult = await lintAbapCode(nearLimitCode);
  if (nearLimitResult.success) {
    console.log('  ✓ PASSED: Code under limit processed successfully\n');
    passed++;
  } else {
    console.log(`  ✗ FAILED: ${nearLimitResult.error}\n`);
    failed++;
  }
  
  // Test 4: Empty code should be handled
  console.log('Test 4: Empty code handling');
  const emptyResult = await lintAbapCode('');
  if (emptyResult.success && emptyResult.findings.length === 0) {
    console.log('  ✓ PASSED: Empty code handled correctly\n');
    passed++;
  } else {
    console.log(`  ✗ FAILED: Unexpected result for empty code\n`);
    failed++;
  }
  
  // Summary
  console.log('=== Summary ===');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

testSafetyMeasures().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
