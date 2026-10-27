import { closePool, query } from './pool.js';
import { logger } from '../config/logger.js';

try {
  const result = await query(
    "DELETE FROM refresh_tokens WHERE expires_at < now() - interval '30 days'",
  );
  logger.info({ deleted: result.rowCount ?? 0 }, 'expired refresh tokens cleaned up');
} finally {
  await closePool();
}
