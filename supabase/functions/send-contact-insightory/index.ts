// Supabase Edge Function: formulário de contacto do site da Insightory.Lab.
//
// Recebe nome, email e mensagem e envia UM email para a caixa da equipa através do
// SendGrid, com o email do visitante em "Responder a". Não guarda nada na base de dados
// e não envia email de confirmação ao visitante (evita que alguém use o formulário para
// enviar mensagens a terceiros).
//
// Segredos (já existem neste projeto):
//   SENDGRID_API_KEY   obrigatório
//   SENDGRID_FROM      remetente verificado (por defeito no-reply@insightorylab.com)
//   CONTACT_TO         opcional, por defeito geral@insightorylab.com
//   ALLOWED_ORIGINS    opcional, lista separada por vírgulas

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? '';
const FROM = Deno.env.get('SENDGRID_FROM') ?? 'no-reply@insightorylab.com';
const FROM_NAME = 'Insightory.Lab';
const CONTACT_TO = Deno.env.get('CONTACT_TO') ?? 'geral@insightorylab.com';
const ALLOWED_ORIGINS = (
  Deno.env.get('ALLOWED_ORIGINS') ??
  'https://insightorylab.com,https://www.insightorylab.com,https://gugas55.github.io,http://localhost:8000'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_PER_MINUTE = 2;
const RATE_PER_HOUR = 6;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

// ---------- Limite de pedidos por IP (contador na base de dados, partilhado com o chat) ----------
async function hmacHex(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function rpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`rpc ${fn} ${res.status}`);
  return res.json();
}

/** true se o IP passou o limite. Se não conseguir contar, lança erro e nada é enviado. */
async function overLimit(ip: string): Promise<boolean> {
  const id = (await hmacHex(SERVICE_KEY, ip)).slice(0, 32);
  const now = Date.now();
  const minute = (await rpc('chat_rate_hit', { p_bucket: `c:m:${id}:${Math.floor(now / 60_000)}`, p_ttl_seconds: 120 })) as number;
  if (minute > RATE_PER_MINUTE) return true;
  const hour = (await rpc('chat_rate_hit', { p_bucket: `c:h:${id}:${Math.floor(now / 3_600_000)}`, p_ttl_seconds: 7_200 })) as number;
  return hour > RATE_PER_HOUR;
}

// ---------- Email ----------
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

async function sendGrid(name: string, email: string, message: string) {
  const text = `Nome: ${name}\nEmail: ${email}\n\n${message}`;
  const html = `<table style="border-collapse:collapse;font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#111">
<tr><td style="padding:6px 14px 6px 0;color:#666;vertical-align:top">Nome</td><td style="padding:6px 0">${esc(name)}</td></tr>
<tr><td style="padding:6px 14px 6px 0;color:#666;vertical-align:top">Email</td><td style="padding:6px 0">${esc(email)}</td></tr>
<tr><td style="padding:6px 14px 6px 0;color:#666;vertical-align:top">Mensagem</td><td style="padding:6px 0">${esc(message).replace(/\n/g, '<br>')}</td></tr>
</table>`;
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: CONTACT_TO }] }],
      from: { email: FROM, name: FROM_NAME },
      reply_to: { email, name },
      subject: `Novo contacto: ${name}`,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`SendGrid ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin);
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: allowed ? corsHeaders(origin) : undefined });

  if (!allowed) return new Response('Forbidden', { status: 403 });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);

  let p: { name?: unknown; email?: unknown; message?: unknown; website?: unknown };
  try {
    p = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid json' }, 400);
  }

  // Armadilha para robôs: as pessoas nunca veem nem preenchem este campo.
  // Responde como se tivesse corrido bem, mas não envia nada.
  if (typeof p.website === 'string' && p.website.trim()) return json({ ok: true });

  const name = oneLine(typeof p.name === 'string' ? p.name : '').slice(0, 100);
  const email = oneLine(typeof p.email === 'string' ? p.email : '').slice(0, 200);
  const message = (typeof p.message === 'string' ? p.message : '').trim().slice(0, 3000);
  if (!name || !EMAIL_RE.test(email) || !message) return json({ ok: false, error: 'missing fields' }, 400);
  if (!SENDGRID_API_KEY) return json({ ok: false, error: 'not configured' }, 500);

  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown';
  try {
    if (await overLimit(ip)) return json({ ok: false, error: 'rate limited' }, 429);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    return json({ ok: false, error: 'unavailable' }, 503);
  }

  try {
    await sendGrid(name, email, message);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    return json({ ok: false, error: 'send failed' }, 502);
  }
  return json({ ok: true });
});
