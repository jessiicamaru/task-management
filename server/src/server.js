import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3000;

// Express 5 calls the listen callback on failure too, passing the error (e.g. EADDRINUSE).
createApp().listen(port, (err) => {
  if (err) {
    console.error(`Failed to start API on port ${port}: ${err.message}`);
    process.exit(1);
  }
  console.log(`API listening on port ${port}`);
});
