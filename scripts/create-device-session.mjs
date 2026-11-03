import fs from 'node:fs';
import https from 'node:https';

const BASE_URL = 'https://daxul.77.37.45.177.sslip.io';
const agent = new https.Agent({ rejectUnauthorized: false });

function httpsReq(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const req = https.request(url, { ...options, agent }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          text: () => Promise.resolve(buf.toString('utf8')),
          json: () => Promise.resolve(JSON.parse(buf.toString('utf8'))),
          buffer: () => Promise.resolve(buf)
        });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function main() {
  const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAADklEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const boundary = '----Boundary' + Math.random().toString(36).substring(2);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="qa-device.png"\r\nContent-Type: image/png\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([Buffer.from(header), samplePng, Buffer.from(footer)]);

  const upRes = await httpsReq('/api/lithophane/upload', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length
    },
    body
  });
  const upJson = await upRes.json();
  const filename = upJson.file.filename;

  const cookieHeader = Array.isArray(upRes.headers['set-cookie'])
    ? upRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ')
    : (upRes.headers['set-cookie'] ? upRes.headers['set-cookie'].split(';')[0] : '');

  const cfgRes = await httpsReq('/api/lithophane/config');
  const cfg = await cfgRes.json();
  const variety = cfg.varieties[0];
  const size = variety.sizes[0];

  const genRes = await httpsReq('/api/lithophane/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
    body: JSON.stringify({ filename, varietyKey: variety.key, sizeId: size.id, orientation: 'portrait' })
  });
  const genJson = await genRes.json();
  console.log('Gen:', genJson);

  const testJson = JSON.stringify({
    asset: { version: '2.0', generator: 'Daxul-Physical-Device-Session' },
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'lithophane_base', mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }]
  });
  const testJsonPad = testJson.padEnd(Math.ceil(testJson.length / 4) * 4, ' ');
  const glbLength = 12 + 8 + testJsonPad.length;
  const glbBuf = Buffer.alloc(glbLength);
  glbBuf.writeUInt32LE(0x46546c67, 0);
  glbBuf.writeUInt32LE(2, 4);
  glbBuf.writeUInt32LE(glbLength, 8);
  glbBuf.writeUInt32LE(testJsonPad.length, 12);
  glbBuf.writeUInt32LE(0x4e4f534a, 16);
  glbBuf.write(testJsonPad, 20, 'utf8');

  const sessRes = await httpsReq('/api/lithophane/ar/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationId: genJson.generationId,
      hash: genJson.hash,
      configSummary: {
        varietyName: 'Table Stand',
        sizeName: 'Standard (100 × 150 mm)',
        widthMm: 100,
        heightMm: 150,
        depthMm: 3,
        lightOn: true
      },
      deviceInfo: 'Physical Device QA Session',
      glbBase64: glbBuf.toString('base64')
    })
  });
  const sessJson = await sessRes.json();
  console.log('Status:', sessRes.status);
  console.log('Body:', sessJson);
}

main().catch(console.error);
