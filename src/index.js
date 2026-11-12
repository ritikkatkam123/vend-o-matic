import { createServer } from './server.js';

const port = Number(process.env.PORT) || 3000;

createServer().listen(port, () => {
  console.log(`Vend-O-Matic listening on http://localhost:${port}`);
});
