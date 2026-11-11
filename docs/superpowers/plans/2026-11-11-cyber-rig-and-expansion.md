# Cyber-Deck Rig & Advanced Cyberwarfare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Hacker Simulator with a massive modular Cyber-Deck hardware upgrade system, Active Blue Team AI defense, deep packet inspection / MITM token forgery, malware suite (cryptominers/ransomware), hex disassembler zero-day crafting (`r2`), and TMUX split terminal panes.

**Architecture:** Pure vanilla JavaScript ES modules without external build tools. Modular extensions (`src/rig.js`, `src/defense.js`, `src/malware.js`) integrated into `GameEngine` coordinator, extending `TerminalEmulator` commands, `NetworkSimulation` packet generator, and UI panels while maintaining 100% test coverage and Cloudflare Pages deployment compatibility.

**Tech Stack:** JavaScript (ES6+ Modules), HTML5 Canvas, Web Audio API, CSS3 Grid/Flexbox, Cloudflare Pages, Node.js test harness.

**Spec:** [`docs/superpowers/specs/2026-11-11-cyber-rig-and-expansion-design.md`](file:///C:/Users/gawie/OneDrive/Documents/GitHub/Hacker%20Simulator/docs/superpowers/specs/2026-11-11-cyber-rig-and-expansion-design.md)

## Global Constraints

- Pure client-side static web application with zero external build step.
- Preserve full backward compatibility with savegame schema `hacker_sim_save_v2`.
- All Node.js tests run headlessly (`typeof window !== 'undefined'` guards on DOM/Audio APIs).
- Maintain 100% pass rate across existing 8 test suites without regression.
- Follow ASD-STE100 caveman rules for user communication and clickable `file:///` markdown links.

## Review Focus

1. **Cyber-deck Thread Limit Overflow**: Attempting `hs.exec` when CPU threads are saturated should fail gracefully with an informative error rather than freezing the script engine.
2. **Blue Team AI Story Mission Soft-lock**: Sysadmin port patching and file honeypots must never lock or delete files required for campaign missions (`exam_keys_2026.enc`, `credentials.txt`, `ledger_accounts.csv`).
3. **Ransomware Key File Invalidation**: `encrypt` command must validate target paths and forbid encrypting system root directories or mission loot.
4. **TMUX Split DOM Cleanup**: Closing split panes must unbind event listeners and cancel polling loops without leaking memory.
5. **Overclock Thermal Runaway**: Redlining overclocking must engage thermal throttling (50% speed) and cool down automatically rather than locking the UI.

---

### Task 1: Modular Cyber-Deck Rig & Darknet Hardware Market Engine

**Files:**
- Create: `src/rig.js`
- Modify: `src/game.js:10-50`, `src/terminal.js:25-35`, `index.html:120-130`, `styles/main.css:500-550`
- Test: `test/rig_test.js`

**Interfaces:**
- Consumes: `game.credits`, `game.saveState()`, `terminal.writeln()`
- Produces: `CyberDeck` instance on `game.rig`, providing:
  - `getThreadsCapacity(): number`
  - `getMaxConcurrentScripts(): number`
  - `getTraceMultiplier(): number`
  - `getDownloadSpeed(): number`
  - `purchaseHardware(itemId: string): { success: boolean, message: string }`
  - `toggleOverclock(state?: boolean): boolean`

- [ ] **Step 1: Write the failing unit test**

Create `test/rig_test.js` asserting default rig stats (2 CPU threads, 4GB RAM / 3 scripts, 1.0x trace multiplier), hardware upgrade purchasing with ₿ balance validation, and overclock heat accumulation.

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/rig_test.js`  
Expected: FAIL with "Cannot find module '../src/rig.js'"

- [ ] **Step 3: Implement `CyberDeck` in `src/rig.js`**

Implement `CyberDeck` class with hardware catalog (CPU, RAM, Storage, Antenna, Bouncers, Cooling), stat calculations, purchase logic, overclock state machine, and serialization methods.

- [ ] **Step 4: Integrate `CyberDeck` into `GameEngine` and `TerminalEmulator`**

Hook `game.rig = new CyberDeck(game);` into `GameEngine.init()`, wire `rig`, `market`, `buy`, `overclock` commands into `src/terminal.js`, and add the "CYBER-DECK RIG" panel in `index.html`.

- [ ] **Step 5: Run test to verify it passes**

Run: `node test/rig_test.js`  
Expected: PASS

---

### Task 2: Active Blue Team AI Defense & DEFCON Alert Engine

**Files:**
- Create: `src/defense.js`
- Modify: `src/network.js:10-35`, `src/game.js:70-110`, `src/processes.js:40-70`, `src/terminal.js:150-180`
- Test: `test/defense_test.js`

**Interfaces:**
- Consumes: `game.network`, `game.processes`, `game.terminal`
- Produces: `BlueTeamDefense` manager on `game.defense`:
  - `getNodeDefcon(nodeId: string): number`
  - `escalateAlert(nodeId: string, reason: string): void`
  - `tickDefense(deltaTime: number): void`
  - `installBackdoor(nodeId: string): { success: boolean, message: string }`

- [ ] **Step 1: Write the failing unit test**

Create `test/defense_test.js` verifying that nodes with `securityLevel >= 2` escalate DEFCON on failed cracks, hunt/kill unauthorized background scripts, surge trace speed (+150%), and allow persistent access via `installBackdoor()`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/defense_test.js`  
Expected: FAIL with "Cannot find module '../src/defense.js'"

- [ ] **Step 3: Implement `BlueTeamDefense` in `src/defense.js`**

Implement alert escalation state machine (DEFCON 5 &rarr; 3 &rarr; 1), process hunter loop calling `game.processes.kill()`, port re-locking timer (60s), honeypot trigger detector, and persistent backdoor registration.

- [ ] **Step 4: Wire defense loop into `GameEngine.update()` and terminal commands**

Add `backdoor install` and honeypot detection on file access in `src/terminal.js`. Connect trace surge multipliers into `NetworkSimulation.tick()`.

- [ ] **Step 5: Run test to verify it passes**

Run: `node test/defense_test.js`  
Expected: PASS

---

### Task 3: Deep Packet Inspection & MITM Token Interceptor

**Files:**
- Modify: `src/network.js:440-490`, `src/ui.js:140-190`, `index.html:150-170`, `styles/network.css:120-160`
- Test: `test/mitm_test.js`

**Interfaces:**
- Consumes: `game.network.packets`, `game.ui.openModal()`
- Produces: Clickable packet inspection UI and `forgeAuthPacket(packetId: string): boolean` in `NetworkSimulation`.

- [ ] **Step 1: Write the failing unit test**

Create `test/mitm_test.js` testing packet payload parsing, auth token extraction from simulated HTTP/FTP packets, and token injection granting root compromise on target host.

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/mitm_test.js`  
Expected: FAIL with assertion error on packet inspection API.

- [ ] **Step 3: Implement packet inspector and forgery in `src/network.js` & `src/ui.js`**

Attach click handlers to sniffer table rows. Render packet inspector modal showing Ethernet/IP/TCP headers and ASCII/Hex dump with "INJECT FORGED PACKET" action button.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/mitm_test.js`  
Expected: PASS

---

### Task 4: Malware Suite (Persistent Cryptominers & Ransomware)

**Files:**
- Create: `src/malware.js`
- Modify: `src/game.js:120-150`, `src/terminal.js:30-40`, `src/vfs.js:140-170`
- Test: `test/malware_test.js`

**Interfaces:**
- Consumes: `game.vfs`, `game.credits`, `game.defense`
- Produces: `MalwareSuite` manager on `game.malware`:
  - `deployMiner(nodeId: string): { success: boolean, message: string }`
  - `encryptDirectory(nodeId: string, path: string): { success: boolean, payout: number, timer: number }`
  - `tickMiners(): number`

- [ ] **Step 1: Write the failing unit test**

Create `test/malware_test.js` verifying `miner deploy` generates passive ₿, respects router caps, triggers sysadmin sweeps on Level 2+ hosts, and `encrypt` creates `.enc` files while exempting critical mission keys.

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/malware_test.js`  
Expected: FAIL with "Cannot find module '../src/malware.js'"

- [ ] **Step 3: Implement `MalwareSuite` in `src/malware.js`**

Implement stealth miner background daemon tracking yields and detection probability. Implement targeted file encryptor with countdown timer and payout settlement.

- [ ] **Step 4: Connect terminal commands `miner` and `encrypt`**

Wire `miner deploy`, `miner list`, and `encrypt <dir>` into `src/terminal.js`. Hook `tickMiners()` into `GameEngine` periodic update.

- [ ] **Step 5: Run test to verify it passes**

Run: `node test/malware_test.js`  
Expected: PASS

---

### Task 5: Hex Disassembler & Zero-Day Exploit Engine (`r2`)

**Files:**
- Modify: `src/exploits.js:20-60`, `src/terminal.js:30-45`, `src/network.js:360-410`
- Test: `test/hex_test.js`

**Interfaces:**
- Consumes: `currentHost.vfs`, `game.ui.openModal()`, `game.exploits`
- Produces: `createHexDisassemblerPuzzle(binaryPath: string, onSuccess: Function, onFailure: Function): void`

- [ ] **Step 1: Write the failing unit test**

Create `test/hex_test.js` testing `r2 <binary>` parsing, vulnerable opcode detection, and buffer overflow payload injection unlocking custom zero-day exploits in `game.exploits`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/hex_test.js`  
Expected: FAIL with "r2 is not recognized".

- [ ] **Step 3: Implement `createHexDisassemblerPuzzle` in `src/exploits.js`**

Create modal hex disassembler view displaying simulated memory addresses, opcodes, and interactive payload input to align target return address.

- [ ] **Step 4: Wire `r2` shell command and populate binary targets**

Add mock ELF binaries on Corp DMZ (`/opt/chimera/bin/auth_daemon`), Bank, and Airgap nodes. Hook `r2` command into `TerminalEmulator`.

- [ ] **Step 5: Run test to verify it passes**

Run: `node test/hex_test.js`  
Expected: PASS

---

### Task 6: TMUX Multi-Pane Split Terminal Layout

**Files:**
- Modify: `src/terminal.js:100-140`, `index.html:60-90`, `styles/terminal.css:50-90`
- Test: `test/tmux_test.js`

**Interfaces:**
- Consumes: `terminal.container`, `terminal.output`
- Produces:
  - `splitPane(direction: 'horizontal' | 'vertical', streamType?: string): void`
  - `closePane(paneId: string): void`

- [ ] **Step 1: Write the failing unit test**

Create `test/tmux_test.js` verifying DOM split creation, secondary output stream binding (`tail <pid>` or packet sniffer), and memory-clean closing of panes.

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/tmux_test.js`  
Expected: FAIL with "splitPane is not a function".

- [ ] **Step 3: Implement pane splitting in `src/terminal.js` and styles**

Add flex/grid container layout for primary shell pane alongside secondary scrollable output pane. Support `split -h`, `split -v`, and `close`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/tmux_test.js`  
Expected: PASS

---

### Task 7: Full Regression Suite & Cloudflare Pages Deployment

**Files:**
- Test: Run all tests (`verify.js`, `terminal_test.js`, `script_test.js`, `tutorial_test.js`, `production_test.js`, `audit_fixes_test.js`, `pass2_test.js`, `pass3_test.js`, `rig_test.js`, `defense_test.js`, `mitm_test.js`, `malware_test.js`, `hex_test.js`, `tmux_test.js`)

- [ ] **Step 1: Run complete 14-suite test matrix**

Command:
```bash
node test/verify.js; node test/terminal_test.js; node test/script_test.js; node test/tutorial_test.js; node test/production_test.js; node test/audit_fixes_test.js; node test/pass2_test.js; node test/pass3_test.js; node test/rig_test.js; node test/defense_test.js; node test/mitm_test.js; node test/malware_test.js; node test/hex_test.js; node test/tmux_test.js
```
Expected: All tests pass with exit code 0.

- [ ] **Step 2: Deploy to Cloudflare Pages**

Command:
```bash
npx wrangler pages deploy . --project-name hacker-simulator --branch main
```
Expected: Deployment complete with live production URL.

- [ ] **Step 3: Verify live production HTTP status**

Command:
```bash
node -e "fetch('https://hacker-simulator-1ts.pages.dev').then(r => console.log('HTTP Status:', r.status))"
```
Expected: HTTP Status: 200.
