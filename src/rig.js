// ============================================================
// HACKER SIMULATOR // MODULAR CYBER-DECK RIG & MARKETPLACE
// Modular hardware slots, stat modifiers, thermal loop, overclock
// ============================================================

export const HARDWARE_CATALOG = {
  cpu: [
    { id: 'cpu_celeron', name: 'Intel Celeron Dual-Core G3900', threads: 2, price: 0, desc: 'Stock budget dual-core processor.' },
    { id: 'cpu_i7', name: 'Intel Core i7-13700K Octa-Core', threads: 8, price: 1200, desc: 'High-speed 8-core CPU for multi-threaded botnets.' },
    { id: 'cpu_threadripper', name: 'AMD Ryzen Threadripper 3990X', threads: 64, price: 6000, desc: 'Enterprise workstation 64-core powerhouse.' },
    { id: 'cpu_quantum', name: 'Chimera Quantum Neural Processor', threads: 256, price: 25000, desc: 'Experimental superconductor neural computing matrix.' }
  ],
  ram: [
    { id: 'ram_4gb', name: '4 GB DDR3-1600 Standard', maxScripts: 3, price: 0, desc: 'Base memory module; holds up to 3 active scripts.' },
    { id: 'ram_16gb', name: '16 GB DDR4-3200 Low-Latency', maxScripts: 10, price: 800, desc: 'Expanded RAM for medium botnet automation.' },
    { id: 'ram_64gb', name: '64 GB DDR5-6000 Performance', maxScripts: 30, price: 4500, desc: 'Heavy memory bandwidth for aggressive parallel operations.' },
    { id: 'ram_256gb', name: '256 GB High-Bandwidth ECC Stack', maxScripts: 999, price: 18000, desc: 'Data center grade ECC memory pool; virtually unlimited scripts.' }
  ],
  storage: [
    { id: 'storage_hdd', name: '500 GB Mechanical HDD', downloadSpeed: 0.5, price: 0, desc: 'Standard magnetic drive (500 KB/s I/O).' },
    { id: 'storage_sata', name: '1 TB SATA III SSD', downloadSpeed: 2.0, price: 600, desc: 'Solid state speed boost (2 MB/s).' },
    { id: 'storage_nvme', name: '4 TB Gen4 NVMe M.2 Array', downloadSpeed: 15.0, price: 3200, desc: 'Blazing fast transfer bandwidth (15 MB/s).' },
    { id: 'storage_optane', name: 'Holographic Optical Storage Array', downloadSpeed: 100.0, price: 12000, desc: 'Near-instantaneous binary read/write throughput.' }
  ],
  antenna: [
    { id: 'ant_ethernet', name: 'Standard 1GbE Onboard NIC', scanRange: 1, price: 0, desc: 'Standard local network adapter.' },
    { id: 'ant_wifi6', name: 'Dual-Band Wi-Fi 6E PCI-e Card', scanRange: 2, price: 900, desc: 'Scans adjacent institutional & academic subnets.' },
    { id: 'ant_sdr', name: 'HackRF Software Defined Radio Transceiver', scanRange: 3, price: 5000, desc: 'Uncovers hidden encrypted darknet relays.' },
    { id: 'ant_laser', name: 'Orbital Optical Quantum Transceiver', scanRange: 4, price: 20000, desc: 'Penetrates air-gaps and military orbital uplinks.' }
  ],
  bouncer: [
    { id: 'vpn_direct', name: 'Direct Public ISP Connection', traceMultiplier: 1.0, price: 0, desc: 'Exposed IP address; baseline trace rate.' },
    { id: 'vpn_single', name: 'Encrypted Single-Hop VPN Tunnel', traceMultiplier: 0.75, price: 1500, desc: 'Reduces passive trace rate by 25%.' },
    { id: 'vpn_tor3', name: '3-Hop Tor Onion Relay Circuit', traceMultiplier: 0.4, price: 7000, desc: 'Anonymizes packet origins; reduces trace rate by 60%.' },
    { id: 'vpn_ghost', name: 'Darknet Ghost Distributed Proxy Mesh', traceMultiplier: 0.15, price: 22000, desc: 'Dynamic decoy routing; reduces trace accumulation by 85%.' }
  ],
  cooling: [
    { id: 'cool_stock', name: 'Stock Aluminum Heatsink & Fan', dissipation: 1.0, price: 0, desc: 'Basic air cooling.' },
    { id: 'cool_dual', name: 'Dual-Tower Copper Heatpipe Cooler', dissipation: 2.5, price: 800, desc: 'Improved thermal headroom.' },
    { id: 'cool_liquid360', name: 'Custom 360mm Triple-Fan Liquid Loop', dissipation: 5.0, price: 3500, desc: 'High-performance liquid cooling for extended overclocking.' },
    { id: 'cool_cryo', name: 'Sub-Zero Liquid Nitrogen Cryo Rig', dissipation: 12.0, price: 15000, desc: 'Extreme industrial cooling with instantaneous thermal recovery.' }
  ]
};

