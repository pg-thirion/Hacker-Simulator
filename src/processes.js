// ============================================================
// HACKER SIMULATOR // PROCESS & DAEMON MANAGER
// Background workers, botnet zombies, compute power, task threads
// ============================================================

export class ProcessManager {
  constructor(game) {
    this.game = game;
    this.processes = [];
    this.nextPid = 1000;
  }

  spawnTask(name, target, durationSec, onComplete) {
    const pid = this.nextPid++;
    const task = {
      pid,
      name,
      target,
      durationSec,
      elapsed: 0,
      progress: 0,
      onComplete
    };
    this.processes.push(task);
    this.render();
    return pid;
  }

  kill(pid) {
    const idx = this.processes.findIndex(p => p.pid === pid);
    if (idx !== -1) {
      this.processes.splice(idx, 1);
      this.render();
      return true;
    }
    return false;
  }

  tick(deltaSec) {
    let changed = false;
    for (let i = this.processes.length - 1; i >= 0; i--) {
      const p = this.processes[i];
      p.elapsed += deltaSec;
      p.progress = Math.min(100, Math.floor((p.elapsed / p.durationSec) * 100));

      if (p.elapsed >= p.durationSec) {
        if (p.onComplete) p.onComplete();
        this.processes.splice(i, 1);
        changed = true;
      } else {
        changed = true;
      }
    }

    if (changed) {
      this.render();
    }
  }

  render() {
    if (typeof document === 'undefined') return;
    const tbody = document.getElementById('process-tbody');
    const daemonCount = document.getElementById('daemon-count');
    const botnetCount = document.getElementById('botnet-count');
    const computePower = document.getElementById('compute-power');

    // Count rooted nodes as botnet zombies
    let rooted = 0;
    this.game.network.nodes.forEach(n => {
      if (n.hasRoot && n.id !== 'localhost') rooted++;
    });

    if (daemonCount) daemonCount.textContent = this.processes.length;
    if (botnetCount) botnetCount.textContent = `${rooted} nodes`;
    if (computePower) computePower.textContent = `${(1.0 + rooted * 1.5).toFixed(1)} GHz`;

    if (!tbody) return;
    tbody.innerHTML = '';

    if (this.processes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 12px;">No active background daemons running.</td></tr>`;
      return;
    }

    this.processes.forEach(p => {
      const remaining = Math.max(0, Math.ceil(p.durationSec - p.elapsed));
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.pid}</td>
        <td>${p.target}</td>
        <td><span class="text-accent">${p.name}</span></td>
        <td>
          <div class="progress-bar-inline">
            <div class="progress-fill" style="width: ${p.progress}%"></div>
          </div>
          ${p.progress}%
        </td>
        <td>${remaining}s</td>
        <td><button class="btn-danger btn-tool" data-pid="${p.pid}">KILL</button></td>
      `;

      tr.querySelector('button').addEventListener('click', () => {
        this.kill(p.pid);
      });

      tbody.appendChild(tr);
    });
  }
}
