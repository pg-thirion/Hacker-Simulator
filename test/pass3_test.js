// ============================================================
// HACKER SIMULATOR // PASS 3 VERIFICATION TEST SUITE
// Tests terminal keyboard shortcuts (Ctrl+C, Ctrl+L, Ctrl+U),
// network autocomplete, clickable suggestion callbacks,
// volume stepper cycling, dynamic inspector buttons, and
// port knock sequence reset.
// ============================================================

import { VirtualFileSystem } from '../src/vfs.js';
import { NetworkSimulation } from '../src/network.js';
import { TerminalEmulator } from '../src/terminal.js';
import { sound } from '../src/audio.js';
import { UIManager } from '../src/ui.js';
import { ExploitEngine } from '../src/exploits.js';

console.log("--> 1. Testing Terminal Keyboard Shortcuts (Ctrl+C, Ctrl+L, Ctrl+U)...");
const net = new NetworkSimulation();
const mockGame = {
  credits: 500,
  network: net,
  saveKey: 'test_pass3',
  terminal: null,
  scripts: { activeScripts: new Map() },
  processes: { spawnTask: () => {}, kill: () => {}, render: () => {} },
  exploits: null,
  missions: { checkProgress: () => {}, activeMission: null },
  ui: null
};

// Create mock terminal instance
const term = Object.create(TerminalEmulator.prototype);
term.game = mockGame;
term.currentHost = net.getNode('localhost');
term.promptEl = { textContent: 'player@hackbox:~$' };
term.input = { value: 'scan 192.168.', focus: () => {} };
term.historyDraft = 'draft';
term.autocompleteBox = { classList: { add: (c) => {}, remove: (c) => {} }, innerHTML: '', appendChild: () => {} };
term.commands = ['help', 'scan', 'ssh', 'cat'];
let printedLines = [];
term.writeln = (t) => { printedLines.push(t); };
let cleared = false;
term.clear = () => { cleared = true; };
term.scrollToBottom = () => {};

// Test Ctrl+C
term.input.value = 'cat secret.txt';
term.handleKeyDown({ ctrlKey: true, key: 'c', preventDefault: () => {} });
if (term.input.value !== '') {
  throw new Error("Ctrl+C did not clear input: " + term.input.value);
}
if (!printedLines[printedLines.length - 1].includes('cat secret.txt^C')) {
  throw new Error("Ctrl+C did not echo command with ^C: " + printedLines[printedLines.length - 1]);
}

// Test Ctrl+U
term.input.value = 'half written command';
term.handleKeyDown({ ctrlKey: true, key: 'u', preventDefault: () => {} });
if (term.input.value !== '') {
  throw new Error("Ctrl+U did not clear input line");
}

// Test Ctrl+L
term.handleKeyDown({ ctrlKey: true, key: 'l', preventDefault: () => {} });
if (!cleared) {
  throw new Error("Ctrl+L did not trigger clear()");
}
console.log("✔ Terminal Keyboard Shortcuts (Ctrl+C, Ctrl+L, Ctrl+U) PASSED");

console.log("--> 2. Testing Network Host & IP Autocomplete...");
// Make sure a remote node is discovered
const univ = net.getNode('192.168.1.45');
univ.isDiscovered = true;

// Tab autocomplete on network command 'scan 192.'
term.input.value = 'scan 192.168.1.4';
term.handleTabAutocomplete();
if (!term.input.value.includes('192.168.1.45')) {
  throw new Error("Autocomplete failed to complete node IP: " + term.input.value);
}

// Tab autocomplete on node hostname
term.input.value = 'ssh acad';
term.handleTabAutocomplete();
if (!term.input.value.includes('acad-ftp.edu')) {
  throw new Error("Autocomplete failed to complete node hostname: " + term.input.value);
}
console.log("✔ Network Host & IP Autocomplete PASSED");

console.log("--> 3. Testing Clickable Autocomplete Callback...");
let popupElements = [];
globalThis.document = {
  createElement: (tag) => {
    const node = {
      className: '',
      textContent: '',
      style: {},
      listeners: {},
      addEventListener: function(event, fn) {
        this.listeners[event] = fn;
      },
      click: function() {
        if (this.listeners['click']) {
          this.listeners['click']({ stopPropagation: () => {} });
        }
      }
    };
    return node;
  }
};
term.autocompleteBox = {
  classList: { add: () => {}, remove: () => {} },
  set innerHTML(val) { popupElements = []; },
  appendChild: (el) => popupElements.push(el)
};

// Autocomplete with multiple choices (e.g. commands starting with 's')
term.input.value = 's';
let chosen = null;
term.showAutocompletePopup(['scan', 'ssh'], (sel) => {
  chosen = sel;
});
if (popupElements.length !== 2) {
  throw new Error("Autocomplete popup did not create 2 items: " + popupElements.length);
}
// Simulate click on second element
popupElements[1].click();
if (chosen !== 'ssh') {
  throw new Error("Clickable autocomplete callback failed, got: " + chosen);
}
console.log("✔ Clickable Autocomplete Callback PASSED");

console.log("--> 4. Testing Audio Volume Stepper Cycling...");
// Initial state: volume 0.5, unmuted
sound.volume = 0.5;
sound.muted = false;

// Step to 1.0 (or closest)
const s1 = sound.cycleVolume(); // next from 0.5 closest (idx 1 -> idx 2 is 0.2)
if (typeof s1.volume !== 'number' || !s1.icon || !s1.label) {
  throw new Error("cycleVolume returned invalid structure: " + JSON.stringify(s1));
}

