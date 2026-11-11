// ============================================================
// HACKER SIMULATOR // TOPOLOGY CANVAS RENDERER
// Interactive network graph, packet animations, node physics
// ============================================================

export class NetworkCanvas {
  constructor(game, canvasId) {
    this.game = game;
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.selectedNode = null;
    this.hoveredNode = null;
    this.draggedNode = null;
    this.isDragging = false;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    // Viewport transform
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1.0;
    this.dpr = 1;

    // Animated packet particles on links
    this.packetParticles = [];

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Mouse interactions
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

    // Recenter button
    const btnRecenter = document.getElementById('btn-net-recenter');
    if (btnRecenter) {
      btnRecenter.addEventListener('click', () => this.recenter());
    }

    // Ping sweep button
    const btnScan = document.getElementById('btn-net-scan');
    if (btnScan) {
      btnScan.addEventListener('click', () => {
        this.game.network.nodes.forEach(n => n.isDiscovered = true);
        this.game.ui.toast("Ping sweep complete. All subnet nodes unmasked.", "info");
      });
    }

    // Connect packet listener to spawn visual particles
    this.game.network.onPacketCallback = (packet) => {
      this.spawnPacketParticle(packet);
    };

    // Start render loop
    this.loop();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
  }

  recenter() {
    this.zoom = 1.0;
    const discovered = Array.from(this.game.network.nodes.values()).filter(n => n.isDiscovered);
    if (discovered.length === 0) {
      this.panX = 0;
      this.panY = 0;
      return;
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    discovered.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const canvasLogicalW = (this.canvas.width / (this.dpr || 1));
    const canvasLogicalH = (this.canvas.height / (this.dpr || 1));

    this.panX = (canvasLogicalW / 2) - centerX;
    this.panY = (canvasLogicalH / 2) - centerY;
  }

  spawnPacketParticle(packet) {
    const src = this.game.network.getNode(packet.srcNodeId);
    const dst = this.game.network.getNode(packet.dstNodeId);
    if (!src || !dst) return;

    this.packetParticles.push({
      srcX: src.x,
      srcY: src.y,
      dstX: dst.x,
      dstY: dst.y,
      progress: 0,
      speed: 0.02 + Math.random() * 0.02,
      proto: packet.proto
    });
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - this.panX) / this.zoom,
      y: (e.clientY - rect.top - this.panY) / this.zoom
    };
  }

  handleWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.4, Math.min(2.5, this.zoom * zoomFactor));

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
    this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
    this.zoom = newZoom;
  }

  handleMouseMove(e) {
    if (this.isPanning) {
      this.panX = e.clientX - this.panStartX;
      this.panY = e.clientY - this.panStartY;
      return;
    }

    const pos = this.getMousePos(e);

    if (this.isDragging && this.draggedNode) {
      this.draggedNode.x = pos.x - this.dragOffsetX;
      this.draggedNode.y = pos.y - this.dragOffsetY;
      return;
    }

    // Check hover
    let found = null;
    this.game.network.nodes.forEach(node => {
      if (!node.isDiscovered) return;
      const dx = pos.x - node.x;
      const dy = pos.y - node.y;
      if (Math.hypot(dx, dy) <= node.radius + 6) {
        found = node;
      }
    });

    this.hoveredNode = found;
    this.canvas.style.cursor = found ? 'pointer' : (this.isPanning ? 'grabbing' : 'crosshair');
  }

  handleMouseDown(e) {
    const pos = this.getMousePos(e);
    let clicked = null;

    this.game.network.nodes.forEach(node => {
      if (!node.isDiscovered) return;
      const dx = pos.x - node.x;
      const dy = pos.y - node.y;
      if (Math.hypot(dx, dy) <= node.radius + 6) {
        clicked = node;
      }
    });

    if (clicked) {
      this.selectedNode = clicked;
      this.draggedNode = clicked;
      this.isDragging = true;
      this.dragOffsetX = pos.x - clicked.x;
      this.dragOffsetY = pos.y - clicked.y;
      this.game.ui.showNodeInspector(clicked);
    } else {
      this.selectedNode = null;
      this.game.ui.hideNodeInspector();
      // Start background pan
      this.isPanning = true;
      this.panStartX = e.clientX - this.panX;
      this.panStartY = e.clientY - this.panY;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  handleMouseUp() {
    this.isDragging = false;
    this.isPanning = false;
    this.draggedNode = null;
    this.canvas.style.cursor = 'crosshair';
  }

  loop() {
    this.updatePhysics();
    this.render();
    requestAnimationFrame(() => this.loop());
  }

  updatePhysics() {
    // Basic force repulsion to prevent node overlap
    const nodes = Array.from(this.game.network.nodes.values()).filter(n => n.isDiscovered);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = n1.radius + n2.radius + 40;

        if (dist > 0 && dist < minDist) {
          const force = (minDist - dist) / dist * 0.05;
          if (n1 !== this.draggedNode) {
            n1.x -= dx * force;
            n1.y -= dy * force;
          }
          if (n2 !== this.draggedNode) {
            n2.x += dx * force;
            n2.y += dy * force;
          }
        }
      }
    }

    // Update particle packets
    for (let i = this.packetParticles.length - 1; i >= 0; i--) {
      const p = this.packetParticles[i];
      p.progress += p.speed;
      if (p.progress >= 1.0) {
        this.packetParticles.splice(i, 1);
      }
    }
  }

  render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // Draw grid background
    this.drawGrid();

    // Draw connection lines
    this.drawLinks();

    // Draw animated packet pulses
    this.drawPacketParticles();

    // Draw nodes
    this.drawNodes();

    ctx.restore();
  }

  drawGrid() {
    const { ctx, canvas } = this;
    const w = canvas.width / (this.dpr || 1);
    const h = canvas.height / (this.dpr || 1);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const step = 30;

    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  drawLinks() {
    const { ctx } = this;
    this.game.network.nodes.forEach(node => {
      if (!node.isDiscovered) return;

      node.connections.forEach(targetId => {
        const target = this.game.network.getNode(targetId);
        if (target && target.isDiscovered) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = 'rgba(30, 44, 61, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // If connected to currently selected node, glow highlight
          if (this.selectedNode && (node.id === this.selectedNode.id || target.id === this.selectedNode.id)) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = 'rgba(0, 255, 102, 0.35)';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      });
    });
  }

  drawPacketParticles() {
    const { ctx } = this;
    this.packetParticles.forEach(p => {
      const curX = p.srcX + (p.dstX - p.srcX) * p.progress;
      const curY = p.srcY + (p.dstY - p.srcY) * p.progress;

      ctx.beginPath();
      ctx.arc(curX, curY, 3, 0, Math.PI * 2);
      ctx.fillStyle = p.proto === 'SSH' ? '#bb9af7' : (p.proto === 'HTTP' ? '#73daca' : '#00ff66');
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  drawNodes() {
    const { ctx } = this;
    const now = Date.now() / 1000;

    this.game.network.nodes.forEach(node => {
      if (!node.isDiscovered) return;

      const isSelected = (this.selectedNode && this.selectedNode.id === node.id);
      const isHovered = (this.hoveredNode && this.hoveredNode.id === node.id);

      // Outer status ring
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + (isSelected ? 6 : 3), 0, Math.PI * 2);
      if (node.hasRoot) {
        ctx.strokeStyle = '#00ff66';
        ctx.fillStyle = 'rgba(0, 255, 102, 0.15)';
      } else {
        ctx.strokeStyle = isSelected ? '#ff9e3b' : 'rgba(122, 162, 247, 0.4)';
        ctx.fillStyle = 'rgba(12, 26, 40, 0.85)';
      }
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.fill();
      ctx.stroke();

      // Pulsing aura on selected node
      if (isSelected) {
        ctx.beginPath();
        const pulseR = node.radius + 8 + Math.sin(now * 4) * 3;
        ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Center Node Core
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = node.hasRoot ? '#00ff66' : (node.securityLevel > 3 ? '#f7768e' : '#7aa2f7');
      ctx.fill();

      // Rooted Checkmark or Security Level
      ctx.font = '10px monospace';
      ctx.fillStyle = node.hasRoot ? '#000000' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.hasRoot ? '✓' : `L${node.securityLevel}`, node.x, node.y);
      ctx.textBaseline = 'alphabetic';

      // Subnet Pill Tag (Above Node)
      ctx.font = '8px monospace';
      ctx.fillStyle = 'rgba(122, 162, 247, 0.7)';
      ctx.textAlign = 'center';
      ctx.fillText(`[${node.subnet}]`, node.x, node.y - node.radius - 6);

      // Node Hostname Label
      ctx.font = '11px "Fira Code", monospace';
      ctx.fillStyle = isSelected ? '#00ff66' : (node.hasRoot ? '#33ff77' : '#c0caf5');
      ctx.textAlign = 'center';
      ctx.fillText(node.hostname, node.x, node.y + node.radius + 14);

      // Node IP Label
      ctx.font = '9px monospace';
      ctx.fillStyle = '#565f89';
      ctx.fillText(node.ip, node.x, node.y + node.radius + 25);
    });
  }
}
