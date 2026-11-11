// ============================================================
// HACKER SIMULATOR // NETWORK & TOPOLOGY ENGINE
// Simulated nodes, subnets, routing, ports, packets, canvas graph
// ============================================================

import { VirtualFileSystem } from './vfs.js';

export class NetworkNode {
  constructor(config) {
    this.id = config.id;
    this.hostname = config.hostname;
    this.ip = config.ip;
    this.subnet = config.subnet || 'PUBLIC';
    this.description = config.description || 'Generic Node';
    this.securityLevel = config.securityLevel || 1; // 1 (Novice) to 5 (Military Air-Gap)
    this.hasRoot = config.hasRoot || false;
    this.isDiscovered = config.isDiscovered || false;
    this.ports = config.ports || {}; // { 21: { service: 'ftp', open: true, version: 'ProFTPd 1.3.3c', vuln: 'CVE-2010-4221' } }
    this.requiredPortsToRoot = config.requiredPortsToRoot || 1;
    this.traceSpeed = config.traceSpeed || 1.0; // % per second when active
    this.bounty = config.bounty || 100;
    this.vfs = new VirtualFileSystem(this.hostname);

    // Canvas position & graph physics
    this.x = config.x || Math.random() * 600 + 50;
    this.y = config.y || Math.random() * 400 + 50;
    this.vx = 0;
    this.vy = 0;
    this.radius = 14 + (this.securityLevel * 2);
    this.color = config.color || '#7aa2f7';
    this.connections = config.connections || []; // Node IDs this connects to
  }
}

export class NetworkSimulation {
  constructor() {
    this.nodes = new Map();
    this.packets = [];
    this.packetCounter = 0;
    this.maxPackets = 150;
    this.activeTrace = 0; // 0 to 100%
    this.traceActive = false;
    this.currentTraceTarget = null;
    this.onPacketCallback = null;
    this.onTraceAlertCallback = null;

    this.initDefaultNetwork();
  }

