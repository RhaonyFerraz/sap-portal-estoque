import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_DIR = path.join(__dirname, 'web');
const PORT = 3000;

// Host do SAP BTP
const BTP_HOST = '6449ad14-b137-4a27-8017-6421c2c4f0b0.abap-web.us10.hana.ondemand.com';
const BTP_BASE_PATH = '/sap/opu/odata4/sap/zui_estoque_rf_o4/srvd/sap/zui_estoque_rf_o4/0001';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer(async (req, res) => {
  // CORS Headers para todas as respostas
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, Accept, If-Match');
  res.setHeader('Access-Control-Expose-Headers', 'X-CSRF-Token, Location, ETag');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // 1. Rota de teste de conexão com o SAP BTP
  if (url.pathname === '/api/btp-test' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { user, password, host, path: srvPath } = JSON.parse(body || '{}');
        const targetHost = host || BTP_HOST;
        const targetPath = srvPath || BTP_BASE_PATH;

        const auth = 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
        const options = {
          hostname: targetHost,
          port: 443,
          path: `${targetPath}/$metadata`,
          method: 'GET',
          headers: {
            'Authorization': auth,
            'X-CSRF-Token': 'Fetch',
            'Accept': 'application/xml, application/json'
          }
        };

        const btpReq = https.request(options, btpRes => {
          let respData = '';
          btpRes.on('data', c => respData += c);
          btpRes.on('end', () => {
            const csrfToken = btpRes.headers['x-csrf-token'] || '';
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: btpRes.statusCode,
              ok: btpRes.statusCode >= 200 && btpRes.statusCode < 300,
              csrfToken: csrfToken,
              message: btpRes.statusCode === 200 ? 'Conexão SAP BTP bem-sucedida!' : `SAP retornou status ${btpRes.statusCode}`,
              headers: btpRes.headers
            }));
          });
        });

        btpReq.on('error', err => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        });

        btpReq.end();
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'JSON inválido' }));
      }
    });
    return;
  }

  // 2. Proxy reverso para /sap/* -> SAP BTP
  if (url.pathname.startsWith('/sap/')) {
    const options = {
      hostname: BTP_HOST,
      port: 443,
      path: url.pathname + url.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: BTP_HOST,
        referer: `https://${BTP_HOST}`
      }
    };

    const proxyReq = https.request(options, proxyRes => {
      // Repassa cabeçalhos e status
      const headers = { ...proxyRes.headers };
      headers['access-control-allow-origin'] = '*';
      headers['access-control-expose-headers'] = 'X-CSRF-Token, Location, ETag';
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', err => {
      console.error('Erro proxy BTP:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro de comunicação com o SAP BTP', details: err.message }));
    });

    req.pipe(proxyReq, { end: true });
    return;
  }

  // 3. Servidor de arquivos estáticos da pasta web/
  let filePath = path.join(WEB_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  filePath = path.normalize(filePath);

  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403);
    res.end('Acesso Negado');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Não Encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = { 'Content-Type': contentType };

    if (url.pathname === '/sw.js') {
      headers['Service-Worker-Allowed'] = '/';
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    }

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Servidor Portal SAP BTP rodando em: http://localhost:${PORT}`);
  console.log(`🔗 Proxy BTP ativo para: https://${BTP_HOST}`);
  console.log(`📁 Diretório web: ${WEB_DIR}\n`);
});
