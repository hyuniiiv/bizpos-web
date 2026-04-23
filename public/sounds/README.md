# Sounds

Static audio assets served from `/sounds/*` at runtime (Next.js `public/` mapping).
Electron builds include these via the Next.js static export step — they resolve from the current page URL.

## Required Files

| File | Purpose | Format | Notes |
|------|---------|--------|-------|
| `success.mp3` | Global payment success ("띵동") | MP3, 44.1kHz | Short (< 1.5s), peak ~ -3 dB |
| `error.mp3` | Global payment failure / error | MP3, 44.1kHz | Short (< 1.5s), distinct from success |

Fallback order:
1. Menu-specific `MenuConfig.soundFile` (see `types/menu.ts`)
2. Global `success.mp3` / `error.mp3` above

## Replacing Files

1. Drop the new `.mp3` (or `.wav`) in this directory with the exact filename above.
2. Keep files small (< 50 KB recommended) so first-play latency stays low on Electron.
3. Rebuild the Electron app (`pnpm build` → `pnpm electron:build`) or redeploy to Vercel.
4. Verify in DevTools → Network that `/sounds/success.mp3` returns 200.

## Menu-Specific Sounds

Per-menu overrides live in `MenuConfig.soundFile`. Values can be:
- Bare filename: `ding.mp3` (resolved as `/sounds/ding.mp3`)
- Absolute path: `/sounds/my-menu.mp3`
- Full URL: `https://cdn.example.com/ding.mp3`
- Empty / undefined → fall back to the global success sound.

## Autoplay Policy

Browsers block audio without user interaction. Bizpos flows are driven by barcode / keyboard / touch
events, which count as user gestures, so playback is normally allowed. Failures fall through silently
and never block the payment UI — see `lib/audio/soundPlayer.ts`.
