export const PRICE_IN_QUARTERS = 2;
export const ITEM_COUNT = 3;
export const STOCK_PER_ITEM = 5;

// The machine itself. Knows nothing about HTTP, so it can be tested on its own
// and the server file only has to translate requests into these calls.
export class VendingMachine {
  constructor() {
    this.coins = 0;
    this.inventory = new Array(ITEM_COUNT).fill(STOCK_PER_ITEM);
  }

  insertCoin() {
    this.coins += 1;
    return this.coins;
  }

  // Hands back whatever is sitting in the machine.
  returnCoins() {
    const returned = this.coins;
    this.coins = 0;
    return returned;
  }

  getInventory() {
    return [...this.inventory];
  }

  hasItem(id) {
    return Number.isInteger(id) && id >= 0 && id < this.inventory.length;
  }

  getQuantity(id) {
    return this.inventory[id];
  }

  // Tries to buy one of item `id`.
  //
  // Stock is checked before coins. If the slot is empty there is nothing to
  // sell at any price, so telling the customer "out of stock" is more useful
  // than asking them for another quarter first.
  //
  // On a failed purchase the coins stay in the machine. The customer can pick
  // something else or ask for their money back (DELETE /).
  purchase(id) {
    if (this.inventory[id] === 0) {
      return { result: 'out_of_stock', coins: this.coins };
    }

    if (this.coins < PRICE_IN_QUARTERS) {
      return { result: 'insufficient_coins', coins: this.coins };
    }

    this.inventory[id] -= 1;
    const change = this.coins - PRICE_IN_QUARTERS;
    this.coins = 0; // transaction is over, change goes back to the customer

    return {
      result: 'vended',
      coins: change,
      remaining: this.inventory[id],
      quantity: 1,
    };
  }
}
