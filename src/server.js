import http from 'node:http';
import { VendingMachine } from './machine.js';

const MAX_BODY_BYTES = 1024;

function send(res, status, { headers = {}, body } = {}) {
  if (body === undefined) {
    res.writeHead(status, headers);
    res.end();
    return;
  }

  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

function sendError(res, status, message, headers) {
  send(res, status, { headers, body: { error: message } });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body is too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Request body must be valid JSON'));
      }
    });

    req.on('error', reject);
  });
}

async function handleCoins(req, res, machine) {
  if (req.method === 'PUT') {
    let body;
    try {
      body = await readJson(req);
    } catch (err) {
      return sendError(res, 400, err.message);
    }

    // One quarter at a time is the only thing the slot physically takes.
    if (body === null || typeof body !== 'object' || body.coin !== 1) {
      return sendError(res, 400, 'Expected body {"coin": 1}');
    }

    const coins = machine.insertCoin();
    return send(res, 204, { headers: { 'X-Coins': coins } });
  }

  if (req.method === 'DELETE') {
    const returned = machine.returnCoins();
    return send(res, 204, { headers: { 'X-Coins': returned } });
  }

  sendError(res, 405, 'Method not allowed', { Allow: 'PUT, DELETE' });
}

function handleInventoryList(req, res, machine) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed', { Allow: 'GET' });
  }
  send(res, 200, { body: machine.getInventory() });
}

function handleInventoryItem(req, res, machine, id) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return sendError(res, 405, 'Method not allowed', { Allow: 'GET, PUT' });
  }

  if (!machine.hasItem(id)) {
    return sendError(res, 404, `No item with id ${id}`, { 'X-Coins': machine.coins });
  }

  if (req.method === 'GET') {
    return send(res, 200, { body: machine.getQuantity(id) });
  }

  const outcome = machine.purchase(id);

  switch (outcome.result) {
    case 'out_of_stock':
      return send(res, 404, { headers: { 'X-Coins': outcome.coins } });
    case 'insufficient_coins':
      return send(res, 403, { headers: { 'X-Coins': outcome.coins } });
    default:
      return send(res, 200, {
        headers: {
          'X-Coins': outcome.coins,
          'X-Inventory-Remaining': outcome.remaining,
        },
        body: { quantity: outcome.quantity },
      });
  }
}

export function createServer(machine = new VendingMachine()) {
  return http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, 'http://localhost');
      // treat /inventory/ the same as /inventory
      const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

      if (path === '/') {
        return await handleCoins(req, res, machine);
      }

      if (path === '/inventory') {
        return handleInventoryList(req, res, machine);
      }

      const match = path.match(/^\/inventory\/(\d+)$/);
      if (match) {
        return handleInventoryItem(req, res, machine, Number(match[1]));
      }

      sendError(res, 404, 'Not found');
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        sendError(res, 500, 'Internal server error');
      }
    }
  });
}
