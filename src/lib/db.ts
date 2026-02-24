import { neon } from '@neondatabase/serverless';

let _sql: ReturnType<typeof neon> | undefined;

function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable is not set. Configure .env.local with your Neon database URL.');
    }
    _sql = neon(url);
  }
  return _sql;
}

// Lazy wrapper: the Neon connection is only established on first query call,
// not at module import time. This prevents build-time failures when DATABASE_URL
// is not yet configured.
const sql = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<Record<string, unknown>[]> =>
  getSql()(strings, ...values) as Promise<Record<string, unknown>[]>;

export default sql;
