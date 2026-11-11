// ============================================================
// HACKER SIMULATOR // IN-GAME SCRIPTING ENGINE & BOTNET RUNTIME
// Executes user JavaScript scripts with 'hs.*' API (like Bitburner's 'ns.*')
// Supports asynchronous execution, loops, botnet farming, logs & threads
// ============================================================

import { sound } from './audio.js';

export class ScriptRuntime {
  constructor(game) {
    this.game = game;
    this.activeScripts = new Map(); // pid -> ScriptProcess
    this.activeTailTimer = null;
  }

  // Check and run a script from the target host's VFS (defaults to current host)
  async runScript(scriptPath, args = [], threads = 1, targetHost = null) {
    const hostNode = targetHost || this.game.terminal.currentHost;
    const vfs = hostNode.vfs;
    const res = vfs.cat(scriptPath);

    if (!res.success) {
      return { success: false, error: `run: cannot open '${scriptPath}': No such file` };
    }

    const scriptCode = res.content;
    const reqThreads = Math.max(1, parseInt(threads) || 1);

    // Enforce CyberDeck Hardware Rig Limits (Review Focus 1)
    if (this.game && this.game.rig) {
      const threadCap = this.game.rig.getThreadsCapacity();
      const currentThreads = Array.from(this.activeScripts.values()).reduce((sum, p) => sum + (p.threads || 1), 0);
      if (currentThreads + reqThreads > threadCap) {
        return { success: false, error: `run: CPU core thread capacity exceeded (${currentThreads}/${threadCap} threads in use). Upgrade CPU via 'market' or kill active scripts.` };
      }

      const maxScripts = this.game.rig.getMaxConcurrentScripts();
      if (this.activeScripts.size >= maxScripts) {
        return { success: false, error: `run: RAM memory bank exhausted (${this.activeScripts.size}/${maxScripts} scripts loaded). Upgrade RAM modules via 'market'.` };
      }
    }

    const scriptName = scriptPath.split('/').pop();
    const pid = (this.game.processes && this.game.processes.nextPid) ? this.game.processes.nextPid++ : Math.floor(Math.random() * 8000 + 1000);

    const scriptProcess = {
      pid,
      name: scriptName,
      path: scriptPath,
      host: hostNode,
      threads: reqThreads,
      args: args,
      logs: [],
      status: 'RUNNING',
      startTime: Date.now(),
      abortController: new AbortController()
    };

    this.activeScripts.set(pid, scriptProcess);

    // Register in UI process table
    let taskPid = pid;
    if (this.game.processes && this.game.processes.spawnTask) {
      taskPid = this.game.processes.spawnTask(
        `${scriptName} [x${scriptProcess.threads}]`,
        hostNode.hostname,
        999999, // Long-running background daemon
        () => {}
      );
    }
    scriptProcess.taskPid = taskPid;

    // Build the sandbox API exposed to player's script (hs.*)
    const hs = this.createScriptAPI(scriptProcess);

    // Run script asynchronously in isolated wrapper
    (async () => {
      try {
        // Construct async function with hs parameter
        const asyncFn = new Function('hs', `
          return (async () => {
            ${scriptCode}
          })();
        `);

        await asyncFn(hs);
        scriptProcess.logs.push(`[${new Date().toLocaleTimeString()}] Script execution finished successfully.`);
        scriptProcess.status = 'COMPLETED';
      } catch (err) {
        if (err.name === 'AbortError' || scriptProcess.abortController.signal.aborted) {
          scriptProcess.logs.push(`[${new Date().toLocaleTimeString()}] Script halted by user.`);
          scriptProcess.status = 'KILLED';
        } else {
          scriptProcess.logs.push(`[${new Date().toLocaleTimeString()}] Script Runtime Error: ${err.message}`);
          scriptProcess.status = 'ERROR';
          this.game.terminal.writeln(`[!] Script error in ${scriptName} (PID ${pid}): ${err.message}`, 'term-error');
        }
      } finally {
        if (this.game.processes) {
          if (this.game.processes.kill) this.game.processes.kill(taskPid);
          if (this.game.processes.render) this.game.processes.render();
        }
        this.activeScripts.delete(pid);
      }
    })();

    return { success: true, pid };
  }

