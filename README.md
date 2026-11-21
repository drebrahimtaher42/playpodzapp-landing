# playpodzapp.com — Play Podz B2B site

Static site on Cloudflare Pages (no build step). Pages: home, features, screens (`/panels/`), venue types (`/venues/`), demo request (`/contact/`), privacy, terms.

## Settings

| What | Where | Notes |
|---|---|---|
| Meta Pixel | `assets/js/config.js` → `metaPixelId` | Pixel from Business Portfolio B. Empty = no pixel. WhatsApp clicks and the demo form fire a `Lead` event. |
| Visit stats | Cloudflare Pages → the project → Metrics → Web Analytics | Free, no code. |
| Demo-form emails | Cloudflare Pages → Settings → Variables and Secrets: `RESEND_API_KEY` (secret), `LEAD_TO`, `LEAD_FROM` | Handled by `functions/api/lead.js`. Without them the form still opens WhatsApp; nothing is emailed. |

## Copy rules
- Talk to the venue owner in casual Egyptian Arabic: «روم» not «غرفة/أوضة», prefer «مكانك» over «الصالة».
- Only claim what is live in the system. Commission and no-show debt are not on the site.
- Brand: «Play Podz» in text, slogans «اللعبة في ايدك!» / «Plug Into Your Game!».
