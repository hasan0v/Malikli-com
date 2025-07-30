// Simple test for EMS calculation
const { getEMSShippingMethod, calculateEMSShipping } = require('./src/utils/emsShippingCalculator.ts');

console.log('Testing EMS calculation...');

// Test with Australia (AU -> Australia)
console.log('\n=== Testing Australia ===');
const australiaMethod = getEMSShippingMethod('Australia', 2, 100);
console.log('Australia result:', australiaMethod);

// Test with United States (US -> United States)  
console.log('\n=== Testing United States ===');
const usMethod = getEMSShippingMethod('United States', 2, 100);
console.log('US result:', usMethod);

// Test with calculation function directly
console.log('\n=== Direct calculation test ===');
const calculation = calculateEMSShipping('Australia', { itemCount: 2, declaredValue: 100 });
console.log('Direct calculation:', calculation);
