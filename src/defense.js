// ============================================================
// HACKER SIMULATOR // BLUE TEAM AI DEFENSE & DEFCON ENGINE
// Autonomous SOC defense, DEFCON alerts, sysadmin process hunting,
// port patching, persistent backdoors, and honeypot detection.
// ============================================================

export class BlueTeamDefense {
  constructor(game) {
    this.game = game;
    // Map of nodeId -> { defcon: 5, alertTimer: 0, patchTimer: 60, hasBackdoor: false, lastPatrol: 0 }
    this.nodeDefenses = new Map();

    this.initDefenses();
  }

  initDefenses() {
    if (!this.game || !this.game.network || !this.game.network.nodes) return;
    for (const [id, node] of this.game.network.nodes.entries()) {
      if (node.securityLevel >= 2) {
        this.nodeDefenses.set(id, {
          defcon: 5,
          alertTimer: 0,
          patchTimer: 60,
          hasBackdoor: false,
          lastPatrol: 0
        });
      }
    }
  }

  getRecord(nodeId) {
    if (!this.nodeDefenses.has(nodeId)) {
      const node = this.game.network ? this.game.network.getNode(nodeId) : null;
      if (node && node.securityLevel >= 2) {
        this.nodeDefenses.set(node.id, {
          defcon: 5,
          alertTimer: 0,
          patchTimer: 60,
          hasBackdoor: false,
          lastPatrol: 0
        });
      }
    }
    return this.nodeDefenses.get(nodeId) || null;
  }

  getNodeDefcon(nodeId) {
    const rec = this.getRecord(nodeId);
    return rec ? rec.defcon : 5;
  }

  escalateAlert(nodeId, reason = '') {
    const rec = this.getRecord(nodeId);
    if (!rec) return;

    if (rec.defcon === 5) {
      rec.defcon = 3;
      rec.alertTimer = 90; // 90 seconds in DEFCON 3
      if (this.game.ui && this.game.ui.toast) {
        this.game.ui.toast(`[DEFCON 3] SOC Alert on ${nodeId}: ${reason}`, 'warning');
      }
    } else if (rec.defcon === 3) {
      rec.defcon = 1;
      rec.alertTimer = 180; // 3 minutes in DEFCON 1
      rec.patchTimer = 60;
      if (this.game.ui && this.game.ui.toast) {
        this.game.ui.toast(`[DEFCON 1 RED ALERT] Active Intrusion Response on ${nodeId}!`, 'error');
      }
    }
    if (typeof this.game.markDirty === 'function') this.game.markDirty();
  }

  getTraceMultiplier(nodeId) {
    const defcon = this.getNodeDefcon(nodeId);
    if (defcon === 1) return 2.5; // +150% trace rate
    if (defcon === 3) return 1.5; // +50% trace rate
    return 1.0;
  }

  hasBackdoor(nodeId) {
    const rec = this.getRecord(nodeId);
    return rec ? rec.hasBackdoor : false;
  }

  installBackdoor(nodeId) {
    const node = this.game.network ? this.game.network.getNode(nodeId) : null;
    if (!node) return { success: false, message: `Node '${nodeId}' not found.` };
    if (!node.hasRoot) return { success: false, message: `Root access required to plant rootkit backdoor.` };

    const rec = this.getRecord(node.id);
    if (rec) {
      rec.hasBackdoor = true;
      if (typeof this.game.markDirty === 'function') this.game.markDirty();
      return { success: true, message: `Persistent rootkit daemon installed on ${node.hostname}. Sysadmin cannot revoke access.` };
    }
    return { success: true, message: `Node ${node.hostname} does not run active SOC defenses. Access is already permanent.` };
  }

  // Detects honeypot files
  checkHoneypotAccess(nodeId, filePath) {
    if (filePath.endsWith('passwords.kdbx') || filePath.endsWith('honeypot.token')) {
      this.escalateAlert(nodeId, "TRIPWIRE DETECTED: Honeypot file accessed");
      if (this.game.network) {
        this.game.network.activeTrace = Math.min(100, this.game.network.activeTrace + 50);
      }
      return true;
    }
    return false;
  }

  tickDefense(deltaSec = 1) {
    for (const [nodeId, rec] of this.nodeDefenses.entries()) {
      if (rec.defcon === 1 || rec.defcon === 3) {
        rec.alertTimer -= deltaSec;
        if (rec.alertTimer <= 0) {
          rec.defcon = (rec.defcon === 1) ? 3 : 5;
          rec.alertTimer = (rec.defcon === 3) ? 60 : 0;
        }
      }

      // DEFCON 1 Sysadmin Process Hunter
      if (rec.defcon === 1) {
        rec.lastPatrol += deltaSec;
        if (rec.lastPatrol >= 10) {
          rec.lastPatrol = 0;
          this.sweepRogueProcesses(nodeId);
        }

        // Port patching timer (if no backdoor installed)
        if (!rec.hasBackdoor) {
          rec.patchTimer -= deltaSec;
          if (rec.patchTimer <= 0) {
            rec.patchTimer = 60;
            this.patchCrackedPorts(nodeId);
          }
        }
      }
    }
  }

  sweepRogueProcesses(nodeId) {
    if (!this.game.scripts || !this.game.scripts.activeScripts) return;
    for (const [pid, proc] of this.game.scripts.activeScripts.entries()) {
      if (proc.host && proc.host.id === nodeId) {
        // Kill rogue script
        if (this.game.scripts.killScript) {
          this.game.scripts.killScript(pid);
        }
        if (this.game.terminal) {
          this.game.terminal.writeln(`[!] BLUE TEAM SIGKILL: Sysadmin on ${proc.host.hostname} terminated unauthorized bot (PID ${pid}: ${proc.name})`, 'term-error');
        }
        if (this.game.ui && this.game.ui.toast) {
          this.game.ui.toast(`Bot on ${proc.host.hostname} killed by sysadmin!`, 'error');
        }
      }
    }
  }

  patchCrackedPorts(nodeId) {
    const node = this.game.network ? this.game.network.getNode(nodeId) : null;
    if (!node || node.hasRoot === false) return;

    // Review Focus 2: Story campaign mission targets never lock permanently
    const storyTargets = ['univ-ftp', 'shadow-bank', 'corp-dmz', 'apex-airgap'];
    if (storyTargets.includes(nodeId)) return;

    // Reset root state if no backdoor
    node.hasRoot = false;
    if (this.game.terminal && this.game.terminal.currentHost && this.game.terminal.currentHost.id === nodeId) {
      this.game.terminal.cmdExit();
      this.game.terminal.writeln(`[!] CONNECTION SEVERED: SOC security engineers patched firewall ports on ${node.hostname}.`, 'term-error');
    }
  }

  serialize() {
    const entries = [];
    for (const [id, rec] of this.nodeDefenses.entries()) {
      entries.push({ id, ...rec });
    }
    return entries;
  }

  deserialize(data) {
    if (!Array.isArray(data)) return;
    for (const item of data) {
      if (item && item.id) {
        this.nodeDefenses.set(item.id, {
          defcon: item.defcon || 5,
          alertTimer: item.alertTimer || 0,
          patchTimer: item.patchTimer || 60,
          hasBackdoor: item.hasBackdoor || false,
          lastPatrol: item.lastPatrol || 0
        });
      }
    }
  }
}