// Test complete cycle from 1.0 -> 0.6 -> 0.2 -> 0.0 -> 1.0
sound.setVolume(1.0);
sound.muted = false;

const step60 = sound.cycleVolume();
if (step60.volume !== 0.6 || step60.label !== '60%') {
  throw new Error("Expected 60% step, got: " + JSON.stringify(step60));
}

const step20 = sound.cycleVolume();
if (step20.volume !== 0.2 || step20.label !== '20%') {
  throw new Error("Expected 20% step, got: " + JSON.stringify(step20));
}

const stepMute = sound.cycleVolume();
if (stepMute.volume !== 0 || !sound.muted || stepMute.icon !== '🔇') {
  throw new Error("Expected Mute step, got: " + JSON.stringify(stepMute));
}

const step100 = sound.cycleVolume();
if (step100.volume !== 1.0 || sound.muted || step100.label !== '100%') {
  throw new Error("Expected 100% step, got: " + JSON.stringify(step100));
}
console.log("✔ Audio Volume Stepper Cycling PASSED");

console.log("--> 5. Testing Dynamic Node Inspector Buttons...");
const mockUi = Object.create(UIManager.prototype);
mockUi.game = mockGame;
let executedCommand = '';
mockGame.terminal = {
  executeCommandLine: (cmd) => { executedCommand = cmd; }
};

const fakeSshBtn = { textContent: '', className: '', onclick: null };
const fakeScanBtn = { textContent: '', className: '', onclick: null };
const fakeCard = { classList: { remove: () => {}, add: () => {} } };
const fakeDetails = { innerHTML: '' };
const fakeTitle = { textContent: '' };

globalThis.document = {
  getElementById: (id) => {
    if (id === 'node-inspector') return fakeCard;
    if (id === 'inspector-name') return fakeTitle;
    if (id === 'inspector-details') return fakeDetails;
    if (id === 'btn-quick-ssh') return fakeSshBtn;
    if (id === 'btn-quick-scan') return fakeScanBtn;
    return null;
  }
};

// Test unrooted node: buttons should be PORT SCAN and CRACK HOST
const targetNode = net.getNode('192.168.1.45');
targetNode.hasRoot = false;
mockUi.showNodeInspector(targetNode);

if (fakeSshBtn.textContent !== 'PORT SCAN') {
  throw new Error("Unrooted node btnSsh text should be PORT SCAN, got: " + fakeSshBtn.textContent);
}
if (fakeScanBtn.textContent !== 'CRACK HOST') {
  throw new Error("Unrooted node btnScan text should be CRACK HOST, got: " + fakeScanBtn.textContent);
}
fakeScanBtn.onclick();
if (executedCommand !== `crack ${targetNode.ip}`) {
  throw new Error("Crack button did not execute crack command, got: " + executedCommand);
}

// Test rooted node: buttons should be CONNECT SSH and RUN FARM BOT
targetNode.hasRoot = true;
mockUi.showNodeInspector(targetNode);

if (fakeSshBtn.textContent !== 'CONNECT SSH') {
  throw new Error("Rooted node btnSsh text should be CONNECT SSH, got: " + fakeSshBtn.textContent);
}
if (fakeScanBtn.textContent !== 'RUN FARM BOT') {
  throw new Error("Rooted node btnScan text should be RUN FARM BOT, got: " + fakeScanBtn.textContent);
}
fakeScanBtn.onclick();
if (executedCommand !== 'run scripts/farm.js') {
  throw new Error("Farm bot button did not execute run scripts/farm.js, got: " + executedCommand);
}
console.log("✔ Dynamic Node Inspector Buttons PASSED");

console.log("--> 6. Testing Port Knock Sequence Reset...");
mockGame.exploits = new ExploitEngine(mockGame);
let modalOpened = false;
let modalClosed = false;
mockGame.ui = {
  openModal: () => { modalOpened = true; },
  closeModal: () => { modalClosed = true; },
  toast: () => {}
};

let resetBtnClicked = false;
const fakeDisplay = { textContent: '[ ] [ ] [ ]' };
let mockResetHandler = null;

const fakeElements = {
  'modal-title': { textContent: '' },
  'modal-body': { innerHTML: '' },
  'modal-footer': { innerHTML: '' },
  'knock-seq-display': fakeDisplay,
  'btn-reset-knock': {
    addEventListener: (evt, handler) => { mockResetHandler = handler; }
  },
  'btn-cancel-knock': { addEventListener: () => {} }
};

document.getElementById = (id) => fakeElements[id] || null;
document.querySelectorAll = () => [];

mockGame.exploits.createPortKnockPuzzle(() => {}, () => {});
if (!modalOpened) {
  throw new Error("Port knock puzzle failed to open modal");
}
if (typeof mockResetHandler !== 'function') {
  throw new Error("Reset knock button handler not attached");
}

// Set display to simulated clicked state then trigger reset
fakeDisplay.textContent = '[7000] [8000]';
mockResetHandler();
if (fakeDisplay.textContent !== '[ ] [ ] [ ]') {
  throw new Error("Reset handler did not reset display text, got: " + fakeDisplay.textContent);
}
console.log("✔ Port Knock Sequence Reset PASSED");

console.log("\n==========================================");
console.log("ALL PASS 3 VERIFICATION TESTS PASSED!");
console.log("==========================================");
