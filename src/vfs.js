// ============================================================
// HACKER SIMULATOR // VIRTUAL FILE SYSTEM (VFS)
// Realistic UNIX inode/directory hierarchy per host
// ============================================================

export class VFSNode {
  constructor(name, type = 'file', options = {}) {
    this.name = name;
    this.type = type; // 'file', 'dir', 'bin'
    this.permissions = options.permissions || (type === 'dir' ? 'rwxr-xr-x' : (type === 'bin' ? 'rwxr-xr-x' : 'rw-r--r--'));
    this.owner = options.owner || 'root';
    this.group = options.group || 'root';
    this.size = options.size || (type === 'dir' ? 4096 : (options.content ? options.content.length : 0));
    this.content = options.content || '';
    this.children = type === 'dir' ? new Map() : null;
    this.parent = null;
    this.mtime = options.mtime || new Date().toISOString().slice(0, 16).replace('T', ' ');
    this.isSecret = options.isSecret || false;
  }
}

export class VirtualFileSystem {
  constructor(hostname = 'localhost') {
    this.hostname = hostname;
    this.root = new VFSNode('', 'dir', { owner: 'root', permissions: 'rwxr-xr-x' });
    this.currentPath = '/';
  }

  // Resolve an absolute or relative path to a VFSNode
  resolve(pathStr, baseDirNode = null) {
    if (!pathStr || pathStr.trim() === '') return this.getNodeByPath(this.currentPath);

    let clean = pathStr.trim();
    let parts;

    if (clean.startsWith('/')) {
      parts = clean.split('/').filter(p => p.length > 0);
      let curr = this.root;
      for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') {
          curr = curr.parent || curr;
          continue;
        }
        if (!curr.children || !curr.children.has(part)) return null;
        curr = curr.children.get(part);
      }
      return curr;
    } else {
      const startPath = this.currentPath === '/' ? '/' : this.currentPath + '/';
      return this.resolve(startPath + clean);
    }
  }

  getNodeByPath(absPath) {
    if (absPath === '/' || !absPath) return this.root;
    const parts = absPath.split('/').filter(p => p.length > 0);
    let curr = this.root;
    for (const part of parts) {
      if (!curr.children || !curr.children.has(part)) return null;
      curr = curr.children.get(part);
    }
    return curr;
  }

  // Change working directory
  cd(targetPath = '~') {
    if (targetPath === '~') {
      targetPath = '/home/player';
      if (!this.resolve(targetPath)) targetPath = '/root';
      if (!this.resolve(targetPath)) targetPath = '/';
    }
    const node = this.resolve(targetPath);
    if (!node) return { success: false, error: `cd: ${targetPath}: No such file or directory` };
    if (node.type !== 'dir') return { success: false, error: `cd: ${targetPath}: Not a directory` };

    this.currentPath = this.getPathOfNode(node);
    return { success: true, path: this.currentPath };
  }

  pwd() {
    return this.currentPath;
  }

  // List directory entries
  ls(targetPath = '', flags = {}) {
    const node = targetPath ? this.resolve(targetPath) : this.getNodeByPath(this.currentPath);
    if (!node) return { success: false, error: `ls: cannot access '${targetPath}': No such file or directory` };

    if (node.type === 'file' || node.type === 'bin') {
      return { success: true, isFile: true, node };
    }

    const entries = [];
    node.children.forEach((child) => {
      if (!flags.all && child.name.startsWith('.')) return;
      entries.push({
        name: child.name,
        type: child.type,
        permissions: child.permissions,
        owner: child.owner,
        group: child.group,
        size: child.size,
        mtime: child.mtime,
        isSecret: child.isSecret
      });
    });

    entries.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, entries, path: this.getPathOfNode(node) };
  }

  // Read file contents
  cat(filePath, options = {}) {
    const node = this.resolve(filePath);
    if (!node) return { success: false, error: `cat: ${filePath}: No such file or directory` };
    if (node.type === 'dir') return { success: false, error: `cat: ${filePath}: Is a directory` };
    if (node.isSecret && options.user && options.user !== 'root') {
      return { success: false, error: `cat: ${filePath}: Permission denied (root access required)` };
    }
    return { success: true, content: node.content };
  }

  // Write or create a file
  writeFile(filePath, content, options = {}) {
    const parts = filePath.split('/').filter(p => p.length > 0);
    const fileName = parts.pop();
    const dirPath = filePath.startsWith('/') ? '/' + parts.join('/') : (parts.length > 0 ? parts.join('/') : '.');
    
    let parentDir = this.resolve(dirPath);
    if (!parentDir || parentDir.type !== 'dir') {
      const mkRes = this.mkdir(dirPath);
      if (mkRes.success) {
        parentDir = mkRes.node;
      } else {
        return { success: false, error: `cannot create file '${filePath}': No such directory` };
      }
    }

    let node = parentDir.children.get(fileName);
    if (!node) {
      node = new VFSNode(fileName, options.type || 'file', {
        owner: options.owner || 'player',
        permissions: options.permissions || 'rw-r--r--',
        content: content,
        isSecret: options.isSecret || false
      });
      node.parent = parentDir;
      parentDir.children.set(fileName, node);
    } else {
      node.content = content;
      node.size = content.length;
      node.mtime = new Date().toISOString().slice(0, 16).replace('T', ' ');
    }

    return { success: true, node };
  }

  // Create directory (with recursive parent creation support like mkdir -p)
  mkdir(dirPath, options = {}) {
    const parts = dirPath.split('/').filter(p => p.length > 0);
    if (parts.length === 0) return { success: false, error: `mkdir: missing operand` };

    let curr = dirPath.startsWith('/') ? this.root : this.getNodeByPath(this.currentPath);
    if (!curr) curr = this.root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!curr.children) {
        return { success: false, error: `mkdir: cannot create directory: Not a directory` };
      }
      if (!curr.children.has(part)) {
        const newDir = new VFSNode(part, 'dir', {
          owner: options.owner || 'root',
          permissions: options.permissions || 'rwxr-xr-x'
        });
        newDir.parent = curr;
        curr.children.set(part, newDir);
        curr = newDir;
      } else {
        const existing = curr.children.get(part);
        if (existing.type !== 'dir' && i < parts.length - 1) {
          return { success: false, error: `mkdir: cannot create directory '${dirPath}': Not a directory` };
        }
        curr = existing;
      }
    }

    return { success: true, node: curr };
  }

  // Remove file or directory
  rm(targetPath, recursive = false) {
    const node = this.resolve(targetPath);
    if (!node) return { success: false, error: `rm: cannot remove '${targetPath}': No such file or directory` };
    if (node === this.root) return { success: false, error: `rm: cannot remove root directory '/'` };

    if (node.type === 'dir' && !recursive) {
      return { success: false, error: `rm: cannot remove '${targetPath}': Is a directory (use -r)` };
    }

    const parent = node.parent;
    if (parent && parent.children) {
      parent.children.delete(node.name);
      return { success: true };
    }
    return { success: false, error: `rm: unknown error removing file` };
  }

  // Get full absolute path string of a node
  getPathOfNode(node) {
    if (!node || node === this.root) return '/';
    const parts = [];
    let curr = node;
    while (curr && curr !== this.root) {
      parts.unshift(curr.name);
      curr = curr.parent;
    }
    return '/' + parts.join('/');
  }

  // Autocomplete filenames in current directory or target path
  autocomplete(prefix) {
    let searchDir = this.currentPath;
    let stub = prefix;

    if (prefix.includes('/')) {
      const idx = prefix.lastIndexOf('/');
      const dirPart = prefix.slice(0, idx + 1);
      stub = prefix.slice(idx + 1);
      const dirNode = this.resolve(dirPart);
      if (!dirNode || dirNode.type !== 'dir') return [];
      searchDir = this.getPathOfNode(dirNode);
    }

    const dirNode = this.getNodeByPath(searchDir);
    if (!dirNode || !dirNode.children) return [];

    const matches = [];
    dirNode.children.forEach((child) => {
      if (child.name.startsWith(stub)) {
        matches.push(child.name + (child.type === 'dir' ? '/' : ''));
      }
    });

    return matches;
  }

  // Append content to existing file or create new (for >> redirection)
  appendFile(filePath, extraContent, options = {}) {
    const existing = this.cat(filePath);
    const newContent = existing.success ? existing.content + extraContent : extraContent;
    return this.writeFile(filePath, newContent, options);
  }

  // Copy file from srcPath to dstPath
  cp(srcPath, dstPath) {
    const srcNode = this.resolve(srcPath);
    if (!srcNode) return { success: false, error: `cp: cannot stat '${srcPath}': No such file or directory` };
    if (srcNode.type === 'dir') return { success: false, error: `cp: -r not specified; omitting directory '${srcPath}'` };

    let targetPath = dstPath;
    const dstNode = this.resolve(dstPath);
    if (dstNode && dstNode.type === 'dir') {
      targetPath = dstPath.endsWith('/') ? dstPath + srcNode.name : dstPath + '/' + srcNode.name;
    }

    return this.writeFile(targetPath, srcNode.content, {
      permissions: srcNode.permissions,
      owner: srcNode.owner,
      isSecret: srcNode.isSecret
    });
  }

  // Move / Rename file
  mv(srcPath, dstPath) {
    const cpRes = this.cp(srcPath, dstPath);
    if (!cpRes.success) return cpRes;
    this.rm(srcPath);
    return { success: true };
  }

  // Return first n lines of file
  head(filePath, n = 10) {
    const res = this.cat(filePath);
    if (!res.success) return res;
    const lines = res.content.split('\n').slice(0, n);
    return { success: true, content: lines.join('\n') };
  }

  // Return last n lines of file
  tailFile(filePath, n = 10) {
    const res = this.cat(filePath);
    if (!res.success) return res;
    const lines = res.content.split('\n');
    const start = Math.max(0, lines.length - n);
    return { success: true, content: lines.slice(start).join('\n') };
  }

  // Search file lines matching pattern
  grep(pattern, filePath, flags = {}) {
    const res = this.cat(filePath);
    if (!res.success) return res;
    const lines = res.content.split('\n');
    const isInsensitive = flags.i || false;
    const pat = isInsensitive ? pattern.toLowerCase() : pattern;
    
    const matched = lines.filter(l => {
      const lineText = isInsensitive ? l.toLowerCase() : l;
      return flags.v ? !lineText.includes(pat) : lineText.includes(pat);
    });

    return { success: true, lines: matched };
  }

  // Serialize entire VFS hierarchy into a plain JSON object
  serialize() {
    return {
      hostname: this.hostname,
      currentPath: this.currentPath,
      root: this.serializeNode(this.root)
    };
  }

  serializeNode(node) {
    const data = {
      name: node.name,
      type: node.type,
      permissions: node.permissions,
      owner: node.owner,
      group: node.group,
      size: node.size,
      content: node.content,
      mtime: node.mtime,
      isSecret: node.isSecret
    };
    if (node.type === 'dir' && node.children) {
      data.children = [];
      node.children.forEach(child => {
        data.children.push(this.serializeNode(child));
      });
    }
    return data;
  }

  // Restore VFS hierarchy from serialized JSON
  deserialize(data) {
    if (!data || !data.root) return false;
    this.hostname = data.hostname || this.hostname;
    this.currentPath = data.currentPath || '/';
    this.root = this.deserializeNode(data.root, null);
    return true;
  }

  deserializeNode(data, parent = null) {
    const node = new VFSNode(data.name, data.type, {
      permissions: data.permissions,
      owner: data.owner,
      group: data.group,
      size: data.size,
      content: data.content,
      mtime: data.mtime,
      isSecret: data.isSecret
    });
    node.parent = parent;
    if (data.type === 'dir' && Array.isArray(data.children)) {
      data.children.forEach(childData => {
        const child = this.deserializeNode(childData, node);
        node.children.set(child.name, child);
      });
    }
    return node;
  }
}