  initDefaultNetwork() {
    // 1. Localhost (Player rig)
    const localhost = new NetworkNode({
      id: 'localhost',
      hostname: 'hackbox',
      ip: '127.0.0.1',
      subnet: 'LAN',
      description: 'Player Local Attack Machine (Kali Linux v6.4)',
      securityLevel: 1,
      hasRoot: true,
      isDiscovered: true,
      x: 100,
      y: 180,
      color: '#00ff66',
      ports: {
        22: { service: 'ssh', open: true, version: 'OpenSSH 9.2p1', vuln: null }
      },
      connections: ['gateway']
    });
    this.setupLocalhostVFS(localhost.vfs);
    this.nodes.set(localhost.id, localhost);

    // 2. Gateway / ISP Router
    const gateway = new NetworkNode({
      id: 'gateway',
      hostname: 'isp-gw-01',
      ip: '192.168.1.1',
      subnet: 'LAN',
      description: 'Local ISP Fiber Gateway Router',
      securityLevel: 1,
      hasRoot: false,
      isDiscovered: true,
      x: 220,
      y: 180,
      color: '#7aa2f7',
      ports: {
        80: { service: 'http', open: true, version: 'micro_httpd 2014', vuln: 'CVE-2014-2321' },
        22: { service: 'ssh', open: false, version: 'Dropbear SSH 2019.78', vuln: 'Weak Credentials' }
      },
      requiredPortsToRoot: 1,
      bounty: 150,
      connections: ['localhost', 'univ-ftp', 'darknet-relay', 'corp-dmz']
    });
    this.setupGatewayVFS(gateway.vfs);
    this.nodes.set(gateway.id, gateway);

    // 3. University FTP Server (Mission 1 Target)
    const univ = new NetworkNode({
      id: 'univ-ftp',
      hostname: 'acad-ftp.edu',
      ip: '192.168.1.45',
      subnet: 'ACADEMIC',
      description: 'State Polytech Academic File Repository',
      securityLevel: 1,
      hasRoot: false,
      isDiscovered: true,
      x: 320,
      y: 80,
      color: '#73daca',
      ports: {
        21: { service: 'ftp', open: true, version: 'ProFTPD 1.3.3c', vuln: 'Backdoor command execution' },
        80: { service: 'http', open: true, version: 'Apache 2.4.41', vuln: null }
      },
      requiredPortsToRoot: 1,
      bounty: 500,
      connections: ['gateway']
    });
    this.setupUnivVFS(univ.vfs);
    this.nodes.set(univ.id, univ);

    // 4. Shadow Bank Offshore Node (Mission 2 Target)
    const bank = new NetworkNode({
      id: 'shadow-bank',
      hostname: 'cayman-core.finance',
      ip: '104.28.19.82',
      subnet: 'FINANCIAL',
      description: 'Offshore Anonymous Crypto & Banking Node',
      securityLevel: 2,
      hasRoot: false,
      isDiscovered: false,
      x: 440,
      y: 280,
      color: '#e0af68',
      ports: {
        21: { service: 'ftp', open: false, version: 'vsftpd 3.0.3', vuln: null },
        22: { service: 'ssh', open: true, version: 'OpenSSH 7.4', vuln: 'CVE-2018-15473' },
        80: { service: 'http', open: true, version: 'nginx 1.18.0', vuln: null },
        3306: { service: 'mysql', open: true, version: 'MariaDB 10.3', vuln: 'SQLi Authentication Bypass' }
      },
      requiredPortsToRoot: 2,
      bounty: 1200,
      connections: ['gateway', 'darknet-relay']
    });
    this.setupBankVFS(bank.vfs);
    this.nodes.set(bank.id, bank);

    // 5. Darknet Relay (Underground Dealer / NullSector)
    const darknet = new NetworkNode({
      id: 'darknet-relay',
      hostname: 'onion-proxy-9',
      ip: '198.51.100.24',
      subnet: 'DARKNET',
      description: 'Encrypted NullSector Underworld Relay',
      securityLevel: 3,
      hasRoot: false,
      isDiscovered: false,
      x: 200,
      y: 330,
      color: '#bb9af7',
      ports: {
        22: { service: 'ssh', open: true, version: 'OpenSSH 8.9p1', vuln: null },
        8080: { service: 'proxy', open: true, version: 'ShadowProxy v2.1', vuln: 'Buffer Misalignment' },
        1337: { service: 'backdoor', open: true, version: 'NullSector Daemon', vuln: 'Knock sequence required' }
      },
      requiredPortsToRoot: 2,
      bounty: 2500,
      connections: ['gateway', 'shadow-bank', 'medtech-node']
    });
    this.setupDarknetVFS(darknet.vfs);
    this.nodes.set(darknet.id, darknet);

    // 6. Corporate DMZ Gateway
    const corpDmz = new NetworkNode({
      id: 'corp-dmz',
      hostname: 'chimera-corp-gw',
      ip: '172.16.0.1',
      subnet: 'CORP-NET',
      description: 'Chimera Defense Systems Border Firewall',
      securityLevel: 3,
      hasRoot: false,
      isDiscovered: false,
      x: 360,
      y: 190,
      color: '#ff9e3b',
      ports: {
        22: { service: 'ssh', open: true, version: 'OpenSSH 8.2', vuln: 'Weak root credentials' },
        80: { service: 'http', open: true, version: 'IIS 10.0', vuln: null },
        443: { service: 'https', open: true, version: 'OpenSSL 1.1.1', vuln: null }
      },
      requiredPortsToRoot: 2,
      bounty: 3000,
      connections: ['gateway', 'apex-airgap', 'medtech-node']
    });
    this.setupCorpVFS(corpDmz.vfs);
    this.nodes.set(corpDmz.id, corpDmz);

    // 7. MedTech Bio Research
    const medtech = new NetworkNode({
      id: 'medtech-node',
      hostname: 'biogen-research.internal',
      ip: '172.16.4.88',
      subnet: 'CORP-NET',
      description: 'Synthetics Bio-Neural Genetics Datastore',
      securityLevel: 3,
      hasRoot: false,
      isDiscovered: false,
      x: 320,
      y: 350,
      color: '#2ac3de',
      ports: {
        21: { service: 'ftp', open: true, version: 'ProFTPD 1.3.5', vuln: 'Mod_copy arbitrary copy' },
        80: { service: 'http', open: true, version: 'Node.js Express', vuln: null },
        3306: { service: 'mysql', open: true, version: 'MySQL 5.7', vuln: 'Default admin root' }
      },
      requiredPortsToRoot: 2,
      bounty: 4500,
      connections: ['corp-dmz', 'darknet-relay']
    });
    this.setupMedtechVFS(medtech.vfs);
    this.nodes.set(medtech.id, medtech);

    // 8. Apex Defense Air-Gapped Controller (Endgame Target)
    const apex = new NetworkNode({
      id: 'apex-airgap',
      hostname: 'apex-black-box',
      ip: '10.0.4.99',
      subnet: 'MIL-AIRGAP',
      description: 'Orbital Defense Laser Network Mainframe',
      securityLevel: 5,
      hasRoot: false,
      isDiscovered: false,
      x: 520,
      y: 120,
      color: '#f7768e',
      ports: {
        22: { service: 'ssh', open: true, version: 'Custom MilSSH v4', vuln: 'Kernel zero-day exploit' },
        443: { service: 'https', open: true, version: 'AirGap Gateway', vuln: null },
        1337: { service: 'backdoor', open: false, version: 'Killswitch daemon', vuln: 'Requires 4 key fragments' }
      },
      requiredPortsToRoot: 3,
      bounty: 15000,
      connections: ['corp-dmz', 'satellite-link']
    });
    this.setupApexVFS(apex.vfs);
    this.nodes.set(apex.id, apex);

    // 9. Global Satellite Uplink
    const satellite = new NetworkNode({
      id: 'satellite-link',
      hostname: 'sky-relay-alpha',
      ip: '203.0.113.5',
      subnet: 'ORBITAL',
      description: 'Geostationary High-Orbit Quantum Transceiver',
      securityLevel: 4,
      hasRoot: false,
      isDiscovered: false,
      x: 540,
      y: 240,
      color: '#bb9af7',
      ports: {
        8080: { service: 'proxy', open: true, version: 'QuantumRoute 4.0', vuln: 'Entropy bypass' },
        22: { service: 'ssh', open: true, version: 'OpenSSH 8.4', vuln: 'RSA private key reuse' }
      },
      requiredPortsToRoot: 2,
      bounty: 8000,
      connections: ['apex-airgap', 'shadow-bank']
    });
    this.setupSatelliteVFS(satellite.vfs);
    this.nodes.set(satellite.id, satellite);
  }