  // Terminate a running script by PID
  killScript(pid) {
    const proc = this.activeScripts.get(pid);
    if (proc) {
      proc.abortController.abort();
      if (this.game.processes) {
        if (this.game.processes.kill) this.game.processes.kill(proc.taskPid);
        if (this.game.processes.render) this.game.processes.render();
      }
      this.activeScripts.delete(pid);
      return true;
    }
    return false;
  }

  // Create the 'hs' (Hacker Simulator) API injected into scripts
  createScriptAPI(proc) {
    const game = this.game;
    const signal = proc.abortController.signal;

    const checkAbort = () => {
      if (signal.aborted) {
        const err = new Error('Script aborted');
        err.name = 'AbortError';
        throw err;
      }
    };

    return {
      // Print to internal script log
      print: (...msgs) => {
        const line = `[${new Date().toLocaleTimeString()}] ${msgs.join(' ')}`;
        proc.logs.push(line);
        if (proc.logs.length > 100) proc.logs.shift();
      },

      // Terminal print
      tprint: (...msgs) => {
        const line = `[PID ${proc.pid}:${proc.name}] ${msgs.join(' ')}`;
        game.terminal.writeln(line, 'term-info');
        proc.logs.push(line);
      },

      // Async sleep in ms
      sleep: async (ms) => {
        checkAbort();
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            signal.removeEventListener('abort', onAbort);
            resolve();
          }, ms);
          const onAbort = () => {
            clearTimeout(timeout);
            const err = new Error('Script aborted');
            err.name = 'AbortError';
            reject(err);
          };
          signal.addEventListener('abort', onAbort);
        });
      },

      // Network reconnaissance
      scan: (targetIp) => {
        const node = game.network.getNode(targetIp || proc.host.ip);
        if (!node) return [];
        return node.connections || [];
      },

      // Check node root status
      hasRoot: (targetIp) => {
        const node = game.network.getNode(targetIp);
        return node ? node.hasRoot : false;
      },

      // Read target security rating
      getServerSecurity: (targetIp) => {
        const node = game.network.getNode(targetIp);
        return node ? node.securityLevel : 0;
      },

      // Read target bounty / available funds
      getServerMoney: (targetIp) => {
        const node = game.network.getNode(targetIp);
        return node ? node.bounty : 0;
      },

      // Automated Hack (drains money and earns BTC credits)
      hack: async (targetIp) => {
        checkAbort();
        const node = game.network.getNode(targetIp);
        if (!node) throw new Error(`Target ${targetIp} unreachable`);
        if (!node.hasRoot) throw new Error(`Target ${targetIp} access denied: root required`);

        // Siphon duration based on security level
        const durationMs = 2000 + (node.securityLevel * 1000);
        await new Promise(r => setTimeout(r, durationMs));
        checkAbort();

        // Calculate siphoned profit scaled by threads
        const yieldBtc = Math.floor((node.bounty * 0.15) * proc.threads);
        game.credits += yieldBtc;
        sound.exploitSuccess();
        game.ui.updateHUD();

        const logMsg = `Hacked ${node.hostname} (+${yieldBtc} ₿ siphoned)`;
        proc.logs.push(`[${new Date().toLocaleTimeString()}] ${logMsg}`);
        return yieldBtc;
      },

      // Weaken security level of a node
      weaken: async (targetIp) => {
        checkAbort();
        const node = game.network.getNode(targetIp);
        if (!node) throw new Error(`Target ${targetIp} unreachable`);

        await new Promise(r => setTimeout(r, 1500));
        checkAbort();

        if (node.securityLevel > 1) {
          node.securityLevel = Math.max(1, node.securityLevel - 0.2);
        }
        const logMsg = `Weakened ${node.hostname} security to ${node.securityLevel.toFixed(1)}`;
        proc.logs.push(`[${new Date().toLocaleTimeString()}] ${logMsg}`);
        return node.securityLevel;
      },

      // Siphon data / Grow financial reserves
      grow: async (targetIp) => {
        checkAbort();
        const node = game.network.getNode(targetIp);
        if (!node) throw new Error(`Target ${targetIp} unreachable`);

        await new Promise(r => setTimeout(r, 2000));
        checkAbort();

        node.bounty = Math.floor(node.bounty * 1.1);
        const logMsg = `Grew ${node.hostname} reserve to ${node.bounty} ₿`;
        proc.logs.push(`[${new Date().toLocaleTimeString()}] ${logMsg}`);
        return node.bounty;
      },

      // Launch a script on a remote rooted server
      exec: async (scriptFile, remoteIp, remoteThreads = 1) => {
        checkAbort();
        const remoteNode = game.network.getNode(remoteIp);
        if (!remoteNode) throw new Error(`Host ${remoteIp} not found`);
        if (!remoteNode.hasRoot) throw new Error(`Cannot exec on ${remoteIp}: target not rooted`);

        // Copy script content to remote host VFS if missing
        const fileName = scriptFile.split('/').pop();
        const srcContent = proc.host.vfs.cat(scriptFile);
        if (srcContent.success) {
          remoteNode.vfs.writeFile(`/bin/${fileName}`, srcContent.content);
        }

        const result = await game.scripts.runScript(`/bin/${fileName}`, [], remoteThreads, remoteNode);
        if (!result.success) {
          throw new Error(result.error || `exec: failed to run ${fileName} on ${remoteNode.hostname}`);
        }
        return result.pid;
      }
    };
  }

  // Display real-time script tail log dialog
  tail(pidOrName) {
    let proc = null;
    if (typeof pidOrName === 'number' || !isNaN(parseInt(pidOrName))) {
      proc = this.activeScripts.get(parseInt(pidOrName));
    } else {
      for (const p of this.activeScripts.values()) {
        if (p.name === pidOrName || p.path === pidOrName) {
          proc = p;
          break;
        }
      }
    }

    if (!proc) {
      this.game.terminal.writeln(`tail: process '${pidOrName}' not found or not active`, 'term-error');
      return;
    }

    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    const modalFooter = document.getElementById('modal-footer');

    modalTitle.textContent = `PROCESS LOGS // PID ${proc.pid} (${proc.name}) [${proc.threads} threads]`;
    modalBody.innerHTML = `
      <div id="tail-log-window" style="background: #000; color: #33ff77; font-family: var(--font-mono); font-size: 11px; padding: 10px; height: 260px; overflow-y: auto; border: 1px solid var(--border-color); white-space: pre-wrap;">
        ${proc.logs.join('\n') || 'Awaiting script output...'}
      </div>
    `;

    modalFooter.innerHTML = `
      <button id="btn-kill-script-modal" class="btn-danger">KILL SCRIPT</button>
      <button id="btn-close-tail" class="btn-tool">CLOSE</button>
    `;

    this.game.ui.openModal();

    if (this.activeTailTimer) clearInterval(this.activeTailTimer);

    // Auto-update log in modal while open
    this.activeTailTimer = setInterval(() => {
      const logBox = document.getElementById('tail-log-window');
      if (logBox && proc) {
        logBox.textContent = proc.logs.join('\n') || 'Awaiting script output...';
        logBox.scrollTop = logBox.scrollHeight;
      } else {
        this.closeTail();
      }
    }, 500);

    document.getElementById('btn-kill-script-modal').addEventListener('click', () => {
      this.killScript(proc.pid);
      this.closeTail();
      this.game.ui.closeModal();
      this.game.terminal.writeln(`[+] Process PID ${proc.pid} (${proc.name}) terminated.`, 'term-warn');
    });

    document.getElementById('btn-close-tail').addEventListener('click', () => {
      this.closeTail();
      this.game.ui.closeModal();
    });
  }

  closeTail() {
    if (this.activeTailTimer) {
      clearInterval(this.activeTailTimer);
      this.activeTailTimer = null;
    }
  }
}
