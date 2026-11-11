// ============================================================
// HACKER SIMULATOR // INTERACTIVE ACADEMY & BEGINNER TUTORIAL
// Foolproof, zero-jargon interactive guide for non-hackers
// ============================================================

import { sound } from './audio.js';

export class TutorialManager {
  constructor(game) {
    this.game = game;
    this.currentStep = 0;
    this.steps = [
      {
        title: "STEP 1 // WELCOME TO HACKER SIMULATOR",
        subtitle: "No coding or Linux experience required",
        body: `
          <p>You play an elite digital operative hired by an underground hacker collective called <strong>NullSector</strong>.</p>
          <p style="margin-top: 8px;">Your job: investigate corporate and government servers, breach their security doors (ports), steal confidential files, and get paid in crypto credits (₿).</p>
          <div style="background: rgba(0, 255, 102, 0.1); border-left: 3px solid var(--text-accent); padding: 8px; margin: 10px 0;">
            <strong>THE 3 MAIN SCREENS:</strong><br>
            &bull; <strong>Left (Terminal):</strong> Your command station where actions happen.<br>
            &bull; <strong>Top Right (Network Map):</strong> Connected computers and targets.<br>
            &bull; <strong>Bottom Right (Missions & Intel):</strong> Your active contracts and rewards.
          </div>
        `,
        suggestedCmd: "help",
        actionBtnText: "Next: Learn Commands &rarr;"
      },
      {
        title: "STEP 2 // LOOKING AT YOUR FILES ('ls')",
        subtitle: "How to see what's on your computer",
        body: `
          <p>Just like double-clicking a folder on Windows or Mac, the command <strong><code>ls</code></strong> stands for <em>List</em>.</p>
          <p style="margin-top: 8px;">Typing <code>ls</code> shows all files and folders in your current location.</p>
          <div style="background: rgba(122, 162, 247, 0.1); border-left: 3px solid var(--text-info); padding: 8px; margin: 10px 0;">
            <strong>TIP:</strong> You can type commands, or just click the <strong>Quick Buttons</strong> directly below the terminal!
          </div>
        `,
        suggestedCmd: "ls -la",
        actionBtnText: "Try 'ls -la' &rarr;"
      },
      {
        title: "STEP 3 // READING A FILE ('cat')",
        subtitle: "How to read mission notes and passwords",
        body: `
          <p>To open and read any text file, use <strong><code>cat [filename]</code></strong>.</p>
          <p style="margin-top: 8px;">Your computer has a notes file with secret target addresses. Let's read <code>notes.md</code>.</p>
          <div style="background: rgba(255, 176, 0, 0.1); border-left: 3px solid var(--text-warning); padding: 8px; margin: 10px 0;">
            Click the button below to automatically read your target notes!
          </div>
        `,
        suggestedCmd: "cat notes.md",
        actionBtnText: "Read 'notes.md' &rarr;"
      },
      {
        title: "STEP 4 // PROBING A TARGET ('scan')",
        subtitle: "Finding open doors on a remote computer",
        body: `
          <p>Every computer on the internet has a unique address called an <strong>IP Address</strong> (like <code>192.168.1.45</code>).</p>
          <p style="margin-top: 8px;">Computers have numbered doorways called <strong>Ports</strong> (Port 21 is for files, Port 22 is for remote login, Port 80 is for websites).</p>
          <p style="margin-top: 8px;">Typing <strong><code>scan 192.168.1.45</code></strong> sweeps the university server to see what doors are vulnerable!</p>
        `,
        suggestedCmd: "scan 192.168.1.45",
        actionBtnText: "Scan 192.168.1.45 &rarr;"
      },
      {
        title: "STEP 5 // BREAKING IN ('crack')",
        subtitle: "Exploiting vulnerable ports",
        body: `
          <p>When a port is unpatched, our exploit tools pick the digital lock!</p>
          <p style="margin-top: 8px;">Typing <strong><code>crack 192.168.1.45</code></strong> launches our FTP payload. A quick memory alignment mini-game will appear—just match the register return address to break through!</p>
          <div style="background: rgba(0, 255, 102, 0.1); border-left: 3px solid var(--text-accent); padding: 8px; margin: 10px 0;">
            Once cracked, you gain <strong>ROOT ACCESS</strong> (administrator control).
          </div>
        `,
        suggestedCmd: "crack 192.168.1.45",
        actionBtnText: "Launch 'crack 192.168.1.45' &rarr;"
      },
      {
        title: "STEP 6 // LOGGING IN & STEALING DATA",
        subtitle: "Remote control ('ssh') and downloading loot ('download')",
        body: `
          <p>1. Type <strong><code>ssh 192.168.1.45</code></strong> to connect your terminal directly inside the university server.</p>
          <p style="margin-top: 6px;">2. Once inside, type <strong><code>ls</code></strong> to find secret files.</p>
          <p style="margin-top: 6px;">3. Type <strong><code>download /home/admin/credentials.txt</code></strong> to copy it to your computer and finish Mission 1!</p>
          <div style="background: rgba(122, 162, 247, 0.1); border-left: 3px solid var(--text-info); padding: 8px; margin: 10px 0;">
            When finished, type <strong><code>exit</code></strong> to safely return to your own machine.
          </div>
        `,
        suggestedCmd: "ssh 192.168.1.45",
        actionBtnText: "Connect with 'ssh' &rarr;"
      },
      {
        title: "STEP 7 // PASSIVE BOTNET INCOME ('run')",
        subtitle: "Automating money while you sleep",
        body: `
          <p>Real hackers don't hack by hand all day—they write autonomous bots!</p>
          <p style="margin-top: 8px;">Your machine comes with a pre-written farming bot: <code>scripts/farm.js</code>.</p>
          <p style="margin-top: 8px;">Type <strong><code>run scripts/farm.js</code></strong> to turn rooted computers into botnet workers that continuously siphon BTC into your bank account!</p>
          <p style="margin-top: 8px;">Type <strong><code>ps</code></strong> to check running bots, or <strong><code>tail 1000</code></strong> to watch the live cash flow!</p>
        `,
        suggestedCmd: "run scripts/farm.js",
        actionBtnText: "Start 'run scripts/farm.js' &rarr;"
      },
      {
        title: "ACADEMY COMPLETE // YOU ARE READY!",
        subtitle: "You now know the core loop of Hacker Simulator",
        body: `
          <p>Here is your basic game loop for every target:</p>
          <ol style="margin-left: 18px; margin-top: 8px; line-height: 1.6;">
            <li><strong>Check Missions:</strong> Pick a target contract in the bottom right panel.</li>
            <li><strong>Recon:</strong> Type <code>scan [ip]</code> to find open ports.</li>
            <li><strong>Exploit:</strong> Type <code>crack [ip]</code> to break the security.</li>
            <li><strong>Infiltrate:</strong> Type <code>ssh [ip]</code> to take control.</li>
            <li><strong>Extract:</strong> Type <code>download [file]</code> to get paid!</li>
          </ol>
          <p style="margin-top: 10px; color: var(--text-accent); font-weight: bold;">
            Bonus: We deposited +200 ₿ starter credits into your account!
          </p>
        `,
        suggestedCmd: "missions",
        actionBtnText: "Start Playing!"
      }
    ];

    this.init();
  }

