// ============================================================
// HACKER SIMULATOR // MISSIONS & CONTRACTS ENGINE
// Underground fixer "NullSector", narrative arcs, reward triggers
// ============================================================

import { sound } from './audio.js';

export const STORY_MISSIONS = [
  {
    id: 'M-01',
    title: 'First Incursion: Academic Footprint',
    client: 'NullSector Dispatch',
    targetIp: '192.168.1.45',
    targetHost: 'acad-ftp.edu',
    desc: 'A local polytechnic holds unreleased network vulnerability tests. Scan their public FTP, bypass port 21 backdoor, and extract admin credentials.',
    objectives: [
      { id: 'scan_univ', text: 'Scan 192.168.1.45 using nmap', completed: false },
      { id: 'crack_univ', text: 'Exploit ProFTPd vulnerability on port 21', completed: false },
      { id: 'download_creds', text: 'Download /home/admin/credentials.txt to local loot', completed: false }
    ],
    rewardBtc: 800,
    rewardTools: ['ssh_brute'],
    completed: false
  },
  {
    id: 'M-02',
    title: 'Offshore Phantom: Cayman Ledger',
    client: 'GhostHoldings Whistleblower',
    targetIp: '104.28.19.82',
    targetHost: 'cayman-core.finance',
    desc: 'Target offshore shadow bank. Unmask their SQL database, gain root shell access, and download the confidential transaction ledger.',
    objectives: [
      { id: 'scan_bank', text: 'Recon 104.28.19.82 for open database ports', completed: false },
      { id: 'root_bank', text: 'Breach security and obtain root privileges', completed: false },
      { id: 'download_ledger', text: 'Download /var/db_dumps/ledger_accounts.csv', completed: false }
    ],
    rewardBtc: 2000,
    rewardTools: ['sqli_injector'],
    completed: false
  },
  {
    id: 'M-03',
    title: 'Ghost In The Wire: Corporate DMZ',
    client: 'NullSector Inner Council',
    targetIp: '172.16.0.1',
    targetHost: 'chimera-corp-gw',
    desc: 'Chimera Defense Systems guards military telemetry behind a hardened firewall. Crack SSH and retrieve the orbital defense blueprints.',
    objectives: [
      { id: 'scan_corp', text: 'Map ports on Chimera Gateway (172.16.0.1)', completed: false },
      { id: 'root_corp', text: 'Infiltrate and gain root shell', completed: false },
      { id: 'download_blueprints', text: 'Download orbital_schematics.dxf from /opt/chimera/blueprints', completed: false }
    ],
    rewardBtc: 5000,
    rewardTools: ['kernel_zero_day'],
    completed: false
  },
  {
    id: 'M-04',
    title: 'Project Chimera: Air-Gap Overwrite',
    client: 'Global Liberation Alliance',
    targetIp: '10.0.4.99',
    targetHost: 'apex-black-box',
    desc: 'The master orbital laser control terminal is isolated from public nets. Pivot through corporate relays, exploit the zero-day kernel bug, and extract the master killswitch key.',
    objectives: [
      { id: 'scan_apex', text: 'Locate and scan Apex Air-Gap Mainframe (10.0.4.99)', completed: false },
      { id: 'root_apex', text: 'Deploy Ring-0 exploit to achieve master root', completed: false },
      { id: 'download_key', text: 'Download /defense/killswitch/override_master.key', completed: false }
    ],
    rewardBtc: 25000,
    rewardTools: [],
    completed: false
  }
];

export class MissionManager {
  constructor(game) {
    this.game = game;
    this.missions = STORY_MISSIONS.map(m => ({
      ...m,
      objectives: m.objectives.map(o => ({ ...o }))
    }));
    this.activeMission = this.missions[0];
  }

  setActiveMission(missionId) {
    const found = this.missions.find(m => m.id === missionId);
    if (found) {
      this.activeMission = found;
      this.game.ui.renderMissions();
      this.game.ui.toast(`Active contract updated: ${found.title}`, 'info');
    }
  }