  // Populate Localhost VFS
  setupLocalhostVFS(vfs) {
    vfs.mkdir('/bin');
    vfs.mkdir('/etc');
    vfs.mkdir('/home/player/tools');
    vfs.mkdir('/home/player/loot');
    vfs.mkdir('/home/player/scripts');
    vfs.mkdir('/var/log');

    vfs.writeFile('/home/player/readme.txt', 
      "====================================================\n" +
      " WELCOME TO HACKER SIMULATOR (v2.4.0)\n" +
      "====================================================\n\n" +
      "Your node is configured for offensive cyber operations.\n" +
      "Commands available:\n" +
      "  - help           : Show full system manual\n" +
      "  - scan [ip]      : Recon target host ports and vulnerabilities\n" +
      "  - crack [ip]     : Launch automated exploit against open ports\n" +
      "  - ssh [user@ip]  : Open remote shell on compromised node\n" +
      "  - cat, ls, cd    : Standard UNIX file navigation\n" +
      "  - run [script]   : Execute JS automation script (e.g. run scripts/farm.js)\n" +
      "  - tail [pid]     : Watch real-time script output logs\n" +
      "  - sniff          : View live packet streams\n" +
      "  - download [file]: Extract files from remote hosts\n\n" +
      "Check your MISSIONS panel on the right to accept contracts.\n"
    );

    vfs.writeFile('/home/player/scripts/farm.js',
      "// Autonomous Botnet Farming Script\n" +
      "// Continuously optimizes target security and siphons funds\n" +
      "const target = '192.168.1.45';\n" +
      "hs.tprint('Initiating farm loop against ' + target);\n\n" +
      "while (true) {\n" +
      "  const sec = hs.getServerSecurity(target);\n" +
      "  const money = hs.getServerMoney(target);\n" +
      "  hs.print('Telemetry -> Security: ' + sec + ' | Reserve: ' + money + ' BTC');\n\n" +
      "  if (sec > 2) {\n" +
      "    hs.print('Weakening security layers...');\n" +
      "    await hs.weaken(target);\n" +
      "  } else if (money < 300) {\n" +
      "    hs.print('Expanding reserve pool...');\n" +
      "    await hs.grow(target);\n" +
      "  } else {\n" +
      "    hs.print('Executing hack siphoning payload...');\n" +
      "    const yieldBtc = await hs.hack(target);\n" +
      "    hs.tprint('Payload success: +' + yieldBtc + ' BTC from ' + target);\n" +
      "  }\n" +
      "  await hs.sleep(1200);\n" +
      "}\n"
    );

    vfs.writeFile('/home/player/scripts/autohack.js',
      "// Network Probe & Siphon Worker\n" +
      "hs.tprint('Starting autohack probe cycle...');\n" +
      "const targets = ['192.168.1.45', '104.28.19.82', '172.16.0.1'];\n\n" +
      "for (const t of targets) {\n" +
      "  if (hs.hasRoot(t)) {\n" +
      "    hs.tprint('Target ' + t + ' is rooted. Harvesting data...');\n" +
      "    await hs.hack(t);\n" +
      "  } else {\n" +
      "    hs.print('Skipping ' + t + ' (not rooted)');\n" +
      "  }\n" +
      "}\n" +
      "hs.tprint('Autohack cycle completed.');\n"
    );

    vfs.writeFile('/home/player/notes.md', 
      "# TARGET RECON NOTES\n" +
      "- 192.168.1.1 (Gateway): Default router. Port 80 runs old micro_httpd.\n" +
      "- 192.168.1.45 (University): Target for NullSector Contract 1. Vulnerable ProFTPd 1.3.3c on port 21.\n" +
      "- NullSector pays in BTC credits upon mission file retrieval.\n" +
      "- Use 'run scripts/farm.js' to automate revenue from rooted nodes.\n"
    );

    vfs.writeFile('/etc/motd', "Debian GNU/Linux 12 (bookworm) - Kernel 6.4.0-hacker-x86_64\nUnauthorized access will be prosecuted under International Cyber Treaties.\n");
    vfs.writeFile('/var/log/auth.log', "Nov 11 01:00:12 localhost sshd[102]: Accepted publickey for player from 127.0.0.1 port 54892 ssh2\n");
    vfs.currentPath = '/home/player';
  }

