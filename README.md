# Vend-O-Matic

HTTP service for a beverage vending machine. Built with plain Node.js, no dependencies, so there is nothing to install.

## Setup

1. You need Node 18 or newer. Check with:

   ```bash
   node -v
   ```

   If it's missing or older, install it with [Homebrew](https://brew.sh) or download it from [nodejs.org](https://nodejs.org):

   ```bash
   brew install node
   ```

2. Get the code and go into the folder:

   ```bash
   git clone https://github.com/ritikkatkam123/vend-o-matic.git
   cd vend-o-matic
   ```

There is no `npm install` step.

## Run

From inside the `vend-o-matic` folder:

```bash
npm start
```

You should see:

```
Vend-O-Matic listening on http://localhost:3000
```

The server keeps running in that terminal. Press Ctrl+C to stop it.

If port 3000 is already in use, pick another one with `PORT=8080 npm start`.

## Test

The server does not need to be running for this.

```bash
npm test
```

## Quick try

With the server running, open a second terminal and run:

```bash
# insert two quarters
curl -i -X PUT localhost:3000/ -H 'Content-Type: application/json' -d '{"coin": 1}'
curl -i -X PUT localhost:3000/ -H 'Content-Type: application/json' -d '{"coin": 1}'

# buy drink 0
curl -i -X PUT localhost:3000/inventory/0

# check stock
curl -i localhost:3000/inventory

# get coins back
curl -i -X DELETE localhost:3000/
```

## Notes

A few things the spec left open, and what I did:

- Item ids are 0, 1 and 2, same as their position in the inventory array.
- If a drink is sold out you get a 404 even if you haven't put in enough coins. No point asking for more money for something that isn't there.
- Coins stay in the machine after a 403 or 404. You can pick another drink or `DELETE /` to get them back.
- After a successful purchase the change is returned and the coin count resets to 0.
- `PUT /` only accepts `{"coin": 1}`. Anything else is a 400.
- An item id that doesn't exist is a 404.
- Everything is kept in memory, so restarting the server restocks the machine.

The vending logic is in `src/machine.js` and the HTTP layer is in `src/server.js`.
