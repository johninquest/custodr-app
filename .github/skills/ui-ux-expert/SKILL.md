---
name: ui-ux-expert
description: Design system and UI/UX guidance for this fintech app's mobile-first interface, built around the "Baobab Green" calm/natural color theme. Use this skill whenever the user asks to design, build, style, mock up, or review any screen, component, or flow for this app — including requests like "build a screen for X", "make this component", "design the settings page", "how should the transaction list look", or any React/HTML/Figma-style UI work for this project, even if the user doesn't explicitly say "design system" or mention Baobab by name. Always consult this skill before writing UI code or making visual/layout decisions for this app, to keep colors, spacing, typography, and component patterns consistent with the established vision.
---

# Baobab Fintech UI — Design System

A calm, natural, soft-but-trustworthy design language for a mobile-first fintech app. Light mode only, flat surfaces, moderate rounding, minimal motion. When in doubt: quieter, not louder.

## Design principles (the vision, in one paragraph)

This app should feel calm and human — the opposite of sterile enterprise fintech or hyper-gamified consumer apps. Money-related numbers are shown with the same visual weight as everything else, not blown up for drama. Surfaces are flat and separated by color/borders, never shadows. Corners are softly rounded, never sharp and never pill-shaped. Motion is subtle and settled — nothing bounces. One primary action per screen, always in solid green. Green also does double duty as the "positive" signal (income, growth, success), with a separate muted red reserved strictly for negative/warning states.

## Color tokens

| Token | Hex | Usage |
|---|---|---|
| `color-background` | `#F8F9F4` | App background, screen canvas. Never pure white. |
| `color-text` | `#202520` | Primary text. Never pure black. |
| `color-primary` | `#3E7655` | Primary buttons, active tab, links, key icons, brand accent |
| `color-positive` | `#277A55` | Positive amounts, success states, "up" trends |
| `color-negative` | `#B54B47` | Negative amounts, errors, destructive actions, "down" trends |

**Derived tones** (generate these programmatically, don't hand-pick new hues):
- `color-text-muted`: `color-text` at ~60% opacity — secondary text, timestamps, helper copy
- `color-border`: `color-text` at ~12% opacity — dividers, card outlines, input borders
- `color-surface`: `color-background` mixed slightly toward white (e.g. `#FCFDFA`) — for cards/sheets that need to sit one step above the canvas, without using a shadow
- `color-primary-subtle`: `color-primary` at ~10-12% opacity as a fill — for tags, selected states, chip backgrounds
- `color-positive-subtle` / `color-negative-subtle`: same treatment, for amount badges

**Rules:**
- No pure `#000000` or `#FFFFFF` anywhere in the UI — it breaks the calm, low-strain feel of the palette.
- Positive/negative colors are reserved for their semantic meaning only. Don't reuse `color-negative` for generic emphasis, and don't reuse `color-positive` as a decorative accent — it should always mean "good/up/success" so it stays trustworthy.
- Maintain WCAG AA contrast (4.5:1 body text, 3:1 large text/UI components) for every text/background pairing. `color-text` on `color-background` and white text on `color-primary`/`color-negative` both pass comfortably — verify any new pairing before shipping it.

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
- Use `color-surface` vs `color-background` for a subtle one-step lift
- Use a 1px `color-border` outline when two adjacent surfaces are the same color and need a hard edge
- Modals/sheets may use a very light scrim (`color-text` at ~30% opacity) behind them, but the sheet itself stays flat — no drop shadow

## Iconography

- Thin-line icons only, consistent stroke width (1.5–2px) across the entire app — never mix stroke weights or mix line icons with filled icons
- Icons default to `color-text-muted`; switch to `color-primary` only when the icon is interactive/active (e.g. selected tab)
- Icon size: 20px inline with text, 24px standalone tap targets (with adequate touch padding to reach 44px minimum tap area)

## Motion

Subtle and minimal — this app never bounces or overshoots.
- Duration: 150–200ms for micro-interactions (button press, toggle), 250–300ms for screen transitions
- Easing: standard ease-in-out or ease-out. No spring/bounce curves.
- Prefer opacity + slight position fades over scale/bounce effects
- Loading states: simple fade-in of content or a quiet skeleton pulse — no spinners with personality, no playful loaders

## Navigation

Bottom tab bar, 3–5 items. Active tab = `color-primary` icon + label; inactive = `color-text-muted`. Tab bar sits on `color-surface` with a 1px top `color-border`, no shadow. Reserve a floating action button only if there's truly one dominant action app-wide (e.g. "Send money") — otherwise keep primary actions inline in each screen.

## Core components

**Buttons**
- Primary: filled `color-primary`, white text, radius `10px`. One primary button per screen/section max.
- Secondary: `color-border` outline, `color-text` label, transparent fill
- Destructive: filled `color-negative`, white text — reserved for genuinely destructive actions (delete, close account), not general negative-amount contexts
- Disabled: `color-text` at ~30% opacity, no color change to primary green

**Transaction / list rows**
- Left: icon or merchant initial in a circle (`color-primary-subtle` fill)
- Middle: `Body-strong` label + `Caption` metadata (date/category) stacked
- Right: amount in `Body-strong`, colored `color-positive` or `color-negative` depending on sign — this is the one place amount color-coding does the "loud" work instead of size
- Rows separated by `color-border` 1px divider, not cards-in-cards

**Balance / summary display**
- Shown at `Title` size, `color-text` (not green, not oversized) — modest, equal footing with surrounding content, per the app's calm-not-flashy principle
- Supporting trend text in `Caption`, using `color-positive`/`color-negative` for direction

**Inputs**
- `color-surface` background, `1px` `color-border`, radius `10px`
- Focus state: border becomes `color-primary`, no glow/shadow
- Error state: border becomes `color-negative`, helper text below in `color-negative`

**Badges / tags**
- Pill-shaped is fine here (badges are the one exception to the no-pill rule), small `Label` text on `-subtle` background variants

## Accessibility checklist

- [ ] Text/background contrast meets WCAG AA (4.5:1 body, 3:1 large text)
- [ ] Don't rely on color alone for positive/negative — pair with `+`/`-` prefix or an icon for colorblind users
- [ ] Tap targets minimum 44×44px even when the visual icon is smaller
- [ ] Focus states are visible (border color change, not just color shift too subtle to notice)

## Mobile-first layout rules

- Design at a 375–414px wide viewport first; scale up gracefully, don't design desktop-down
- Single-column layouts by default; avoid multi-column grids except for small repeating elements (e.g. quick-action icons)
- Sticky bottom tab bar + safe-area padding for iOS home indicator
- Avoid horizontal scroll except for clearly-signaled carousels (e.g. cards, quick filters)

## Quick self-check before shipping any screen

- [ ] Uses only tokens from this file — no off-palette colors, no off-grid spacing, no new fonts
- [ ] No shadows anywhere
- [ ] Corners are 10–12px, not sharp, not pill (except badges)
- [ ] At most one filled primary button visible at a time
- [ ] Balances/numbers are not oversized relative to body text
- [ ] Green used only for primary actions/brand or genuinely positive states; red used only for genuinely negative/destructive states
- [ ] Motion, if any, is a fade/ease — no bounce