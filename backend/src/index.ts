import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(__dirname, '../.env') });

import { validateEnv } from './env';
import { createApp } from './app';

validateEnv(['PORT']);

const port = parseInt(process.env.PORT as string, 10);
const app = createApp();

const server = app.listen(port, () => {
  process.stdout.write(`[backend] Server listening on port ${port}\n`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    process.stderr.write(
      `Error: Port ${port} is already in use. Set a different PORT in your .env file.\n`,
    );
    process.exit(1);
  }
  throw err;
});
