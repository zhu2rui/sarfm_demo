// Test script to verify Content-Type checking logic

// Simulate different Content-Type headers from backend
const testContentTypes = [
  'text/csv',
  'text/csv; charset=utf-8',
  'text/csv;charset=utf-8',
  'application/json',
  'text/plain'
];

console.log('Testing Content-Type checking logic:\n');

// Test 1: Original strict equality check (broken)
console.log('1. Original strict equality check:');
for (const contentType of testContentTypes) {
  const isCsv = contentType === 'text/csv';
  console.log(`${contentType}: ${isCsv ? '✅ CSV' : '❌ Not CSV'}`);
}

// Test 2: Fixed check using includes()
console.log('\n2. Fixed check using includes():');
for (const contentType of testContentTypes) {
  const isCsv = contentType && contentType.includes('text/csv');
  console.log(`${contentType}: ${isCsv ? '✅ CSV' : '❌ Not CSV'}`);
}

// Test 3: Current backend Content-Type
console.log('\n3. Current backend Content-Type:');
const currentBackendContentType = 'text/csv; charset=utf-8';
const originalCheck = currentBackendContentType === 'text/csv';
const fixedCheck = currentBackendContentType && currentBackendContentType.includes('text/csv');
console.log(`Backend returns: "${currentBackendContentType}"`);
console.log(`Original check result: ${originalCheck} (${originalCheck ? '✅ Correct' : '❌ Incorrect'})`);
console.log(`Fixed check result: ${fixedCheck} (${fixedCheck ? '✅ Correct' : '❌ Incorrect'})`);

console.log('\nConclusion:');
if (!originalCheck && fixedCheck) {
  console.log('✅ The fix resolves the Content-Type mismatch issue!');
} else {
  console.log('❌ The fix is not working as expected.');
}
