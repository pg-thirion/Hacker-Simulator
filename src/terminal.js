// ============================================================
// HACKER SIMULATOR // TERMINAL EMULATOR
// Linux Bash shell emulation, VFS routing, piping, autocomplete
// ============================================================

import { sound } from './audio.js';

export class TerminalEmulator {
  constructor(game) {
    this.game = game;
    this.history = [];
    this.historyIndex = -1;
    this.currentHost = null; // Currently connected NetworkNode
    this.currentUser = 'player';
    this.isRoot = true;

    this.container = typeof document !== 'undefined' ? document.getElementById('terminal-container') : null;
    this.output = typeof document !== 'undefined' ? document.getElementById('terminal-output') : null;
    this.input = typeof document !== 'undefined' ? document.getElementById('terminal-input') : null;
    this.promptEl = typeof document !== 'undefined' ? document.getElementById('terminal-prompt') : null;
    this.tabTitle = typeof document !== 'undefined' ? document.getElementById('terminal-tab-title') : null;
    this.autocompleteBox = typeof document !== 'undefined' ? document.getElementById('autocomplete-hints') : null;

    this.panes = new Map();
    this.activePaneId = 'main';
    this.paneCounter = 0;
    this.mainPane = null;

    this.commands = [
      'help', 'man', 'clear', 'ls', 'cat', 'cd', 'pwd', 'mkdir', 'touch', 'rm',
      'cp', 'mv', 'echo', 'whoami', 'date', 'uname', 'history', 'ps', 'kill',
      'ifconfig', 'ip', 'ping', 'scan', 'nmap', 'ssh', 'connect', 'exit', 'logout',
      'crack', 'exploit', 'nuke', 'download', 'upload', 'decrypt', 'nano', 'vim',
      'missions', 'buy', 'arsenal', 'trace', 'run', 'tail', 'tutorial', 'guide',
      'grep', 'head', 'wc', 'top', 'traceroute', 'export', 'import',
      'rig', 'market', 'overclock', 'backdoor', 'defcon',
      'miner', 'encrypt', 'r2', 'radare2',
      'split', 'tmux', 'close'
    ];

    this.init();
  }

  init() {
    this.currentHost = this.game.network ? this.game.network.getNode('localhost') : null;
    this.updatePrompt();

    // Input listeners
    if (this.input) {
      this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
      this.input.addEventListener('input', () => sound.keyClick());
    }
    if (this.container && this.input) {
      this.container.addEventListener('click', () => this.input.focus());
    }

    // Print welcome banner
    this.printBanner();
  }

  printBanner() {
    const banner = 
`  _    _            _             _____ _                 _       _             
 | |  | |          | |           / ____(_)               | |     | |            
 | |__| | __ _  ___| | _____ _ _| (___  _ _ __ ___  _   _| | __ _| |_ ___  _ __ 
 |  __  |/ _\` |/ __| |/ / _ \\ '__\\___ \\| | '_ \` _ \\| | | | |/ _\` | __/ _ \\| '__|
 | |  | | (_| | (__|   <  __/ |  ____) | | | | | | | |_| | | (_| | || (_) | |   
 |_|  |_|\\__,_|\\___|_|\\_\\___|_| |_____/|_|_| |_| |_|\\__,_|_|\\__,_|\\__\\___/|_|   
 -------------------------------------------------------------------------------
 KERNEL: Linux 6.4.0-hacker-x86_64 | SYSTEM: hackbox | SECURE SHELL ACTIVE
 -------------------------------------------------------------------------------
 [★] NEW PLAYER? Type 'tutorial' or click '🎓 TUTORIAL / ACADEMY' at the top!
 [★] NOT A HACKER? Click the QUICK ACTION buttons below the prompt to play!
 -------------------------------------------------------------------------------`;
    this.writeln(banner, 'ansi-cyan');
    this.writeln('');
  }

  updatePrompt() {
    const hostName = this.currentHost ? this.currentHost.hostname : 'localhost';
    const isLocal = this.currentHost && this.currentHost.id === 'localhost';
    this.currentUser = isLocal ? 'root' : (this.currentHost.hasRoot ? 'root' : 'user');
    this.isRoot = (this.currentUser === 'root');

    const vfs = this.currentHost.vfs;
    let path = vfs.pwd();
    if (path.startsWith('/home/' + this.currentUser)) {
      path = '~' + path.slice(('/home/' + this.currentUser).length);
    } else if (this.isRoot && path === '/root') {
      path = '~';
    }

    const symbol = this.isRoot ? '#' : '$';
    const promptColor = this.isRoot ? 'ansi-red' : 'ansi-green';
    
    if (this.promptEl) {
      this.promptEl.innerHTML = `<span class="${promptColor}">${this.currentUser}@${hostName}</span>:<span class="ansi-blue">${path}</span>${symbol}&nbsp;`;
    }
    if (this.tabTitle) {
      this.tabTitle.textContent = `bash - ${this.currentUser}@${hostName}:${path}`;
    }

    // Update top HUD metrics
    if (typeof document !== 'undefined') {
      const hostDisp = document.getElementById('current-host-display');
      const privDisp = document.getElementById('privilege-display');
      if (hostDisp) hostDisp.textContent = `${hostName} (${this.currentHost.ip})`;
      if (privDisp) {
        privDisp.textContent = this.isRoot ? 'ROOT' : 'USER';
        privDisp.className = this.isRoot ? 'metric-value badge-root' : 'metric-value badge-user';
      }
    }
  }

