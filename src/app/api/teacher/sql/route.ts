import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';

// DDL keywords that are blocked
const BLOCKED_KEYWORDS = ['DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE'];

function isDdlBlocked(query: string): boolean {
  const normalized = query.replace(/\s+/g, ' ').trim();
  return BLOCKED_KEYWORDS.some((kw) => {
    const re = new RegExp(`(^|;\\s*)${kw}\\s`, 'i');
    return re.test(normalized);
  });
}

export async function POST(req: NextRequest) {
  try {
    await initDb();

    const user = await getCurrentUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const body = (await req.json()) as { query: string };
    const query = (body.query ?? '').trim();

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    if (isDdlBlocked(query)) {
      return NextResponse.json(
        { error: 'DDL statements (DROP, CREATE, ALTER, TRUNCATE, GRANT) are not allowed.' },
        { status: 400 }
      );
    }

    // Use Pool for dynamic query execution
    const { Pool } = await import('@neondatabase/serverless');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      const result = await pool.query(query);
      const rows = (result.rows ?? []) as Record<string, unknown>[];
      const limited = rows.slice(0, 200);

      return NextResponse.json({
        rows: limited,
        rowCount: rows.length,
        truncated: rows.length > 200,
      });
    } finally {
      await pool.end();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Query error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
