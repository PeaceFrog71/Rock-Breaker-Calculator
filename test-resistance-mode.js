// Manual test script to verify resistance mode functionality
import { calculateBreakability, deriveBaseResistance, calculateEffectiveResistance } from './src/utils/calculator.ts';
import { LASER_HEADS, GADGETS } from './src/types/index.ts';

console.log('=== Testing Resistance Mode Feature ===\n');

// Test 1: deriveBaseResistance function
console.log('Test 1: Reverse Calculation');
console.log('Given: Modified resistance = 21, Modifier = 0.7');
const derivedBase = deriveBaseResistance(21, 0.7);
console.log(`Result: Base resistance = ${derivedBase}`);
console.log(`Expected: 30`);
console.log(`Pass: ${Math.abs(derivedBase - 30) < 0.01 ? '✅' : '❌'}\n`);

// Test 2: Base mode (default behavior)
console.log('Test 2: Base Mode (Legacy Behavior)');
const rock1 = { mass: 25000, resistance: 30 };  // No resistanceMode = defaults to 'base'
const hofstede = LASER_HEADS.find(l => l.id === 'hofstede-s2');
const config1 = {
  lasers: [{ laserHead: hofstede, modules: [null, null] }]
};

const result1 = calculateBreakability(config1, rock1, []);
console.log(`Input: ${rock1.resistance} (base mode)`);
console.log(`Adjusted Resistance: ${result1.adjustedResistance}`);
console.log(`Expected: 21 (30 × 0.7)`);
console.log(`Pass: ${Math.abs(result1.adjustedResistance - 21) < 0.01 ? '✅' : '❌'}\n`);

// Test 3: Modified mode (new feature)
console.log('Test 3: Modified Mode (Reverse Calculation)');
const rock2 = {
  mass: 25000,
  resistance: 21,  // User scanned with laser, got modified value
  resistanceMode: 'modified'
};

const result2 = calculateBreakability(config1, rock2, []);
console.log(`Input: ${rock2.resistance} (modified mode)`);
console.log(`Derived Base: ${result2.resistanceContext.derivedBaseValue}`);
console.log(`Final Adjusted: ${result2.adjustedResistance}`);
console.log(`Expected Base: 30, Final: 21`);
console.log(`Pass: ${
  Math.abs(result2.resistanceContext.derivedBaseValue - 30) < 0.01 &&
  Math.abs(result2.adjustedResistance - 21) < 0.01 ? '✅' : '❌'
}\n`);

// Test 4: Round-trip consistency
console.log('Test 4: Round-Trip Consistency');
console.log('Base mode and Modified mode should produce same final result');
console.log(`Base mode LP needed: ${result1.adjustedLPNeeded.toFixed(2)}`);
console.log(`Modified mode LP needed: ${result2.adjustedLPNeeded.toFixed(2)}`);
console.log(`Pass: ${Math.abs(result1.adjustedLPNeeded - result2.adjustedLPNeeded) < 0.01 ? '✅' : '❌'}\n`);

// Test 5: With gadgets
console.log('Test 5: Modified Mode with Gadgets');
const sabir = GADGETS.find(g => g.id === 'sabir');  // 0.5x modifier
const rock3 = {
  mass: 25000,
  resistance: 10.5,  // 30 × 0.7 (Hofstede) × 0.5 (Sabir) = 10.5
  resistanceMode: 'modified'
};

const result3 = calculateBreakability(config1, rock3, [sabir]);
console.log(`Input: ${rock3.resistance} (with Hofstede 0.7x + Sabir 0.5x = 0.35x total)`);
console.log(`Derived Base: ${result3.resistanceContext.derivedBaseValue.toFixed(2)}`);
console.log(`Expected Base: 30`);
console.log(`Pass: ${Math.abs(result3.resistanceContext.derivedBaseValue - 30) < 0.01 ? '✅' : '❌'}\n`);

console.log('=== All Tests Complete ===');
