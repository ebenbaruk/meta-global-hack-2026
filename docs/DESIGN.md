# Feedforward: art direction

**Idea in one line:** the morning paper of your business. Agents worked overnight. You wake up to a warm, printed-feeling feed of finished work, and you flip through it with your thumb.

The direction is a **warm editorial pop** look: cream paper, deep aubergine ink, chunky soft serif headlines, lilac and electric-yellow accents, hand-drawn stickers and small typed labels. Picture an indie zine crossed with a modern consumer app. It is never a grey SaaS dashboard and never "AI purple gradient on black".

## 1. Palette

All colors are CSS variables. Light mode is **Oat**, dark mode is **Night**. The Tailwind names are what components use, so a component should never contain a raw hex value or `white/` or `black/`.

| Token (Tailwind) | Oat (light) | Night (dark) | Use |
|---|---|---|---|
| `bg` | `#FFF3E8` cream paper | `#160A1F` aubergine night | page |
| `surface` | `#FFFDFB` | `#21122D` | cards, sheets |
| `elevated` | `#F7E9DC` | `#2D1A3B` | inputs, chips, inner wells |
| `ink` / `fg` | `#1E0A2B` | `#FFF1E7` | text, 1.5px outlines |
| `muted` | `#6A5872` | `#C6B5CF` | secondary text (≥4.5:1) |
| `faint` | `#8C7A93` | `#9A87A5` | tertiary text, meta |
| `line` | `rgb(30 10 43 / .12)` | `rgb(255 241 231 / .10)` | hairlines |
| `line-strong` | `rgb(30 10 43 / .9)` | `rgb(255 241 231 / .85)` | ink outlines on pills and stickers |
| `lilac` | `#D9A8FF` | `#C995F5` | brand color, highlights, marquee, Lens |
| `lilac-ink` | `#5B1F8C` | `#E7CCFF` | text on lilac-soft, links |
| `yellow` | `#F4F75A` | `#F4F75A` | **primary action (Approve)**, always with ink text |
| `tangerine` | `#FF8A4C` | `#FF9A62` | schedule and urgent |
| `sky` | `#8CCBFF` | `#8CCBFF` | email |
| `mint` | `#93E2B0` | `#93E2B0` | done, success, snap |
| `rose` | `#FF9CC2` | `#FF9CC2` | social |
| `danger` | `#D93A4A` | `#FF6B7A` | errors only |

Each card kind gets one **pastel "can" color** (as the brand gives each flavor its own can). It shows up as the kind sticker and a thin top band:
email = sky · team_update = mint · schedule = tangerine · social_post = rose · task = elevated/ink · insight = lilac · snap = mint · sponsored = yellow with an ink "Sponsored" sticker.

Pastels sit behind **ink** text (`#1E0A2B`) in both modes. Never put white text on a pastel.

## 2. Type

- **Display:** `Fraunces` (Google, variable) at weight 800–900, `opsz` 144, `SOFT` 100, `WONK` 0. It gives chunky, soft and friendly headlines. Use it for hero headlines, the screen titles ("Today"), card titles (600–700, opsz ~36) and big numbers. Use tight tracking (`-0.02em`) and a line height of about 0.95 on big sizes.
- **Body:** `Geist` sans (already loaded) for anything people read at length: email bodies, posts, chat.
- **Typed labels:** `Space Mono` 400/700, uppercase or small caps, `tracking-wide`, 10–12px. Use it for metadata such as "AGENT · EMAIL REPLY · 2 MIN AGO", the Agent Lens log lines, the marquee, timestamps and the source refs [e1].
- Use the CSS vars `--font-display`, `--font-sans` and `--font-mono`, through the Tailwind classes `font-display`, `font-sans` and `font-mono`.

## 3. Shape and material

- **Radius:** cards 28px (`rounded-card`), media inside cards 20px, pills fully round, stickers round or a 10px rounded rect.
- **Ink outlines:** primary pills, stickers and the phone frame use a **1.5px `line-strong` border**. Cards use a 1px `line` border plus a soft shadow (`shadow-card`). Don't put ink borders on everything; they're an accent.
- **Pill buttons:**
  - **Primary:** yellow fill, ink text, 1.5px ink border and a small ink drop shadow `2px 2px 0 ink`. On press, translate it by (2px, 2px) so the shadow disappears; it should feel like a physical button.
  - **Secondary:** transparent, ink border.
  - **Icon buttons:** 44px circles on `elevated`.
- **Stickers:** small rotated (−6° to 8°) badges such as "Drafted for you", "New", "Sponsored" and "Learned". They are pastel fill plus ink outline plus Space Mono caps. They animate in with a small spring pop.
- **Grain:** a very subtle noise overlay on `bg` (an SVG feTurbulence at 3–4% opacity) so the cream reads as paper. The Night mode version is the same at 5%.
- **No glassmorphism, no glow, no blue.** Depth comes from cream-on-cream layering, ink lines and soft shadows.

## 4. Motion (Framer Motion, with a purpose)

- Cards **materialize** with a spring (`stiffness 260, damping 24`), rising 16px with a slight scale from 0.98.
- **Approve:** the card stamps out. A rotated mint "DONE ✓" sticker pops onto it, then the card slides right and collapses with `layout`. **Dismiss** slides left and fades.
- **Skeletons** get a typewriter feel: a Space Mono label that types in ("Reading your inbox…"), plus a lilac shimmer band.
- **Marquee tickers** (landing page and app header strip): an infinite horizontal scroll of typed labels separated by a small ✺ glyph.
- **Stickers** pop with a spring scale of 0 → 1.08 → 1 and a slight rotation.
- **Theme toggle:** a sun/moon icon swap with a rotation.
- Everything respects `prefers-reduced-motion` (fades only).

## 5. Layout

- **The app is always a phone.**
  - Mobile (<1024px): it runs full bleed, with a bottom tab bar and safe areas.
  - Desktop (≥1024px): the same mobile UI is rendered **inside a phone device frame** centered on the page. The frame is ink-outlined with rounded 56px corners and a dynamic-island pill, and it gets a slight tilt-in on load.
    - **Left column:** Maya's context ("Good morning, Maya", what the agents read overnight) and the Taste profile.
    - **Right column:** the **Agent Lens** styled as a typed log in Space Mono, i.e. the "under the hood" view.
  - So nothing inside the app tree uses viewport breakpoints (`sm:` `md:` `lg:`). Only the shell decides frame versus full bleed.
- The phone screen element has `transform: translateZ(0)` and its own scroll container, so `position: fixed` sheets, toasts and the tab bar stay inside the phone.
- **Landing (`/`):** a marketing page in the same DA that explains the project and links to `/app`.
- **App (`/app`):** the product.

## 6. Voice

Short, warm and confident, with a little wit, the way a person talks. Say "Good morning, Maya. Your agents handled 9 things overnight.", not "AI-powered productivity solution". The labels are lowercase-friendly and typed.

## 7. Brand assets (`public/brand/`)

These are generated illustrations in the same style: ink line art with flat lilac, yellow and pastel fills on a transparent background, hand-drawn and rubber-hose cartoon energy.
- **Mascot "Ford":** a cheerful paper-card character with an arrow for a nose or hat, used for empty states and the landing page.
- **A sticker set.**
- **Warm film-photo scenes of the fictional roastery,** for the landing page.

The rule is unchanged: fictional people and brands only.
