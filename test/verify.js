// ============================================================
// HACKER SIMULATOR // UNIT & COMPONENT VERIFICATION TEST
// ============================================================

import { VirtualFileSystem } from '../src/vfs.js';
import { NetworkSimulation } from '../src/network.js';
import { ExploitEngine, TOOLS_CATALOG } from '../src/exploits.js';
import { STORY_MISSIONS, MissionManager } from '../src/missions.js';

console.log("--> Testing Virtual File System (VFS)...");
const vfs = new VirtualFileSystem('testhost');
vfs.mkdir('/var');
vfs.mkdir('/var/log');
vfs.writeFile('/var/log/auth.log', 'session opened for user root');

const readRes = vfs.cat('/var/log/auth.log');
if (!readRes.success || readRes.content !== 'session opened for user root') {
  throw new Error("VFS cat failed: " + JSON.stringify(readRes));
}

vfs.cd('/var');
if (vfs.pwd() !== '/var') {
  throw new Error("VFS cd failed, pwd is: " + vfs.pwd());
}

const lsRes = vfs.ls();
if (!lsRes.success || !lsRes.entries.some(e => e.name === 'log')) {
  throw new Error("VFS ls failed: " + JSON.stringify(lsRes));
}

const acMatches = vfs.autocomplete('l');
if (!acMatches.includes('log/')) {
  throw new Error("VFS autocomplete failed: " + JSON.stringify(acMatches));
}
console.log("✔ VFS tests PASSED");

console.log("--> Testing Network Simulation...");
const net = new NetworkSimulation();
if (net.nodes.size !== 9) {
  throw new Error(`Expected 9 network nodes, got ${net.nodes.size}`);
}

const localhost = net.getNode('localhost');
const targetUniv = net.getNode('192.168.1.45');
if (!localhost || !targetUniv) {
  throw new Error("Failed to resolve network nodes by ID or IP");
}

if (!targetUniv.ports[21] || !targetUniv.ports[21].open) {
  throw new Error("Target University does not have port 21 FTP open");
}

let packetReceived = false;
net.onPacketCallback = (p) => { packetReceived = true; };
for (let i = 0; i < 20; i++) {
  net.tickPackets();
}
console.log("✔ Network Simulation tests PASSED");

console.log("--> Testing Exploit Engine & Tools...");
const mockGame = {
  credits: 1000,
  ui: { toast: () => {}, updateHUD: () => {}, renderArsenal: () => {}, openModal: () => {}, closeModal: () => {} },
  network: net
};
const exploits = new ExploitEngine(mockGame);
if (!exploits.isToolUnlocked('nmap_scanner')) {
  throw new Error("nmap_scanner should be unlocked by default");
}
if (!exploits.canExploitPort(21)) {
  throw new Error("ftp_bounce should be unlocked for port 21 by default");
}
exploits.unlockTool('ssh_brute');
if (!exploits.canExploitPort(22)) {
  throw new Error("ssh_brute should allow port 22 exploit");
}
console.log("✔ Exploit Engine tests PASSED");

console.log("--> Testing Missions Manager...");
mockGame.exploits = exploits;
const missions = new MissionManager(mockGame);
mockGame.missions = missions;

if (!missions.activeMission || missions.activeMission.id !== 'M-01') {
  throw new Error("Initial active mission should be M-01");
}

// Simulate scan progress
missions.checkProgress('scan', { ip: '192.168.1.45' });
const scanObj = missions.activeMission.objectives.find(o => o.id === 'scan_univ');
if (!scanObj.completed) {
  throw new Error("Mission scan objective did not complete");
}

// Simulate crack progress
missions.checkProgress('root', { ip: '192.168.1.45' });
// Simulate download progress
missions.checkProgress('download', { file: 'credentials.txt', content: 'test' });

if (!missions.activeMission.completed) {
  throw new Error("Mission M-01 should be completed after all objectives are met");
}
console.log("✔ Mission Manager tests PASSED");

console.log("\n==========================================");
console.log("ALL SUB-SYSTEM VERIFICATION TESTS PASSED!");
console.log("==========================================");
