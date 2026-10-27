import { query } from '../../db/pool.js';

/**
 * One round trip through the shared pool. The health service applies its own two-second deadline.
 */
export async function pingDatabase(): Promise<void> {
  await query('SELECT 1');
}