  // Populate Gateway VFS
  setupGatewayVFS(vfs) {
    vfs.mkdir('/etc');
    vfs.mkdir('/www');
    vfs.mkdir('/var/log');
    vfs.writeFile('/etc/config.json', '{"dhcp_range":"192.168.1.100-200","dns_primary":"1.1.1.1","firewall":"loose"}');
    vfs.writeFile('/www/index.html', '<h1>ISP Router Administration</h1><p>Firmware v1.0.4. Please upgrade.</p>');
    vfs.writeFile('/var/log/syslog', 'Nov 11 00:41:22 router kernel: NAT table renewed. Connected hosts: 4\n');
  }

  // Populate University VFS
  setupUnivVFS(vfs) {
    vfs.mkdir('/home/admin');
    vfs.mkdir('/var/ftp/public');
    vfs.mkdir('/var/ftp/classified');
    vfs.writeFile('/var/ftp/public/welcome.msg', 'Welcome to Polytech Academic Archive. Upload student papers here.\n');
    vfs.writeFile('/var/ftp/classified/exam_keys_2026.enc', 'ENCRYPTED_AES256_PAYLOAD:4a8b7201dfbc9344109f0293e8ab12\n', { isSecret: true });
    vfs.writeFile('/home/admin/credentials.txt', 'DB_USER=root\nDB_PASS=P0lyT3ch_S3cur3!#\nDEEP_RELAY_IP=198.51.100.24\n', { isSecret: true });
  }

