import { execSync, spawn } from 'node:child_process';
import path from 'node:path';

const BASE = 'https://daxul.77.37.45.177.sslip.io';

// Read creds from VPS
const out = execSync(
  'ssh -i C:/Users/daksh/.ssh/aadya_migration -o StrictHostKeyChecking=no root@77.37.45.177 "cat /root/.daxul-qa/creds.env"',
  { encoding: 'utf8' }
);

let email = '';
let password = '';
for (const line of out.split('\n')) {
  if (line.startsWith('QA_ADMIN_EMAIL=')) email = line.split('=')[1].trim();
  if (line.startsWith('QA_ADMIN_PASSWORD=')) password = line.split('=')[1].trim();
}

if (!email || !password) {
  console.error('Failed to read QA credentials from VPS');
  process.exit(1);
}

const env = {
  ...process.env,
  BASE_URL: BASE,
  QA_ADMIN_EMAIL: email,
  QA_ADMIN_PASSWORD: password,
  QA_RESUME: '1',
};

console.log(`Running Playwright Phase B against ${BASE}...`);
const cmd = 'npx';
const args = ['playwright', 'test', '-c', 'e2e/playwright.config.ts', 'e2e/18-phase-b-conversion-discovery.spec.ts'];

const child = spawn(cmd, args, {
  stdio: 'inherit',
  shell: true,
  env,
});

child.on('close', (code) => {
  process.exit(code || 0);
});
