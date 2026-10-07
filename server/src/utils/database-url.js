/**
 * The loggable parts of a database URL: host, port and database name. Never the user or password,
 * and never the URL itself.
 */
export function describeDatabaseUrl(url) {
  try {
    const { hostname, port, pathname } = new URL(url);
    return { host: hostname, port: port ? Number(port) : 5432, database: pathname.slice(1) };
  } catch {
    return { host: 'unparseable' };
  }
}
