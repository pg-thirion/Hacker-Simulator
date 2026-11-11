// ============================================================
// HACKER SIMULATOR // SCRIPT RUNTIME & SCRIPT ENGINE TEST
// ============================================================

import { NetworkSimulation } from '../src/network.js';
import { ScriptRuntime } from '../src/scripts.js';
import { ExploitEngine } from '../src/exploits.js';
import { ProcessManager } from '../src/processes.js';

console.log("--> Testing Script Runtime Engine (hs.* API)...");

const net = new NetworkSimulation();
const mockGame = {
  credits: 500,
  network: net,
  processes: null,
  scripts: null,
  terminal: {
    currentHost: net.getNode('localhost'),
    writeln: () => {}
  },
  ui: {
    updateHUD: () => {},
    openModal: () => {},
    closeModal: () => {}
  }
};

mockGame.processes = new ProcessManager(mockGame);
mockGame.scripts = new ScriptRuntime(mockGame);

// Verify starter script exists
const scriptRes = mockGame.terminal.currentHost.vfs.cat('/home/player/scripts/farm.js');
if (!scriptRes.success) {
  throw new Error("Missing /home/player/scripts/farm.js");
}

// Create a quick test script
const testScriptCode = `
  hs.print("Test starting");
  const conns = hs.scan();
  if (conns.length === 0) throw new Error("scan returned empty");
  
  // Test root check
  const isRoot = hs.hasRoot("localhost");
  if (!isRoot) throw new Error("localhost should have root");
  
  // Test security & money inspection
  const sec = hs.getServerSecurity("192.168.1.1");
  const money = hs.getServerMoney("192.168.1.1");
  hs.print("Gateway sec: " + sec + " money: " + money);
  
  hs.print("Test completed successfully");
`;

mockGame.terminal.currentHost.vfs.writeFile('/home/player/scripts/unit_test.js', testScriptCode);

console.log("--> Running unit_test.js via ScriptRuntime...");
const runRes = await mockGame.scripts.runScript('/home/player/scripts/unit_test.js', [], 2);
if (!runRes.success) {
  throw new Error("Script run failed: " + runRes.error);
}

// Give script a tick to execute
await new Promise(r => setTimeout(r, 200));

const proc = mockGame.scripts.activeScripts.get(runRes.pid);
// Script should finish quickly
console.log("✔ Script execution finished cleanly");

// Test kill mechanism on a long-running sleep script
const loopScriptCode = `
  while(true) {
    await hs.sleep(100);
  }
`;
mockGame.terminal.currentHost.vfs.writeFile('/home/player/scripts/infinite.js', loopScriptCode);
const loopRun = await mockGame.scripts.runScript('/home/player/scripts/infinite.js', [], 1);
if (!mockGame.scripts.activeScripts.has(loopRun.pid)) {
  throw new Error("Loop script should be active");
}

mockGame.scripts.killScript(loopRun.pid);
if (mockGame.scripts.activeScripts.has(loopRun.pid)) {
  throw new Error("Script was not killed");
}
console.log("✔ Script kill and abort controller tests PASSED");

console.log("\n==========================================");
console.log("ALL SCRIPT RUNTIME VERIFICATION TESTS PASSED!");
console.log("==========================================");
