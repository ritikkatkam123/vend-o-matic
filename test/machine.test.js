import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VendingMachine } from '../src/machine.js';

test('starts with five of each of the three drinks and no coins', () => {
  const machine = new VendingMachine();
  assert.deepEqual(machine.getInventory(), [5, 5, 5]);
  assert.equal(machine.coins, 0);
});

test('insertCoin returns the running total', () => {
  const machine = new VendingMachine();
  assert.equal(machine.insertCoin(), 1);
  assert.equal(machine.insertCoin(), 2);
  assert.equal(machine.insertCoin(), 3);
});

test('returnCoins gives everything back and empties the machine', () => {
  const machine = new VendingMachine();
  machine.insertCoin();
  machine.insertCoin();
  assert.equal(machine.returnCoins(), 2);
  assert.equal(machine.returnCoins(), 0);
});

test('purchase with exact change vends one drink and returns nothing', () => {
  const machine = new VendingMachine();
  machine.insertCoin();
  machine.insertCoin();

  const outcome = machine.purchase(1);

  assert.deepEqual(outcome, { result: 'vended', coins: 0, remaining: 4, quantity: 1 });
  assert.deepEqual(machine.getInventory(), [5, 4, 5]);
});

test('purchase with extra coins still vends one drink and returns the rest', () => {
  const machine = new VendingMachine();
  for (let i = 0; i < 5; i++) machine.insertCoin();

  const outcome = machine.purchase(0);

  assert.equal(outcome.quantity, 1);
  assert.equal(outcome.coins, 3);
  assert.equal(machine.coins, 0);
});

test('purchase without enough coins is refused and the coin is kept', () => {
  const machine = new VendingMachine();
  assert.deepEqual(machine.purchase(0), { result: 'insufficient_coins', coins: 0 });

  machine.insertCoin();
  assert.deepEqual(machine.purchase(0), { result: 'insufficient_coins', coins: 1 });
  assert.equal(machine.coins, 1);
  assert.deepEqual(machine.getInventory(), [5, 5, 5]);
});

test('purchase of a sold out drink is refused and coins are kept', () => {
  const machine = new VendingMachine();
  for (let i = 0; i < 5; i++) {
    machine.insertCoin();
    machine.insertCoin();
    machine.purchase(2);
  }
  assert.equal(machine.getQuantity(2), 0);

  machine.insertCoin();
  machine.insertCoin();
  assert.deepEqual(machine.purchase(2), { result: 'out_of_stock', coins: 2 });
  assert.equal(machine.coins, 2);
});

test('hasItem only accepts ids 0, 1 and 2', () => {
  const machine = new VendingMachine();
  assert.equal(machine.hasItem(0), true);
  assert.equal(machine.hasItem(2), true);
  assert.equal(machine.hasItem(3), false);
  assert.equal(machine.hasItem(-1), false);
  assert.equal(machine.hasItem(1.5), false);
});

test('getInventory returns a copy, not the internal array', () => {
  const machine = new VendingMachine();
  machine.getInventory()[0] = 99;
  assert.equal(machine.getQuantity(0), 5);
});
