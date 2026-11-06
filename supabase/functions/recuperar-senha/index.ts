// Esqueci minha senha: recebe o @, procura o e-mail de recuperação da pessoa
// e manda um link para criar uma nova senha (envio pelo Brevo).
// Sempre responde a mesma coisa, exista ou não o @ (não revela quem tem conta).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "método não permitido" }, 405);

  const brevoKey = Deno.env.get("BREVO_API_KEY");
  const sender = Deno.env.get("EMAIL_REMETENTE");
  if (!brevoKey || !sender) return reply({ error: "nao_configurado" }, 503);

  let body: { username?: string; redirectTo?: string };
  try { body = await req.json(); } catch { return reply({ error: "pedido inválido" }, 400); }
  const username = String(body.username ?? "").trim().toLowerCase().replace(/^@/, "");
  if (!/^[a-z0-9_.]{3,24}$/.test(username)) return reply({ ok: true });
  const redirectTo = /^https?:\/\//.test(String(body.redirectTo ?? "")) ? String(body.redirectTo) : undefined;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // limites: 3 pedidos por @ e 10 por internet a cada hora
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconhecido";
  const ipHash = await sha256(ip);
  const since = new Date(Date.now() - 3600_000).toISOString();
  const [{ count: byUser }, { count: byIp }] = await Promise.all([
    admin.from("recovery_log").select("id", { count: "exact", head: true }).eq("username", username).gt("created_at", since),
    admin.from("recovery_log").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gt("created_at", since),
  ]);
  if ((byUser ?? 0) >= 3 || (byIp ?? 0) >= 10) return reply({ error: "muitos_pedidos" }, 429);
  await admin.from("recovery_log").insert({ username, ip_hash: ipHash });

  const { data: profile } = await admin.from("profiles").select("id, name").eq("username", username).maybeSingle();
  if (!profile) return reply({ ok: true });
  const { data: contact } = await admin.from("user_contacts").select("email").eq("user_id", profile.id).maybeSingle();
  if (!contact?.email) return reply({ ok: true });

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: `${username}@treino.local`,
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (linkError || !link?.properties?.action_link) {
    console.error("generateLink", linkError);
    return reply({ ok: true });
  }

  const name = escapeHtml(profile.name || username);
  const url = link.properties.action_link;
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": brevoKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Meu Treino", email: sender },
      to: [{ email: contact.email, name: profile.name || username }],
      subject: "Crie uma nova senha no Meu Treino",
      htmlContent: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto">
        <h2>Oi, ${name}! 💪</h2>
        <p>Alguém pediu para criar uma nova senha para <b>@${escapeHtml(username)}</b> no Meu Treino.</p>
        <p><a href="${url}" style="display:inline-block;background:#22c55e;color:#052e16;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:700">Criar nova senha</a></p>
        <p style="color:#666;font-size:13px">O link vale por 1 hora. Se não foi você, é só ignorar este e-mail: sua senha continua a mesma.</p>
      </div>`,
    }),
  });
  if (!res.ok) console.error("brevo", res.status, await res.text());
  return reply({ ok: true });
});
