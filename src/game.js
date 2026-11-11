// ============================================================
// HACKER SIMULATOR // MAIN ENGINE & BOOTSTRAP
// Orchestrates Network, Terminal, Canvas, Missions, Processes & Save
// ============================================================

import { NetworkSimulation } from './network.js';
import { ExploitEngine } from './exploits.js';
import { TerminalEmulator } from './terminal.js';
import { NetworkCanvas } from './canvas.js';
import { MissionManager } from './missions.js';
import { ProcessManager } from './processes.js';
import { ScriptRuntime } from './scripts.js';
import { TutorialManager } from './tutorial.js';
import { UIManager } from './ui.js';
import { sound } from './audio.js';
import { CyberDeck } from './rig.js';
import { BlueTeamDefense } from './defense.js';
import { MalwareSuite } from './malware.js';

export class GameEngine {
  constructor() {
    this.credits = 100; // Starter cash
    this.saveKey = 'hacker_sim_save_v2';
    this.isDirty = false;

    // 1. Core Subsystems
    this.rig = new CyberDeck(this);
    this.defense = new BlueTeamDefense(this);
    this.network = new NetworkSimulation();
    this.network.game = this;
    this.malware = new MalwareSuite(this);
    this.exploits = new ExploitEngine(this);
    this.missions = new MissionManager(this);
    this.processes = new ProcessManager(this);
    this.scripts = new ScriptRuntime(this);
    this.ui = new UIManager(this);
    this.terminal = new TerminalEmulator(this);
    this.canvas = new NetworkCanvas(this, 'network-canvas');
    this.tutorial = new TutorialManager(this);

    // 2. Load persistence or default
    this.loadState();

    // 3. Initial UI Render
    this.ui.updateHUD();
    this.ui.renderMissions();
    this.ui.renderArsenal();
    this.ui.renderRig();
    this.processes.render();

    // 4. Start main loop
    this.lastTick = performance.now();
    this.startLoop();

    // 5. Auto-save every 30 seconds only if state changed (dirty flag)
    setInterval(() => {
      if (this.isDirty) {
        this.saveState(true);
      }
    }, 30000);
  }

  markDirty() {
    this.isDirty = true;
  }