  checkProgress(eventType, data) {
    if (!this.activeMission || this.activeMission.completed) return;

    let updated = false;

    if (eventType === 'scan') {
      const targetIp = data.ip;
      if (this.activeMission.id === 'M-01' && targetIp === '192.168.1.45') {
        const obj = this.activeMission.objectives.find(o => o.id === 'scan_univ');
        if (obj && !obj.completed) { obj.completed = true; updated = true; }
      }
      if (this.activeMission.id === 'M-02' && targetIp === '104.28.19.82') {
        const obj = this.activeMission.objectives.find(o => o.id === 'scan_bank');
        if (obj && !obj.completed) { obj.completed = true; updated = true; }
      }
      if (this.activeMission.id === 'M-03' && targetIp === '172.16.0.1') {
        const obj = this.activeMission.objectives.find(o => o.id === 'scan_corp');
        if (obj && !obj.completed) { obj.completed = true; updated = true; }
      }
      if (this.activeMission.id === 'M-04' && targetIp === '10.0.4.99') {
        const obj = this.activeMission.objectives.find(o => o.id === 'scan_apex');
        if (obj && !obj.completed) { obj.completed = true; updated = true; }
      }
      // Dynamic Freelance Bounty handling
      if (this.activeMission.id.startsWith('B-') && targetIp === this.activeMission.targetIp) {
        const obj = this.activeMission.objectives.find(o => o.id.startsWith('scan_'));
        if (obj && !obj.completed) { obj.completed = true; updated = true; }
      }
    }

    if (eventType === 'root') {
      const targetIp = data.ip;
      if (this.activeMission.id === 'M-01' && targetIp === '192.168.1.45') {
        const obj = this.activeMission.objectives.find(o => o.id === 'crack_univ');
        if (obj && !obj.completed) { obj.completed = true; updated = true; }
      }
      if (this.activeMission.id === 'M-02' && targetIp === '104.28.19.82') {
        const obj = this.activeMission.objectives.find(o => o.id === 'root_bank');
        if (obj && !obj.completed) { obj.completed = true; updated = true; }
      }
      if (this.activeMission.id === 'M-03' && targetIp === '172.16.0.1') {
        const obj = this.activeMission.objectives.find(o => o.id === 'root_corp');
        if (obj && !obj.completed) { obj.completed = true; updated = true; }
      }
      if (this.activeMission.id === 'M-04' && targetIp === '10.0.4.99') {
        const obj = this.activeMission.objectives.find(o => o.id === 'root_apex');
        if (obj && !obj.completed) { obj.completed = true; updated = true; }
      }
      // Dynamic Freelance Bounty handling
      if (this.activeMission.id.startsWith('B-') && targetIp === this.activeMission.targetIp) {
        const obj = this.activeMission.objectives.find(o => o.id.startsWith('root_'));
        if (obj && !obj.completed) { obj.completed = true; updated = true; }
      }
    }

    if (eventType === 'download') {
      const fileName = data.file;
      if (this.activeMission.id === 'M-01' && fileName.includes('credentials.txt')) {
        const obj = this.activeMission.objectives.find(o => o.id === 'download_creds');
        if (obj && !obj.completed) { obj.completed = true; updated = true; }
      }
      if (this.activeMission.id === 'M-02' && fileName.includes('ledger_accounts.csv')) {
        const obj = this.activeMission.objectives.find(o => o.id === 'download_ledger');
        if (obj && !obj.completed) { obj.completed = true; updated = true; }
      }
      if (this.activeMission.id === 'M-03' && fileName.includes('orbital_schematics.dxf')) {
        const obj = this.activeMission.objectives.find(o => o.id === 'download_blueprints');
        if (obj && !obj.completed) { obj.completed = true; updated = true; }
      }
      if (this.activeMission.id === 'M-04' && fileName.includes('override_master.key')) {
        const obj = this.activeMission.objectives.find(o => o.id === 'download_key');
        if (obj && !obj.completed) { obj.completed = true; updated = true; }
      }
    }

    if (updated) {
      sound.exploitSuccess();
      if (this.game.ui && this.game.ui.renderMissions) this.game.ui.renderMissions();
      this.checkCompletion();
    }
  }

