---
name: ui-ux-expert
description: Design system and UI/UX guidance for this app's mobile-first interface. Use this skill whenever the user asks to design, build, style, mock up, or review any screen, component, or flow for this app — including requests like "build a screen for X", "make this component", "design the settings page", "how should the contract list look", or any React/HTML/Figma-style UI work for this project, even if the user doesn't explicitly say "design system". Always consult this skill before writing UI code or making visual/layout decisions for this app, to keep spacing, typography, component patterns, and interaction conventions consistent. The authoritative colour palette lives in apps/web/tailwind.config.js — read it before choosing any colour.
---

# Fintech UI — Design System

A calm, soft-but-trustworthy design language for a mobile-first fintech app. Light mode only, flat surfaces, moderate rounding, minimal motion. When in doubt: quieter, not louder.

## Colour: `apps/web/tailwind.config.js` is the single source of truth

Do not hard-code hex values, and do not introduce Tailwind default palettes
(`blue-600`, `gray-900`, `red-500`, etc.). This app uses **semantic** colour
names defined in `apps/web/tailwind.config.js`. Read that file and use its
tokens by name.

The token set, for reference only — the config file wins if they ever disagree:

| Token (Tailwind class) | Usage |
|---|---|
| `bg-background` | App canvas |
| `bg-surface` | Cards, sheets, inputs sitting one step above the canvas |
| `text-text` | Primary text |
| `text-muted` | Secondary text, timestamps, helper copy |
| `border-border` | Dividers, card outlines, input borders |
| `bg-primary` / `text-primary` / `border-primary` | Primary buttons, active tab, links, key icons |
| `bg-primary-subtle` | Tinted fill for tags, avatars, selected states |
| `positive` / `positive-subtle` | Positive amounts, success states |
| `negative` / `negative-subtle` | Errors, destructive actions, negative amounts |
| `category-{insurance,electricity,gas,mobile,streaming,other}` (+ `-subtle`) | Per-category identity tints |
| `warning` (+ `-subtle`) | Urgency emphasis (e.g. renewals within 7 days) |

**Rules:**
- Never use raw Tailwind palette colours (`blue-*`, `gray-*`, `slate-*`, `red-*`). Use the semantic tokens.
- `positive` / `negative` are reserved for their semantic meaning. Don't reuse `negative` for generic emphasis, and don't use `positive` as a decorative accent — it must always mean "good/up/success" so it stays trustworthy.
- Add a new colour only by editing `tailwind.config.js`, never by writing an arbitrary value like `text-[#123456]` in a component.
- Maintain WCAG AA contrast (4.5:1 body text, 3:1 large text/UI components) for every text/background pairing. Verify any new pairing before shipping it.
- `category-*` and `warning` exist for their specific purposes; don't repurpose them as general accents.

## Typography

IBM Plex Sans (humanist sans-serif). No serif, no display/decorative faces.

| Style | Size / Weight | Usage |
|---|---|---|
| Display | 28px / 600 | Rare — big moment screens only (e.g. onboarding), not routine balances |
| Title | 20px / 600 | Screen titles, section headers |
| Body-strong | 16px / 600 | Emphasized body text, list item primary labels |
| Body | 16px / 400 | Default body text |
| Caption | 13px / 400 | Timestamps, helper text, metadata |
| Label | 13px / 600, uppercase, +0.02em tracking | Section eyebrows, tab labels |

Line height: 1.4–1.5 for body text, 1.2 for titles/display. Left-align by default — this app does not center body copy or paragraphs.

**Balances and amounts explicitly use `Body-strong` or `Title` size at most** — never bump a balance to Display size just because it's a number. Numbers earn attention through position and color (positive/negative), not size.

## Spacing

8px base grid: `4, 8, 16, 24, 32, 40, 48`. Don't introduce arbitrary values (e.g. 13px, 22px) outside this scale.

- Screen horizontal padding: `16` (mobile default)
- Gap between unrelated sections: `32`
- Gap between related items in a list: `8`–`16`
- Card internal padding: `16`–`24`

## Radius

