# playpodzapp.com — Play Podz B2B site

Static site deployed by Cloudflare Workers Builds as static assets (no build step). `wrangler.jsonc` points the build at the repo root; `.assetsignore` keeps repo files private.
Don't add a `functions/` folder: the automatic setup refuses to deploy a project that has one. Pages: home, features, screens (`/panels/`), venue types (`/venues/`), demo request (`/contact/`), privacy, terms.

## Settings

| What | Where | Notes |
|---|---|---|
| Meta Pixel | `assets/js/config.js` → `metaPixelId` | Pixel from Business Portfolio B. Empty = no pixel. WhatsApp clicks and the demo form fire a `Lead` event. |
| Visit stats | Cloudflare dashboard → Workers & Pages → playpodzapp-landing → Settings → Web Analytics (or Analytics & Logs) | Free, no code. |

## Copy rules
- Talk to the venue owner in casual Egyptian Arabic: «روم» not «غرفة/أوضة», prefer «مكانك» over «الصالة».
- Only claim what is live in the system. Commission and no-show debt are not on the site.
- Brand: «Play Podz» in text, slogans «اللعبة في ايدك!» / «Plug Into Your Game!».