export class CyberDeck {
  constructor(game) {
    this.game = game;

    // Equipped slots
    this.slots = {
      cpu: 'cpu_celeron',
      ram: 'ram_4gb',
      storage: 'storage_hdd',
      antenna: 'ant_ethernet',
      bouncer: 'vpn_direct',
      cooling: 'cool_stock'
    };

    // Thermal & Overclock state
    this.temperature = 35.0; // in Celsius
    this.overclockActive = false;
    this.isThrottled = false;
  }

  getItem(slot, id) {
    const list = HARDWARE_CATALOG[slot];
    if (!list) return null;
    return list.find(item => item.id === id) || null;
  }

  getEquippedItem(slot) {
    const id = this.slots[slot];
    return this.getItem(slot, id);
  }

  getThreadsCapacity() {
    const cpu = this.getEquippedItem('cpu');
    return cpu ? cpu.threads : 2;
  }

  getMaxConcurrentScripts() {
    const ram = this.getEquippedItem('ram');
    return ram ? ram.maxScripts : 3;
  }

  getDownloadSpeed() {
    const storage = this.getEquippedItem('storage');
    return storage ? storage.downloadSpeed : 0.5;
  }

  getScanRange() {
    const ant = this.getEquippedItem('antenna');
    return ant ? ant.scanRange : 1;
  }

  getTraceMultiplier() {
    const bouncer = this.getEquippedItem('bouncer');
    return bouncer ? bouncer.traceMultiplier : 1.0;
  }

  getSpeedMultiplier() {
    if (this.isThrottled) return 0.5;
    if (this.overclockActive) return 2.0;
    return 1.0;
  }

  getMarketCatalog() {
    return HARDWARE_CATALOG;
  }

  purchaseHardware(itemId) {
    for (const [slot, items] of Object.entries(HARDWARE_CATALOG)) {
      const match = items.find(i => i.id === itemId);
      if (match) {
        if (this.slots[slot] === itemId) {
          return { success: false, message: `Hardware ${match.name} is already installed in your cyber-deck.` };
        }
        if (this.game.credits < match.price) {
          return { success: false, message: `Insufficient funds. Required: ${match.price} ₿, Available: ${this.game.credits} ₿` };
        }
        this.game.credits -= match.price;
        this.slots[slot] = itemId;
        if (typeof this.game.markDirty === 'function') this.game.markDirty();
        if (this.game.ui && typeof this.game.ui.updateHUD === 'function') this.game.ui.updateHUD();
        if (this.game.ui && typeof this.game.ui.renderRig === 'function') this.game.ui.renderRig();
        return { success: true, message: `Successfully installed ${match.name} into ${slot.toUpperCase()} slot.` };
      }
    }
    return { success: false, message: `Unknown hardware ID: ${itemId}` };
  }

  toggleOverclock(state) {
    if (this.isThrottled) {
      this.overclockActive = false;
      return false;
    }
    this.overclockActive = (state !== undefined) ? state : !this.overclockActive;
    return this.overclockActive;
  }

  tickThermal(deltaSeconds = 1) {
    const cooling = this.getEquippedItem('cooling');
    const dissipation = cooling ? cooling.dissipation : 1.0;

    if (this.overclockActive && !this.isThrottled) {
      this.temperature += (2.2 * deltaSeconds);
      if (this.temperature >= 100.0) {
        this.temperature = 100.0;
        this.isThrottled = true;
        this.overclockActive = false;
      }
    } else {
      // Dissipate heat towards ambient 35C
      if (this.temperature > 35.0) {
        this.temperature = Math.max(35.0, this.temperature - (dissipation * deltaSeconds));
      }
      if (this.isThrottled && this.temperature <= 45.0) {
        this.isThrottled = false;
      }
    }
    return this.temperature;
  }

  serialize() {
    return {
      slots: { ...this.slots },
      temperature: this.temperature,
      overclockActive: this.overclockActive,
      isThrottled: this.isThrottled
    };
  }

  deserialize(data) {
    if (!data) return;
    if (data.slots) this.slots = { ...data.slots };
    if (typeof data.temperature === 'number') this.temperature = data.temperature;
    if (typeof data.overclockActive === 'boolean') this.overclockActive = data.overclockActive;
    if (typeof data.isThrottled === 'boolean') this.isThrottled = data.isThrottled;
  }
}
