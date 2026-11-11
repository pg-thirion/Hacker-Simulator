// ============================================================
// HACKER SIMULATOR // TASK 6 TEST: TMUX MULTI-PANE SPLIT TERMINAL
// ============================================================

import { NetworkSimulation } from '../src/network.js';
import { TerminalEmulator } from '../src/terminal.js';
import { ScriptRuntime } from '../src/scripts.js';

console.log("--> Testing TMUX Multi-Pane Split Terminal Layout...");

// ------------------------------------------------------------
// Mock DOM Setup for Headless Node.js Environment
// ------------------------------------------------------------
class MockElement {
  constructor(tag, id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.children = [];
    this.childNodes = this.children;
    this.parentNode = null;
    this._textContent = '';
    this.innerHTML = '';
    this._classes = new Set();
    this.classList = {
      add: (...cls) => cls.forEach(c => { if (c) this._classes.add(c); }),
      remove: (...cls) => cls.forEach(c => this._classes.delete(c)),
      contains: (c) => this._classes.has(c),
      toggle: (c) => {
        if (this._classes.has(c)) { this._classes.delete(c); return false; }
        else { this._classes.add(c); return true; }
      }
    };
  }

  get textContent() {
    if (this.children && this.children.length > 0) {
      return this.children.map(c => c.textContent).join(' ');
    }
    return this._textContent;
  }

  set textContent(val) {
    this._textContent = String(val);
    this.children = [];
  }

  get className() {
    return Array.from(this._classes).join(' ');
  }

  set className(val) {
    this._classes = new Set((val || '').split(/\s+/).filter(Boolean));
  }

  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(newChild, refChild) {
    if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
    newChild.parentNode = this;
    const idx = this.children.indexOf(refChild);
    if (idx === -1) {
      this.children.push(newChild);
    } else {
      this.children.splice(idx, 0, newChild);
    }
    return newChild;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  contains(el) {
    if (!el) return false;
    let curr = el;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentNode;
    }
    return false;
  }

  querySelector(selector) {
    const isClass = selector.startsWith('.');
    const isId = selector.startsWith('#');
    const name = selector.slice(1);

    const search = (node) => {
      for (const child of node.children) {
        if (isClass && child.classList.contains(name)) return child;
        if (isId && child.id === name) return child;
        const res = search(child);
        if (res) return res;
      }
      return null;
    };
    return search(this);
  }

  querySelectorAll(selector) {
    const isClass = selector.startsWith('.');
    const isId = selector.startsWith('#');
    const name = selector.slice(1);
    const results = [];

    const search = (node) => {
      for (const child of node.children) {
        if (isClass && child.classList.contains(name)) results.push(child);
        if (isId && child.id === name) results.push(child);
        search(child);
      }
    };
    search(this);
    return results;
  }

  addEventListener(event, fn) {
    this[`on${event}`] = fn;
  }

  click() {
    if (this.onclick) this.onclick({ stopPropagation: () => {} });
  }

  get firstChild() {
    return this.children[0] || null;
  }
}

const containerEl = new MockElement('div', 'terminal-container');
containerEl.className = 'terminal-body';

const outputEl = new MockElement('div', 'terminal-output');
const inputLineEl = new MockElement('div', 'terminal-input-line');
const inputEl = new MockElement('input', 'terminal-input');
const promptEl = new MockElement('span', 'terminal-prompt');
const tabTitleEl = new MockElement('span', 'terminal-tab-title');
const hintsEl = new MockElement('div', 'autocomplete-hints');

containerEl.appendChild(outputEl);
containerEl.appendChild(inputLineEl);
containerEl.appendChild(hintsEl);

const mockElements = {
  'terminal-container': containerEl,
  'terminal-output': outputEl,
  'terminal-input-line': inputLineEl,
  'terminal-input': inputEl,
  'terminal-prompt': promptEl,
  'terminal-tab-title': tabTitleEl,
  'autocomplete-hints': hintsEl
};

global.document = {
  createElement: (tag) => new MockElement(tag),
  getElementById: (id) => mockElements[id] || null
};

// ------------------------------------------------------------
// Mock Game Environment
// ------------------------------------------------------------
const net = new NetworkSimulation();
const mockGame = {
  network: net,
  credits: 1000,
  missions: { checkProgress: () => {} },
  defense: { defcon: 4 },
  ui: {
    toast: () => {},
    updateHUD: () => {}
  }
};
mockGame.scripts = new ScriptRuntime(mockGame);

// Add a mock active script
mockGame.scripts.activeScripts.set(1001, {
  pid: 1001,
  name: 'farm.js',
  threads: 4,
  status: 'RUNNING',
  logs: ['[10:00:00] Initialized farm daemon', '[10:00:02] Siphoning 192.168.1.45 (+150 BTC)']
});

const term = new TerminalEmulator(mockGame);