  // Populate Bank VFS
  setupBankVFS(vfs) {
    vfs.mkdir('/home/finance');
    vfs.mkdir('/var/db_dumps');
    vfs.writeFile('/var/db_dumps/honeypot.token', 'CANARY_AUTH_TOKEN_TRIPWIRE:0xDEADBEEF\n', { isSecret: true });
    vfs.writeFile('/var/db_dumps/ledger_accounts.csv', 
      "account_id,holder,balance_btc,routing\n" +
      "99401,GhostHoldings LLC,420.50,CAY-991\n" +
      "99402,NullSector Reserve,1500.00,ANON-002\n" +
      "99403,Senator Vance,85.25,SWISS-77\n", 
      { isSecret: true }
    );
    vfs.writeFile('/home/finance/private_key.pem', '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA04q2+bT...[TRUNCATED_CHIMERA_KEY]...==\n-----END RSA PRIVATE KEY-----\n', { isSecret: true });
    vfs.writeFile('/home/finance/transaction_verifier', '\x7fELF_TRANSACTION_VERIFIER_X86_64_FLAG{FINANCIAL_TX_0DAY}\n', { isSecret: true });
  }

  // Populate Darknet VFS
  setupDarknetVFS(vfs) {
    vfs.mkdir('/nullsector');
    vfs.mkdir('/nullsector/exploits');
    vfs.writeFile('/nullsector/manifesto.txt', 'Information belongs to everyone. The firewalls will fall.\n-- NullSector Collective\n');
    vfs.writeFile('/nullsector/exploits/zero_day_kernel.c', '// Chimera kernel privilege escalation 0-day\n#include <sys/mman.h>\n// PAYLOAD READY\n', { isSecret: true });
    vfs.writeFile('/nullsector/bounties.json', '{"targets":["172.16.0.1","172.16.4.88","10.0.4.99"],"payout":"unlimited"}');
  }

  // Populate Corporate DMZ VFS
  setupCorpVFS(vfs) {
    vfs.mkdir('/opt/chimera');
    vfs.mkdir('/opt/chimera/blueprints');
    vfs.mkdir('/opt/chimera/bin');
    vfs.writeFile('/opt/chimera/passwords.kdbx', 'CANARY_TRIPWIRE_ENCRYPTED_VAULT\n', { isSecret: true });
    vfs.writeFile('/opt/chimera/blueprints/orbital_schematics.dxf', 'BINARY_AIRGAP_LINK_KEY: 0x99F4A801 // APEX TARGET 10.0.4.99\n', { isSecret: true });
    vfs.writeFile('/opt/chimera/bin/auth_daemon', '\x7fELF_AUTH_DAEMON_EXEC_FLAG{CHIMERA_AUTH_DAEMON_0DAY_PWNED}\n', { isSecret: true });
    vfs.writeFile('/etc/shadow', 'root:$6$rounds=5000$saltsalt$h9s2m9f821...:19200:0:99999:7:::\nadmin:$6$rounds=5000$test$p@ssw0rd123:19200:0:99999:7:::\n', { isSecret: true });
  }

