// Cloudflare Pages Function: POST /api/lead
// Emails each demo/quote request so a lead isn't lost if the owner never presses send in WhatsApp.
// Settings (Cloudflare Pages → Settings → Variables and Secrets):
//   RESEND_API_KEY  secret, Resend API key
//   LEAD_TO         where leads go, e.g. playpodzapp@gmail.com
//   LEAD_FROM       a verified Resend sender, e.g. "Play Podz <leads@mail.playpodz.app>"
// Without these the endpoint still answers 204 and does nothing.

const FIELDS = ["venue", "name", "phone", "city", "venueType", "stations", "notes", "lang", "page"];
const clip = (v, n = 300) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const esc = (v) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export async function onRequestPost({ request, env }) {
  let data;
  try {
    if (Number(request.headers.get("content-length") || 0) > 10000) return new Response(null, { status: 413 });
    data = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (data.website) return new Response(null, { status: 204 }); // bot filled the hidden field

  const lead = Object.fromEntries(FIELDS.map((k) => [k, clip(data[k], k === "notes" ? 1000 : 200)]));
  if (!lead.venue || !lead.name || !lead.phone) return new Response(null, { status: 400 });

  if (env.RESEND_API_KEY && env.LEAD_TO && env.LEAD_FROM) {
    const rows = FIELDS.filter((k) => lead[k]).map((k) => `<tr><td><b>${k}</b></td><td>${esc(lead[k])}</td></tr>`).join("");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.LEAD_FROM,
        to: env.LEAD_TO.split(",").map((s) => s.trim()),
        subject: `طلب ديمو جديد: ${lead.venue}`,
        html: `<table cellpadding="6">${rows}</table>`,
      }),
    }).catch(() => {});
  }
  return new Response(null, { status: 204 });
}

export const onRequest = () => new Response(null, { status: 405, headers: { Allow: "POST" } });
