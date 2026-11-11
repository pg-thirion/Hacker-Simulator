// ============================================================
// HACKER SIMULATOR // TASK 5 TEST: HEX DISASSEMBLER & ZERO-DAY
// ============================================================

import { NetworkSimulation } from '../src/network.js';
import { ExploitEngine } from '../src/exploits.js';
import { TerminalEmulator } from '../src/terminal.js';

console.log("--> Testing Hex Disassembler & Zero-Day Exploit Engine (r2)...");

const net = new NetworkSimulation();

// ------------------------------------------------------------
// 1. VFS Binary Placement Tests
// ------------------------------------------------------------
// Check Corp DMZ node for auth_daemon
const corpNode = net.getNode('corp-dmz');
if (!corpNode) throw new Error("corp-dmz node not found in network");
const authDaemon = corpNode.vfs.resolve('/opt/chimera/bin/auth_daemon');
if (!authDaemon) throw new Error("Missing /opt/chimera/bin/auth_daemon on corp-dmz");
if (authDaemon.type !== 'file') throw new Error("/opt/chimera/bin/auth_daemon is not a file");
if (!authDaemon.isSecret) throw new Error("/opt/chimera/bin/auth_daemon missing isSecret flag");
if (!authDaemon.content.includes('FLAG{CHIMERA_AUTH_DAEMON_0DAY_PWNED}')) {
  throw new Error("/opt/chimera/bin/auth_daemon missing secret flag content");
}

// Check Bank node for transaction_verifier
const bankNode = net.getNode('shadow-bank');
if (!bankNode) throw new Error("shadow-bank node not found in network");
const txVerifier = bankNode.vfs.resolve('/home/finance/transaction_verifier');
if (!txVerifier) throw new Error("Missing /home/finance/transaction_verifier on shadow-bank");
if (txVerifier.type !== 'file') throw new Error("/home/finance/transaction_verifier is not a file");
if (!txVerifier.isSecret) throw new Error("/home/finance/transaction_verifier missing isSecret flag");

// Check Apex Airgap node for guidance_core
const apexNode = net.getNode('apex-airgap');
if (!apexNode) throw new Error("apex-airgap node not found in network");
const guidanceCore = apexNode.vfs.resolve('/defense/killswitch/guidance_core');
if (!guidanceCore) throw new Error("Missing /defense/killswitch/guidance_core on apex-airgap");
if (guidanceCore.type !== 'file') throw new Error("/defense/killswitch/guidance_core is not a file");
if (!guidanceCore.isSecret) throw new Error("/defense/killswitch/guidance_core missing isSecret flag");

console.log("✔ VFS binary placeholders & secret flags verified");

// ------------------------------------------------------------
// 2. Disassembler Output & Structure Tests
// ------------------------------------------------------------
let toastMessages = [];
const mockGame = {
  network: net,
  ui: {
    toast: (msg, type) => toastMessages.push({ msg, type }),
    updateHUD: () => {},
    renderArsenal: () => {},
    openModal: () => {},
    closeModal: () => {}
  },
  missions: {
    checkProgress: () => {}
  }
};

const exploits = new ExploitEngine(mockGame);

// Disassemble auth_daemon
const puzzle1 = exploits.createHexDisassemblerPuzzle(
  '/opt/chimera/bin/auth_daemon',
  () => {},
  () => {}
);

if (!puzzle1.disassembly) throw new Error("Puzzle missing disassembly output");
if (!puzzle1.disassembly.includes('0x08048420:') || !puzzle1.disassembly.includes('sub esp, 0x40')) {
  throw new Error("Disassembly missing memory addresses or stack allocation opcodes: " + puzzle1.disassembly);
}
if (!puzzle1.disassembly.includes('call strcpy') || !puzzle1.disassembly.includes('VULNERABLE BUFFER OVERFLOW')) {
  throw new Error("Disassembly missing vulnerable strcpy instruction annotation: " + puzzle1.disassembly);
}
if (puzzle1.targetOffset !== 64) {
  throw new Error(`Target offset should be 64 bytes, got ${puzzle1.targetOffset}`);
}
if (puzzle1.targetRegister !== '0xDEADBEEF') {
  throw new Error(`Target register should be 0xDEADBEEF, got ${puzzle1.targetRegister}`);
}

console.log("✔ Mock disassembly output and vulnerability annotations verified");

// ------------------------------------------------------------
// 3. Invalid Input Rejection Tests
// ------------------------------------------------------------
let failureCount = 0;
let successCount = 0;

const puzzleFail = exploits.createHexDisassemblerPuzzle(
  '/opt/chimera/bin/auth_daemon',
  () => { successCount++; },
  () => { failureCount++; }
);

// Incorrect offset: 32 bytes
const resFail1 = puzzleFail.submit(32);
if (resFail1.success !== false) throw new Error("Offset 32 should fail alignment");
if (failureCount !== 1) throw new Error("onFailure should be called on invalid offset");
if (exploits.isToolUnlocked('chimera_zero_day')) {
  throw new Error("chimera_zero_day should not be unlocked after failed alignment");
}

// Abort test
let aborted = false;
const puzzleAbort = exploits.createHexDisassemblerPuzzle(
  '/opt/chimera/bin/auth_daemon',
  () => {},
  () => { aborted = true; }
);
puzzleAbort.abort();
if (!aborted) throw new Error("Puzzle abort should trigger onFailure callback");

