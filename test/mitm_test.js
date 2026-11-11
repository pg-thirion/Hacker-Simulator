// ============================================================
// HACKER SIMULATOR // TASK 3 TEST: DEEP PACKET INSPECTION & MITM
// ============================================================

import { NetworkSimulation } from '../src/network.js';

console.log("--> Testing Deep Packet Inspection & MITM Forgery...");

const net = new NetworkSimulation();
const mockGame = {
  network: net,
  missions: { checkProgress: () => {} },
  ui: { toast: () => {} }
};
net.game = mockGame;

// 1. Packet Generation with Auth Payloads
const univNode = net.getNode('192.168.1.45');
univNode.isDiscovered = true;
univNode.hasRoot = false;

// Inject synthetic auth packet into simulation
const packetId = net.addPacket({
  src: '192.168.1.1',
  dest: '192.168.1.45',
  proto: 'HTTP',
  len: 342,
  info: 'POST /api/v1/auth [BEARER_TOKEN]',
  payload: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123\r\nHost: 192.168.1.45\r\nUser-Agent: curl/7.88.1'
});

if (!packetId) {
  throw new Error("Failed to add packet to simulation");
}

// 2. Deep Packet Inspection & Payload Parsing
const inspected = net.getPacketDetails(packetId);
if (!inspected || !inspected.hexDump || !inspected.asciiDump) {
  throw new Error("getPacketDetails missing hex/ascii representation: " + JSON.stringify(inspected));
}
if (!inspected.asciiDump.includes('Bearer eyJhbGciOi')) {
  throw new Error("Inspected ASCII payload does not contain auth token");
}
console.log("✔ Deep packet inspection & hex parsing verified");

// 3. MITM Packet Forgery Action
const forgeResult = net.forgeAuthPacket(packetId);
if (!forgeResult.success) {
  throw new Error("Packet forgery failed: " + forgeResult.message);
}
if (!univNode.hasRoot) {
  throw new Error("Forged packet did not compromise destination node root privileges");
}
console.log("✔ MITM packet replay & authentication bypass verified");

// 4. Non-Auth Packet Replay Rejection
const rawPacketId = net.addPacket({
  src: '192.168.1.1',
  dest: '192.168.1.45',
  proto: 'DNS',
  len: 64,
  info: 'Standard query 0x1a2b A router.local',
  payload: 'DNS query response standard'
});

const invalidForge = net.forgeAuthPacket(rawPacketId);
if (invalidForge.success) {
  throw new Error("Non-auth packet should not have succeeded in forgery");
}
console.log("✔ Invalid packet forgery rejection verified");

console.log("\n==========================================");
console.log("ALL TASK 3 MITM TESTS PASSED!");
console.log("==========================================");
