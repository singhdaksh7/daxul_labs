import { describe, expect, it } from 'vitest';
import https from 'node:https';
import { buildArScene, exportArGlb } from '@/lib/lithophaneArModel';
import type { HeightMap } from '@/lib/lithophaneRelief';

const BASE_URL = 'https://daxul.77.37.45.177.sslip.io';
const agent = new https.Agent({ rejectUnauthorized: false });

function httpsReq(path: string, options: any = {}): Promise<{ status: number; headers: any; setCookie?: string | string[]; text: () => Promise<string>; json: () => Promise<any>; buffer: () => Promise<Buffer> }> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      agent,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          setCookie: res.headers['set-cookie'],
          text: () => Promise.resolve(buffer.toString('utf8')),
          json: () => Promise.resolve(JSON.parse(buffer.toString('utf8'))),
          buffer: () => Promise.resolve(buffer),
        });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

describe('Live Production AR Deployment & Security QA Matrix', () => {
  it('verifies public /api/health is 200 OK', async () => {
    const res = await httpsReq('/api/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
  });

  it('verifies live lithophane varieties contain AR fields', async () => {
    const res = await httpsReq('/api/lithophane/config');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.varieties.length).toBeGreaterThan(0);
    for (const v of json.varieties) {
      expect(v.arEnabled).toBe(true);
      expect(v.arPlacementType).toBe('floor');
      expect(v.arScaleMode).toBe('fixed');
    }
  });

  it('verifies unauthorized / tampered token access is strictly denied', async () => {
    const res1 = await httpsReq('/api/lithophane/ar/session/tampered-invalid-token-12345');
    expect(res1.status).toBe(404);

    const res2 = await httpsReq('/api/lithophane/ar/model/tampered-invalid-token-12345');
    expect([401, 404]).toContain(res2.status);

    const res3 = await httpsReq('/.private_ar_cache/some-model.glb');
    expect([403, 404]).toContain(res3.status);
  });

  it('executes full live lithophane generation, GLB export, QR session handoff, and binary download', async () => {
    // 1. Upload sample photo
    const samplePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAADklEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const boundary = '----Boundary' + Math.random().toString(36).substring(2);
    const bodyHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="qa-live.png"\r\nContent-Type: image/png\r\n\r\n`;
    const bodyFooter = `\r\n--${boundary}--\r\n`;
    const multipartBody = Buffer.concat([Buffer.from(bodyHeader), samplePng, Buffer.from(bodyFooter)]);

    const uploadRes = await httpsReq('/api/lithophane/upload', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': multipartBody.length,
      },
      body: multipartBody,
    });
    expect(uploadRes.status).toBe(200);
    const uploadJson = await uploadRes.json();
    expect(uploadJson.success).toBe(true);
    const filename = uploadJson.file.filename;

    const cookieHeader = Array.isArray(uploadRes.setCookie)
      ? uploadRes.setCookie.map(c => c.split(';')[0]).join('; ')
      : (uploadRes.setCookie ? uploadRes.setCookie.split(';')[0] : '');

    // 2. Fetch config for sizes
    const cfgRes = await httpsReq('/api/lithophane/config');
    const cfg = await cfgRes.json();
    const variety = cfg.varieties.find((v: any) => v.key === 'table_stand') || cfg.varieties[0];
    const size = variety.sizes[0]; // e.g. 100x150 mm

    // 3. Generate lithophane
    const genRes = await httpsReq('/api/lithophane/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify({
        filename,
        varietyKey: variety.key,
        sizeId: size.id,
        orientation: 'portrait',
      }),
    });
    expect(genRes.status).toBe(200);
    const genJson = await genRes.json();
    expect(genJson.generationId).toBeDefined();
    expect(genJson.hash).toBeDefined();

    // 4. Build local AR scene and export binary GLB
    const dummyMap: HeightMap = {
      cols: 4,
      rows: 4,
      data: new Float32Array(16).fill(1.5),
      minMm: 0.8,
      maxMm: 3.0,
    };
    const sceneBuild = buildArScene({
      map: dummyMap,
      widthMm: size.widthMm,
      heightMm: size.heightMm,
      thicknessMm: size.thicknessMm,
      depthMm: size.depthMm,
      baseModel: variety.baseModel,
      options: { stand_type: 'angled', base_colour: 'black' },
      lightOn: true,
    });
    const glbArrayBuffer = await exportArGlb(sceneBuild.root);
    const glbBase64 = Buffer.from(glbArrayBuffer).toString('base64');

    // 5. Create AR session with glbBase64
    const sessionRes = await httpsReq('/api/lithophane/ar/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationId: genJson.generationId,
        hash: genJson.hash,
        configSummary: {
          varietyName: variety.name,
          sizeName: size.name,
          widthMm: size.widthMm,
          heightMm: size.heightMm,
          depthMm: size.depthMm,
          lightOn: true,
        },
        deviceInfo: 'QA Production Tester',
        glbBase64,
      }),
    });
    expect(sessionRes.status).toBe(200);
    const sessionJson = await sessionRes.json();
    expect(sessionJson.token).toBeDefined();
    expect(sessionJson.qrCodeDataUrl).toContain('data:image/png;base64,');
    expect(sessionJson.url).toContain('/ar/lithophane/');

    const token = sessionJson.token;

    // 6. Retrieve AR session metadata
    const metaRes = await httpsReq(`/api/lithophane/ar/session/${token}`);
    expect(metaRes.status).toBe(200);
    const metaJson = await metaRes.json();
    expect(metaJson.generationId).toBe(genJson.generationId);
    expect(metaJson.config.widthMm).toBe(size.widthMm);
    expect(metaJson.modelUrl).toBe(`/api/lithophane/ar/model/${token}`);

    // 7. Download binary GLB model via token
    const modelRes = await httpsReq(`/api/lithophane/ar/model/${token}`);
    expect(modelRes.status).toBe(200);
    expect(modelRes.headers['content-type']).toContain('model/gltf-binary');
    const modelBuf = await modelRes.buffer();
    expect(modelBuf.readUInt32LE(0)).toBe(0x46546c67); // 'glTF'
    expect(modelBuf.byteLength).toBe(glbArrayBuffer.byteLength);

    // 8. Test landing page for mobile handoff
    const landingRes = await httpsReq(`/ar/lithophane/${token}`);
    expect(landingRes.status).toBe(200);
    const html = await landingRes.text();
    expect(html).toContain('Connecting to AR Session...');

    // 9. Privacy & Telemetry verification
    const telRes = await httpsReq('/api/analytics/ar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'AR_STARTED',
        token,
        deviceType: 'android',
        timestamp: new Date().toISOString(),
      }),
    });
    expect(telRes.status).toBe(200);
  });
});