console.log("✔ Invalid input rejection & abort handling verified");

// ------------------------------------------------------------
// 4. Memory Alignment Solving & Zero-Day Arsenal Injection Tests
// ------------------------------------------------------------
// A. Chimera Zero-Day (Numeric input 64)
let unlockedToolChimera = null;
const puzzleChimera = exploits.createHexDisassemblerPuzzle(
  '/opt/chimera/bin/auth_daemon',
  (tool) => { unlockedToolChimera = tool; },
  () => { throw new Error("auth_daemon alignment failed unexpectedly"); }
);

const resChimera = puzzleChimera.submit(64);
if (!resChimera.success) throw new Error("Alignment with 64 failed");
if (!unlockedToolChimera || unlockedToolChimera.id !== 'chimera_zero_day') {
  throw new Error("Expected chimera_zero_day tool injection");
}
if (!exploits.isToolUnlocked('chimera_zero_day')) {
  throw new Error("chimera_zero_day not unlocked in exploit engine");
}
if (!exploits.canExploitPort(1337)) {
  throw new Error("chimera_zero_day should crack port 1337");
}

// B. Financial Zero-Day (Hex string input '0x40')
let unlockedToolBank = null;
const puzzleBank = exploits.createHexDisassemblerPuzzle(
  '/home/finance/transaction_verifier',
  (tool) => { unlockedToolBank = tool; },
  () => { throw new Error("transaction_verifier alignment failed unexpectedly"); }
);

const resBank = puzzleBank.submit('0x40');
if (!resBank.success) throw new Error("Alignment with '0x40' hex string failed");
if (!unlockedToolBank || unlockedToolBank.id !== 'financial_zero_day') {
  throw new Error("Expected financial_zero_day tool injection");
}
if (!exploits.isToolUnlocked('financial_zero_day')) {
  throw new Error("financial_zero_day not unlocked in exploit engine");
}
if (!exploits.canExploitPort(443)) {
  throw new Error("financial_zero_day should crack port 443");
}

// C. Apex Zero-Day (String input '64 bytes')
let unlockedToolApex = null;
const puzzleApex = exploits.createHexDisassemblerPuzzle(
  '/defense/killswitch/guidance_core',
  (tool) => { unlockedToolApex = tool; },
  () => { throw new Error("guidance_core alignment failed unexpectedly"); }
);

const resApex = puzzleApex.submit('64 bytes');
if (!resApex.success) throw new Error("Alignment with '64 bytes' string failed");
if (!unlockedToolApex || unlockedToolApex.id !== 'apex_zero_day') {
  throw new Error("Expected apex_zero_day tool injection");
}
if (!exploits.isToolUnlocked('apex_zero_day')) {
  throw new Error("apex_zero_day not unlocked in exploit engine");
}
if (!exploits.canExploitPort(8888)) {
  throw new Error("apex_zero_day should crack port 8888");
}

console.log("✔ Zero-Day exploit tool injection & port exploitability verified");

// ------------------------------------------------------------
// 5. Terminal Emulator `r2` & `radare2` Integration Tests
// ------------------------------------------------------------
const termLines = [];
const mockTermGame = {
  network: net,
  exploits: exploits,
  missions: { checkProgress: () => {} },
  ui: mockGame.ui
};

const term = new TerminalEmulator(mockTermGame);
term.writeln = (line, cls) => termLines.push({ line, cls });

// Check command registration
if (!term.commands.includes('r2')) throw new Error("r2 missing from terminal commands list");
if (!term.commands.includes('radare2')) throw new Error("radare2 missing from terminal commands list");

// Check man page
let manLines = [];
term.writeln = (line) => manLines.push(line);
term.cmdMan('r2');
if (!manLines.some(l => l.includes('r2 / radare2 - Hex Disassembler'))) {
  throw new Error("r2 man page missing or incorrect: " + manLines.join('\n'));
}

// Check usage on empty input
termLines.length = 0;
term.writeln = (line, cls) => termLines.push({ line, cls });
term.cmdR2();
if (!termLines.some(l => l.line.includes('usage: r2 [BINARY_FILE_PATH]'))) {
  throw new Error("cmdR2 without argument should display usage warning");
}

// Check non-existent binary
termLines.length = 0;
term.cmdR2('/usr/bin/not_found');
if (!termLines.some(l => l.line.includes('No such file or directory'))) {
  throw new Error("cmdR2 on missing file should display error");
}

// Connect to corp-dmz and run r2 on auth_daemon
term.currentHost = corpNode;
termLines.length = 0;
const r2Puzzle = term.cmdR2('/opt/chimera/bin/auth_daemon');
if (!r2Puzzle) throw new Error("cmdR2 did not return puzzle instance");
if (!termLines.some(l => l.line.includes('Opening binary in radare2'))) {
  throw new Error("cmdR2 did not output opening status message");
}

// Solve puzzle via r2 instance
r2Puzzle.submit(64);
if (!termLines.some(l => l.line.includes('Memory alignment confirmed! EIP hijacked: 0xDEADBEEF'))) {
  throw new Error("cmdR2 did not output EIP hijacked success message: " + JSON.stringify(termLines));
}

console.log("✔ Terminal r2 / radare2 command dispatch and session lifecycle verified");

console.log("\n==========================================");
console.log("ALL TASK 5 HEX DISASSEMBLER TESTS PASSED!");
console.log("==========================================");