// ------------------------------------------------------------
// 1. Pane State Initialization Tests
// ------------------------------------------------------------
if (!(term.panes instanceof Map)) {
  throw new Error("terminal.panes should be an instance of Map");
}
if (term.activePaneId !== 'main') {
  throw new Error(`Expected activePaneId 'main', got '${term.activePaneId}'`);
}
console.log("✔ TMUX pane state properties initialized correctly");

// ------------------------------------------------------------
// 2. Command Registration Tests
// ------------------------------------------------------------
if (!term.commands.includes('split')) throw new Error("split missing from terminal.commands");
if (!term.commands.includes('tmux')) throw new Error("tmux missing from terminal.commands");
if (!term.commands.includes('close')) throw new Error("close missing from terminal.commands");

// Check man documentation
let manOutput = [];
const origWriteln = term.writeln.bind(term);
term.writeln = (msg) => manOutput.push(msg);

term.cmdMan('split');
term.cmdMan('tmux');
term.cmdMan('close');

if (!manOutput.some(m => m.includes('split / tmux - TMUX Multi-Pane'))) {
  throw new Error("man split / tmux documentation missing or incomplete");
}
if (!manOutput.some(m => m.includes('close - Close TMUX Split Pane'))) {
  throw new Error("man close documentation missing or incomplete");
}
console.log("✔ Command registration and manual pages verified");

// ------------------------------------------------------------
// 3. Horizontal Split (Default: direction='horizontal', stream='tail')
// ------------------------------------------------------------
const splitRes1 = term.splitPane('horizontal', 'tail');
if (!splitRes1 || !splitRes1.success || !splitRes1.paneId) {
  throw new Error(`splitPane('horizontal', 'tail') failed: ${JSON.stringify(splitRes1)}`);
}

const pane1Id = splitRes1.paneId;
if (!term.panes.has(pane1Id)) {
  throw new Error(`Pane '${pane1Id}' not found in terminal.panes Map`);
}
const pane1 = term.panes.get(pane1Id);
if (pane1.direction !== 'horizontal' || pane1.streamType !== 'tail') {
  throw new Error(`Pane 1 attributes invalid: ${JSON.stringify(pane1)}`);
}
if (term.activePaneId !== pane1Id) {
  throw new Error(`activePaneId should be updated to '${pane1Id}', got '${term.activePaneId}'`);
}

// Verify DOM structure for horizontal split
if (!containerEl.classList.contains('terminal-split-wrapper')) {
  throw new Error("containerEl missing class 'terminal-split-wrapper'");
}
if (!containerEl.classList.contains('split-horizontal')) {
  throw new Error("containerEl missing class 'split-horizontal'");
}
const secPaneEl = containerEl.querySelector('.terminal-pane-secondary');
if (!secPaneEl) {
  throw new Error("Secondary pane element .terminal-pane-secondary not found inside container");
}

const headerEl = secPaneEl.querySelector('.pane-header');
if (!headerEl) {
  throw new Error(".pane-header element missing inside secondary pane");
}
if (!headerEl.textContent.includes('TMUX PANE') || !headerEl.textContent.includes('TAIL')) {
  throw new Error(`Header text should contain 'TMUX PANE' and 'TAIL', got: ${headerEl.textContent}`);
}

const closeBtn = headerEl.querySelector('.pane-close-btn');
if (!closeBtn || !closeBtn.textContent.includes('[x]')) {
  throw new Error("Header missing [x] close button");
}

// Verify stream content rendered
const contentEl = secPaneEl.querySelector('.pane-content');
if (!contentEl) {
  throw new Error(".pane-content element missing inside secondary pane");
}
if (!contentEl.textContent.includes('farm.js') || !contentEl.textContent.includes('1001')) {
  throw new Error(`Tail content does not contain process info: ${contentEl.textContent}`);
}
if (!pane1.timer) {
  throw new Error("Polling timer not established for tail stream");
}
console.log("✔ Horizontal split (tail stream) and DOM hierarchy verified");

// ------------------------------------------------------------
// 4. Memory Leak Prevention & closePane Cleanup (Review Focus 4)
// ------------------------------------------------------------
let intervalCleared = false;
const origClearInterval = global.clearInterval;
global.clearInterval = (timerId) => {
  intervalCleared = true;
  origClearInterval(timerId);
};

const closeRes = term.closePane(pane1Id);
if (!closeRes) {
  throw new Error(`closePane('${pane1Id}') returned false`);
}
if (!intervalCleared) {
  throw new Error("closePane did not call clearInterval on polling timer (Memory Leak!)");
}
if (term.panes.has(pane1Id)) {
  throw new Error(`Pane '${pane1Id}' was not deleted from terminal.panes`);
}
if (term.panes.size !== 0) {
  throw new Error(`Expected panes Map to be empty, has ${term.panes.size}`);
}
if (term.activePaneId !== 'main') {
  throw new Error(`Expected activePaneId to reset to 'main', got '${term.activePaneId}'`);
}