  init() {
    if (typeof document === 'undefined') return;

    // Insert Quick Command Dock under terminal
    this.insertQuickCommandDock();

    // Check if player has seen tutorial before
    const seen = localStorage.getItem('hacker_sim_tutorial_seen');
    if (!seen) {
      setTimeout(() => {
        this.showTutorialCard(0);
      }, 800);
    }
  }

  // Floating Guided Step-by-Step Card
  showTutorialCard(stepIndex) {
    this.currentStep = stepIndex;
    const step = this.steps[stepIndex];
    if (!step) return;

    let overlay = document.getElementById('tutorial-card-float');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tutorial-card-float';
      overlay.className = 'tutorial-floating-card';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="tut-card-header">
        <div class="tut-header-title">
          <span class="tut-badge">GUIDE ${stepIndex + 1}/${this.steps.length}</span>
          <span class="tut-title-text">${step.title}</span>
        </div>
        <button id="btn-tut-close" class="btn-close" title="Dismiss Guide">&times;</button>
      </div>
      <div class="tut-card-body">
        <div class="tut-subtitle">${step.subtitle}</div>
        <div class="tut-content">${step.body}</div>
      </div>
      <div class="tut-card-footer">
        <div class="tut-pagination">
          ${this.steps.map((_, i) => `<span class="tut-dot ${i === stepIndex ? 'active' : ''}"></span>`).join('')}
        </div>
        <div style="display: flex; gap: 6px;">
          ${stepIndex > 0 ? `<button id="btn-tut-prev" class="btn-tool">&larr; Back</button>` : ''}
          <button id="btn-tut-action" class="btn-action">${step.actionBtnText}</button>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');

    // Button event listeners
    document.getElementById('btn-tut-close').addEventListener('click', () => {
      overlay.classList.add('hidden');
      localStorage.setItem('hacker_sim_tutorial_seen', 'true');
    });

    if (document.getElementById('btn-tut-prev')) {
      document.getElementById('btn-tut-prev').addEventListener('click', () => {
        this.showTutorialCard(stepIndex - 1);
      });
    }

    document.getElementById('btn-tut-action').addEventListener('click', () => {
      if (step.suggestedCmd) {
        // Execute the command in the terminal!
        this.game.terminal.executeCommandLine(step.suggestedCmd);
      }

      if (stepIndex < this.steps.length - 1) {
        this.showTutorialCard(stepIndex + 1);
      } else {
        // Finished tutorial!
        this.game.credits += 200;
        this.game.ui.updateHUD();
        this.game.ui.toast("Academy training complete! +200 ₿ bonus credits awarded.", "success");
        overlay.classList.add('hidden');
        localStorage.setItem('hacker_sim_tutorial_seen', 'true');
      }
    });
  }