  startLoop() {
    const loop = (time) => {
      const deltaSec = (time - this.lastTick) / 1000;
      this.lastTick = time;

      // Tick network packets
      this.network.tickPackets();

      // Tick background processes
      this.processes.tick(deltaSec);

      // Tick CyberDeck thermal loop
      if (this.rig) {
        this.rig.tickThermal(deltaSec);
      }

      // Tick Blue Team SOC Defense Loop
      if (this.defense) {
        this.defense.tickDefense(deltaSec);
      }

      // Tick Cryptominers
      if (this.malware) {
        this.malware.tickMiners(deltaSec);
      }

      // IDS Trace decay if idle or trigger lockdown at 100%
      if (this.network.activeTrace > 0) {
        if (this.network.activeTrace >= 100) {
          this.handleTraceLockdown();
        } else {
          this.network.activeTrace = Math.max(0, this.network.activeTrace - (deltaSec * 0.5));
          this.ui.updateHUD();
        }
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  handleTraceLockdown() {
    this.network.activeTrace = 40; // Reset to 40% after emergency scrub
    this.credits = Math.max(0, this.credits - 100);
    this.markDirty();
    this.ui.updateHUD();
    sound.denied();

    if (this.terminal) {
      if (this.terminal.currentHost && this.terminal.currentHost.id !== 'localhost') {
        this.terminal.cmdExit();
      }
      this.terminal.writeln('------------------------------------------------------------', 'term-error');
      this.terminal.writeln('[!] CRITICAL ALERT: 100% IDS TRACE DETECTED! CONNECTION SEVERED.', 'term-error');
      this.terminal.writeln('[!] Emergency proxy scrubber deployed (-100 ₿ penalty).', 'term-warn');
      this.terminal.writeln('------------------------------------------------------------', 'term-error');
    }

    this.ui.toast("100% TRACE LOCKDOWN! Remote shell dropped.", "error");
  }

  saveState(silent = false) {
    try {
      const state = {
        credits: this.credits,
        activeTrace: this.network.activeTrace,
        nodes: Array.from(this.network.nodes.entries()).map(([id, n]) => ({
          id,
          hasRoot: n.hasRoot,
          isDiscovered: n.isDiscovered
        })),
        tools: Array.from(this.exploits.tools.entries()).map(([id, t]) => ({
          id,
          unlocked: t.unlocked
        })),
        missions: this.missions.missions.map(m => ({
          id: m.id,
          title: m.title,
          client: m.client,
          targetIp: m.targetIp,
          targetHost: m.targetHost,
          desc: m.desc,
          rewardBtc: m.rewardBtc,
          rewardTools: m.rewardTools,
          completed: m.completed,
          objectives: m.objectives.map(o => ({ id: o.id, text: o.text, completed: o.completed }))
        })),
        vfsData: Array.from(this.network.nodes.entries()).map(([id, n]) => ({
          id,
          vfs: n.vfs.serialize()
        })),
        activeMissionId: this.missions.activeMission ? this.missions.activeMission.id : 'M-01',
        rig: this.rig ? this.rig.serialize() : null,
        defenses: this.defense ? this.defense.serialize() : null,
        malware: this.malware ? this.malware.serialize() : null
      };

      localStorage.setItem(this.saveKey, JSON.stringify(state));
      this.isDirty = false;
      if (!silent) {
        sound.exploitSuccess();
        this.ui.toast("Session saved to local storage.", "success");
      }
    } catch (e) {
      console.error("Save state failed:", e);
    }
  }

  loadState() {
    try {
      const raw = localStorage.getItem(this.saveKey);
      if (!raw) return;

      const state = JSON.parse(raw);
      if (typeof state.credits === 'number') this.credits = state.credits;
      if (typeof state.activeTrace === 'number') this.network.activeTrace = state.activeTrace;

      // Restore nodes
      if (Array.isArray(state.nodes)) {
        state.nodes.forEach(savedNode => {
          const n = this.network.getNode(savedNode.id);
          if (n) {
            n.hasRoot = savedNode.hasRoot;
            n.isDiscovered = savedNode.isDiscovered;
          }
        });
      }

      // Restore VFS files and directories
      if (Array.isArray(state.vfsData)) {
        state.vfsData.forEach(item => {
          const n = this.network.getNode(item.id);
          if (n && item.vfs) {
            n.vfs.deserialize(item.vfs);
          }
        });
      }

      // Restore tools
      if (Array.isArray(state.tools)) {
        state.tools.forEach(savedTool => {
          const t = this.exploits.tools.get(savedTool.id);
          if (t) t.unlocked = savedTool.unlocked;
        });
      }

      // Restore missions (including freelance procedural contracts)
      if (Array.isArray(state.missions)) {
        state.missions.forEach(savedM => {
          let m = this.missions.missions.find(x => x.id === savedM.id);
          if (!m && savedM.id && savedM.id.startsWith('B-')) {
            m = {
              id: savedM.id,
              title: savedM.title || `Freelance Contract: ${savedM.targetHost || 'Target'}`,
              client: savedM.client || 'NullSector Broker',
              targetIp: savedM.targetIp || '',
              targetHost: savedM.targetHost || 'host',
              desc: savedM.desc || 'Freelance reconnaissance contract',
              rewardBtc: savedM.rewardBtc || 1000,
              rewardTools: savedM.rewardTools || [],
              completed: savedM.completed || false,
              objectives: savedM.objectives || []
            };
            this.missions.missions.push(m);
          } else if (m) {
            m.completed = savedM.completed;
            if (Array.isArray(savedM.objectives)) {
              savedM.objectives.forEach(savedObj => {
                const o = m.objectives.find(x => x.id === savedObj.id);
                if (o) o.completed = savedObj.completed;
              });
            }
          }
        });
      }

      if (state.activeMissionId) {
        this.missions.setActiveMission(state.activeMissionId);
      }

      // Restore CyberDeck hardware rig
      if (state.rig && this.rig) {
        this.rig.deserialize(state.rig);
      }

      // Restore Blue Team Defense status
      if (state.defenses && this.defense) {
        this.defense.deserialize(state.defenses);
      }

      // Restore Malware Suite
      if (state.malware && this.malware) {
        this.malware.deserialize(state.malware);
      }
    } catch (e) {
      console.warn("Could not load save state, using fresh defaults:", e);
    }
  }

  // Export savegame to downloadable JSON file
  exportSaveFile() {
    this.saveState(true);
    const raw = localStorage.getItem(this.saveKey);
    if (!raw) return;

    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hacker_simulator_save_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.ui.toast("Savegame exported as JSON file.", "success");
  }

  // Import savegame from JSON file
  importSaveFile(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed.credits !== 'number') {
        throw new Error("Invalid save file structure");
      }
      localStorage.setItem(this.saveKey, jsonString);
      this.loadState();
      this.ui.updateHUD();
      this.ui.renderMissions();
      this.ui.renderArsenal();
      this.ui.toast("Savegame successfully imported!", "success");
      sound.exploitSuccess();
    } catch (err) {
      this.ui.toast(`Import failed: ${err.message}`, "error");
      sound.denied();
    }
  }
}

// Bootstrap once DOM ready
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.game = new GameEngine();
    const unlockAudio = () => sound.ensureContext();
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
  });
}
