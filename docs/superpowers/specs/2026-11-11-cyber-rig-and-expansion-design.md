# Cyber-Deck Rig & Advanced Cyberwarfare Expansion – Design Specification

**Date:** 2026-11-11  
**Project:** Hacker Simulator  
**Scope:** Massive Modular Rig Marketplace, Active Blue Team AI Defense, Hex Disassembly, MITM Packet Inspection, Malware Deployment, and TMUX Split Terminal.

---

## 1. Intent and Why

Hacker Simulator currently offers an authentic POSIX terminal, visual topology, scripted botnet execution (`hs.*`), and interactive mini-games. However, progression currently caps out once missions are solved and scripts idle-farm money.

Players need:
1. **Long-Term Progression & Power Fantasy**: A tangible outlet for earned Bitcoin (₿) through an expansive modular hardware upgrade system (CPUs, RAM, antennas, cooling, decoy proxies) that directly enhances gameplay capabilities.
2. **Dynamic Resistance**: Static target servers create predictable gameplay; high-value servers should fight back with reactive sysadmins, tripwires, and process hunting.
3. **Advanced Cyberwarfare Tooling**: Deep packet inspection, hex disassembly, malware deployment, and multi-pane terminal workflows that mirror real-world offensive cyber operations.

---

## 2. Goals, Non-Goals, Anti-Goals

### Goals
- **Massive Modular Cyber-Deck System**: 6 upgradeable hardware slots (CPU, RAM, Storage, Antennas, Proxies, Thermal Cooling) with tiered models, stat bonuses, and dedicated visual dashboard + CLI.
- **Active Blue Team AI (SOC Defense)**: High-tier targets dynamically detect suspicious activity, deploy IDS tripwires, terminate player bots, and patch open ports in real time.
- **Hex Disassembler Mini-Game (`r2`/`ghidra`)**: Interactive memory inspection puzzle to locate vulnerable offsets and forge zero-day payloads.
- **MITM Packet Sniffer Interception**: Click-to-inspect captured packets, harvest JWT tokens/credentials, and replay forged authentication requests.
- **Malware Deployment**: Plant persistent Ransomware daemons and Cryptominers that generate passive income with escalating trace risk.
- **TMUX Multi-Window Split**: Split the terminal into multiple independent panes (active shell, script log tails, live network metrics).
- **100% Portability & Zero Regressions**: Maintain pure vanilla JavaScript ES modules, zero build step, and complete backwards compatibility with Cloudflare Pages hosting.

### Non-Goals
- Multiplayer or network backend servers (stays 100% client-side simulation).
- Heavy external dependencies (keeps zero build step, pure browser APIs).

### Anti-Goals
- Paywalls or unfinishable grinding loops (all gear earnable through smart hacking and botnet automation).
- Artificial UI clutter that obscures the retro terminal and canvas aesthetics.

---

## 3. System Architecture & Detailed Mechanics

### Component 1: Massive Modular Cyber-Deck Rig Architecture (Feature 1 - Expanded)
Players upgrade their personal attack rig (`hackbox`) through both a dedicated UI tab ("CYBER-DECK RIG") and the terminal (`rig`, `market`, `buy <id>`, `upgrade <slot>`).

#### 1. Hardware Slots & Upgrades
| Slot | Function / Stat Effects | Tier Progression |
|---|---|---|
| **CPU (Processor Cores)** | Governs max total script threads across network, port crack speed multiplier, and compilation time. | Dual-Core Celeron (2 threads) &rarr; Quad-Core i7 (8 threads) &rarr; Threadripper 32-Core (64 threads) &rarr; Quantum Neural Array (256 threads) |
| **RAM (Memory Banks)** | Determines max concurrent active scripts and packet sniffer buffer depth. | 4 GB DDR3 (3 scripts max) &rarr; 16 GB DDR4 (10 scripts) &rarr; 64 GB DDR5 (30 scripts) &rarr; 256 GB High-Bandwidth ECC (Unlimited scripts) |
| **Storage (I/O & NVMe)** | Download/upload transfer bandwidth and max local loot/exploit capacity. | 120 GB HDD (500 KB/s) &rarr; 1 TB SATA SSD (2 MB/s) &rarr; 4 TB Gen4 NVMe (15 MB/s) &rarr; Optane Holographic Array (Instantaneous) |
| **Network Interface & Antennas** | Uncovers stealth/air-gap network nodes and accelerates canvas ping sweep frequency. | Standard Ethernet &rarr; Dual-Band Wi-Fi 6 &rarr; Rogue High-Gain SDR Antenna &rarr; Orbital Laser Uplink (Unlocks Deep Satellite Nodes) |
| **Decoy Bouncers & VPN Mesh** | Directly slows trace accumulation rate and reduces trace lockdown penalties. | Direct Dial (1.0x trace rate) &rarr; Single VPN Tunnel (0.75x) &rarr; 3-Hop Tor Circuit (0.4x) &rarr; Darknet Ghost Onion Mesh (0.15x) |
| **Cooling & Overclock Engine** | Enables temporary "TURBO OVERCLOCK" mode (doubles exploit speed for 20s) with overheat failure protection. | Stock Heatsink &rarr; Dual-Fan Air Cooler &rarr; Liquid Loop 360mm &rarr; Liquid Nitrogen Sub-Zero Cryo Rig |

