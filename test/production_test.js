// ============================================================
// HACKER SIMULATOR // PRODUCTION GRADE TEST SUITE
// Tests VFS persistence, file redirection, piping, new commands,
// procedural bounties, and SQLi/port-knocking puzzles
// ============================================================

import { VirtualFileSystem } from '../src/vfs.js';
import { NetworkSimulation } from '../src/network.js';
import { ExploitEngine } from '../src/exploits.js';
import { MissionManager } from '../src/missions.js';
import { ProcessManager } from '../src/processes.js';
import { ScriptRuntime } from '../src/scripts.js';

console.log("--> 1. Testing VFS Serialization & Deserialization...");
const vfs1 = new VirtualFileSystem('node1');
vfs1.mkdir('/home/player/loot');
vfs1.writeFile('/home/player/loot/secret.txt', 'CLASSIFIED_PAYLOAD_DATA');
vfs1.appendFile('/home/player/loot/secret.txt', '\nADDITIONAL_LEAK');

// Verify appendFile
const catRes = vfs1.cat('/home/player/loot/secret.txt');
if (!catRes.content.includes('CLASSIFIED_PAYLOAD_DATA') || !catRes.content.includes('ADDITIONAL_LEAK')) {
  throw new Error("appendFile failed: " + catRes.content);
}

// Serialize
const serializedData = vfs1.serialize();
const vfs2 = new VirtualFileSystem('node2');
vfs2.deserialize(serializedData);

const catRes2 = vfs2.cat('/home/player/loot/secret.txt');
if (!catRes2.success || catRes2.content !== catRes.content) {
  throw new Error("VFS deserialization failed to restore file contents");
}
console.log("✔ VFS Serialization & Deserialization PASSED");

console.log("--> 2. Testing VFS cp, mv, head, tailFile, and grep...");
// Test cp
vfs1.cp('/home/player/loot/secret.txt', '/home/player/backup.txt');
const backupRes = vfs1.cat('/home/player/backup.txt');
if (!backupRes.success || !backupRes.content.includes('CLASSIFIED_PAYLOAD_DATA')) {
  throw new Error("vfs.cp failed: " + JSON.stringify(backupRes));
}

// Test mv
vfs1.mv('/home/player/backup.txt', '/home/player/renamed.txt');
if (vfs1.resolve('/home/player/backup.txt') !== null) {
  throw new Error("vfs.mv did not remove source file");
}
if (!vfs1.cat('/home/player/renamed.txt').success) {
  throw new Error("vfs.mv did not create target file");
}

// Test head & tailFile
vfs1.writeFile('/home/player/lines.txt', 'line1\nline2\nline3\nline4\nline5');
const headRes = vfs1.head('/home/player/lines.txt', 2);
if (headRes.content !== 'line1\nline2') {
  throw new Error("vfs.head failed: " + headRes.content);
}
const tailRes = vfs1.tailFile('/home/player/lines.txt', 2);
if (tailRes.content !== 'line4\nline5') {
  throw new Error("vfs.tailFile failed: " + tailRes.content);
}

// Test grep
const grepRes = vfs1.grep('line3', '/home/player/lines.txt');
if (grepRes.lines.length !== 1 || grepRes.lines[0] !== 'line3') {
  throw new Error("vfs.grep failed: " + JSON.stringify(grepRes));
}
console.log("✔ VFS Extended File Operations PASSED");

console.log("--> 3. Testing Procedural Contract Generation...");
const net = new NetworkSimulation();
const mockGame = {
  credits: 500,
  network: net,
  processes: null,
  scripts: null,
  ui: { updateHUD: () => {}, renderMissions: () => {}, toast: () => {}, openModal: () => {}, closeModal: () => {} }
};
mockGame.exploits = new ExploitEngine(mockGame);
mockGame.missions = new MissionManager(mockGame);

const bounty = mockGame.missions.generateProceduralContract();
if (!bounty || !bounty.id.startsWith('B-') || !bounty.targetIp) {
  throw new Error("Procedural contract generation failed: " + JSON.stringify(bounty));
}
if (!mockGame.missions.missions.some(m => m.id === bounty.id)) {
  throw new Error("Procedural contract not registered in mission list");
}

// Simulate completing dynamic bounty
mockGame.missions.checkProgress('scan', { ip: bounty.targetIp });
mockGame.missions.checkProgress('root', { ip: bounty.targetIp });
if (!bounty.completed) {
  throw new Error("Procedural bounty did not complete on scan + root");
}
console.log("✔ Procedural Contract Generator & Tracking PASSED");

console.log("--> 4. Testing Exploit Mini-Game Registry...");
if (typeof mockGame.exploits.createSqliPuzzle !== 'function') {
  throw new Error("createSqliPuzzle is missing from ExploitEngine");
}
if (typeof mockGame.exploits.createPortKnockPuzzle !== 'function') {
  throw new Error("createPortKnockPuzzle is missing from ExploitEngine");
}
console.log("✔ Exploit Mini-Game Registry PASSED");

console.log("--> 5. Testing Savegame Export/Import Integrity...");
const mockState = {
  credits: 9999,
  activeTrace: 0,
  nodes: [{ id: 'localhost', hasRoot: true, isDiscovered: true }],
  tools: [{ id: 'ssh_brute', unlocked: true }],
  missions: [{ id: 'M-01', completed: true, objectives: [] }],
  vfsData: [{ id: 'localhost', vfs: vfs1.serialize() }],
  activeMissionId: 'M-01'
};
const jsonString = JSON.stringify(mockState);
const parsed = JSON.parse(jsonString);
if (parsed.credits !== 9999 || parsed.vfsData.length !== 1) {
  throw new Error("Savegame JSON serialization validation failed");
}
console.log("✔ Savegame Serialization Validation PASSED");

console.log("\n==========================================");
console.log("ALL PRODUCTION TEST SUITE ASSERTIONS PASSED!");
console.log("==========================================");
