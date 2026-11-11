// ============================================================
// HACKER SIMULATOR // TASK 1 TEST: MODULAR CYBER-DECK RIG
// ============================================================

import { CyberDeck } from '../src/rig.js';

console.log("--> Testing CyberDeck Rig Architecture & Upgrades...");

const mockGame = {
  credits: 5000,
  terminal: { writeln: () => {} },
  markDirty: () => {}
};

const rig = new CyberDeck(mockGame);

// 1. Initial Default Specs
if (rig.getThreadsCapacity() !== 2) {
  throw new Error("Default CPU threads expected 2, got: " + rig.getThreadsCapacity());
}
if (rig.getMaxConcurrentScripts() !== 3) {
  throw new Error("Default RAM script limit expected 3, got: " + rig.getMaxConcurrentScripts());
}
if (rig.getTraceMultiplier() !== 1.0) {
  throw new Error("Default bouncer trace multiplier expected 1.0, got: " + rig.getTraceMultiplier());
}
console.log("✔ Default cyber-deck specs verified");

// 2. Hardware Market Listing
const market = rig.getMarketCatalog();
if (!market.cpu || market.cpu.length < 3) {
  throw new Error("Market missing CPU tiers");
}

// 3. Purchase Hardware Upgrade (Quad-Core i7: 8 threads, 1200 BTC)
const buyResult = rig.purchaseHardware('cpu_i7');
if (!buyResult.success) {
  throw new Error("Failed to purchase cpu_i7: " + buyResult.message);
}
if (mockGame.credits !== 3800) {
  throw new Error("Credits not deducted accurately. Expected 3800, got: " + mockGame.credits);
}
if (rig.getThreadsCapacity() !== 8) {
  throw new Error("Threads capacity not upgraded. Expected 8, got: " + rig.getThreadsCapacity());
}
console.log("✔ Hardware purchase & stat modifier verified");

// 4. Overclock Engine & Thermal Throttling
const initialOc = rig.toggleOverclock(true);
if (!initialOc || !rig.overclockActive) {
  throw new Error("Failed to activate overclock");
}

// Simulate thermal heat buildup to overheat threshold (100 C)
rig.tickThermal(60);
if (!rig.isThrottled) {
  throw new Error("Rig did not engage thermal throttling at 100C");
}
// When throttled, effective speed is halved (0.5x)
if (rig.getSpeedMultiplier() !== 0.5) {
  throw new Error("Throttled speed multiplier should be 0.5, got: " + rig.getSpeedMultiplier());
}
console.log("✔ Thermal overclocking & throttling loop verified");

// 5. Serialization & Deserialization
const savedData = rig.serialize();
const newRig = new CyberDeck(mockGame);
newRig.deserialize(savedData);
if (newRig.getThreadsCapacity() !== 8) {
  throw new Error("Deserialized rig failed to restore cpu_i7");
}
console.log("✔ Cyber-deck serialization verified");

console.log("\n==========================================");
console.log("ALL TASK 1 RIG TESTS PASSED!");
console.log("==========================================");
