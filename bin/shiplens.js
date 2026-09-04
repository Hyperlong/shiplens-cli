#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function tryRunNativeBinary() {
  const platform = process.platform;
  const arch = process.arch;

  let binName = '';
  if (platform === 'win32') {
    binName = arch === 'arm64' ? 'shiplens-windows-arm64.exe' : 'shiplens-windows-amd64.exe';
  } else if (platform === 'darwin') {
    binName = arch === 'arm64' ? 'shiplens-darwin-arm64' : 'shiplens-darwin-amd64';
  } else if (platform === 'linux') {
    binName = arch === 'arm64' ? 'shiplens-linux-arm64' : 'shiplens-linux-amd64';
  }

  if (binName) {
    const binPath = path.join(__dirname, binName);
    if (fs.existsSync(binPath)) {
      try {
        if (platform !== 'win32') {
          try { fs.chmodSync(binPath, 0o755); } catch (_) {}
        }
        const result = spawnSync(binPath, process.argv.slice(2), {
          stdio: 'inherit',
          env: process.env
        });
        if (result.error) {
          return false;
        }
        process.exit(result.status ?? 0);
      } catch (err) {
        return false;
      }
    }
  }
  return false;
}

// 1. 优先调用极致性能的 Go 原生单可执行文件
if (!tryRunNativeBinary()) {
  // 2. 环境不兼容或二进制缺失时，无缝降级至全功能纯 Node.js CLI 实现
  const { runCLI } = require('../lib/cli');
  runCLI(process.argv.slice(2));
}
