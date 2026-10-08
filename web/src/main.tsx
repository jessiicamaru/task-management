import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('index.html is missing <div id="root">');
const root = createRoot(container);

// Configuration is validated when the app module loads (src/lib/config.ts). A bundle built
// without it renders the reason — naming the variable — instead of a blank page.
import('./app/App')
  .then(({ App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    root.render(
      <pre role="alert" style={{ padding: '2rem', whiteSpace: 'pre-wrap' }}>
        {error instanceof Error ? error.message : String(error)}
      </pre>,
    );
  });