- Buttons, inputs, chips: `10px`
- Cards, sheets, modals: `12px`
- Avatars/icons-in-circles: fully round (`50%`)
- Never use sharp `0px` corners on interactive elements; never use full pill radius on cards or buttons (that's a different design language than this one)

## Elevation — flat, no shadows

Never use `box-shadow` for card/surface separation. Instead:
- Use `bg-surface` vs `bg-background` for a subtle one-step lift
- Use a 1px `border-border` outline when two adjacent surfaces are the same colour and need a hard edge
- Modals/sheets may use a very light scrim (`text` at ~30% opacity) behind them, but the sheet itself stays flat — no drop shadow

Note: `apps/web/src/index.css` enforces this globally with
`* { box-shadow: none !important; }`, so shadow utilities are dead on arrival —
don't reach for them.

## Iconography

- Thin-line icons only, consistent stroke width (1.5–2px) — never mix stroke weights, never mix line icons with filled icons
- All icons live in `apps/web/src/components/ui/Icon.tsx`. Add new ones there rather than inlining `<svg>` in a page
- Icons default to `text-muted`; switch to `text-primary` only when interactive/active (e.g. selected tab)
- Icon size: 20px inline with text, 24px standalone tap targets (with adequate touch padding to reach 44px minimum tap area)

## Motion

Subtle and minimal — this app never bounces or overshoots.
- Duration: 150–200ms for micro-interactions (button press, toggle), 250–300ms for screen transitions. `duration-150` is the established default
- Easing: standard ease-in-out or ease-out. No spring/bounce curves.
- Prefer opacity + slight position fades over scale/bounce effects
- Loading states: simple fade-in of content or a quiet skeleton pulse — no spinners with personality, no playful loaders

## Navigation

Bottom tab bar on mobile, 3–5 items. Active tab = `text-primary` icon + label; inactive = `text-muted`. Tab bar sits on `bg-surface` with a 1px top border, no shadow. Reserve a floating action button only if there's truly one dominant action app-wide — otherwise keep primary actions inline in each screen.

## Core components

**Buttons**
- Primary: filled `bg-primary`, white text, radius `10px`. One primary button per screen/section max.
- Secondary: `border-border` outline, `text-text` label, transparent fill
- Destructive: filled `bg-negative`, white text — reserved for genuinely destructive actions (delete, close account), not general negative-amount contexts
- Disabled: reduce opacity, no colour change to primary

**Transaction / list rows**
- Left: icon or initial in a circle (`bg-primary-subtle` fill)
- Middle: `Body-strong` label + `Caption` metadata (date/category) stacked
- Right: amount in `Body-strong`, coloured `text-positive` or `text-negative` depending on sign — this is the one place amount colour-coding does the "loud" work instead of size
- Rows separated by a 1px `border-border` divider, not cards-in-cards

**Balance / summary display**
- Shown at `Title` size, `text-text` (not coloured, not oversized) — modest, equal footing with surrounding content, per the app's calm-not-flashy principle
- Supporting trend text in `Caption`, using `text-positive`/`text-negative` for direction

**Inputs**
- `bg-background` (the app's convention — see `SharesTab` in `ContractsPage.tsx`), `1px` `border-border`, radius `10px`
- Focus state: border becomes `border-primary`, no glow/shadow
- Error state: border becomes `border-negative`, helper text below in `text-negative`

**Badges / tags**
- Pill-shaped is fine here (badges are the one exception to the no-pill rule), small `Label` text on `-subtle` background variants

## Accessibility checklist

- [ ] Text/background contrast meets WCAG AA (4.5:1 body, 3:1 large text)
- [ ] Don't rely on colour alone for positive/negative — pair with a `+`/`-` prefix or an icon for colourblind users
- [ ] Tap targets minimum 44×44px even when the visual icon is smaller
- [ ] Focus states are visible (border colour change, not a shift too subtle to notice)
- [ ] Icon-only controls carry an accessible name (`aria-label` or `sr-only` text — see `CategoryBadge` in `ContractsPage.tsx`)
- [ ] Form inputs have associated labels; validation errors are linked via `aria-describedby` and announced

## Mobile-first layout rules

- Design at a 375–414px wide viewport first; scale up gracefully, don't design desktop-down
- Single-column layouts by default; avoid multi-column grids except for small repeating elements (e.g. quick-action icons)
- Sticky bottom tab bar + safe-area padding for iOS home indicator
- Avoid horizontal scroll except for clearly-signalled carousels (e.g. cards, quick filters)

## Quick self-check before shipping any screen

- [ ] Uses only tokens from `apps/web/tailwind.config.js` — no raw Tailwind palette (`blue-*`, `gray-*`), no arbitrary `[#hex]` values, no off-grid spacing
- [ ] No shadows anywhere
- [ ] Corners are 10–12px, not sharp, not pill (except badges)
- [ ] At most one filled primary button visible at a time
- [ ] Balances/numbers are not oversized relative to body text
- [ ] `primary` used only for primary actions/brand/active state; `positive` only for genuinely positive states; `negative` only for genuinely negative or destructive actions
- [ ] Motion, if any, is a fade/ease — no bounce