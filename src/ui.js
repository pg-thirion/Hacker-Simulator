// ============================================================
// HACKER SIMULATOR // UI MANAGER
// Layout tabs, packet sniffer, inspector, themes, toasts, modals
// ============================================================

import { sound } from './audio.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.currentThemeIndex = 0;
    this.themes = ['theme-matrix', 'theme-amber', 'theme-cyber', 'theme-obsidian'];
    this.crtEnabled = true;

    this.initControls();
    this.initTabs();
    this.initSniffer();
  }

  initControls() {
    // Theme toggle
    const btnTheme = document.getElementById('btn-theme-toggle');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        document.body.classList.remove(this.themes[this.currentThemeIndex]);
        this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
        document.body.classList.add(this.themes[this.currentThemeIndex]);
        this.toast(`Theme switched: ${this.themes[this.currentThemeIndex].replace('theme-', '').toUpperCase()}`, 'info');
      });
    }

    // CRT Toggle
    const btnCrt = document.getElementById('btn-crt-toggle');
    if (btnCrt) {
      btnCrt.addEventListener('click', () => {
        this.crtEnabled = !this.crtEnabled;
        document.body.classList.toggle('crt-overlay', this.crtEnabled);
        this.toast(`CRT Scanlines: ${this.crtEnabled ? 'ENABLED' : 'DISABLED'}`, 'info');
      });
    }

    // Academy Tutorial Button
    const btnTut = document.getElementById('btn-tutorial-open');
    if (btnTut) {
      btnTut.addEventListener('click', () => {
        sound.commandExec();
        if (this.game.tutorial) this.game.tutorial.openTutorialModal();
      });
    }

    // Ambient Drone Toggle
    const btnAmbient = document.getElementById('btn-ambient-toggle');
    if (btnAmbient) {
      btnAmbient.addEventListener('click', () => {
        const active = sound.toggleAmbient();
        btnAmbient.textContent = active ? '🎧' : '🔈';
        this.toast(`Server Room Ambient Hum: ${active ? 'ACTIVE' : 'OFF'}`, 'info');
      });
    }

    // Export Save JSON
    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        this.game.exportSaveFile();
      });
    }

    // Import Save JSON
    const btnImport = document.getElementById('btn-import');
    if (btnImport) {
      btnImport.addEventListener('click', () => {
        this.game.terminal.cmdImport();
      });
    }

    // Audio Toggle (Volume Stepper: 100% -> 60% -> 20% -> Mute)
    const btnAudio = document.getElementById('btn-audio-toggle');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const state = sound.cycleVolume();
        btnAudio.textContent = state.icon;
        this.toast(`Audio FX Volume: ${state.label}`, 'info');
      });
    }

    // Save Game
    const btnSave = document.getElementById('btn-save');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        this.game.saveState();
      });
    }

    // Reset Game
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm("Reset all game progress back to initial factory state?")) {
          localStorage.removeItem('hacker_sim_save_v2');
          window.location.reload();
        }
      });
    }

    // Modal Close
    const btnModalClose = document.getElementById('btn-modal-close');
    if (btnModalClose) {
      btnModalClose.addEventListener('click', () => this.closeModal());
    }

    // Inspector Close
    const btnInspClose = document.getElementById('btn-inspector-close');
    if (btnInspClose) {
      btnInspClose.addEventListener('click', () => this.hideNodeInspector());
    }

    // Terminal Clear & Manual buttons
    const btnTermClear = document.getElementById('btn-term-clear');
    if (btnTermClear) {
      btnTermClear.addEventListener('click', () => this.game.terminal.clear());
    }
    const btnTermHelp = document.getElementById('btn-term-help');
    if (btnTermHelp) {
      btnTermHelp.addEventListener('click', () => this.game.terminal.cmdHelp());
    }
  }

  initTabs() {
    const tabBtns = document.querySelectorAll('.tabs-list .tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const targetId = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });

        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');

        if (targetId === 'tab-missions') this.renderMissions();
        if (targetId === 'tab-tools') this.renderArsenal();
        if (targetId === 'tab-processes') this.game.processes.render();
      });
    });
  }

  initSniffer() {
    const btnClear = document.getElementById('btn-sniffer-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        const tbody = document.getElementById('sniffer-tbody');
        if (tbody) tbody.innerHTML = '';
      });
    }

    // Attach packet arrival to UI table
    const origPacketCb = this.game.network.onPacketCallback;
    this.game.network.onPacketCallback = (packet) => {
      if (origPacketCb) origPacketCb(packet);
      this.addSnifferRow(packet);
    };
  }

  addSnifferRow(packet) {
    const filterInput = typeof document !== 'undefined' ? document.getElementById('sniffer-filter') : null;
    const filter = filterInput ? filterInput.value.trim().toLowerCase() : '';

    if (filter) {
      const src = (packet.srcIp || packet.src || '').toLowerCase();
      const dst = (packet.dstIp || packet.dest || '').toLowerCase();
      const proto = (packet.proto || '').toLowerCase();
      const payload = (packet.payload || packet.info || '').toLowerCase();
      const match = src.includes(filter) || dst.includes(filter) || proto.includes(filter) || payload.includes(filter);
      if (!match) return;
    }

    const tbody = typeof document !== 'undefined' ? document.getElementById('sniffer-tbody') : null;
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.className = 'sniffer-row clickable-row';
    tr.style.cursor = 'pointer';
    tr.setAttribute('title', 'Click to inspect packet headers, hex dump & forge authentication tokens');

    const srcDisplay = packet.srcIp || packet.src || '127.0.0.1';
    const dstDisplay = packet.dstIp || packet.dest || '127.0.0.1';
    const protoDisplay = packet.proto || 'TCP';
    const payloadText = packet.payload || packet.info || '';

    tr.innerHTML = `
      <td>${packet.time || ''}</td>
      <td>${srcDisplay}</td>
      <td>${dstDisplay}</td>
      <td><span class="proto-${protoDisplay.toLowerCase()}">${protoDisplay}</span></td>
      <td>${packet.len || payloadText.length || 0} B</td>
      <td style="font-family: monospace; font-size: 10px;">${this.escapeHtml(payloadText)}</td>
    `;

    tr.addEventListener('click', () => {
      this.showPacketInspector(packet);
    });

    tbody.insertBefore(tr, tbody.firstChild);

    // Limit sniffer rows in DOM to 80
    if (tbody.children.length > 80) {
      tbody.removeChild(tbody.lastChild);
    }
  }

  renderPacketRow(packet) {
    this.addSnifferRow(packet);
  }

  showPacketInspector(packet) {
    const details = (this.game.network && typeof this.game.network.getPacketDetails === 'function')
      ? (this.game.network.getPacketDetails(packet.id) || packet)
      : packet;

    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');

    if (!modalTitle || !modalBody || !modalFooter) return;

    modalTitle.textContent = `DEEP PACKET INSPECTION // ${details.id || 'PACKET'}`;

    const hexDump = details.hexDump || (details.payload ? Array.from(details.payload).map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join(' ') : '00');
    const asciiDump = details.asciiDump || details.payload || details.info || '';
    const srcDisplay = details.srcIp || details.src || '127.0.0.1';
    const dstDisplay = details.dstIp || details.dest || '127.0.0.1';
    const protoDisplay = details.proto || 'TCP';

    modalBody.innerHTML = `
      <div class="packet-inspection-dialog" style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 11px; background: rgba(0,0,0,0.4); padding: 10px; border: 1px solid var(--border-color); border-radius: 4px;">
          <div><span style="color: var(--text-dim);">PACKET ID:</span> <strong style="color: var(--text-accent);">${details.id || 'N/A'}</strong></div>
          <div><span style="color: var(--text-dim);">TIMESTAMP:</span> <strong>${details.time || 'N/A'}</strong></div>
          <div><span style="color: var(--text-dim);">SOURCE:</span> <strong>${srcDisplay}</strong></div>
          <div><span style="color: var(--text-dim);">DESTINATION:</span> <strong>${dstDisplay}</strong></div>
          <div><span style="color: var(--text-dim);">PROTOCOL:</span> <strong class="proto-${protoDisplay.toLowerCase()}">${protoDisplay}</strong></div>
          <div><span style="color: var(--text-dim);">LENGTH:</span> <strong>${details.len || asciiDump.length || 0} bytes</strong></div>
        </div>

        <div>
          <div style="font-size: 10px; color: var(--text-dim); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 1px;">RAW ASCII PAYLOAD</div>
          <pre style="background: #080808; border: 1px solid var(--border-color); color: #7aa2f7; font-family: monospace; font-size: 11px; padding: 10px; border-radius: 4px; max-height: 120px; overflow-y: auto; white-space: pre-wrap; word-break: break-all;">${this.escapeHtml(asciiDump)}</pre>
        </div>

        <div>
          <div style="font-size: 10px; color: var(--text-dim); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 1px;">HEX DUMP</div>
          <pre style="background: #050505; border: 1px solid var(--border-color); color: var(--text-accent); font-family: monospace; font-size: 10px; padding: 10px; border-radius: 4px; max-height: 140px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; line-height: 1.4;">${hexDump}</pre>
        </div>
      </div>
    `;

    modalFooter.innerHTML = `
      <button id="btn-forge-packet" class="btn-action" style="margin-right: 8px;">INJECT FORGED PACKET</button>
      <button id="btn-packet-close" class="btn-tool">CLOSE</button>
    `;

    this.openModal();

    const btnForge = document.getElementById('btn-forge-packet');
    if (btnForge) {
      btnForge.addEventListener('click', () => {
        const result = this.game.network.forgeAuthPacket(details.id);
        if (result && result.success) {
          sound.exploitSuccess();
          const targetName = result.targetNode ? `${result.targetNode.hostname} (${result.targetNode.ip})` : 'Target';
          this.toast(`MITM Token Injection SUCCESS: Root access obtained on ${targetName}!`, 'success');
          this.closeModal();
          this.updateHUD();
          if (this.renderMissions) this.renderMissions();
        } else {
          sound.denied();
          const msg = (result && result.message) ? result.message : "No hijackable authentication token found in packet payload.";
          this.toast(msg, 'danger');
        }
      });
    }

    const btnClose = document.getElementById('btn-packet-close');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.closeModal();
      });
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  showNodeInspector(node) {
    const card = document.getElementById('node-inspector');
    const title = document.getElementById('inspector-name');
    const content = document.getElementById('inspector-details');

    if (!card || !node) return;

    title.textContent = `${node.hostname} (${node.ip})`;

    let openPortsStr = '';
    for (const [p, info] of Object.entries(node.ports)) {
      if (info.open) {
        openPortsStr += `<span class="text-accent">${p}/${info.service}</span> `;
      }
    }

    content.innerHTML = `
      <div class="inspector-row"><span>Subnet:</span><strong>${node.subnet}</strong></div>
      <div class="inspector-row"><span>Security Tier:</span><strong>Level ${node.securityLevel}</strong></div>
      <div class="inspector-row"><span>Root Privilege:</span><strong class="${node.hasRoot ? 'text-accent' : 'text-danger'}">${node.hasRoot ? 'COMPROMISED' : 'LOCKED'}</strong></div>
      <div class="inspector-row"><span>Open Ports:</span><div>${openPortsStr || 'None scanned'}</div></div>
      <div class="inspector-row"><span>Bounty Value:</span><strong class="text-warning">${node.bounty} ₿</strong></div>
      <div style="font-size: 10px; color: var(--text-dim); margin-top: 4px;">${node.description}</div>
    `;

    // Action buttons
    const btnSsh = document.getElementById('btn-quick-ssh');
    const btnScan = document.getElementById('btn-quick-scan');

    if (btnSsh && btnScan) {
      if (node.hasRoot) {
        btnSsh.textContent = 'CONNECT SSH';
        btnSsh.className = 'btn-quick-act';
        btnSsh.onclick = () => {
          this.game.terminal.executeCommandLine(`ssh ${node.ip}`);
        };

        btnScan.textContent = 'RUN FARM BOT';
        btnScan.className = 'btn-quick-act';
        btnScan.onclick = () => {
          this.game.terminal.executeCommandLine(`run scripts/farm.js`);
        };
      } else {
        btnSsh.textContent = 'PORT SCAN';
        btnSsh.className = 'btn-quick-act';
        btnSsh.onclick = () => {
          this.game.terminal.executeCommandLine(`scan ${node.ip}`);
        };

        btnScan.textContent = 'CRACK HOST';
        btnScan.className = 'btn-quick-act';
        btnScan.onclick = () => {
          this.game.terminal.executeCommandLine(`crack ${node.ip}`);
        };
      }
    }

    card.classList.remove('hidden');
  }

  hideNodeInspector() {
    const card = document.getElementById('node-inspector');
    if (card) card.classList.add('hidden');
  }

  renderMissions() {
    const active = this.game.missions.activeMission;
    const heroCard = document.getElementById('mission-active-card');
    const contractsList = document.getElementById('contracts-list');

    if (heroCard && active) {
      heroCard.innerHTML = `
        <div class="mission-tag">ACTIVE CONTRACT // ${active.client}</div>
        <div class="mission-title">${active.title}</div>
        <div class="mission-desc">${active.desc}</div>
        <div class="mission-objectives">
          ${active.objectives.map(o => `
            <div class="obj-item">
              <span class="obj-check ${o.completed ? 'done' : ''}">${o.completed ? '[✔]' : '[ ]'}</span>
              <span>${o.text}</span>
            </div>
          `).join('')}
        </div>
        <div class="mission-footer">
          <span>Target: <strong class="text-accent">${active.targetHost} (${active.targetIp})</strong></span>
          <span>Bounty: <strong class="text-warning">${active.rewardBtc} ₿</strong></span>
        </div>
      `;
    }

    if (contractsList) {
      contractsList.innerHTML = '';
      this.game.missions.missions.forEach(m => {
        const item = document.createElement('div');
        item.className = 'contract-item';
        item.innerHTML = `
          <div>
            <div style="font-weight: 600; color: ${m.completed ? 'var(--text-accent)' : 'var(--text-main)'}">
              ${m.completed ? '✔ ' : ''}${m.id}: ${m.title}
            </div>
            <div style="font-size: 10px; color: var(--text-dim);">${m.client} &bull; Target: ${m.targetIp}</div>
          </div>
          <div style="text-align: right;">
            <div class="text-warning">${m.rewardBtc} ₿</div>
            <span class="version">${m.completed ? 'SOLVED' : (m.id === active.id ? 'ACTIVE' : 'READY')}</span>
          </div>
        `;

        item.addEventListener('click', () => {
          this.game.missions.setActiveMission(m.id);
        });

        contractsList.appendChild(item);
      });

      const btnNewBounty = document.createElement('button');
      btnNewBounty.className = 'btn-action';
      btnNewBounty.style.width = '100%';
      btnNewBounty.style.marginTop = '8px';
      btnNewBounty.textContent = '+ ACQUIRE FREELANCE BOUNTY CONTRACT';
      btnNewBounty.onclick = () => {
        sound.commandExec();
        this.game.missions.generateProceduralContract();
      };
      contractsList.appendChild(btnNewBounty);
    }
  }

  renderArsenal() {
    const grid = document.getElementById('arsenal-grid');
    if (!grid) return;
    grid.innerHTML = '';

    this.game.exploits.tools.forEach(tool => {
      const card = document.createElement('div');
      card.className = `tool-card ${tool.unlocked ? 'unlocked' : ''}`;
      card.innerHTML = `
        <div class="tool-name">${tool.name}</div>
        <div class="tool-desc">${tool.desc}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
          <span class="tool-cost">${tool.cost === 0 ? 'FREE' : tool.cost + ' ₿'}</span>
          <button class="btn-tool ${tool.unlocked ? '' : 'btn-action'}" ${tool.unlocked ? 'disabled' : ''}>
            ${tool.unlocked ? 'EQUIPPED' : 'PURCHASE'}
          </button>
        </div>
      `;

      if (!tool.unlocked) {
        card.querySelector('button').addEventListener('click', () => {
          this.game.terminal.executeCommandLine(`buy ${tool.id}`);
        });
      }

      grid.appendChild(card);
    });
  }

  renderRig() {
    const grid = document.getElementById('rig-grid');
    if (!grid || !this.game.rig) return;
    grid.innerHTML = '';

    const btnOc = document.getElementById('btn-toggle-overclock');
    if (btnOc) {
      const oc = this.game.rig.overclockActive;
      const throttled = this.game.rig.isThrottled;
      btnOc.textContent = throttled ? `THROTTLED (${this.game.rig.temperature.toFixed(0)}°C)` : `OVERCLOCK: ${oc ? 'ON (2X SPEED)' : 'OFF'}`;
      btnOc.style.color = throttled ? 'var(--text-danger)' : (oc ? 'var(--text-accent)' : 'var(--text-warning)');
      btnOc.onclick = () => {
        this.game.terminal.executeCommandLine('overclock');
        this.renderRig();
      };
    }

    const catalog = this.game.rig.getMarketCatalog();
    for (const [slot, items] of Object.entries(catalog)) {
      const equippedId = this.game.rig.slots[slot];
      const equippedItem = items.find(i => i.id === equippedId);
      if (!equippedItem) continue;

      const card = document.createElement('div');
      card.className = 'tool-card unlocked';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 10px; color: var(--text-dim); text-transform: uppercase;">[${slot}]</span>
          <span style="font-size: 10px; color: var(--text-accent); font-weight: bold;">ACTIVE</span>
        </div>
        <div class="tool-name" style="margin-top: 4px;">${equippedItem.name}</div>
        <div class="tool-desc">${equippedItem.desc}</div>
        <div style="margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 6px;">
          <div style="font-size: 10px; color: var(--text-dim); margin-bottom: 4px;">AVAILABLE UPGRADES:</div>
          ${items.filter(i => i.id !== equippedId && i.price > 0).map(u => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 11px;">
              <span>${u.name.split(' ')[0]} ${u.name.split(' ')[1] || ''}</span>
              <button class="btn-tool btn-action btn-rig-upgrade" data-id="${u.id}" style="padding: 2px 6px;">
                ${u.price} ₿
              </button>
            </div>
          `).join('')}
        </div>
      `;

      card.querySelectorAll('.btn-rig-upgrade').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.game.terminal.executeCommandLine(`buy ${id}`);
          this.renderRig();
        });
      });

      grid.appendChild(card);
    }
  }

  updateHUD() {
    const credEl = document.getElementById('credits-display');
    const traceBar = document.getElementById('trace-bar');
    const tracePercent = document.getElementById('trace-percent');

    if (credEl) credEl.textContent = `${this.game.credits} ₿`;

    const trace = this.game.network.activeTrace;
    if (traceBar) traceBar.style.width = `${trace}%`;
    if (tracePercent) {
      tracePercent.textContent = `${Math.floor(trace)}%`;
      tracePercent.style.color = trace > 70 ? 'var(--text-danger)' : 'var(--text-main)';
    }
  }

  openModal() {
    const modal = document.getElementById('modal-overlay');
    if (modal) modal.classList.remove('hidden');
  }

  closeModal() {
    if (this.game.scripts) this.game.scripts.closeTail();
    const modal = document.getElementById('modal-overlay');
    if (modal) modal.classList.add('hidden');
  }

  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => container.removeChild(toast), 300);
    }, 3500);
  }
}