  handleKeyDown(e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        const pText = this.promptEl ? this.promptEl.textContent : '';
        this.writeln(`${pText}${this.input.value}^C`, 'term-dim');
        this.input.value = '';
        this.historyDraft = '';
        if (this.autocompleteBox) this.autocompleteBox.classList.add('hidden');
        this.scrollToBottom();
        return;
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        this.clear();
        return;
      }
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        this.input.value = '';
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const rawCmd = this.input.value.trim();
      if (this.autocompleteBox) this.autocompleteBox.classList.add('hidden');
      this.historyDraft = '';
      if (rawCmd.length > 0) {
        this.history.push(rawCmd);
        this.historyIndex = this.history.length;
        sound.commandExec();
        this.executeCommandLine(rawCmd);
      } else {
        this.writeln(this.promptEl ? this.promptEl.textContent : '');
      }
      this.input.value = '';
      this.scrollToBottom();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.history.length > 0) {
        if (this.historyIndex === this.history.length) {
          this.historyDraft = this.input.value;
        }
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.input.value = this.history[this.historyIndex];
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.input.value = this.history[this.historyIndex];
      } else {
        this.historyIndex = this.history.length;
        this.input.value = this.historyDraft || '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this.handleTabAutocomplete();
    }
  }

  handleTabAutocomplete() {
    const val = this.input.value;
    const parts = val.split(' ');
    
    if (parts.length === 1) {
      // Autocomplete command
      const stub = parts[0];
      const matches = this.commands.filter(c => c.startsWith(stub));
      if (matches.length === 1) {
        this.input.value = matches[0] + ' ';
      } else if (matches.length > 1) {
        this.showAutocompletePopup(matches, (selected) => {
          this.input.value = selected + ' ';
          if (this.input.focus) this.input.focus();
        });
      }
    } else {
      const cmd = parts[0].toLowerCase();
      const networkCmds = ['scan', 'ping', 'ssh', 'connect', 'crack', 'nuke', 'traceroute'];
      const stub = parts[parts.length - 1];

      if (networkCmds.includes(cmd)) {
        // Autocomplete IP or hostname of known network nodes
        const knownNodes = this.game && this.game.network && this.game.network.nodes
          ? Array.from(this.game.network.nodes.values()).filter(n => n.isDiscovered)
          : [];
        const candidates = [];
        knownNodes.forEach(n => {
          if (n.ip) candidates.push(n.ip);
          if (n.hostname && n.hostname !== n.ip) candidates.push(n.hostname);
        });
        const matches = candidates.filter(c => c.toLowerCase().startsWith(stub.toLowerCase()));
        if (matches.length === 1) {
          parts[parts.length - 1] = matches[0];
          this.input.value = parts.join(' ') + ' ';
        } else if (matches.length > 1) {
          this.showAutocompletePopup(matches, (selected) => {
            parts[parts.length - 1] = selected;
            this.input.value = parts.join(' ') + ' ';
            if (this.input.focus) this.input.focus();
          });
        }
      } else {
        // Autocomplete filename/path
        if (this.currentHost && this.currentHost.vfs) {
          const matches = this.currentHost.vfs.autocomplete(stub);
          if (matches.length === 1) {
            if (stub.includes('/')) {
              const prefix = stub.slice(0, stub.lastIndexOf('/') + 1);
              parts[parts.length - 1] = prefix + matches[0];
            } else {
              parts[parts.length - 1] = matches[0];
            }
            this.input.value = parts.join(' ');
            if (!matches[0].endsWith('/')) {
              this.input.value += ' ';
            }
          } else if (matches.length > 1) {
            this.showAutocompletePopup(matches, (selected) => {
              if (stub.includes('/')) {
                const prefix = stub.slice(0, stub.lastIndexOf('/') + 1);
                parts[parts.length - 1] = prefix + selected;
              } else {
                parts[parts.length - 1] = selected;
              }
              this.input.value = parts.join(' ');
              if (!selected.endsWith('/')) {
                this.input.value += ' ';
              }
              if (this.input.focus) this.input.focus();
            });
          }
        }
      }
    }
  }

  showAutocompletePopup(matches, onSelect) {
    if (!this.autocompleteBox || typeof document === 'undefined') return;
    this.autocompleteBox.innerHTML = '';
    matches.forEach(m => {
      const el = document.createElement('span');
      el.className = 'autocomplete-item';
      el.textContent = m;
      if (onSelect) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelect(m);
          this.autocompleteBox.classList.add('hidden');
        });
      }
      this.autocompleteBox.appendChild(el);
    });
    this.autocompleteBox.classList.remove('hidden');
    clearTimeout(this.autocompleteTimer);
    this.autocompleteTimer = setTimeout(() => {
      if (this.autocompleteBox) this.autocompleteBox.classList.add('hidden');
    }, 3500);
  }

  writeln(text, className = '') {
    if (typeof document === 'undefined' || !this.output) return;
    const line = document.createElement('div');
    line.className = `term-line ${className}`;
    line.textContent = text;
    this.output.appendChild(line);
    if (this.output.children.length > 300) {
      this.output.removeChild(this.output.firstChild);
    }
    this.scrollToBottom();
  }

  writeHTML(html) {
    if (typeof document === 'undefined' || !this.output) return;
    const line = document.createElement('div');
    line.className = 'term-line';
    line.innerHTML = html;
    this.output.appendChild(line);
    if (this.output.children.length > 300) {
      this.output.removeChild(this.output.firstChild);
    }
    this.scrollToBottom();
  }

  scrollToBottom() {
    if (this.mainPane && this.mainPane.scrollHeight) {
      this.mainPane.scrollTop = this.mainPane.scrollHeight;
    }
    if (this.container) {
      this.container.scrollTop = this.container.scrollHeight;
    }
  }

  clear() {
    this.output.innerHTML = '';
  }

  // Parse and execute command line, supporting redirection '>', '>>' and pipes '|'
  executeCommandLine(cmdLine) {
    // Print prompt echo
    this.writeHTML(`<span class="term-dim">${this.promptEl.innerHTML}</span> <span class="term-cmd">${this.escapeHtml(cmdLine)}</span>`);

    // Redirection support (> or >>)
    if (cmdLine.includes('>>') || cmdLine.includes('>')) {
      const isAppend = cmdLine.includes('>>');
      const parts = cmdLine.split(isAppend ? '>>' : '>');
      const rawCmd = parts[0].trim();
      const targetFile = parts[1].trim();

      if (!targetFile) {
        this.writeln('bash: syntax error near unexpected token `newline`', 'term-error');
        return;
      }

      const captured = [];
      const origWriteln = this.writeln.bind(this);
      const origWriteHTML = this.writeHTML.bind(this);

      this.writeln = (text) => captured.push(text);
      this.writeHTML = (html) => {
        if (typeof document !== 'undefined') {
          const tmp = document.createElement('div');
          tmp.innerHTML = html;
          captured.push(tmp.textContent || tmp.innerText || '');
        } else {
          captured.push(html.replace(/<[^>]*>/g, ''));
        }
      };

      try {
        this.dispatchCommandString(rawCmd);
      } finally {
        this.writeln = origWriteln;
        this.writeHTML = origWriteHTML;
      }

      const textToWrite = captured.join('\n') + '\n';
      const vfs = this.currentHost.vfs;
      const res = isAppend ? vfs.appendFile(targetFile, textToWrite) : vfs.writeFile(targetFile, textToWrite);
      if (!res.success) {
        this.writeln(res.error, 'term-error');
      }
      return;
    }

    if (cmdLine.includes('|')) {
      const stages = cmdLine.split('|').map(s => s.trim());
      this.executePiped(stages);
      return;
    }

    this.dispatchCommandString(cmdLine);
    this.updatePrompt();
  }

  tokenize(cmdStr) {
    const tokens = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < cmdStr.length; i++) {
      const char = cmdStr[i];

      if ((char === '"' || char === "'") && (!inQuotes || quoteChar === char)) {
        inQuotes = !inQuotes;
        quoteChar = inQuotes ? char : '';
      } else if (char === ' ' && !inQuotes) {
        if (current.length > 0) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current.length > 0) {
      tokens.push(current);
    }
    return tokens;
  }

  dispatchCommandString(cmdStr) {
    const tokens = this.tokenize(cmdStr);
    if (tokens.length === 0) return;
    const cmd = tokens[0].toLowerCase();
    const args = tokens.slice(1);
    this.dispatchCommand(cmd, args);
  }

  executePiped(stages) {
    let output = '';
    for (let i = 0; i < stages.length; i++) {
      const tokens = this.tokenize(stages[i]);
      if (tokens.length === 0) continue;
      const cmd = tokens[0].toLowerCase();
      const args = tokens.slice(1);

      if (i === 0) {
        // First stage: capture command output
        const captured = [];
        const origWriteln = this.writeln.bind(this);
        const origWriteHTML = this.writeHTML.bind(this);
        this.writeln = (t) => captured.push(t);
        this.writeHTML = (h) => captured.push(h.replace(/<[^>]*>/g, ''));

        try {
          this.dispatchCommand(cmd, args);
        } finally {
          this.writeln = origWriteln;
          this.writeHTML = origWriteHTML;
        }
        output = captured.join('\n');
      } else {
        // Subsequent filter stage (grep, wc, sort, head, tail)
        const lines = output.split('\n');
        if (cmd === 'grep') {
          const query = args[0] || '';
          output = lines.filter(l => l.toLowerCase().includes(query.toLowerCase())).join('\n');
        } else if (cmd === 'wc') {
          output = `${lines.length} lines, ${output.split(/\s+/).length} words, ${output.length} bytes`;
        } else if (cmd === 'sort') {
          output = lines.slice().sort().join('\n');
        } else if (cmd === 'head') {
          const n = parseInt(args[0]) || 10;
          output = lines.slice(0, n).join('\n');
        } else if (cmd === 'tail') {
          const n = parseInt(args[0]) || 10;
          output = lines.slice(Math.max(0, lines.length - n)).join('\n');
        }
      }
    }

    if (output) {
      this.writeln(output, 'term-info');
    }
  }

  dispatchCommand(cmd, args) {
    const vfs = this.currentHost.vfs;

    switch (cmd) {
      case 'help':
        this.cmdHelp();
        break;

      case 'man':
        this.cmdMan(args[0]);
        break;

      case 'clear':
        this.clear();
        break;

      case 'pwd':
        this.writeln(vfs.pwd());
        break;

      case 'cd':
        const cdRes = vfs.cd(args[0] || '~');
        if (!cdRes.success) this.writeln(cdRes.error, 'term-error');
        break;

      case 'ls':
        this.cmdLs(args);
        break;

      case 'cat':
        if (!args[0]) {
          this.writeln('cat: missing operand', 'term-error');
          return;
        }
        if (this.game && this.game.defense && this.currentHost) {
          this.game.defense.checkHoneypotAccess(this.currentHost.id, args[0]);
        }
        const catRes = vfs.cat(args[0], { user: this.currentUser });
        if (catRes.success) {
          this.writeln(catRes.content);
        } else {
          this.writeln(catRes.error, 'term-error');
        }
        break;

      case 'touch':
        if (!args[0]) return this.writeln('touch: missing operand', 'term-error');
        vfs.writeFile(args[0], '');
        break;

      case 'mkdir':
        if (!args[0]) return this.writeln('mkdir: missing operand', 'term-error');
        const mkRes = vfs.mkdir(args[0]);
        if (!mkRes.success) this.writeln(mkRes.error, 'term-error');
        break;

      case 'rm':
        if (!args[0]) return this.writeln('rm: missing operand', 'term-error');
        const isRec = args.includes('-r') || args.includes('-rf');
        const target = args.find(a => !a.startsWith('-'));
        const rmRes = vfs.rm(target, isRec);
        if (!rmRes.success) this.writeln(rmRes.error, 'term-error');
        break;

      case 'cp':
        if (args.length < 2) return this.writeln('cp: missing file operand. usage: cp [source] [destination]', 'term-error');
        const cpRes = vfs.cp(args[0], args[1]);
        if (!cpRes.success) this.writeln(cpRes.error, 'term-error');
        break;

      case 'mv':
        if (args.length < 2) return this.writeln('mv: missing file operand. usage: mv [source] [destination]', 'term-error');
        const mvRes = vfs.mv(args[0], args[1]);
        if (!mvRes.success) this.writeln(mvRes.error, 'term-error');
        break;

      case 'echo':
        const echoText = args.join(' ').replace(/^["']|["']$/g, '');
        this.writeln(echoText);
        break;

      case 'grep':
        this.cmdGrep(args);
        break;

      case 'head':
        this.cmdHead(args);
        break;

      case 'wc':
        this.cmdWc(args);
        break;

      case 'top':
        this.cmdTop();
        break;

      case 'traceroute':
        this.cmdTraceroute(args[0]);
        break;

      case 'export':
        this.game.exportSaveFile();
        break;

      case 'import':
        this.cmdImport();
        break;

      case 'whoami':
        this.writeln(this.currentUser);
        break;

      case 'date':
        this.writeln(new Date().toUTCString());
        break;

      case 'uname':
        this.writeln('Linux hackbox 6.4.0-hacker-x86_64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux');
        break;

      case 'history':
        this.history.forEach((h, idx) => this.writeln(`${(idx + 1).toString().padStart(4, ' ')}  ${h}`));
        break;

      case 'tutorial':
      case 'guide':
        this.game.tutorial.showTutorialCard(0);
        this.writeln('[+] Opened interactive recruit tutorial.', 'term-success');
        break;

      case 'run':
        this.cmdRun(args);
        break;

      case 'tail':
        this.cmdTail(args[0]);
        break;

      case 'ps':
        this.cmdPs();
        break;

      case 'kill':
        this.cmdKill(args[0]);
        break;

      case 'ifconfig':
      case 'ip':
        this.cmdIfconfig();
        break;

      case 'ping':
        this.cmdPing(args[0]);
        break;

      case 'scan':
      case 'nmap':
        this.cmdScan(args[0]);
        break;

      case 'ssh':
      case 'connect':
        this.cmdSsh(args[0]);
        break;

      case 'exit':
      case 'logout':
        this.cmdExit();
        break;

      case 'crack':
      case 'exploit':
        this.cmdExploit(args[0]);
        break;

      case 'nuke':
        this.cmdNuke(args[0]);
        break;

      case 'download':
        this.cmdDownload(args[0]);
        break;

      case 'decrypt':
        this.cmdDecrypt(args[0]);
        break;

      case 'missions':
        this.cmdMissions();
        break;

      case 'rig':
        this.cmdRig();
        break;

      case 'market':
        this.cmdMarket(args[0]);
        break;

      case 'overclock':
        this.cmdOverclock(args[0]);
        break;

      case 'backdoor':
        this.cmdBackdoor(args[0]);
        break;

      case 'defcon':
        this.cmdDefcon();
        break;

      case 'miner':
        this.cmdMiner(args);
        break;

      case 'encrypt':
        this.cmdEncrypt(args[0]);
        break;

      case 'r2':
      case 'radare2':
        this.cmdR2(args[0]);
        break;

      case 'buy':
        if (args[0] && (args[0].startsWith('cpu_') || args[0].startsWith('ram_') || args[0].startsWith('storage_') || args[0].startsWith('ant_') || args[0].startsWith('vpn_') || args[0].startsWith('cool_'))) {
          if (this.game.rig) {
            const res = this.game.rig.purchaseHardware(args[0]);
            if (res.success) {
              sound.exploitSuccess();
              this.writeln(`[✔] ${res.message}`, 'term-success');
            } else {
              sound.denied();
              this.writeln(`[✗] ${res.message}`, 'term-error');
            }
          }
        } else {
          this.cmdArsenal(args[0]);
        }
        break;

      case 'arsenal':
        this.cmdArsenal(args[0]);
        break;

      case 'trace':
        this.cmdTrace();
        break;

      case 'nano':
      case 'vim':
        this.cmdEditor(args[0]);
        break;

      case 'split':
      case 'tmux':
        this.cmdSplit(args);
        break;

      case 'close':
        this.cmdClose(args[0]);
        break;

      default:
        const beginnerTriggers = ['how', 'what', 'start', 'play', 'hack', 'confused', 'idk', 'wtf', 'helpme', 'begin', 'stuck'];
        if (beginnerTriggers.some(t => cmd.includes(t))) {
          this.writeln(`[!] NOT SURE WHAT TO DO? HERE ARE 4 EASY STEPS:`, 'ansi-yellow');
          this.writeln(`  1. Type 'scan 192.168.1.45' (or click QUICK ACTION button below) to probe university.`);
          this.writeln(`  2. Type 'crack 192.168.1.45' to breach their open port.`);
          this.writeln(`  3. Type 'ssh 192.168.1.45' to log in as administrator.`);
          this.writeln(`  4. Type 'download /home/admin/credentials.txt' to extract data & get paid!`);
          this.writeln(`[★] Type 'tutorial' anytime to launch the interactive step-by-step guide.`, 'term-success');
        } else {
          this.writeln(`bash: ${cmd}: command not found. Type 'help' for manual or 'tutorial' for beginner guide.`, 'term-error');
        }
        sound.denied();
    }
  }

  async cmdRun(args) {
    if (!args[0]) return this.writeln('run: usage: run [script_file.js] [-t threads] [args...]', 'term-warn');
    const scriptFile = args[0];
    let threads = 1;
    const tIdx = args.indexOf('-t');
    if (tIdx !== -1 && args[tIdx + 1]) {
      threads = parseInt(args[tIdx + 1]) || 1;
    }

    this.writeln(`[+] Deploying script '${scriptFile}' [${threads} thread(s)]...`, 'term-info');
    const res = await this.game.scripts.runScript(scriptFile, args.slice(1), threads);
    if (res.success) {
      sound.commandExec();
      this.writeln(`[✔] Script started with PID ${res.pid}. Type 'tail ${res.pid}' to view logs or 'ps' to inspect.`, 'term-success');
    } else {
      sound.denied();
      this.writeln(`[✗] ${res.error}`, 'term-error');
    }
  }

  cmdTail(target) {
    if (!target) return this.writeln('tail: usage: tail [PID | script_name]', 'term-warn');
    this.game.scripts.tail(target);
  }

  cmdPs() {
    this.writeln('PID    THREADS  STATUS   HOST          COMMAND / SCRIPT');
    this.writeln('------------------------------------------------------------');
    this.writeln('1      1        RUNNING  localhost     /sbin/init');
    this.writeln('102    1        RUNNING  localhost     /usr/sbin/sshd -D');
    this.writeln('210    1        RUNNING  localhost     /usr/bin/network-manager');

    if (this.game.scripts.activeScripts.size === 0) {
      this.writeln('No active player scripts currently running. Use "run [script.js]" to launch.', 'term-dim');
    } else {
      this.game.scripts.activeScripts.forEach(proc => {
        const pidStr = proc.pid.toString().padEnd(6, ' ');
        const thStr = proc.threads.toString().padEnd(8, ' ');
        const stStr = proc.status.padEnd(8, ' ');
        const hStr = proc.host.hostname.padEnd(13, ' ');
        this.writeln(`${pidStr} ${thStr} ${stStr} ${hStr} ${proc.name}`, 'text-accent');
      });
    }
  }

  cmdKill(pidStr) {
    if (!pidStr) return this.writeln('kill: usage: kill [PID]', 'term-warn');
    const pid = parseInt(pidStr);
    const killed = this.game.scripts.killScript(pid);
    if (killed) {
      this.writeln(`[+] Killed process PID ${pid}`, 'term-success');
    } else {
      this.writeln(`kill: (${pid}) - No such player process`, 'term-error');
    }
  }

  cmdGrep(args) {
    if (args.length === 0) return this.writeln('grep: missing pattern and file. usage: grep [pattern] [file]', 'term-warn');
    let isInsensitive = false;
    let pattern = '';
    let file = '';

    if (args[0] === '-i') {
      isInsensitive = true;
      pattern = args[1];
      file = args[2];
    } else {
      pattern = args[0];
      file = args[1];
    }

    if (!file) return this.writeln('grep: missing file operand', 'term-error');
    const res = this.currentHost.vfs.grep(pattern, file, { i: isInsensitive });
    if (!res.success) return this.writeln(res.error, 'term-error');

    if (res.lines.length === 0) {
      this.writeln(`(no matches found for '${pattern}')`, 'term-dim');
    } else {
      res.lines.forEach(l => {
        const highlighted = l.replace(new RegExp(pattern, isInsensitive ? 'gi' : 'g'), m => `<span class="text-accent font-bold">${m}</span>`);
        this.writeHTML(`<div>${highlighted}</div>`);
      });
    }
  }

  cmdHead(args) {
    let n = 10;
    let file = args[0];
    if (args[0] === '-n' && args[1]) {
      n = parseInt(args[1]) || 10;
      file = args[2];
    }
    if (!file) return this.writeln('head: missing file operand', 'term-error');
    const res = this.currentHost.vfs.head(file, n);
    if (res.success) {
      this.writeln(res.content);
    } else {
      this.writeln(res.error, 'term-error');
    }
  }

  cmdWc(args) {
    const file = args.find(a => !a.startsWith('-'));
    if (!file) return this.writeln('wc: missing file operand', 'term-error');
    const res = this.currentHost.vfs.cat(file);
    if (!res.success) return this.writeln(res.error, 'term-error');

    const lines = res.content ? res.content.split('\n').length : 0;
    const words = res.content ? res.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
    const bytes = res.content ? res.content.length : 0;
    this.writeln(`${lines.toString().padStart(6, ' ')} ${words.toString().padStart(6, ' ')} ${bytes.toString().padStart(7, ' ')} ${file}`);
  }

  cmdTop() {
    const activeScripts = this.game.scripts.activeScripts.size;
    const tasksCount = 3 + activeScripts;
    const now = new Date().toTimeString().split(' ')[0];

    let output = `top - ${now} up 4:12,  1 user,  load average: 0.14, 0.08, 0.03\n`;
    output += `Tasks: ${tasksCount} total, 1 running, ${tasksCount - 1} sleeping, 0 stopped\n`;
    output += `%Cpu(s):  3.2 us,  1.4 sy,  0.0 ni, 95.1 id,  0.2 wa,  0.1 hi\n`;
    output += `MiB Mem :  16384.0 total,  11280.4 free,   3102.6 used,   2001.0 buff/cache\n\n`;
    output += `  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n`;
    output += `    1 root      20   0  168420  12480   8420 S   0.0   0.1   0:02.14 systemd\n`;
    output += `  102 root      20   0   84200   6120   4920 S   0.0   0.0   0:00.42 sshd\n`;
    output += `  210 player    20   0  245000  28400  14200 S   1.2   0.2   0:04.18 bash\n`;

    this.game.scripts.activeScripts.forEach(proc => {
      const pidStr = proc.pid.toString().padStart(5, ' ');
      const cpu = (proc.threads * 2.8).toFixed(1).padStart(5, ' ');
      const mem = (proc.threads * 0.4).toFixed(1).padStart(5, ' ');
      output += `${pidStr} player    20   0  310000  42000  18000 R  ${cpu} ${mem}   0:12.80 node (${proc.name})\n`;
    });

    this.writeHTML(`<pre style="margin: 0; font-family: inherit; color: var(--text-main);">${output}</pre>`);
  }

  cmdTraceroute(target) {
    if (!target) return this.writeln('traceroute: missing host operand', 'term-error');
    const node = this.game.network.getNode(target);
    if (!node) return this.writeln(`traceroute: unknown host ${target}`, 'term-error');

    this.writeln(`traceroute to ${node.hostname} (${node.ip}), 30 hops max, 60 byte packets`);
    
    // Simulate route hops: Localhost -> Gateway -> (DMZ / Darknet) -> Target
    const hops = [
      { hop: 1, ip: '192.168.1.1', host: 'isp-gw-01.lan', rtt: '1.241 ms' }
    ];

    if (node.subnet === 'CORP-NET' || node.subnet === 'MIL-AIRGAP') {
      hops.push({ hop: 2, ip: '172.16.0.1', host: 'chimera-corp-gw.corp', rtt: '14.812 ms' });
    } else if (node.subnet === 'DARKNET' || node.subnet === 'FINANCIAL') {
      hops.push({ hop: 2, ip: '198.51.100.24', host: 'onion-proxy-9.darknet', rtt: '48.910 ms' });
    }

    hops.push({ hop: hops.length + 1, ip: node.ip, host: node.hostname, rtt: `${(Math.random() * 20 + 25).toFixed(3)} ms` });

    hops.forEach(h => {
      this.writeln(` ${h.hop}  ${h.host} (${h.ip})  ${h.rtt}  ${h.rtt}  ${h.rtt}`);
    });
  }

  cmdImport() {
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    const modalFooter = document.getElementById('modal-footer');

    modalTitle.textContent = `IMPORT SAVEGAME // RESTORE SESSION`;
    modalBody.innerHTML = `
      <p style="color: var(--text-dim); margin-bottom: 8px;">Paste the JSON savegame string below to restore your session:</p>
      <textarea id="import-json-text" style="width: 100%; height: 200px; background: #000; color: #33ff77; font-family: var(--font-mono); font-size: 11px; border: 1px solid var(--border-color); padding: 8px; resize: none;"></textarea>
    `;

    modalFooter.innerHTML = `
      <button id="btn-do-import" class="btn-action">RESTORE SAVEGAME</button>
      <button id="btn-cancel-import" class="btn-tool">CANCEL</button>
    `;

    this.game.ui.openModal();

    document.getElementById('btn-do-import').onclick = () => {
      const val = document.getElementById('import-json-text').value.trim();
      this.game.ui.closeModal();
      if (val) this.game.importSaveFile(val);
    };

    document.getElementById('btn-cancel-import').onclick = () => {
      this.game.ui.closeModal();
    };
  }

  cmdHelp() {
    const helpText = 
`HACKER SIMULATOR // SHELL COMMAND REFERENCE:
  System & File Navigation:
    ls [-la] [path]       - List files and directory attributes
    cd [path]             - Change current working directory
    pwd                   - Print current working directory
    cat [file]            - View content of text file
    nano / vim [file]     - Open interactive text editor
    mkdir / rm / touch    - Create and delete files or folders
    whoami / uname / date - System identification

  Network Recon & Infiltration:
    ifconfig              - Display network interfaces and IP
    ping [ip/host]        - Test connection latency to target
    nmap / scan [ip]      - Probe host for open ports, services & CVEs
    crack [ip]            - Launch port vulnerability exploits
    nuke [ip]             - Deploy root privilege escalation payload
    ssh [ip]              - Open remote encrypted shell on host
    exit / logout         - Terminate remote session, return to localhost

  Automation & Scripting (Bitburner-Style Runtime):
    run [script] [-t N]   - Execute asynchronous botnet JS script
    tail [pid/name]       - Stream real-time script output log
    ps                    - List active system and script processes
    kill [pid]            - Abort and terminate running background script

  Data & Weapons:
    download [path]       - Extract remote file to localhost /loot
    decrypt [file]        - Launch shadow hash rainbow crack
    r2 / radare2 [file]   - Hex disassembler & zero-day buffer overflow puzzle
    missions              - View active underground contracts
    arsenal / buy [id]    - Browse and purchase black-market exploits
    miner [deploy|list]   - Deploy persistent cryptominers on rooted hosts
    encrypt <directory>   - Deploy ransomware payload & extort bounty
    clear                 - Clear terminal screen

  TMUX Multi-Pane Split:
    split [-h|-v] [stream] - Open secondary split pane (tail, sniffer, trace)
    tmux [-h|-v] [stream]  - Alias for split command
    close [paneId]         - Close secondary split pane & return to single layout`;
    this.writeln(helpText, 'term-info');
  }

  cmdMan(topic) {
    if (!topic) return this.writeln('What manual page do you want? Try: man scan, man nuke, man crack', 'term-warn');
    const manuals = {
      scan: "NAME: scan / nmap - Network Port Scanner\nSYNOPSIS: scan [TARGET_IP]\nDESCRIPTION: Sweeps all TCP/UDP ports, detects software versions, and flags unpatched vulnerabilities.",
      nuke: "NAME: nuke - Root Privilege Escalation Daemon\nSYNOPSIS: nuke [TARGET_IP]\nDESCRIPTION: Once sufficient ports are cracked, nuke breaches the root boundary and grants administrative control.",
      crack: "NAME: crack - Port Exploit Suite\nSYNOPSIS: crack [TARGET_IP]\nDESCRIPTION: Automatically uses unlocked tools (ftp_bounce, hydra_ssh, sql_ninja) to breach open ports.",
      miner: "NAME: miner - Persistent Cryptominer Suite\nSYNOPSIS: miner [deploy [host] | list | status]\nDESCRIPTION: Injects stealth daemon on rooted host generating continuous passive credit stream. Hashrate scales with node security level.",
      encrypt: "NAME: encrypt - Targeted Ransomware Suite\nSYNOPSIS: encrypt <directory>\nDESCRIPTION: Encrypts files in target directory with AES-256 and demands ransom bounty. Mission-critical files are automatically protected against soft-locks.",
      r2: "NAME: r2 / radare2 - Hex Disassembler & Zero-Day Exploit Engine\nSYNOPSIS: r2 [BINARY_PATH]\nDESCRIPTION: Disassembles executable binaries into assembly opcodes. Calculate stack buffer offset to hijack instruction pointer (EIP) and synthesize zero-day exploits.",
      radare2: "NAME: r2 / radare2 - Hex Disassembler & Zero-Day Exploit Engine\nSYNOPSIS: radare2 [BINARY_PATH]\nDESCRIPTION: Disassembles executable binaries into assembly opcodes. Calculate stack buffer offset to hijack instruction pointer (EIP) and synthesize zero-day exploits.",
      split: "NAME: split / tmux - TMUX Multi-Pane Terminal Split Layout\nSYNOPSIS: split [-h | -v] [tail [pid] | sniffer | trace]\nDESCRIPTION: Splits terminal into multi-pane layout. Supports horizontal (-h) side-by-side or vertical (-v) top-bottom split. Streams process tail logs, sniffer packet traffic, or IDS trace metrics.",
      tmux: "NAME: split / tmux - TMUX Multi-Pane Terminal Split Layout\nSYNOPSIS: tmux [-h | -v] [tail [pid] | sniffer | trace]\nDESCRIPTION: Splits terminal into multi-pane layout. Supports horizontal (-h) side-by-side or vertical (-v) top-bottom split. Streams process tail logs, sniffer packet traffic, or IDS trace metrics.",
      close: "NAME: close - Close TMUX Split Pane\nSYNOPSIS: close [PANE_ID]\nDESCRIPTION: Closes the active or specified TMUX split pane, tears down stream timers, and restores single-pane terminal layout."
    };
    this.writeln(manuals[topic] || `No manual entry for ${topic}`, 'term-info');
  }

  cmdLs(args) {
    const flags = {
      all: args.includes('-a') || args.includes('-la') || args.includes('-al'),
      long: args.includes('-l') || args.includes('-la') || args.includes('-al')
    };
    const targetPath = args.find(a => !a.startsWith('-')) || '';
    const res = this.currentHost.vfs.ls(targetPath, flags);

    if (!res.success) {
      this.writeln(res.error, 'term-error');
      return;
    }

    if (flags.long) {
      let output = `total ${res.entries.length * 4}\n`;
      res.entries.forEach(e => {
        const typeChar = e.type === 'dir' ? 'd' : '-';
        const colorClass = e.type === 'dir' ? 'vfs-item-dir' : (e.isSecret ? 'vfs-item-secret' : 'vfs-item-file');
        output += `${typeChar}${e.permissions}  1  ${e.owner}  ${e.group}  ${e.size.toString().padStart(6, ' ')}  ${e.mtime}  <span class="${colorClass}">${e.name}</span>\n`;
      });
      this.writeHTML(`<pre style="margin: 0; font-family: inherit;">${output}</pre>`);
    } else {
      let html = '<div class="vfs-grid">';
      res.entries.forEach(e => {
        const colorClass = e.type === 'dir' ? 'vfs-item-dir' : (e.isSecret ? 'vfs-item-secret' : 'vfs-item-file');
        html += `<span class="${colorClass}">${e.name}${e.type === 'dir' ? '/' : ''}</span>`;
      });
      html += '</div>';
      this.writeHTML(html);
    }
  }

  cmdIfconfig() {
    const text = 
`eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${this.currentHost.ip}  netmask 255.255.255.0  broadcast 192.168.1.255
        ether 08:00:27:5b:9e:11  txqueuelen 1000  (Ethernet)
        RX packets 18492  bytes 12.4 MB
        TX packets 12049  bytes 8.1 MB

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0`;
    this.writeln(text, 'term-info');
  }

  cmdPing(target) {
    if (!target) return this.writeln('ping: missing destination address', 'term-error');
    const node = this.game.network.getNode(target);
    if (!node) {
      this.writeln(`ping: connect: Network is unreachable (host ${target} not found)`, 'term-error');
      return;
    }

    this.writeln(`PING ${node.hostname} (${node.ip}) 56(84) bytes of data.`);
    let seq = 1;
    const interval = setInterval(() => {
      const timeMs = (Math.random() * 25 + 8).toFixed(2);
      this.writeln(`64 bytes from ${node.ip}: icmp_seq=${seq} ttl=58 time=${timeMs} ms`);
      sound.keyClick();
      seq++;
      if (seq > 4) {
        clearInterval(interval);
        this.writeln(`--- ${node.hostname} ping statistics ---`);
        this.writeln(`4 packets transmitted, 4 received, 0% packet loss, time 3004ms\n`);
      }
    }, 600);
  }

  cmdScan(target) {
    if (!target) return this.writeln('scan: missing target IP or hostname', 'term-error');
    const node = this.game.network.getNode(target);
    if (!node) {
      this.writeln(`scan: host '${target}' not found in routing tables.`, 'term-error');
      return;
    }

    sound.radarBlip();
    node.isDiscovered = true;

    this.writeln(`Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toISOString()}`);
    this.writeln(`Nmap scan report for ${node.hostname} (${node.ip})`);
    this.writeln(`Host is up (0.012s latency). Security Level: [Tier ${node.securityLevel}]`);
    this.writeln(`Not shown: 994 closed tcp ports (reset)`);
    this.writeln(`PORT     STATE SERVICE VERSION                 VULNERABILITY`);
    this.writeln(`-------------------------------------------------------------------------`);

    let openCount = 0;
    for (const [port, info] of Object.entries(node.ports)) {
      if (info.open) {
        openCount++;
        const pStr = `${port}/tcp`.padEnd(8, ' ');
        const state = `open`.padEnd(7, ' ');
        const srv = info.service.padEnd(8, ' ');
        const ver = info.version.padEnd(24, ' ');
        const vuln = info.vuln ? `[!] ${info.vuln}` : `Clean`;
        const color = info.vuln ? 'ansi-yellow' : 'ansi-green';
        this.writeln(`${pStr} ${state} ${srv}${ver}${vuln}`, color);
      }
    }

    this.writeln(`\nROOT STATUS: ${node.hasRoot ? '[COMPROMISED / ROOTED]' : '[SECURED - Needs ' + node.requiredPortsToRoot + ' cracked ports]'}`);
    this.writeln(`Nmap done: 1 IP address (1 host up) scanned in 1.48 seconds.\n`);
    
    // Check missions
    this.game.missions.checkProgress('scan', node);
  }

  cmdExploit(target) {
    if (!target) return this.writeln('crack: usage: crack [TARGET_IP]', 'term-warn');
    const node = this.game.network.getNode(target);
    if (!node) return this.writeln(`crack: host '${target}' not found.`, 'term-error');

    this.writeln(`[+] Targeting ${node.hostname} (${node.ip}) with active exploit arsenal...`, 'term-info');
    
    let crackedAny = false;
    for (const [port, info] of Object.entries(node.ports)) {
      const portNum = parseInt(port);
      if (this.game.exploits.canExploitPort(portNum)) {
        this.writeln(`[*] Found vulnerability on port ${port} (${info.service}). Launching payload...`, 'ansi-yellow');
        crackedAny = true;
      }
    }

    if (!crackedAny) {
      this.writeln(`[-] No matching exploit tools for open ports on ${node.hostname}.`, 'term-error');
      this.writeln(`[!] Check 'arsenal' or contract rewards to unlock more exploit tools.`, 'term-warn');
      return;
    }

    // Trigger tailored exploit puzzle based on target service vulnerability
    const onSolve = () => {
      node.hasRoot = true;
      this.writeln(`[✔] VULNERABILITY EXPLOITED! Root shell created on ${node.hostname}.`, 'term-success');
      this.writeln(`[+] Type 'ssh ${node.ip}' to log into target as root.`, 'ansi-cyan');
      this.game.missions.checkProgress('root', node);
      this.game.ui.updateHUD();
    };

    const onFail = () => {
      this.writeln(`[✗] Exploit failed! IDS alert triggered. Trace elevated.`, 'term-error');
      this.game.network.activeTrace = Math.min(100, this.game.network.activeTrace + 25);
      this.game.ui.updateHUD();
    };

    if (node.ports[3306] && node.ports[3306].open && this.game.exploits.canExploitPort(3306)) {
      this.game.exploits.createSqliPuzzle(onSolve, onFail);
    } else if ((node.ports[8080] && node.ports[8080].open && this.game.exploits.canExploitPort(8080)) || 
               (node.ports[1337] && node.ports[1337].open && this.game.exploits.canExploitPort(1337))) {
      this.game.exploits.createPortKnockPuzzle(onSolve, onFail);
    } else if (node.ports[22] && node.ports[22].open && this.game.exploits.canExploitPort(22) && !this.game.exploits.canExploitPort(21)) {
      this.game.exploits.createHashDecryptionPuzzle(onSolve, onFail);
    } else {
      this.game.exploits.createMemoryPuzzle(onSolve, onFail);
    }
  }

  cmdNuke(target) {
    if (!target) return this.writeln('nuke: usage: nuke [TARGET_IP]', 'term-warn');
    const node = this.game.network.getNode(target);
    if (!node) return this.writeln(`nuke: host '${target}' not found.`, 'term-error');

    if (node.hasRoot) {
      return this.writeln(`[!] Host ${node.hostname} is already rooted.`, 'ansi-green');
    }

    let openPorts = 0;
    for (const [p, info] of Object.entries(node.ports)) {
      if (info.open && this.game.exploits.canExploitPort(parseInt(p))) openPorts++;
    }

    if (openPorts >= node.requiredPortsToRoot) {
      node.hasRoot = true;
      sound.exploitSuccess();
      this.writeln(`[✔] NUKE.EXE EXECUTED SUCCESSFULLY: Root privileges obtained on ${node.hostname}!`, 'term-success');
      this.game.missions.checkProgress('root', node);
    } else {
      sound.denied();
      this.writeln(`[✗] NUKE.EXE FAILED: Requires ${node.requiredPortsToRoot} open cracked ports (currently ${openPorts}).`, 'term-error');
    }
  }

  cmdSsh(target) {
    if (!target) return this.writeln('ssh: usage: ssh [user@]hostname_or_ip', 'term-warn');
    const cleanTarget = target.includes('@') ? target.split('@')[1] : target;
    const node = this.game.network.getNode(cleanTarget);

    if (!node) {
      return this.writeln(`ssh: Could not resolve hostname ${cleanTarget}: Name or service not known`, 'term-error');
    }

    if (!node.hasRoot) {
      sound.denied();
      this.writeln(`ssh: connect to host ${node.ip} port 22: Connection refused (Access Denied / Root Required)`, 'term-error');
      this.writeln(`Hint: Run 'scan ${node.ip}' and 'crack ${node.ip}' first.`, 'term-warn');
      return;
    }

    sound.connect();
    this.currentHost = node;
    this.writeln(`Authenticated with root credentials to ${node.hostname} (${node.ip}).`, 'term-success');
    this.writeln(`Last login: ${new Date().toISOString()} from 127.0.0.1\n`);
    this.updatePrompt();
    this.game.missions.checkProgress('ssh', node);
  }

  cmdExit() {
    if (this.currentHost.id === 'localhost') {
      this.writeln('Already on localhost. Session cannot be closed.');
    } else {
      sound.connect();
      const prevHost = this.currentHost.hostname;
      this.currentHost = this.game.network.getNode('localhost');
      this.writeln(`Connection to ${prevHost} closed. Returned to local console.`, 'term-info');
      this.updatePrompt();
    }
  }

  cmdDownload(remotePath) {
    if (!remotePath) return this.writeln('download: missing remote file path', 'term-warn');
    if (this.currentHost.id === 'localhost') {
      return this.writeln('download: you are already on localhost. Connect to a remote host first.', 'term-error');
    }

    if (this.game && this.game.defense && this.currentHost) {
      this.game.defense.checkHoneypotAccess(this.currentHost.id, remotePath);
    }

    const res = this.currentHost.vfs.cat(remotePath);
    if (!res.success) {
      return this.writeln(`download: ${res.error}`, 'term-error');
    }

    const localVfs = this.game.network.getNode('localhost').vfs;
    const fileName = remotePath.split('/').pop();
    localVfs.writeFile(`/home/player/loot/${fileName}`, res.content);

    sound.exploitSuccess();
    this.writeln(`[✔] Downloaded '${fileName}' (size: ${res.content.length} B) -> /home/player/loot/${fileName}`, 'term-success');
    this.game.missions.checkProgress('download', { file: fileName, content: res.content, host: this.currentHost });
  }

  cmdDecrypt(filePath) {
    if (!filePath) return this.writeln('decrypt: usage: decrypt [FILE_PATH]', 'term-warn');
    const res = this.currentHost.vfs.cat(filePath);
    if (!res.success) return this.writeln(res.error, 'term-error');

    this.game.exploits.createHashDecryptionPuzzle(
      (plain) => {
        this.writeln(`[✔] Decryption successful! Key extracted: ${plain}`, 'term-success');
        this.game.missions.checkProgress('decrypt', { file: filePath, plain });
      },
      () => {
        this.writeln(`[✗] Decryption failed.`, 'term-error');
      }
    );
  }

  cmdMissions() {
    const active = this.game.missions.activeMission;
    if (active) {
      this.writeln(`ACTIVE MISSION: [${active.id}] ${active.title}`, 'ansi-yellow');
      this.writeln(`OBJECTIVES:`);
      active.objectives.forEach(o => {
        const check = o.completed ? '[✔]' : '[ ]';
        const color = o.completed ? 'term-success' : 'term-dim';
        this.writeln(`  ${check} ${o.text}`, color);
      });
      this.writeln(`REWARD: ${active.rewardBtc} ₿ credits | ${active.rewardTools ? active.rewardTools.join(', ') : 'None'}`);
    } else {
      this.writeln(`No active contract. Check the MISSIONS tab to accept a target.`, 'term-info');
    }
  }

  cmdArsenal(toolId) {
    if (!toolId) {
      this.writeln(`AVAILABLE ARSENAL TOOLS:`);
      this.game.exploits.tools.forEach(t => {
        const status = t.unlocked ? '[OWNED]' : `[${t.cost} ₿] - buy ${t.id}`;
        const color = t.unlocked ? 'term-success' : 'ansi-yellow';
        this.writeln(`  ${t.name.padEnd(20, ' ')} ${status.padEnd(22, ' ')} - ${t.desc}`, color);
      });
      return;
    }

    const tool = this.game.exploits.tools.get(toolId);
    if (!tool) return this.writeln(`Unknown tool '${toolId}'. Type 'arsenal' for catalog.`, 'term-error');
    if (tool.unlocked) return this.writeln(`Tool '${tool.name}' is already unlocked.`, 'term-info');

    if (this.game.credits >= tool.cost) {
      this.game.credits -= tool.cost;
      tool.unlocked = true;
      sound.exploitSuccess();
      this.writeln(`[✔] Purchased ${tool.name}! Added to attack inventory.`, 'term-success');
      this.game.ui.updateHUD();
      this.game.ui.renderArsenal();
    } else {
      sound.denied();
      this.writeln(`[✗] Insufficient credits! Cost: ${tool.cost} ₿, Available: ${this.game.credits} ₿.`, 'term-error');
    }
  }

  cmdRig() {
    if (!this.game.rig) return this.writeln("Cyber-deck hardware offline.", "term-error");
    const rig = this.game.rig;
    const cpu = rig.getEquippedItem('cpu');
    const ram = rig.getEquippedItem('ram');
    const storage = rig.getEquippedItem('storage');
    const ant = rig.getEquippedItem('antenna');
    const bouncer = rig.getEquippedItem('bouncer');
    const cooling = rig.getEquippedItem('cooling');

    this.writeln("============================================================", "ansi-cyan");
    this.writeln("  CYBER-DECK MODULAR HARDWARE ARCHITECTURE (hackbox)", "ansi-yellow");
    this.writeln("============================================================", "ansi-cyan");
    this.writeln(`  [CPU]      : ${cpu.name} (${cpu.threads} Threads Max)`);
    this.writeln(`  [RAM]      : ${ram.name} (${ram.maxScripts} Concurrent Scripts)`);
    this.writeln(`  [STORAGE]  : ${storage.name} (${storage.downloadSpeed} MB/s Transfer)`);
    this.writeln(`  [ANTENNA]  : ${ant.name} (Scan Tier ${ant.scanRange})`);
    this.writeln(`  [BOUNCER]  : ${bouncer.name} (${Math.round(bouncer.traceMultiplier * 100)}% Trace Rate)`);
    this.writeln(`  [COOLING]  : ${cooling.name} (${cooling.dissipation} °C/s Dissipation)`);
    this.writeln("------------------------------------------------------------", "term-dim");
    const ocStatus = rig.isThrottled ? "THROTTLED (50% Speed)" : (rig.overclockActive ? "ACTIVE (200% Turbo)" : "STANDBY (100% Normal)");
    const tempColor = rig.temperature > 80 ? "term-error" : (rig.temperature > 55 ? "ansi-yellow" : "term-success");
    this.writeln(`  THERMAL STATUS   : ${rig.temperature.toFixed(1)} °C | OVERCLOCK: ${ocStatus}`, tempColor);
    this.writeln(`  THREAD CEILING   : ${rig.getThreadsCapacity()} threads | SCRIPT SLOTS: ${rig.getMaxConcurrentScripts()}`);
    this.writeln("------------------------------------------------------------", "term-dim");
    this.writeln("Tip: Type 'market' to browse darknet vendors or 'buy <id>' to upgrade.", "term-info");
  }

  cmdMarket(category) {
    if (!this.game.rig) return;
    const catalog = this.game.rig.getMarketCatalog();
    this.writeln("============================================================", "ansi-cyan");
    this.writeln("  DARKNET HARDWARE BAZAAR // MODULAR RIG UPGRADES", "ansi-yellow");
    this.writeln("============================================================", "ansi-cyan");

    const categories = category && catalog[category.toLowerCase()] ? [category.toLowerCase()] : Object.keys(catalog);

    categories.forEach(cat => {
      this.writeln(`[${cat.toUpperCase()} MODULES]`, "ansi-cyan");
      catalog[cat].forEach(item => {
        const isEquipped = this.game.rig.slots[cat] === item.id;
        const tag = isEquipped ? "[EQUIPPED]" : (item.price === 0 ? "[DEFAULT]" : `[${item.price} ₿] - buy ${item.id}`);
        const color = isEquipped ? "term-success" : (item.price === 0 ? "term-dim" : "ansi-yellow");
        this.writeln(`  ${item.name.padEnd(42, ' ')} ${tag}`, color);
        this.writeln(`    └─ ${item.desc}`, "term-dim");
      });
      this.writeln("");
    });
    this.writeln("Commands: 'buy <id>' to purchase | 'rig' to inspect installed hardware.", "term-info");
  }

  cmdOverclock(param) {
    if (!this.game.rig) return;
    const rig = this.game.rig;
    if (param === 'on') {
      rig.toggleOverclock(true);
    } else if (param === 'off') {
      rig.toggleOverclock(false);
    } else {
      rig.toggleOverclock();
    }

    if (rig.isThrottled) {
      sound.denied();
      return this.writeln(`[!] CRITICAL: Core temperature at ${rig.temperature.toFixed(1)}°C! Overclock throttled. Wait for cooling.`, "term-error");
    }

    if (rig.overclockActive) {
      sound.exploitSuccess();
      this.writeln(`[✔] TURBO OVERCLOCK ENGAGED! Execution & crack speeds doubled (+100%). Monitor thermal buildup!`, "term-success");
    } else {
      sound.commandExec();
      this.writeln(`[-] Turbo overclock disengaged. System returning to base clock.`, "term-info");
    }
  }

  cmdTrace() {
    const trace = this.game.network.activeTrace;
    this.writeln(`INTRUSION DETECTION SYSTEM TRACE LEVEL: ${trace.toFixed(1)}%`);
    if (trace > 75) {
      this.writeln(`CRITICAL: Trace near 100%! Disconnect or wipe logs to prevent IP quarantine.`, 'term-error');
    } else {
      this.writeln(`Status nominal. Keep activity stealthy.`, 'term-info');
    }
  }

  cmdEditor(fileName) {
    if (!fileName) return this.writeln('nano: missing filename', 'term-warn');
    const existing = this.currentHost.vfs.cat(fileName);
    const initialText = existing.success ? existing.content : '';

    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    const modalFooter = document.getElementById('modal-footer');

    modalTitle.textContent = `GNU NANO 7.2 // ${fileName}`;
    modalBody.innerHTML = `
      <textarea id="nano-editor-text" style="width: 100%; height: 300px; background: #000; color: #fff; font-family: var(--font-mono); font-size: 12px; border: 1px solid var(--border-color); padding: 8px; resize: none; outline: none;">${this.escapeHtml(initialText)}</textarea>
    `;

    modalFooter.innerHTML = `
      <button id="btn-nano-save" class="btn-action">SAVE &amp; EXIT</button>
      <button id="btn-nano-cancel" class="btn-tool">DISCARD</button>
    `;

    this.game.ui.openModal();

    document.getElementById('btn-nano-save').addEventListener('click', () => {
      const text = document.getElementById('nano-editor-text').value;
      this.currentHost.vfs.writeFile(fileName, text);
      this.game.ui.closeModal();
      this.writeln(`[+] Wrote ${text.length} bytes to ${fileName}`, 'term-success');
    });

    document.getElementById('btn-nano-cancel').addEventListener('click', () => {
      this.game.ui.closeModal();
      this.writeln(`Discarded changes to ${fileName}`, 'term-dim');
    });
  }

  cmdBackdoor(action) {
    if (!this.game.defense) return;
    if (this.currentHost.id === 'localhost') {
      return this.writeln("backdoor: Cannot install backdoor on localhost attack rig.", "term-warn");
    }
    const res = this.game.defense.installBackdoor(this.currentHost.id);
    if (res.success) {
      sound.exploitSuccess();
      this.writeln(`[✔] ${res.message}`, 'term-success');
    } else {
      sound.denied();
      this.writeln(`[✗] ${res.message}`, 'term-error');
    }
  }

  cmdDefcon() {
    if (!this.game.defense) return;
    this.writeln("============================================================", "ansi-cyan");
    this.writeln("  DEFCON NETWORK THREAT & BLUE TEAM SOC MONITOR", "ansi-yellow");
    this.writeln("============================================================", "ansi-cyan");

    for (const [id, node] of this.game.network.nodes.entries()) {
      if (node.isDiscovered && node.id !== 'localhost') {
        const defcon = this.game.defense.getNodeDefcon(id);
        const hasBackdoor = this.game.defense.hasBackdoor(id);
        let color = "term-success";
        let label = "DEFCON 5 (NORMAL)";
        if (defcon === 3) {
          color = "ansi-yellow";
          label = "DEFCON 3 (ALERT)";
        } else if (defcon === 1) {
          color = "term-error";
          label = "DEFCON 1 (LOCKDOWN)";
        }
        const bdTag = hasBackdoor ? " [ROOTKIT ACTIVE]" : "";
        this.writeln(`  ${node.hostname.padEnd(24, ' ')} (${node.ip.padEnd(14, ' ')}) : ${label}${bdTag}`, color);
      }
    }
    this.writeln("------------------------------------------------------------", "term-dim");
    this.writeln("Tip: Install backdoors with 'backdoor install' while rooted to maintain access.", "term-info");
  }

  cmdMiner(args = []) {
    if (!this.game.malware) return;
    const sub = (args[0] || 'status').toLowerCase();

    if (sub === 'deploy') {
      const target = args[1] || (this.currentHost ? this.currentHost.id : null);
      if (!target || target === 'localhost') {
        return this.writeln("miner: Cannot deploy miner on localhost attack rig. Connect to a remote target first or specify host.", "term-warn");
      }
      const res = this.game.malware.deployMiner(target);
      if (res.success) {
        sound.exploitSuccess();
        this.writeln(`[✔] ${res.message}`, 'term-success');
      } else {
        sound.denied();
        this.writeln(`[✗] ${res.message}`, 'term-error');
      }
      return;
    }

    if (sub === 'list' || sub === 'status') {
      const miners = this.game.malware.listMiners();
      this.writeln("============================================================", "ansi-cyan");
      this.writeln("  ACTIVE CRYPTOMINER FLEET (PERSISTENT MALWARE)", "ansi-yellow");
      this.writeln("============================================================", "ansi-cyan");

      if (miners.length === 0) {
        this.writeln("No active cryptominers deployed.", "term-dim");
        this.writeln("Tip: Connect to a rooted target and type 'miner deploy' to mine crypto.", "term-info");
        return;
      }

      let totalYield = 0;
      let totalMined = 0;
      for (const m of miners) {
        totalYield += m.yieldPerSec;
        totalMined += m.totalMined;
        this.writeln(`  [${m.host.padEnd(20, ' ')}] Hashrate: ${m.yieldPerSec.toFixed(1)} ₿/s | Total Mined: ${m.totalMined.toFixed(1)} ₿ | ACTIVE`, 'term-success');
      }
      this.writeln("------------------------------------------------------------", "term-dim");
      this.writeln(`FLEET HASHRATE: ${totalYield.toFixed(1)} ₿/s  |  TOTAL EXTRACTED: ${totalMined.toFixed(1)} ₿`, 'ansi-yellow');
      return;
    }

    this.writeln("miner: usage: miner [deploy [host] | list | status]", "term-warn");
  }

  cmdEncrypt(dirPath) {
    if (!this.game.malware) return;
    if (!dirPath) {
      return this.writeln("encrypt: usage: encrypt <directory>", "term-warn");
    }
    if (this.currentHost.id === 'localhost') {
      return this.writeln("encrypt: Cannot deploy ransomware against localhost attack machine.", "term-warn");
    }
    if (!this.currentHost.hasRoot) {
      return this.writeln("encrypt: Permission denied. Root privileges required to execute ransomware.", "term-error");
    }

    const res = this.game.malware.encryptDirectory(this.currentHost.id, dirPath);
    if (res.success) {
      if (res.count > 0) {
        sound.exploitSuccess();
        this.writeln(`[✔] ${res.message}`, 'term-success');
      } else {
        this.writeln(`[!] ${res.message}`, 'term-warn');
      }
    } else {
      sound.denied();
      this.writeln(`[✗] ${res.message}`, 'term-error');
    }
  }

  cmdR2(binaryPath) {
    if (!binaryPath) {
      this.writeln('r2: usage: r2 [BINARY_FILE_PATH]', 'term-warn');
      return { success: false, error: 'missing operand' };
    }

    if (!this.currentHost || !this.currentHost.vfs) {
      this.writeln('r2: No host environment connected', 'term-error');
      return { success: false, error: 'no host' };
    }

    const node = this.currentHost.vfs.resolve(binaryPath);
    if (!node || node.type === 'dir') {
      this.writeln(`r2: ${binaryPath}: No such file or directory`, 'term-error');
      return { success: false, error: 'no such file' };
    }

    this.writeln(`[+] Opening binary in radare2 reverse engineering environment: ${binaryPath}...`, 'term-info');
    return this.game.exploits.createHexDisassemblerPuzzle(
      binaryPath,
      (tool) => {
        this.writeln(`[✔] Memory alignment confirmed! EIP hijacked: 0xDEADBEEF`, 'term-success');
        this.writeln(`[★] Zero-Day Exploit weaponized and unlocked: ${tool ? tool.name : 'Zero-Day'}`, 'term-success');
        if (this.game && this.game.missions && this.game.missions.checkProgress) {
          this.game.missions.checkProgress('r2', { binaryPath, tool });
        }
      },
      () => {
        this.writeln(`[✗] Segmentation fault! Radare2 memory alignment failed.`, 'term-error');
      }
    );
  }

  ensureMainPane() {
    if (!this.container || typeof document === 'undefined') return;
    if (this.mainPane && (this.mainPane.parentNode === this.container || (this.container.contains && this.container.contains(this.mainPane)))) {
      return;
    }

    let existingMain = this.container.querySelector ? this.container.querySelector('.terminal-pane-main') : null;
    if (existingMain) {
      this.mainPane = existingMain;
      return;
    }

    this.mainPane = document.createElement('div');
    this.mainPane.className = 'terminal-pane-main';
    this.mainPane.onclick = () => {
      this.activePaneId = 'main';
    };

    // Move existing children (output, input-line, autocomplete) into mainPane
    const childList = Array.from(this.container.children || this.container.childNodes || []);
    const childrenToMove = childList.filter(
      node => !node.classList || !node.classList.contains('terminal-pane-secondary')
    );
    for (const child of childrenToMove) {
      this.mainPane.appendChild(child);
    }

    if (this.container.firstChild && this.container.insertBefore) {
      this.container.insertBefore(this.mainPane, this.container.firstChild);
    } else {
      this.container.appendChild(this.mainPane);
    }
  }

  splitPane(direction = 'horizontal', streamType = 'tail') {
    direction = (direction || 'horizontal').toLowerCase() === 'vertical' ? 'vertical' : 'horizontal';
    const stream = (streamType || 'tail').toLowerCase();

    // Unique pane ID
    const paneId = `pane-${++this.paneCounter}`;

    let paneEl = null;
    let contentEl = null;

    if (this.container && typeof document !== 'undefined') {
      this.ensureMainPane();

      if (this.container.classList) {
        this.container.classList.add('terminal-split-wrapper');
        this.container.classList.remove('split-horizontal', 'split-vertical');
        this.container.classList.add(direction === 'vertical' ? 'split-vertical' : 'split-horizontal');
      }

      paneEl = document.createElement('div');
      paneEl.className = 'terminal-pane-secondary';
      paneEl.id = paneId;

      const headerEl = document.createElement('div');
      headerEl.className = 'pane-header';

      const titleEl = document.createElement('span');
      titleEl.className = 'pane-title';
      titleEl.textContent = `TMUX PANE [${paneId}] // ${stream.toUpperCase()}`;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'pane-close-btn';
      closeBtn.textContent = '[x]';
      closeBtn.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        this.closePane(paneId);
      };

      headerEl.appendChild(titleEl);
      headerEl.appendChild(closeBtn);
      paneEl.appendChild(headerEl);

      contentEl = document.createElement('div');
      contentEl.className = 'pane-content';
      paneEl.appendChild(contentEl);

      paneEl.onclick = () => {
        this.activePaneId = paneId;
      };

      this.container.appendChild(paneEl);
    }

    const pane = {
      id: paneId,
      direction,
      streamType: stream,
      containerEl: paneEl,
      contentEl: contentEl,
      timer: null,
      cleanup: null
    };

    this.bindPaneStream(pane);
    this.panes.set(paneId, pane);
    this.activePaneId = paneId;

    return { success: true, paneId };
  }

  bindPaneStream(pane) {
    if (!pane) return;
    const stream = (pane.streamType || '').toLowerCase();

    if (stream.startsWith('tail')) {
      const parts = stream.split(/\s+/);
      const targetPid = parts[1] ? parseInt(parts[1]) : null;

      const updateTail = () => {
        if (!pane.contentEl) return;
        let proc = null;
        if (this.game && this.game.scripts && this.game.scripts.activeScripts) {
          if (targetPid) {
            proc = this.game.scripts.activeScripts.get(targetPid);
          } else {
            const scripts = Array.from(this.game.scripts.activeScripts.values());
            proc = scripts[scripts.length - 1] || null;
          }
        }

        if (proc) {
          const logs = proc.logs && proc.logs.length > 0 ? proc.logs.join('\n') : '(Awaiting script output...)';
          pane.contentEl.textContent = `[PID ${proc.pid}] ${proc.name} [${proc.threads} threads] - STATUS: ${proc.status}\n------------------------------------------------------------\n${logs}`;
        } else {
          pane.contentEl.textContent = `[TMUX TAIL] No active background script found${targetPid ? ` with PID ${targetPid}` : ''}.\nType 'run <script.js>' to start a process or 'split -h tail <pid>'.`;
        }
      };

      updateTail();
      pane.timer = setInterval(updateTail, 400);

    } else if (stream.startsWith('sniffer')) {
      const updateSniffer = () => {
        if (!pane.contentEl) return;
        const packets = this.game && this.game.network && this.game.network.packets ? this.game.network.packets.slice(0, 20) : [];
        if (packets.length === 0) {
          pane.contentEl.textContent = `[TMUX SNIFFER] Listening on eth0 (promiscuous mode)...\nNo network packets captured yet.`;
          return;
        }

        let out = `TIME       SRC              DEST             PROTO   LEN   INFO\n`;
        out += `----------------------------------------------------------------------\n`;
        packets.forEach(p => {
          const t = (p.time || '').padEnd(10, ' ').slice(0, 10);
          const src = (p.src || p.srcIp || '').padEnd(16, ' ').slice(0, 16);
          const dst = (p.dest || p.dstIp || '').padEnd(16, ' ').slice(0, 16);
          const proto = (p.proto || 'TCP').padEnd(7, ' ').slice(0, 7);
          const len = String(p.len || 64).padEnd(5, ' ').slice(0, 5);
          const info = (p.info || p.payload || '').slice(0, 30);
          out += `${t} ${src} ${dst} ${proto} ${len} ${info}\n`;
        });
        pane.contentEl.textContent = out;
      };

      updateSniffer();
      pane.timer = setInterval(updateSniffer, 400);

    } else if (stream.startsWith('trace')) {
      const updateTrace = () => {
        if (!pane.contentEl) return;
        const trace = this.game && this.game.network ? (this.game.network.activeTrace || 0) : 0;
        const target = this.game && this.game.network && this.game.network.currentTraceTarget ? this.game.network.currentTraceTarget.hostname : 'None';
        const defcon = this.game && this.game.defense ? (this.game.defense.defcon || 5) : 5;

        const barWidth = 24;
        const filled = Math.min(barWidth, Math.max(0, Math.round((trace / 100) * barWidth)));
        const bar = '='.repeat(filled) + (filled < barWidth ? '>' : '') + ' '.repeat(Math.max(0, barWidth - filled - 1));

        let status = 'NOMINAL';
        if (trace >= 90) status = 'CRITICAL INTERCEPT IMMINENT';
        else if (trace >= 70) status = 'HIGH ALERT';
        else if (trace >= 40) status = 'ELEVATED SURVEILLANCE';

        let out = `============================================================\n`;
        out += `  INTRUSION DETECTION SYSTEM (IDS) // LIVE TRACE TELEMETRY\n`;
        out += `============================================================\n`;
        out += `  TRACE LEVEL : [${bar}] ${trace.toFixed(1)}%\n`;
        out += `  DEFCON ALERT: LEVEL ${defcon}\n`;
        out += `  ACTIVE TARGET: ${target}\n`;
        out += `  STATUS      : ${status}\n`;
        out += `------------------------------------------------------------\n`;
        out += `  Mitigation  : Disconnect (exit) or deploy proxy bouncers.`;

        pane.contentEl.textContent = out;
      };

      updateTrace();
      pane.timer = setInterval(updateTrace, 400);

    } else {
      if (pane.contentEl) {
        pane.contentEl.textContent = `[TMUX PANE ${pane.id}] Stream: ${pane.streamType}\nAwaiting data stream...`;
      }
      pane.timer = setInterval(() => {}, 1000);
    }
  }

  closePane(paneId) {
    if (!paneId) {
      if (this.activePaneId && this.activePaneId !== 'main' && this.panes.has(this.activePaneId)) {
        paneId = this.activePaneId;
      } else if (this.panes.size > 0) {
        paneId = this.panes.keys().next().value;
      } else {
        return false;
      }
    }

    let pane = this.panes.get(paneId);
    let resolvedKey = paneId;

    if (!pane) {
      for (const [key, p] of this.panes.entries()) {
        if (key === `pane-${paneId}` || p.id === paneId || p.id === `pane-${paneId}` || key.endsWith(paneId)) {
          pane = p;
          resolvedKey = key;
          break;
        }
      }
    }

    if (!pane) return false;

    // Clears any polling timer or event listeners (Review Focus 4: prevents memory leaks)
    if (pane.timer) {
      clearInterval(pane.timer);
      pane.timer = null;
    }

    if (typeof pane.cleanup === 'function') {
      pane.cleanup();
      pane.cleanup = null;
    }

    // Remove DOM element
    if (pane.containerEl) {
      if (typeof pane.containerEl.remove === 'function') {
        pane.containerEl.remove();
      } else if (pane.containerEl.parentNode && typeof pane.containerEl.parentNode.removeChild === 'function') {
        pane.containerEl.parentNode.removeChild(pane.containerEl);
      }
    }

    this.panes.delete(resolvedKey);

    // If no more secondary panes, reset to single-pane layout
    if (this.panes.size === 0) {
      this.activePaneId = 'main';

      if (this.container) {
        if (this.container.classList) {
          this.container.classList.remove('terminal-split-wrapper', 'split-horizontal', 'split-vertical');
        }

        // Unwrap main pane
        if (this.mainPane) {
          const mainChildren = Array.from(this.mainPane.children || this.mainPane.childNodes || []);
          for (const child of mainChildren) {
            this.container.appendChild(child);
          }
          if (typeof this.mainPane.remove === 'function') {
            this.mainPane.remove();
          } else if (this.mainPane.parentNode && typeof this.mainPane.parentNode.removeChild === 'function') {
            this.mainPane.parentNode.removeChild(this.mainPane);
          }
          this.mainPane = null;
        }
      }
    } else {
      this.activePaneId = this.panes.keys().next().value;
    }

    return true;
  }

  cmdSplit(args = []) {
    let direction = 'horizontal';
    let streamTokens = [];

    for (let i = 0; i < args.length; i++) {
      const a = (args[i] || '').toLowerCase();
      if (a === '-h' || a === '--horizontal' || a === 'horizontal') {
        direction = 'horizontal';
      } else if (a === '-v' || a === '--vertical' || a === 'vertical') {
        direction = 'vertical';
      } else {
        streamTokens.push(args[i]);
      }
    }

    const streamType = streamTokens.length > 0 ? streamTokens.join(' ') : 'tail';
    const res = this.splitPane(direction, streamType);
    if (res && res.success) {
      this.writeln(`[✔] TMUX split pane [${res.paneId}] created (${direction}, ${streamType})`, 'term-success');
    } else {
      this.writeln(`[✗] Failed to split pane${res && res.error ? ': ' + res.error : ''}`, 'term-error');
    }
    return res;
  }

  cmdClose(paneId) {
    if (this.panes.size === 0) {
      this.writeln('close: no active split panes open', 'term-warn');
      return false;
    }

    const targetId = paneId || this.activePaneId;
    const closed = this.closePane(targetId);
    if (closed) {
      this.writeln(`[+] TMUX pane closed. Returned to single pane layout.`, 'term-success');
    } else {
      this.writeln(`close: pane '${paneId}' not found. Active panes: ${Array.from(this.panes.keys()).join(', ')}`, 'term-error');
    }
    return closed;
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
