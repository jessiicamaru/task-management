/**
 * The loggable parts of a database URL: host, port and database name. Never the user or password,
 * and never the URL itself.
 */
export type DatabaseDescription =
  { host: string; port: number; database: string } | { host: 'unparseable' };

export function describeDatabaseUrl(url: string): DatabaseDescription {
  try {
    const { hostname, port, pathname } = new URL(url);
    return { host: hostname, port: port ? Number(port) : 5432, database: pathname.slice(1) };
  } catch {
    return { host: 'unparseable' };
  }
}
