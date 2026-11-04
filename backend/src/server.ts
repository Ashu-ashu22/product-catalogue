import { loadConfig } from './config.js';
import { buildApp } from './container.js';

const config = loadConfig();
const app = buildApp(config);

const server = app.listen(config.PORT, () => {
  console.info(`API listening on http://localhost:${config.PORT}/api`);
});

// Graceful shutdown so containers stop cleanly (docker stop / ECS task drain).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.info(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
  });
}
