import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { createAuthToken, recentTokenCount } from '@/lib/tokens';
import { sendMail, resetPasswordHtml } from '@/lib/mail';
import { appBaseUrl } from '@/lib/appurl';

// Request a password-reset link. Always responds the same way regardless of
// whether the email exists (no account enumeration) — including on errors.
export async function POST(req: Request) {
  const ok = NextResponse.json({ ok: true });
  try {
    await initDb();
    const { email } = await req.json().catch(() => ({}));
    const e = String(email ?? '').toLowerCase().trim();
    if (!e) return ok;

    const rows = await sql`SELECT id, email, display_name FROM users WHERE email = ${e}`;
    if (rows.length === 0) return ok;
    const userId = Number(rows[0].id);
    if (await recentTokenCount(userId, 'reset') >= 3) return ok; // silently rate-limit

    const token = await createAuthToken(userId, 'reset');
    const link = `${appBaseUrl()}/reset-password?token=${token}`;
    await sendMail({
      to: e,
      subject: 'Reset your Vocab Star password',
      html: resetPasswordHtml({ link, email: rows[0].email as string, displayName: rows[0].display_name as string | null }),
    });
  } catch (err) {
    console.error('request-reset error', err);
  }
  return ok;
}
