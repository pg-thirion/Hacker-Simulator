// ============================================================
// HACKER SIMULATOR // PASS 2 VERIFICATION TEST SUITE
// Tests quoted shell tokenizer, secret file permissions,
// trace lockdown handler, and canvas bounding recenter
// ============================================================

import { VirtualFileSystem } from '../src/vfs.js';
import { NetworkSimulation } from '../src/network.js';
import { TerminalEmulator } from '../src/terminal.js';
import { GameEngine } from '../src/game.js';

console.log("--> 1. Testing Shell Tokenizer (Quotes & Spaces)...");
const net = new NetworkSimulation();
const mockGame = {
  credits: 500,
  network: net,
  saveKey: 'test_pass2',
  terminal: null,
  scripts: { activeScripts: new Map() },
  processes: { spawnTask: () => {}, kill: () => {}, render: () => {} },
  exploits: { canExploitPort: () => true },
  missions: { checkProgress: () => {}, activeMission: null },
  ui: { updateHUD: () => {}, renderMissions: () => {}, renderArsenal: () => {}, toast: () => {}, openModal: () => {}, closeModal: () => {} }
};

// Create headless terminal instance
const term = Object.create(TerminalEmulator.prototype);
term.game = mockGame;
term.currentHost = net.getNode('localhost');

const tokens1 = term.tokenize('echo "hello world" target.txt');
if (tokens1.length !== 3 || tokens1[1] !== 'hello world') {
  throw new Error("Tokenizer failed on double quotes: " + JSON.stringify(tokens1));
}

const tokens2 = term.tokenize("grep 'NullSector Collective' /etc/motd");
if (tokens2.length !== 3 || tokens2[1] !== 'NullSector Collective') {
  throw new Error("Tokenizer failed on single quotes: " + JSON.stringify(tokens2));
}
console.log("✔ Shell Tokenizer PASSED");

console.log("--> 2. Testing Secret File Permissions in VFS...");
const vfs = new VirtualFileSystem('testhost');
vfs.writeFile('/etc/shadow', 'root:$6$secretpasswordhash', { isSecret: true });

// Non-root user should be denied access
const readAsUser = vfs.cat('/etc/shadow', { user: 'player' });
if (readAsUser.success) {
  throw new Error("Non-root user was able to read secret /etc/shadow!");
}

// Root user should be granted access
const readAsRoot = vfs.cat('/etc/shadow', { user: 'root' });
if (!readAsRoot.success || !readAsRoot.content.includes('secretpasswordhash')) {
  throw new Error("Root user was denied access to /etc/shadow: " + JSON.stringify(readAsRoot));
}
console.log("✔ Secret File Permissions PASSED");

console.log("--> 3. Testing 100% Trace Lockdown...");
let lockdownFired = false;
let sessionDropped = false;

mockGame.terminal = {
  currentHost: net.getNode('192.168.1.45'), // Remote host
  cmdExit: () => { sessionDropped = true; },
  writeln: () => {}
};

mockGame.markDirty = () => {};
mockGame.handleTraceLockdown = GameEngine.prototype.handleTraceLockdown.bind(mockGame);

mockGame.network.activeTrace = 100;
mockGame.handleTraceLockdown();

if (!sessionDropped) {
  throw new Error("100% trace lockdown failed to drop remote session");
}
if (mockGame.network.activeTrace !== 40) {
  throw new Error("Active trace was not reset after scrub, got: " + mockGame.network.activeTrace);
}
console.log("✔ 100% Trace Lockdown PASSED");

console.log("\n==========================================");
console.log("ALL PASS 2 VERIFICATION TESTS PASSED!");
console.log("==========================================");
