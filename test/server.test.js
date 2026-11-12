import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

let server;
let baseUrl;

// Fresh machine on a random free port for every test so they can't affect each other.
beforeEach(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function insertCoin() {
  return fetch(`${baseUrl}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coin: 1 }),
  });
}

async function insertCoins(count) {
  for (let i = 0; i < count; i++) await insertCoin();
}

function buy(id) {
  return fetch(`${baseUrl}/inventory/${id}`, { method: 'PUT' });
}

test('PUT / accepts a coin and reports the running total', async () => {
  const first = await insertCoin();
  assert.equal(first.status, 204);
  assert.equal(first.headers.get('x-coins'), '1');
  assert.equal(await first.text(), '');

  const second = await insertCoin();
  assert.equal(second.headers.get('x-coins'), '2');
});

test('PUT / rejects anything that is not a single quarter', async () => {
  const bodies = ['{"coin": 2}', '{"coin": "1"}', '{}', '[]', 'null', 'not json', ''];

  for (const body of bodies) {
    const res = await fetch(`${baseUrl}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    assert.equal(res.status, 400, `body: ${body}`);
  }

  // none of those should have counted
  const res = await fetch(`${baseUrl}/`, { method: 'DELETE' });
  assert.equal(res.headers.get('x-coins'), '0');
});

test('DELETE / returns the inserted coins and resets the count', async () => {
  await insertCoins(3);

  const res = await fetch(`${baseUrl}/`, { method: 'DELETE' });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('x-coins'), '3');

  const again = await fetch(`${baseUrl}/`, { method: 'DELETE' });
  assert.equal(again.headers.get('x-coins'), '0');
});

test('GET /inventory returns the quantities as an array', async () => {
  const res = await fetch(`${baseUrl}/inventory`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await res.json(), [5, 5, 5]);
});

test('GET /inventory/:id returns a single quantity', async () => {
  const res = await fetch(`${baseUrl}/inventory/1`);
  assert.equal(res.status, 200);
  assert.equal(await res.json(), 5);
});

test('GET /inventory/:id is a 404 for an item that does not exist', async () => {
  const res = await fetch(`${baseUrl}/inventory/3`);
  assert.equal(res.status, 404);
});

test('PUT /inventory/:id vends one drink for two quarters', async () => {
  await insertCoins(2);

  const res = await buy(0);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-coins'), '0');
  assert.equal(res.headers.get('x-inventory-remaining'), '4');
  assert.deepEqual(await res.json(), { quantity: 1 });

  const inventory = await fetch(`${baseUrl}/inventory`);
  assert.deepEqual(await inventory.json(), [4, 5, 5]);
});

test('PUT /inventory/:id returns the unused quarters', async () => {
  await insertCoins(5);

  const res = await buy(2);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-coins'), '3');
  assert.deepEqual(await res.json(), { quantity: 1 });

  // change went back to the customer, so a second purchase needs new coins
  const second = await buy(2);
  assert.equal(second.status, 403);
  assert.equal(second.headers.get('x-coins'), '0');
});

test('PUT /inventory/:id is a 403 when there are not enough coins', async () => {
  const none = await buy(0);
  assert.equal(none.status, 403);
  assert.equal(none.headers.get('x-coins'), '0');

  await insertCoin();
  const one = await buy(0);
  assert.equal(one.status, 403);
  assert.equal(one.headers.get('x-coins'), '1');

  // the coin is still in the machine, one more is enough
  await insertCoin();
  const two = await buy(0);
  assert.equal(two.status, 200);
});

test('PUT /inventory/:id is a 404 when the drink is sold out', async () => {
  for (let i = 0; i < 5; i++) {
    await insertCoins(2);
    const res = await buy(1);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-inventory-remaining'), String(4 - i));
  }

  await insertCoins(2);
  const res = await buy(1);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('x-coins'), '2');

  // coins were not swallowed, they can be spent on something else
  const other = await buy(0);
  assert.equal(other.status, 200);
  assert.equal(other.headers.get('x-coins'), '0');
});

test('unknown routes and methods are handled', async () => {
  const missing = await fetch(`${baseUrl}/nope`);
  assert.equal(missing.status, 404);

  const wrongMethod = await fetch(`${baseUrl}/inventory`, { method: 'POST' });
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get('allow'), 'GET');
});
