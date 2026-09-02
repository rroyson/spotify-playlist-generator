# Style lock — Playlist Generator for Spotify

Established: 2026-09-01. Source: starter scaffolding (playful mood, `generate_palette.py --mood playful --mode light --seed 2`) + user brief ("professional and fun, not the old theme") + `~/.tastemaker/profile.md` priors.

## Palette
- Background (`canvas`): #fff9f8 (page)
- Surface: #f8eeeb (panels: review, success, error, skeleton)
- Primary: #c83314 (primary actions, selected-chip border, mode icons)
- Primary strong: #a82a10 (primary hover only)
- Primary soft: #ffd2c8 (selected-tile fill, gate tilt block, error panel fill; never carries primary-colored or muted text, muted fails at 4.49)
- Accent: #197f73 (focus ring, success disc, taste-tile icons, example-card check icons; text only on canvas)
- Accent soft: #d2efe8 (success panel fill; ink 14.26, muted 5.06, accent disc 3.99 UI-safe)
- Text primary (`ink`): #221815 — contrast vs canvas 16.67 (AA pass)
- Text muted: #6e5e59 — vs canvas 5.91, vs surface 5.40 (AA pass)
- Border (`line`): #e8ddda (decorative hairlines; state is carried by color/outline, not the hairline)
- Button label color: white — vs Primary 5.33, vs Accent 4.86
- Dark mode: not needed for this project — single light mode; `color-scheme: light`.

## Color contract
Matrix from `generate_palette.py` (21 pairs) plus three extras checked with `check_contrast.py`.
- Text-safe (>=4.5): ink/on-primary, ink/canvas, ink/surface, ink/line, primary/on-primary, canvas/primary, accent/on-primary, surface/primary, canvas/accent, muted/canvas (5.91), muted/surface (5.40)
- UI-safe (>=3.0 <4.5): surface/accent (4.26), primary/line, accent/line, ink/accent, ink/primary, primary/primary-soft (3.88 — icon or border only)
- Decorative (<3.0): line/on-primary, canvas/line, surface/line, surface/on-primary, primary/accent, canvas/surface, canvas/on-primary
- Consequences applied in the build: selected chips use ink text with a primary icon (primary text on the soft fill fails 4.5); accent is used as text nowhere on surface; the error icon on primary-soft is an icon (UI floor), its heading is ink.

## Typography
- Display/heading font: Urbanist (via next/font) — rounded geometric, playful without being loud
- Body font: Geist (already in the repo; kept over the catalog's Open Sans to avoid a third family)
- Scale: base 16px; h1 gate 36/48px, h1 app 30/36px, h2 24px, body 16, meta 14, eyebrow 12 uppercase

## Shape language
- Corner radius: sm 8px (list rows, skeleton bars) · md 12px (fields, buttons) · lg 20px (panels, example card) · full (chips)
- Shadow depth: none, except a `shadow-sm` on the gate example card
- Border usage: 1px `line` hairlines on fields, ghost buttons, chips, panels

## Density & spacing
- Base unit: 4px
- Content card (panel) internal padding: space-6 (24px) mobile, space-8 (32px) desktop
- Compact rows (song list): space-2/space-2.5 vertical, 44px min hit area on chips and buttons
- Form group gap: space-6; section gap: space-10; page top padding space-8/space-14
- Overall density: calm single column, max width 42rem, generous air (profile prior)
- Section separation: whitespace only, panels are the only bounded regions

## Reference intelligence
- Reference board: `.tastemaker/reference-board.md` — inferred, not viewed
- Design read: single-screen playlist tool for Spotify listeners, mode Operate (with a Persuade gate before sign-in), visual lane "light, warm, one saturated accent"
- Dials: variance 5, motion 3, density 5, art direction 6
- Foundation: existing repo stack (Next 15, React 19, Tailwind v4), no registries, no new dependencies
- Quality bar: Apple Music web (light canvas, one red accent, restraint); Linear (type-led hierarchy); Sonner docs (motion that confirms, never performs)
- Direction contract: Thesis "the output is the visual: a real track list, not a feature tour"; First viewport "copy left, a tilted example result card right"; System "warm canvas, tomato primary, teal accent, Urbanist display, CSS-only motion"; Risk "tomato becomes loud if used as fills beyond buttons"
- Anti-references: slate/purple gradient canvas, emoji icons, Spotify green, indigo buttons, glassmorphism cards

## Taste memory
- Profile priors used: calm surfaces with air and one authored moment; light, fast CSS-only motion (no animation libraries); convention at high craft over a themed concept
- Decision log: `.tastemaker/decisions.log`
- Last resolved decisions: 2026-09-01 rejected the concentric-disc mark (bullseye); rejected calm-only color presence (dull)
- Pending review: new sleeve-and-record mark; second-pass color presence (two-tone headline, cover band, tinted panels, CTA shadow); tilt card; tile picker
- Profile promotion: none
- Memory precedence note: user asked for "fun", profile prefers calm. First pass leaned calm and the user called it dull, so the current request wins: color now appears wherever it carries meaning (headline emphasis, cover band, state panels, selected tile) while the canvas stays quiet.

## Navigation chrome
- Topbar only (no sidebar): wordmark left, "Log out" ghost button right; content area on canvas
- Active/selection treatment: primary-soft fill + primary border (chips); `accent-color: primary` on checkboxes
- Hover treatment: ghost buttons and chips shift to surface / muted border, pointer-fine only

## Mood descriptors
warm, crisp, playful-but-calm

## Assets
- Anchor asset: `src/app/icon.svg` (record-disc mark; also `design/assets/logo/mark.svg`)
- Asset style: Phosphor regular icons, single set, rendered with `currentColor` from `src/components/icons.tsx`
- Illustration vs. photography split: none used — the product's own output (a track list) is the visual; no concept sections needed one
- Illustration source used: n/a (`~/.ideagram/undraw/` not populated; not needed)
- Logo: a teal record (circle + canvas centre) sliding out of a tomato sleeve (rounded rect); replaced the concentric-disc mark the user read as a bullseye. Wordmark "Playlist Generator" in Urbanist bold

## Motion
- Feel: quick and confirming; one soft entrance per panel
- Curves: `--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1)`; hover/color `ease`
- Durations: press 120ms · hover 150ms · panel 200ms · row stagger 30ms/step capped at 300ms · skeleton pulse 1.2s · spinner 700ms
- Entrance: 8px rise + fade on panels and rows
- Screen tracks: app-shell track only (panel entrance, list stagger, skeleton, press feedback); no scroll storytelling
- Frequency rules: no hover motion on touch; chips and buttons only scale on press; no animation on form typing or select changes
- Reduced motion: panels/rows collapse to a 150ms fade, press scale removed, skeleton pulse frozen; spinner stays (progress feedback)
- Verified by: `scripts/audit_motion.py src/app src/components` (3 MEDIUM, all loading loops or CSS-side reduced-motion, documented) + `anti_slop_scan.py` pass + Playwright captures of every state at 1280 and 390 on 2026-09-01

## Do not
- No gradient fills on buttons or text; the one soft radial glow behind the gate's example card is the deliberate exception
- No emoji as icons
- No Spotify green or indigo/purple as UI colors
- No hover:scale on cards or buttons; press-only scale
