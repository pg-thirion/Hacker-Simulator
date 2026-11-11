// ============================================================
// HACKER SIMULATOR // TUTORIAL & ACCESSIBILITY TESTS
// ============================================================

import { NetworkSimulation } from '../src/network.js';
import { ExploitEngine } from '../src/exploits.js';
import { MissionManager } from '../src/missions.js';
import { ProcessManager } from '../src/processes.js';
import { ScriptRuntime } from '../src/scripts.js';
import { TutorialManager } from '../src/tutorial.js';

console.log("--> Testing Beginner Tutorial Engine...");

const net = new NetworkSimulation();
const mockGame = {
  credits: 100,
  network: net,
  processes: null,
  scripts: null,
  terminal: {
    currentHost: net.getNode('localhost'),
    writeln: () => {},
    executeCommandLine: (cmd) => { executedCmds.push(cmd); }
  },
  ui: {
    updateHUD: () => {},
    toast: () => {},
    openModal: () => {},
    closeModal: () => {}
  }
};

const executedCmds = [];
mockGame.processes = new ProcessManager(mockGame);
mockGame.scripts = new ScriptRuntime(mockGame);
mockGame.tutorial = new TutorialManager(mockGame);

if (mockGame.tutorial.steps.length < 5) {
  throw new Error("Tutorial has fewer than 5 steps");
}

// Test step contents
mockGame.tutorial.steps.forEach((step, idx) => {
  if (!step.title || !step.body || !step.actionBtnText) {
    throw new Error(`Tutorial step ${idx} missing required attributes`);
  }
});

console.log(`✔ Verified ${mockGame.tutorial.steps.length} interactive walkthrough steps`);
console.log("\n==========================================");
console.log("ALL TUTORIAL TESTS PASSED!");
console.log("==========================================");
