import { createApp } from './app.js';

// eslint-disable-next-line no-process-env -- moves into the validated config loader (#4)
const port = Number(process.env.PORT) || 3000;

// Express 5 calls the listen callback on failure too, passing the error (e.g. EADDRINUSE).
createApp().listen(port, (err) => {
  if (err) {
    // eslint-disable-next-line no-console -- replaced by the pino logger (#5)
    console.error(`Failed to start API on port ${port}: ${err.message}`);
    process.exit(1);
  }
  // eslint-disable-next-line no-console -- replaced by the pino logger (#5)
  console.log(`API listening on port ${port}`);
});