  // Populate Medtech VFS
  setupMedtechVFS(vfs) {
    vfs.mkdir('/data/genomics');
    vfs.writeFile('/data/genomics/neural_synthesis.dat', 'PROJECT_NEURAL_LINK: Stage 4 Human Trials Approved. Authorized by Apex Defense.\n', { isSecret: true });
    vfs.writeFile('/data/genomics/access_token.jwt', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic3lzYWRtaW4ifQ.chimera_apex_sig\n', { isSecret: true });
  }

  // Populate Apex Airgap VFS
  setupApexVFS(vfs) {
    vfs.mkdir('/defense/orbital');
    vfs.mkdir('/defense/killswitch');
    vfs.writeFile('/defense/orbital/targeting_coordinates.xml', '<Targeting><LaserGrid Active="true"/><Uplink>203.0.113.5</Uplink></Targeting>\n', { isSecret: true });
    vfs.writeFile('/defense/killswitch/override_master.key', 'MASTER_OVERRIDE_FLAG{APEX_DEFENSE_COMPROMISED_CYBER_SUPREMACY_2026}\n', { isSecret: true });
    vfs.writeFile('/defense/killswitch/guidance_core', '\x7fELF_GUIDANCE_CORE_EXEC_FLAG{APEX_GUIDANCE_0DAY}\n', { isSecret: true });
  }

  // Populate Satellite VFS
  setupSatelliteVFS(vfs) {
    vfs.mkdir('/firmware');
    vfs.writeFile('/firmware/telemetry.log', 'ORBIT_STABLE // APOGEE: 35786km // PERIGEE: 35786km // UPLINK: APEX-CORE-ACTIVE\n');
  }

  // Node Discovery & Resolution
  getNode(idOrIp) {
    if (this.nodes.has(idOrIp)) return this.nodes.get(idOrIp);
    for (const node of this.nodes.values()) {
      if (node.ip === idOrIp || node.hostname.toLowerCase() === idOrIp.toLowerCase()) {
        return node;
      }
    }
    return null;
  }

  // Discover a node
  discoverNode(nodeId) {
    const node = this.getNode(nodeId);
    if (node && !node.isDiscovered) {
      node.isDiscovered = true;
      return true;
    }
    return false;
  }

  // Add packet to simulation stream and return unique packet ID
  addPacket(data = {}) {
    this.packetCounter = (this.packetCounter || 0) + 1;
    const id = data.id || `pkt_${Date.now()}_${this.packetCounter}`;
    const srcIp = data.srcIp || data.src || '127.0.0.1';
    const dstIp = data.dstIp || data.dest || '127.0.0.1';
    const proto = data.proto || 'TCP';
    const payload = data.payload || data.info || '';
    const len = data.len || (payload ? payload.length : 64);
    const info = data.info || (payload.length > 50 ? payload.substring(0, 50) + '...' : payload);
    const time = data.time || (new Date().toTimeString().slice(0, 8) + '.' + Math.floor(Math.random() * 900 + 100));

    const srcNode = this.getNode(srcIp);
    const dstNode = this.getNode(dstIp);

    const packet = {
      ...data,
      id,
      time,
      srcIp,
      dstIp,
      src: srcIp,
      dest: dstIp,
      proto,
      len,
      payload,
      info,
      srcNodeId: data.srcNodeId || (srcNode ? srcNode.id : null),
      dstNodeId: data.dstNodeId || (dstNode ? dstNode.id : null),
      progress: data.progress !== undefined ? data.progress : 0
    };

    this.packets.unshift(packet);
    if (this.packets.length > this.maxPackets) {
      this.packets.pop();
    }

    if (this.onPacketCallback) {
      this.onPacketCallback(packet);
    }

    return id;
  }

  // Retrieve packet details by ID with hex and ASCII payload representations
  getPacketDetails(packetId) {
    const packet = this.packets.find(p => p.id === packetId);
    if (!packet) return null;

    const payload = packet.payload || packet.info || '';
    const hexDump = Array.from(payload)
      .map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    const asciiDump = payload;

    return {
      ...packet,
      hexDump,
      asciiDump
    };
  }

  // MITM Packet Forgery: Replay authentication token to compromise destination host
  forgeAuthPacket(packetId) {
    const packet = this.packets.find(p => p.id === packetId);
    if (!packet) {
      return { success: false, message: "Packet not found." };
    }

    const payload = packet.payload || packet.info || '';
    const authRegex = /(authorization:\s*(bearer|basic)|bearer(\s+|_)[a-z0-9_\.\-]+|password\s*=[^&\s]+|username=[^&\s]+.*password=|session_token\s*=[a-z0-9_\.\-]+|auth_token\s*=[a-z0-9_\.\-]+|jwt[=:\s])/i;
    const isAuth = authRegex.test(payload);

    if (!isAuth) {
      return { success: false, message: "No hijackable authentication token found in packet payload." };
    }

    const targetNode = this.getNode(packet.dstIp || packet.dest || packet.dstNodeId);
    if (!targetNode) {
      return { success: false, message: "Destination node not found." };
    }

    targetNode.hasRoot = true;

    if (this.game && this.game.missions && typeof this.game.missions.checkProgress === 'function') {
      this.game.missions.checkProgress('root', targetNode);
    }

    return { success: true, targetNode };
  }

  // Packet generation tick
  tickPackets() {
    // Generate realistic background simulated traffic between connected nodes
    const nodeList = Array.from(this.nodes.values()).filter(n => n.isDiscovered);
    if (nodeList.length < 2) return;

    if (Math.random() < 0.35) {
      const src = nodeList[Math.floor(Math.random() * nodeList.length)];
      // Choose connected or random target
      let dst;
      if (src.connections.length > 0 && Math.random() < 0.7) {
        dst = this.getNode(src.connections[Math.floor(Math.random() * src.connections.length)]);
      }
      if (!dst) dst = nodeList[Math.floor(Math.random() * nodeList.length)];
      if (src.id === dst.id) return;

      const isAuth = Math.random() < 0.25;
      let proto;
      let payload;

      if (isAuth) {
        proto = 'HTTP';
        const authPayloads = [
          `POST /login username=admin password=SecretPass_${Math.floor(Math.random() * 9000 + 1000)}`,
          `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token_${Math.random().toString(36).substring(2, 10)}\r\nHost: ${dst.ip}`,
          `POST /api/v1/auth HTTP/1.1\r\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.root_access_${Math.random().toString(36).substring(2, 8)}`,
          `GET /admin/dashboard HTTP/1.1\r\nCookie: session_token=SESSION_${Math.random().toString(36).substring(2, 10)}; auth=valid`
        ];
        payload = authPayloads[Math.floor(Math.random() * authPayloads.length)];
      } else {
        const protos = ['TCP', 'SSH', 'HTTP', 'ICMP', 'RAW'];
        proto = protos[Math.floor(Math.random() * protos.length)];
        const payloads = [
          'SYN seq=49201 ack=0 win=65535',
          'ACK seq=49202 ack=8104 win=64240',
          'GET /api/v1/telemetry HTTP/1.1',
          'SSH-2.0-OpenSSH_8.9p1 Key Exchange',
          'ICMP Echo (ping) request id=0x04bf',
          'TLSv1.3 Handshake Client Hello',
          'POST /auth/login status=401',
          'PSH, ACK len=1420 win=32768'
        ];
        payload = payloads[Math.floor(Math.random() * payloads.length)];
      }

      this.addPacket({
        srcIp: src.ip,
        dstIp: dst.ip,
        srcNodeId: src.id,
        dstNodeId: dst.id,
        proto: proto,
        len: Math.floor(Math.random() * 1400 + 64),
        payload: payload,
        info: payload
      });
    }
  }
}
