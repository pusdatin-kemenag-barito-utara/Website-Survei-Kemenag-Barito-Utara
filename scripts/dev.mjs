#!/usr/bin/env node

/**
 * ==============================================================================
 * SI-ARUS Kemenag Barito Utara - Infisical Development & Secret Loader
 * ==============================================================================
 * Fetches secrets dynamically from Infisical Cloud (/survei-kemenag)
 * and injects them into the runtime environment for local development.
 * Completely eliminates the dependency on local .env files.
 * ==============================================================================
 */

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import process from 'node:process';

const INFISICAL_API_URL = process.env.INFISICAL_API_URL || 'https://app.infisical.com/api';
const INFISICAL_PROJECT_ID = process.env.INFISICAL_PROJECT_ID || 'ad5be957-3c8a-4c2e-b21e-3838cc3a7c0e';
const INFISICAL_CLIENT_ID = process.env.INFISICAL_CLIENT_ID || 'b8b3334d-a401-4563-af49-8287e5b632b9';
const INFISICAL_CLIENT_SECRET = process.env.INFISICAL_CLIENT_SECRET || '3bfe5a75f66dc227afc0ffeca0a070cdbdc9dca9b11331f7f0d6e2473070df83';
const INFISICAL_SECRET_PATH = process.env.INFISICAL_SECRET_PATH || '/survei-kemenag';

const args = process.argv.slice(2);
const isPullDev = args.includes('--pull');
const isPullProd = args.includes('--pull-prod');
const isNoAir = args.includes('--no-air');
const isBackendOnly = args.includes('--backend') || args.includes('--backend-only');
const isFrontendOnly = args.includes('--frontend') || args.includes('--frontend-only');

const targetEnv = isPullProd ? 'prod' : (process.env.INFISICAL_ENV || 'dev');

async function fetchSecrets(env) {
  console.log(`\x1b[36m[Infisical]\x1b[0m Authenticating with Infisical Cloud (${INFISICAL_API_URL})...`);
  
  let token = process.env.INFISICAL_TOKEN;
  if (!token) {
    const loginRes = await fetch(`${INFISICAL_API_URL}/v1/auth/universal-auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: INFISICAL_CLIENT_ID,
        clientSecret: INFISICAL_CLIENT_SECRET,
      }),
    });

    if (!loginRes.ok) {
      throw new Error(`Failed to authenticate with Infisical: ${loginRes.status} ${loginRes.statusText}`);
    }

    const loginData = await loginRes.json();
    token = loginData.accessToken;
  }

  console.log(`\x1b[36m[Infisical]\x1b[0m Fetching secrets for '${env}' from path '${INFISICAL_SECRET_PATH}'...`);
  const secretsRes = await fetch(
    `${INFISICAL_API_URL}/v3/secrets/raw?environment=${env}&workspaceId=${INFISICAL_PROJECT_ID}&secretPath=${encodeURIComponent(INFISICAL_SECRET_PATH)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!secretsRes.ok) {
    throw new Error(`Failed to fetch secrets: ${secretsRes.status} ${secretsRes.statusText}`);
  }

  const { secrets } = await secretsRes.json();
  const envMap = {};
  if (Array.isArray(secrets)) {
    for (const item of secrets) {
      envMap[item.secretKey] = item.secretValue;
    }
  }

  console.log(`\x1b[32m[Infisical]\x1b[0m Successfully loaded ${Object.keys(envMap).length} secrets from Infisical Cloud!\n`);
  return envMap;
}

async function main() {
  try {
    const secrets = await fetchSecrets(targetEnv);

    // If export/pull mode requested
    if (isPullDev) {
      let content = `# Generated from Infisical (/survei-kemenag - dev)\n`;
      for (const [k, v] of Object.entries(secrets)) {
        content += `${k}=${v}\n`;
      }
      writeFileSync('.env', content, 'utf8');
      console.log(`\x1b[32m✓ Saved dev secrets to .env\x1b[0m`);
      return;
    }

    if (isPullProd) {
      let content = `# Generated from Infisical (/survei-kemenag - prod)\n`;
      for (const [k, v] of Object.entries(secrets)) {
        content += `${k}=${v}\n`;
      }
      writeFileSync('.env.production', content, 'utf8');
      console.log(`\x1b[32m✓ Saved prod secrets to .env.production\x1b[0m`);
      return;
    }

    // Merge secrets into environment
    const childEnv = {
      ...process.env,
      ...secrets,
    };

    // Determine dev commands
    let beCmd = 'cd backend && air';
    if (isNoAir) {
      beCmd = 'cd backend && go run main.go';
    }
    const feCmd = 'cd frontend && npm run dev';

    let runCmd;
    if (isBackendOnly) {
      runCmd = beCmd;
    } else if (isFrontendOnly) {
      runCmd = feCmd;
    } else {
      runCmd = `npx concurrently -n "BE,FE" -c "cyan.bold,magenta.bold" "${beCmd}" "${feCmd}"`;
    }

    console.log(`\x1b[35m[DevServer]\x1b[0m Starting: ${runCmd}\n`);

    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/sh';
    const shellArgs = isWindows ? ['/d', '/s', '/c', runCmd] : ['-c', runCmd];

    const child = spawn(shell, shellArgs, {
      env: childEnv,
      stdio: 'inherit',
      shell: false,
    });

    const cleanExit = (signal) => {
      if (child && !child.killed) {
        child.kill(signal);
      }
      process.exit(0);
    };

    process.on('SIGINT', () => cleanExit('SIGINT'));
    process.on('SIGTERM', () => cleanExit('SIGTERM'));

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });

  } catch (err) {
    console.error(`\x1b[31m[Error]\x1b[0m ${err.message}`);
    process.exit(1);
  }
}

main();