#### 2. Rig Management Terminal Commands
- `rig`: Display current hardware specs, slot utilization, temperature, and performance ratings in stylized ASCII.
- `market [category]`: List darknet hardware vendors, specifications, and prices in ₿.
- `buy <item_id>`: Purchase hardware module and automatically install into cyber-deck.
- `overclock [on|off]`: Toggle turbo overclock state; triggers heat gauge on HUD.

---

### Component 2: Active Blue Team AI Defense (Feature 3)
Target nodes with `securityLevel >= 2` run simulated Blue Team defense daemons.

#### 1. Alert Escalation (DEFCON System)
- **DEFCON 5 (Green)**: Normal baseline. Routine log scans.
- **DEFCON 3 (Yellow)**: Triggered by failed exploit attempts or port scanning without VPN. Trace accumulation +50%.
- **DEFCON 1 (Red)**: Triggered by root compromise, cryptominer presence, or honeypot activation.
  - Sysadmin deploys counter-measures:
    1. **Process Hunting**: Scans for unauthorized player scripts (`run scripts/farm.js`, miners) and terminates them with `SIGKILL`. *(Builder call: hunters terminate background bots and miners rather than revoking root instantly, preserving typing flow while killing automated income).*
    2. **Active Trace Surge**: Trace speed surges by +150% with pulsing HUD warning. If trace reaches 100%, existing trace lockdown severs the connection and fines player.
    3. **Port Patching & Backdoors**: Closed ports re-lock after 60s unless player plants a persistent backdoor (`backdoor install` command after root). *(Builder call: backdoors preserve permanent SSH access; story mission targets never lock permanently).*
    4. **Honeypot Traps**: Fake high-value files (`/root/passwords.kdbx`). If player executes `cat` or `download`, immediate 50% trace spike and shell eviction.

---

### Component 3: Hex Disassembler & Zero-Day Exploit Crafting (Feature 2)
- Added command: `r2 <binary_path>` (e.g., `r2 /opt/chimera/bin/auth_daemon`).
- Modal interactive hex editor:
  - Disassembles pseudo-assembly with memory addresses, hex bytes, and opcodes.
  - *(Builder call: 3 hand-crafted binary vulnerability puzzles on Corp DMZ, Bank, and Airgap nodes; solving crafts named zero-day payloads added directly to Arsenal).*
  - Interactive mini-game: Player spots buffer overflow vulnerability (e.g. `strcpy` without bounds check) and inputs payload padding to align with target `EIP` address `0xDEADBEEF`.

---

### Component 4: Deep Packet Inspection & MITM Token Interceptor (Feature 4)
- Packet sniffer table items become clickable.
- Clicking packet opens **Packet Inspector Panel**:
  - Displays Ethernet, IP, TCP/UDP headers and hex/ASCII payload.
  - Searchable stream filter.
  - *(Builder call: Forging captured auth packets unlocks root access on target web/proxy ports without needing port cracker tools).*

---

### Component 5: Malware Suite (Cryptominers & Ransomware) (Feature 5)
- **Ransomware (`encrypt <target_dir>`)**:
  - *(Builder call: Mission critical key files are protected from encryption to prevent campaign soft-locks; non-essential files become `.enc` and trigger payout countdown).*
- **Cryptominer Daemon (`miner deploy <target_ip>`)**:
  - *(Builder call: Level 1 routers have low CPU yield caps; Level 2+ hosts have high yield but trigger active Blue Team sysadmin sweeps).*

---

### Component 6: TMUX Multi-Pane Terminal Split (Feature 6)
- Commands: `split -h` (horizontal split), `split -v` (vertical split), `tmux switch <id>`, `close`.
- *(Builder call: TMUX pane architecture uses a primary interactive bash terminal alongside secondary live output streams for `tail <pid>`, sniffer, or trace monitor, avoiding multi-session state desync).*

---

### Hardware Cooling & Overclock Mechanics
- *(Builder call: Overheat failure triggers a 45s thermal cooldown throttling speed to 50%, avoiding permanent gear loss).*

---

## 4. Data Models & Persistence Schema

Savegame schema updated (`hacker_sim_save_v2`) to preserve rig state and defense levels:
```json
{
  "rig": {
    "cpu": "cpu_threadripper_32",
    "ram": "ram_64gb_ddr5",
    "storage": "storage_nvme_4tb",
    "antenna": "antenna_sdr_rogue",
    "bouncer": "vpn_tor_3hop",
    "cooling": "cooling_liquid_360",
    "overclockActive": false,
    "temperature": 42
  },
  "defenses": {
    "bank-vault": { "defcon": 5, "alertLevel": 0, "patchedPorts": [] }
  },
  "miners": [
    { "nodeId": "corp-dmz", "yieldPerSec": 0.5, "installedAt": 1700000000 }
  ]
}
```

---

## 5. Verification & Testing Strategy
- Automated unit tests for hardware stat modifiers (thread limits, trace damping).
- Automated tests for DEFCON state transitions and sysadmin process termination.
- Automated tests for hex editor opcode parsing and packet payload forgery.
- Cloudflare Pages static asset upload and production smoke test.

---

## 6. What's Left to the Builder
- Precise Bitcoin pricing curves for Tier 1 through Tier 4 hardware upgrades.
- Exact visual HUD animations for cyber-deck temperature and overclock glow.
- Sound synthesizers for hardware overclock hum and sysadmin alarm siren.
