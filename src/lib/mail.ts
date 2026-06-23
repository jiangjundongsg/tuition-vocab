// Minimal transactional mailer via the Resend REST API (no extra dependency).
// Reads RESEND_API_KEY; the sender defaults to onboarding@resend.dev (override
// with EMAIL_FROM once you have a verified domain). Returns false (and logs)
// when not configured or on failure, so auth flows degrade gracefully instead
// of throwing.

const FROM = process.env.EMAIL_FROM || 'Vocab Star <onboarding@resend.dev>';

export const mailConfigured = () => !!process.env.RESEND_API_KEY;

export async function sendMail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('RESEND_API_KEY not set — email not sent:', opts.subject);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      console.error('Resend send failed', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (e) {
    console.error('Resend send error', e);
    return false;
  }
}

function shell(title: string, bodyHtml: string): string {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;color:#0f172a;line-height:1.5">
    <h2 style="margin:0 0 12px">${title}</h2>
    ${bodyHtml}
    <p style="color:#94a3b8;font-size:12px;margin-top:28px">★ Vocab Star</p>
  </div>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${label}</a>`;

export function resetPasswordHtml(opts: { link: string; email: string; displayName: string | null }): string {
  const who = opts.displayName
    ? `<p>Hi <strong>${escapeHtml(opts.displayName)}</strong>,</p>`
    : '';
  return shell('Reset your password', `
    ${who}
    <p>We received a request to reset the password for your Vocab Star account.</p>
    <p style="background:#f1f5f9;border-radius:8px;padding:10px 14px;font-size:14px;color:#475569">
      Your sign-in email (username) is <strong>${escapeHtml(opts.email)}</strong>.
    </p>
    <p>${button(opts.link, 'Reset password')}</p>
    <p style="color:#64748b;font-size:13px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>`);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
