const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const infisicalJsonPath = path.join(rootDir, '.infisical.json');

// Workspace & Project Metadata
let projectId = process.env.INFISICAL_PROJECT_ID;
if (!projectId && fs.existsSync(infisicalJsonPath)) {
  try {
    const infisicalJson = JSON.parse(fs.readFileSync(infisicalJsonPath, 'utf8'));
    projectId = infisicalJson.workspaceId;
  } catch (_e) {}
}
projectId = projectId || 'ad5be957-3c8a-4c2e-b21e-3838cc3a7c0e';

const envName = process.env.INFISICAL_ENV || 'dev';
const secretPath = process.env.INFISICAL_SECRET_PATH || '/survei-kemenag';
const domain = process.env.INFISICAL_API_URL || 'https://app.infisical.com/api';

const clientId =
  process.env.INFISICAL_CLIENT_ID ||
  process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_ID ||
  'b8b3334d-a401-4563-af49-8287e5b632b9';
const clientSecret =
  process.env.INFISICAL_CLIENT_SECRET ||
  process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET ||
  '3bfe5a75f66dc227afc0ffeca0a070cdbdc9dca9b11331f7f0d6e2473070df83';

console.log(`🔐 Menghubungkan ke Infisical Cloud (${secretPath} [${envName}])...`);

let rawSecrets = '';

// 1. Coba export langsung via sesi CLI aktif
try {
  rawSecrets = execSync(`infisical export --path=${secretPath} --env=${envName}`, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });
} catch (_cliErr) {
  // 2. Fallback ke Universal Auth Machine Identity (In-Memory Token)
  try {
    const loginCmd = `infisical login --method=universal-auth --client-id=${clientId} --client-secret=${clientSecret} --domain=${domain} --plain --silent`;
    const token = execSync(loginCmd, { cwd: rootDir, encoding: 'utf8' }).trim();

    const exportCmd = `infisical export --token=${token} --domain=${domain} --env=${envName} --projectId=${projectId} --path=${secretPath}`;
    rawSecrets = execSync(exportCmd, { cwd: rootDir, encoding: 'utf8' });
  } catch (authErr) {
    console.error('❌ Gagal mengautentikasi ke Infisical Cloud:', authErr.message);
    process.exit(1);
  }
}

// Parse secrets ke dalam objek memory (Zero-Disk)
const envVars = {};
for (const line of rawSecrets.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    envVars[key] = val;
    process.env[key] = val;
  }
}

const varCount = Object.keys(envVars).length;
console.log(`✨ Berhasil menginjeksi ${varCount} environment variables langsung dari Infisical Cloud ke memori.`);
console.log(`🔒 Zero-Disk Mode aktif: Tanpa membuat atau menyimpan file .env ke disk!`);

// Ambil perintah yang akan dijalankan
const args = process.argv.slice(2);
const commandToRun =
  args.length > 0
    ? args.join(' ')
    : 'npx concurrently -n "BE,FE" -c "cyan.bold,magenta.bold" "cd backend && %USERPROFILE%\\go\\bin\\air.exe" "cd frontend && npm run dev"';

const isWindows = process.platform === 'win32';
const shellCmd = isWindows ? 'cmd.exe' : '/bin/sh';
const shellArgs = isWindows ? ['/d', '/s', '/c', commandToRun] : ['-c', commandToRun];

const child = spawn(shellCmd, shellArgs, {
  cwd: rootDir,
  env: { ...process.env, ...envVars },
  stdio: 'inherit',
  windowsVerbatimArguments: isWindows,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code || 0);
  }
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});
