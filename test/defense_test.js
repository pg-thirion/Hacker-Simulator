// ============================================================
// HACKER SIMULATOR // TASK 2 TEST: ACTIVE BLUE TEAM AI DEFENSE
// ============================================================

import { NetworkSimulation } from '../src/network.js';
import { BlueTeamDefense } from '../src/defense.js';

console.log("--> Testing Active Blue Team AI Defense & DEFCON Engine...");

const net = new NetworkSimulation();
let killedPids = [];
let toasted = [];

const mockGame = {
  network: net,
  credits: 500,
  terminal: { writeln: () => {} },
  processes: {
    tasks: [],
    kill: (pid) => { killedPids.push(pid); }
  },
  scripts: {
    activeScripts: new Map(),
    killScript: (pid) => { killedPids.push(pid); }
  },
  ui: {
    toast: (msg, type) => toasted.push({ msg, type }),
    updateHUD: () => {}
  },
  markDirty: () => {}
};

const defense = new BlueTeamDefense(mockGame);

// 1. Initial DEFCON Status
const corpNode = net.getNode('corp-dmz');
if (defense.getNodeDefcon(corpNode.id) !== 5) {
  throw new Error("Initial DEFCON should be 5, got: " + defense.getNodeDefcon(corpNode.id));
}
console.log("✔ Initial DEFCON level verified");

// 2. Alert Escalation (5 -> 3 -> 1)
defense.escalateAlert(corpNode.id, "Failed SSH brute-force detected");
if (defense.getNodeDefcon(corpNode.id) !== 3) {
  throw new Error("Failed brute force should escalate to DEFCON 3, got: " + defense.getNodeDefcon(corpNode.id));
}

defense.escalateAlert(corpNode.id, "Root compromise / Honeypot tripwire");
if (defense.getNodeDefcon(corpNode.id) !== 1) {
  throw new Error("Honeypot should escalate to DEFCON 1, got: " + defense.getNodeDefcon(corpNode.id));
}
console.log("✔ DEFCON state escalation verified");

// 3. Trace Surge Multiplier at DEFCON 1
const surgeMultiplier = defense.getTraceMultiplier(corpNode.id);
if (surgeMultiplier !== 2.5) {
  throw new Error("DEFCON 1 trace multiplier expected 2.5 (+150%), got: " + surgeMultiplier);
}
console.log("✔ Trace surge multiplier verified");

// 4. Process Hunter (Sysadmin sweeps and terminates rogue scripts on DEFCON 1 host)
mockGame.scripts.activeScripts.set(9901, {
  pid: 9901,
  name: 'farm.js',
  host: corpNode,
  threads: 2
});

// Tick defense by 15s to trigger sysadmin patrol sweep
defense.tickDefense(15);
if (!killedPids.includes(9901)) {
  throw new Error("Sysadmin failed to kill unauthorized script on DEFCON 1 node");
}
console.log("✔ Sysadmin rogue process hunting verified");

// 5. Persistent Backdoor Installation
corpNode.hasRoot = true;
const backdoorRes = defense.installBackdoor(corpNode.id);
if (!backdoorRes.success) {
  throw new Error("Failed to install persistent backdoor: " + backdoorRes.message);
}
if (!defense.hasBackdoor(corpNode.id)) {
  throw new Error("Backdoor status not registered for node");
}
console.log("✔ Persistent backdoor installation verified");

// 6. Serialization & Deserialization
const savedDefenses = defense.serialize();
const newDefense = new BlueTeamDefense(mockGame);
newDefense.deserialize(savedDefenses);

if (newDefense.getNodeDefcon(corpNode.id) !== 1 || !newDefense.hasBackdoor(corpNode.id)) {
  throw new Error("Failed to deserialize defense state accurately");
}
console.log("✔ Defense engine serialization verified");

console.log("\n==========================================");
console.log("ALL TASK 2 DEFENSE TESTS PASSED!");
console.log("==========================================");
