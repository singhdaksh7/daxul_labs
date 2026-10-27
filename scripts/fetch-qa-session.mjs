import { execSync } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';

const BASE = 'https://daxul.77.37.45.177.sslip.io';
const agent = new https.Agent({ rejectUnauthorized: false });

async function getCredentials() {
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
  return { email, password };
}

async function login() {
  const { email, password } = await getCredentials();
  if (!email || !password) throw new Error('Could not read QA credentials');

  // 1. Get CSRF Token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { agent });
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const setCookie = csrfRes.headers.get('set-cookie') || '';
  
  // Extract CSRF cookie
  const csrfCookie = setCookie.split(';')[0];

  // 2. Post credentials
  const params = new URLSearchParams({
    csrfToken,
    email,
    password,
    json: 'true',
    callbackUrl: `${BASE}/admin`,
  });

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: csrfCookie,
    },
    body: params.toString(),
    agent,
    redirect: 'manual',
  });

  const sessionCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie') || ''];

  console.log('Login status:', loginRes.status);
  
  const cookieList = [];
  // Parse all cookies
  for (const raw of sessionCookies) {
    if (!raw) continue;
    const parts = raw.split(';').map((p) => p.trim());
    const [name, val] = parts[0].split('=');
    cookieList.push({
      name,
      value: val,
      domain: 'daxul.77.37.45.177.sslip.io',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400 * 7,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    });
  }

  const authData = {
    cookies: cookieList,
    origins: [],
  };

  fs.writeFileSync('e2e/.auth/admin.json', JSON.stringify(authData, null, 2), 'utf8');
  console.log('Saved fresh cookies to e2e/.auth/admin.json');
}

login().catch((err) => {
  console.error('Login error:', err);
  process.exit(1);
});