// Container classes should be reset to single-pane layout
if (containerEl.classList.contains('terminal-split-wrapper') ||
    containerEl.classList.contains('split-horizontal') ||
    containerEl.classList.contains('split-vertical')) {
  throw new Error("Container layout classes not removed on closePane");
}
if (containerEl.querySelector('.terminal-pane-secondary')) {
  throw new Error("Secondary pane element still exists in DOM after closePane");
}
console.log("✔ closePane cleanup, timer clearing and DOM reset verified");

// ------------------------------------------------------------
// 5. Vertical Split (Sniffer Stream)
// ------------------------------------------------------------
// Inject a packet into simulation
net.addPacket({
  src: '10.0.0.5',
  dest: '192.168.1.1',
  proto: 'SSH',
  len: 128,
  info: 'SSH-2.0-OpenSSH_8.4 Encrypted packet'
});

const splitRes2 = term.splitPane('vertical', 'sniffer');
if (!splitRes2.success) {
  throw new Error("splitPane('vertical', 'sniffer') failed");
}
const pane2Id = splitRes2.paneId;
const pane2 = term.panes.get(pane2Id);
if (pane2.direction !== 'vertical' || pane2.streamType !== 'sniffer') {
  throw new Error(`Pane 2 attributes invalid: ${JSON.stringify(pane2)}`);
}

if (!containerEl.classList.contains('split-vertical')) {
  throw new Error("Container missing class 'split-vertical'");
}

const secPane2 = containerEl.querySelector('.terminal-pane-secondary');
const header2 = secPane2.querySelector('.pane-header');
if (!header2.textContent.includes('SNIFFER')) {
  throw new Error(`Expected header to include 'SNIFFER', got: ${header2.textContent}`);
}

const content2 = secPane2.querySelector('.pane-content');
if (!content2.textContent.includes('SSH') || !content2.textContent.includes('10.0.0.5')) {
  throw new Error(`Sniffer stream missing packet info: ${content2.textContent}`);
}

// Close via close button click
const closeBtn2 = header2.querySelector('.pane-close-btn');
closeBtn2.click();

if (term.panes.size !== 0) {
  throw new Error("Close button click did not close secondary pane");
}
console.log("✔ Vertical split (sniffer stream) and close button trigger verified");

// ------------------------------------------------------------
// 6. Trace Stream Pane
// ------------------------------------------------------------
net.activeTrace = 64.2;
const splitRes3 = term.splitPane('horizontal', 'trace');
if (!splitRes3.success) throw new Error("splitPane trace failed");

const secPane3 = containerEl.querySelector('.terminal-pane-secondary');
const content3 = secPane3.querySelector('.pane-content');
if (!content3.textContent.includes('TRACE') || !content3.textContent.includes('64.2%')) {
  throw new Error(`Trace stream missing trace metrics: ${content3.textContent}`);
}
term.closePane(splitRes3.paneId);
console.log("✔ Trace telemetry stream verified");

// ------------------------------------------------------------
// 7. Command Dispatch Integration: split, tmux, close
// ------------------------------------------------------------
const termLines = [];
term.writeln = (line, cls) => termLines.push({ line, cls });

// Test 'split -h sniffer'
term.dispatchCommand('split', ['-h', 'sniffer']);
if (term.panes.size !== 1) {
  throw new Error("dispatchCommand('split', ['-h', 'sniffer']) did not create pane");
}
const activeId = term.activePaneId;
const pActive = term.panes.get(activeId);
if (pActive.direction !== 'horizontal' || pActive.streamType !== 'sniffer') {
  throw new Error("Command 'split -h sniffer' did not set expected direction and stream");
}

// Test 'close'
term.dispatchCommand('close', []);
if (term.panes.size !== 0) {
  throw new Error("dispatchCommand('close') did not close active pane");
}

// Test 'tmux -v trace'
term.dispatchCommand('tmux', ['-v', 'trace']);
if (term.panes.size !== 1) {
  throw new Error("dispatchCommand('tmux', ['-v', 'trace']) did not create pane");
}
const tmuxPane = term.panes.get(term.activePaneId);
if (tmuxPane.direction !== 'vertical' || tmuxPane.streamType !== 'trace') {
  throw new Error("Alias 'tmux' failed to configure pane properly");
}

// Test 'close [paneId]'
term.dispatchCommand('close', [term.activePaneId]);
if (term.panes.size !== 0) {
  throw new Error("dispatchCommand('close', [paneId]) failed to close pane");
}

console.log("✔ Terminal shell commands 'split', 'tmux', and 'close' verified");

console.log("\n==========================================");
console.log("ALL TASK 6 TMUX TESTS PASSED!");
console.log("==========================================");
