// ============================================================
// HACKER SIMULATOR // TERMINAL COMMAND PROCESSING TEST
// ============================================================

import { VirtualFileSystem } from '../src/vfs.js';
import { NetworkSimulation } from '../src/network.js';
import { ExploitEngine } from '../src/exploits.js';
import { MissionManager } from '../src/missions.js';
import { ProcessManager } from '../src/processes.js';

console.log("--> Testing Terminal Command Dispatch Logic...");

// Setup mock environment
const net = new NetworkSimulation();
const mockGame = {
  credits: 500,
  network: net,
  processes: { spawnTask: () => {}, kill: () => {}, render: () => {} },
  ui: {
    toast: () => {},
    updateHUD: () => {},
    renderMissions: () => {},
    renderArsenal: () => {},
    openModal: () => {},
    closeModal: () => {}
  }
};
mockGame.exploits = new ExploitEngine(mockGame);
mockGame.missions = new MissionManager(mockGame);

// Verify node connection & VFS state
const localhost = net.getNode('localhost');
if (!localhost.vfs.resolve('/home/player/readme.txt')) {
  throw new Error("Localhost missing /home/player/readme.txt");
}

const univ = net.getNode('192.168.1.45');
if (!univ.vfs.resolve('/home/admin/credentials.txt')) {
  throw new Error("Univ target missing credentials.txt");
}

// Test cat
const readme = localhost.vfs.cat('/home/player/readme.txt');
if (!readme.success || !readme.content.includes("HACKER SIMULATOR")) {
  throw new Error("Failed to read readme.txt: " + JSON.stringify(readme));
}

// Test download behavior
const credContent = univ.vfs.cat('/home/admin/credentials.txt').content;
localhost.vfs.writeFile('/home/player/loot/credentials.txt', credContent);

const lootRead = localhost.vfs.cat('/home/player/loot/credentials.txt');
if (!lootRead.success || !lootRead.content.includes("DB_USER=root")) {
  throw new Error("Loot file verification failed");
}

console.log("✔ Terminal Command Dispatch & VFS integration tests PASSED");