  checkCompletion() {
    const allDone = this.activeMission.objectives.every(o => o.completed);
    if (allDone && !this.activeMission.completed) {
      this.activeMission.completed = true;
      this.game.credits += this.activeMission.rewardBtc;

      // Unlock tools
      if (this.activeMission.rewardTools) {
        this.activeMission.rewardTools.forEach(tId => {
          this.game.exploits.unlockTool(tId);
        });
      }

      sound.connect();
      if (this.game.ui) {
        if (this.game.ui.toast) this.game.ui.toast(`CONTRACT COMPLETE! +${this.activeMission.rewardBtc} ₿ payout received.`, 'success');
        if (this.game.ui.updateHUD) this.game.ui.updateHUD();
        if (this.game.ui.renderMissions) this.game.ui.renderMissions();
        if (this.game.ui.renderArsenal) this.game.ui.renderArsenal();
      }

      // Check if next mission should auto-activate
      const curIdx = this.missions.findIndex(m => m.id === this.activeMission.id);
      if (curIdx < this.missions.length - 1) {
        const nextM = this.missions[curIdx + 1];
        // Discover next mission target node
        const nextNode = this.game.network.getNode(nextM.targetIp);
        if (nextNode) nextNode.isDiscovered = true;
        if (this.game.ui && this.game.ui.toast) this.game.ui.toast(`New contract unlocked: ${nextM.title}`, 'info');
      } else {
        // Game Victory!
        if (typeof document !== 'undefined') {
          this.showVictoryModal();
        }
      }
    }
  }

  showVictoryModal() {
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    const modalFooter = document.getElementById('modal-footer');

    modalTitle.textContent = `SYSTEM DOMINANCE ACHIEVED // APEX OVERRIDE ACTIVE`;
    modalBody.innerHTML = `
      <div style="font-family: var(--font-mono); text-align: center; padding: 10px;">
        <h2 style="color: var(--text-accent); margin-bottom: 12px;">CONGRATULATIONS, ROOT OPERATOR!</h2>
        <p style="color: var(--text-main); line-height: 1.5; margin-bottom: 14px;">
          You have systematically bypassed all firewalls, infiltrated the offshore banking network, compromised corporate DMZs, and seized the master orbital defense killswitch key.
        </p>
        <div style="background: rgba(0,255,102,0.1); border: 1px solid var(--text-accent); padding: 12px; margin-bottom: 14px; font-weight: bold; color: var(--text-accent);">
          FLAG: FLAG{APEX_DEFENSE_COMPROMISED_CYBER_SUPREMACY_2026}
        </div>
        <p style="color: var(--text-dim); font-size: 11px;">
          All nodes on the network are now under your control. Continue exploring, writing scripts, or generating endless custom contracts.
        </p>
      </div>
    `;

    modalFooter.innerHTML = `<button id="btn-victory-close" class="btn-action">CONTINUE OPERATIONS</button>`;
    this.game.ui.openModal();

    document.getElementById('btn-victory-close').addEventListener('click', () => {
      this.game.ui.closeModal();
    });
  }

  // Generate a procedural freelance bounty contract for endless play
  generateProceduralContract() {
    const candidates = Array.from(this.game.network.nodes.values()).filter(n => n.id !== 'localhost');
    if (candidates.length === 0) return null;

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const bountyNum = Math.floor(Math.random() * 800 + 100);
    const bountyId = `B-${bountyNum}`;
    const clients = [
      'NullSector Broker',
      'Syndicate Darknet Node',
      'Anonymous Whistleblower',
      'Offshore Defense Analyst',
      'Crypto Consortium'
    ];
    const client = clients[Math.floor(Math.random() * clients.length)];
    const reward = (target.securityLevel * 1200) + Math.floor(Math.random() * 1000);

    const contract = {
      id: bountyId,
      title: `Freelance Contract: ${target.hostname}`,
      client: client,
      targetIp: target.ip,
      targetHost: target.hostname,
      desc: `High-value intelligence contract targeting ${target.hostname} (${target.ip}). Infiltrate the host, exploit open ports, and secure administrative root control.`,
      objectives: [
        { id: `scan_${bountyId}`, text: `Scan ${target.ip} with nmap`, completed: false },
        { id: `root_${bountyId}`, text: `Breach security and root ${target.hostname}`, completed: target.hasRoot }
      ],
      rewardBtc: reward,
      rewardTools: [],
      completed: false
    };

    target.isDiscovered = true;
    this.missions.push(contract);
    this.setActiveMission(contract.id);

    if (this.game.ui && this.game.ui.renderMissions) {
      this.game.ui.renderMissions();
      this.game.ui.toast(`Generated freelance contract: ${contract.title}`, 'info');
    }

    return contract;
  }
}