  // Quick Command Action Dock (Clickable buttons right under terminal)
  insertQuickCommandDock() {
    const termPanel = document.getElementById('panel-terminal');
    if (!termPanel || document.getElementById('quick-command-dock')) return;

    const dock = document.createElement('div');
    dock.id = 'quick-command-dock';
    dock.className = 'quick-dock';

    dock.innerHTML = `
      <div class="dock-label">QUICK ACTIONS:</div>
      <div id="dock-button-container" class="dock-buttons"></div>
    `;

    termPanel.appendChild(dock);
    this.updateQuickCommandDock();
  }

  // Dynamically update quick action buttons based on active mission and current host
  updateQuickCommandDock() {
    const container = document.getElementById('dock-button-container');
    if (!container) return;

    const currentHost = this.game.terminal ? this.game.terminal.currentHost : null;
    const isRemote = currentHost && currentHost.id !== 'localhost';
    const activeTarget = (this.game.missions && this.game.missions.activeMission && this.game.missions.activeMission.targetIp) || '192.168.1.45';

    let quickCmds = [];

    if (isRemote) {
      quickCmds = [
        { label: "🚪 exit (Return Home)", cmd: "exit", tip: "Close remote connection and return to localhost" },
        { label: "📁 ls (Remote Files)", cmd: "ls -la", tip: "List files on this server" },
        { label: "📖 cat /etc/shadow", cmd: "cat /etc/shadow", tip: "View password hashes" },
        { label: "💾 download file", cmd: "download", tip: "Download file from remote host" },
        { label: "🤖 run farm.js", cmd: "run /bin/farm.js", tip: "Deploy automated worker" },
        { label: "📜 missions", cmd: "missions", tip: "Check contract objectives" }
      ];
    } else {
      quickCmds = [
        { label: "📁 ls (Files)", cmd: "ls -la", tip: "List files in current folder" },
        { label: "📖 cat notes", cmd: "cat notes.md", tip: "Read secret target clues" },
        { label: `🔍 scan ${activeTarget}`, cmd: `scan ${activeTarget}`, tip: `Probe ${activeTarget} for open ports` },
        { label: `💥 crack ${activeTarget}`, cmd: `crack ${activeTarget}`, tip: `Pick locks on ${activeTarget}` },
        { label: `🔑 ssh ${activeTarget}`, cmd: `ssh ${activeTarget}`, tip: `Log into ${activeTarget} as administrator` },
        { label: "🤖 run farm.js", cmd: "run scripts/farm.js", tip: "Earn passive botnet money" },
        { label: "📜 missions", cmd: "missions", tip: "Show contract objectives" }
      ];
    }

    container.innerHTML = quickCmds.map(q => `
      <button class="btn-dock" data-cmd="${q.cmd}" title="${q.tip}">${q.label}</button>
    `).join('');

    container.querySelectorAll('.btn-dock').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        sound.commandExec();
        this.game.terminal.executeCommandLine(cmd);
      });
    });
  }

  // Full Interactive Handbook / Academy Modal
  openTutorialModal() {
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    const modalFooter = document.getElementById('modal-footer');

    modalTitle.textContent = `🎓 HACKER ACADEMY // BEGINNER FIELD MANUAL`;
    modalBody.innerHTML = `
      <div style="font-family: var(--font-mono); font-size: 12px; max-height: 480px; overflow-y: auto;">
        
        <div style="display: flex; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
          <button id="btn-tab-handbook" class="btn-action">PLAIN ENGLISH GLOSSARY</button>
          <button id="btn-tab-walkthrough" class="btn-tool">STEP-BY-STEP WALKTHROUGH</button>
          <button id="btn-tab-cheatsheet" class="btn-tool">COMMAND CHEAT SHEET</button>
        </div>

        <div id="academy-pane-glossary">
          <h3 style="color: var(--text-accent); margin-bottom: 8px;">Hacker Concepts in Plain English</h3>
          <div style="display: flex; flex-direction: column; gap: 8px; line-height: 1.5;">
            <div>
              <strong style="color: var(--text-info);">IP Address (e.g. 192.168.1.45):</strong>
              <div>A computer's street address on the internet. Every machine you hack has one.</div>
            </div>
            <div>
              <strong style="color: var(--text-info);">Ports (e.g. Port 21, Port 22, Port 80):</strong>
              <div>Doors into a computer. Port 21 is for FTP file transfers. Port 22 is SSH remote control. If a door is open and has outdated locks, we can pick it.</div>
            </div>
            <div>
              <strong style="color: var(--text-info);">Root / Admin Privileges:</strong>
              <div>The master key. Whoever has root has total control over the server, can read every secret file, and can wipe logs.</div>
            </div>
            <div>
              <strong style="color: var(--text-info);">Exploit / Vulnerability:</strong>
              <div>A bug in the server software that lets us sneak in without a password. Our <code>crack</code> tool uses these automatically.</div>
            </div>
            <div>
              <strong style="color: var(--text-info);">Botnet / Farm Script:</strong>
              <div>Using computers you've already rooted to quietly generate cryptocurrency credits in the background.</div>
            </div>
          </div>
        </div>

        <div id="academy-pane-walkthrough" class="hidden">
          <h3 style="color: var(--text-accent); margin-bottom: 8px;">Mission 1: Complete Walkthrough</h3>
          <ol style="margin-left: 18px; line-height: 1.6;">
            <li>Type <strong><code>scan 192.168.1.45</code></strong> (or click the quick button). Notice port 21 is open with a vulnerable ProFTPd service.</li>
            <li>Type <strong><code>crack 192.168.1.45</code></strong>. A memory puzzle appears: click the register block that matches the target return address.</li>
            <li>You will see <code>[✔] VULNERABILITY EXPLOITED! Root shell created</code>.</li>
            <li>Type <strong><code>ssh 192.168.1.45</code></strong>. Notice your prompt changes: you are now inside their server!</li>
            <li>Type <strong><code>download /home/admin/credentials.txt</code></strong>. You steal the file and immediately receive +800 ₿ and the Hydra SSH cracker tool!</li>
            <li>Type <strong><code>exit</code></strong> to return to your home computer.</li>
            <li>Type <strong><code>run scripts/farm.js</code></strong> to start passive automated farming!</li>
          </ol>
        </div>

        <div id="academy-pane-cheatsheet" class="hidden">
          <h3 style="color: var(--text-accent); margin-bottom: 8px;">Essential Commands Table</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-dim);">
                <th style="padding: 4px;">Command</th>
                <th style="padding: 4px;">Plain English Meaning</th>
                <th style="padding: 4px;">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="color: var(--text-accent); padding: 4px;">ls</td><td>List files in folder</td><td><code>ls -la</code></td></tr>
              <tr><td style="color: var(--text-accent); padding: 4px;">cat</td><td>Read text inside file</td><td><code>cat notes.md</code></td></tr>
              <tr><td style="color: var(--text-accent); padding: 4px;">scan</td><td>Probe target for open ports</td><td><code>scan 192.168.1.45</code></td></tr>
              <tr><td style="color: var(--text-accent); padding: 4px;">crack</td><td>Break security locks on ports</td><td><code>crack 192.168.1.45</code></td></tr>
              <tr><td style="color: var(--text-accent); padding: 4px;">ssh</td><td>Connect to compromised computer</td><td><code>ssh 192.168.1.45</code></td></tr>
              <tr><td style="color: var(--text-accent); padding: 4px;">download</td><td>Copy file from remote host to your loot</td><td><code>download secret.txt</code></td></tr>
              <tr><td style="color: var(--text-accent); padding: 4px;">run</td><td>Launch automated script in background</td><td><code>run scripts/farm.js</code></td></tr>
              <tr><td style="color: var(--text-accent); padding: 4px;">ps</td><td>List all running background tasks</td><td><code>ps</code></td></tr>
              <tr><td style="color: var(--text-accent); padding: 4px;">exit</td><td>Disconnect and return home</td><td><code>exit</code></td></tr>
            </tbody>
          </table>
        </div>

      </div>
    `;

    modalFooter.innerHTML = `
      <button id="btn-restart-interactive-tutorial" class="btn-action">RESTART GUIDED TOUR</button>
      <button id="btn-close-academy" class="btn-tool">CLOSE MANUAL</button>
    `;

    this.game.ui.openModal();

    // Tab switching in academy modal
    const pGlossary = document.getElementById('academy-pane-glossary');
    const pWalk = document.getElementById('academy-pane-walkthrough');
    const pCheat = document.getElementById('academy-pane-cheatsheet');
    const btnG = document.getElementById('btn-tab-handbook');
    const btnW = document.getElementById('btn-tab-walkthrough');
    const btnC = document.getElementById('btn-tab-cheatsheet');

    btnG.onclick = () => {
      pGlossary.classList.remove('hidden'); pWalk.classList.add('hidden'); pCheat.classList.add('hidden');
      btnG.className = 'btn-action'; btnW.className = 'btn-tool'; btnC.className = 'btn-tool';
    };
    btnW.onclick = () => {
      pGlossary.classList.add('hidden'); pWalk.classList.remove('hidden'); pCheat.classList.add('hidden');
      btnG.className = 'btn-tool'; btnW.className = 'btn-action'; btnC.className = 'btn-tool';
    };
    btnC.onclick = () => {
      pGlossary.classList.add('hidden'); pWalk.classList.add('hidden'); pCheat.classList.remove('hidden');
      btnG.className = 'btn-tool'; btnW.className = 'btn-tool'; btnC.className = 'btn-action';
    };

    document.getElementById('btn-restart-interactive-tutorial').onclick = () => {
      this.game.ui.closeModal();
      this.showTutorialCard(0);
    };

    document.getElementById('btn-close-academy').onclick = () => {
      this.game.ui.closeModal();
    };
  }
}
