---
name: Pandiones
description: Premium editorial e-commerce design system for lingerie and women's apparel
colors:
  primary: "#11100f"
  secondary: "#5f1227"
  tertiary: "#d7b5a8"
  neutral-bg: "#f1ede4"
  neutral-surface: "#e5dbcf"
  neutral-muted: "#6d665f"
  border: "rgba(17, 16, 15, 0.18)"
typography:
  display:
    fontFamily: "Palatino Linotype, Book Antiqua, Palatino, Georgia, serif"
    fontSize: "clamp(4.5rem, 12vw, 11.5rem)"
    fontWeight: 400
    lineHeight: 0.72
    letterSpacing: "-0.055em"
  headline:
    fontFamily: "Palatino Linotype, Book Antiqua, Palatino, Georgia, serif"
    fontSize: "clamp(2.5rem, 6vw, 5.5rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.045em"
  title:
    fontFamily: "Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.18em"
rounded:
  none: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.none}"
    padding: "11px 24px"
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.neutral-bg}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.none}"
    padding: "11px 24px"
  button-wine:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.none}"
    padding: "11px 24px"
---

# Design System: Pandiones

## Overview

**Creative North Star: "The Editorial Atelier"**

Pandiones embodies a calm, confident, feminine, and fiercely contemporary design world. It deliberately rejects standard e-commerce clichés—purple SaaS gradients, generic cards, rounded pills, and decorative gimmicks—in favor of high-fashion editorial rigor. Product photography is the hero and primary proof: large, vertically calibrated visuals anchor every layout with controlled negative space, generous margins, and architectural typographic restraint.

The aesthetic philosophy balances warmth and precision. The warmth flows from tactile bone, warm terracotta, and skin tones; precision comes from ink black structures, razor-sharp 0px borders, and deliberate 1px dividing lines. Interaction motion is purposeful and cinematic: subtle scale, opacity shifts, and smooth reveals elevate the experience without interfering with immediate, frictionless shopping utility.

**Key Characteristics:**
- **Product-First Gravitas:** Natural vertical image ratios (2:3 or 3:4.3) drive hierarchy; interface containers frame without overwhelming.
- **Architectural Flatness:** Surfaces are flat at rest, organized through fine 1px dividers and tonal bone/paper layers rather than synthetic shadows.
- **Editorial Typography Pairing:** Classical literary serifs (`Palatino`) for expressive headlines alongside utilitarian geometric/grotesque sans (`Segoe UI`) for data, specs, and shopping actions.
- **Disciplined Chromatic Accent:** Deep wine acts as an intentional punctuation mark, reserved for focal hover states and active indicators.

## Colors

The Pandiones palette is an organic, high-fashion harmony inspired by tactile fabrics, natural skin undertones, and archival ink.

### Primary
- **Mürekkep / Deep Ink** (`#11100f`): Serves as the primary structural color, high-contrast text on bone canvases, dark background states, and primary action buttons.

### Secondary
- **Şarap / Noble Wine** (`#5f1227`): The signature brand accent. Used selectively for hover states, active category tabs, interactive highlights, and high-impact editorial moments.

### Tertiary
- **Ten / Warm Terracotta** (`#d7b5a8`): Warm organic tone representing skin and natural lingerie hues. Used for subtle halos, muted emphasis, and secondary lifestyle backdrops.

### Neutral
- **Kemik / Bone White** (`#f1ede4`): The canonical application background, light surface tone, and inverse text color on dark surfaces.
- **Muted Bone / Secondary Surface** (`#e5dbcf`): Tonal secondary layer for search fields, table rows, and secondary cards.
- **Stone Muted** (`#6d665f`): Secondary text, field placeholders, metadata kickers, and subtle contextual notes.
- **Delicate Line** (`rgba(17, 16, 15, 0.18)` / dark: `rgba(255, 255, 255, 0.16)`): Architectural 1px dividers, grid seams, and border outlines.

### Named Rules
**The Wine Accent Rule.** The secondary accent (#5f1227) is present on ≤10% of any given surface. Its power stems entirely from exclusivity and restraint.

**The Contrast Invariance Rule.** Backgrounds must never slip into pure uncalibrated #000000 or sterile clinical #ffffff; warm bone (#f1ede4) and deep ink (#11100f) preserve organic editorial warmth across all viewports.

## Typography

**Display Font:** `Palatino Linotype`, `Book Antiqua`, Palatino, Georgia, serif
**Body Font:** `Segoe UI`, `Helvetica Neue`, Arial, sans-serif
**Wordmark Only Font:** `Montserrat Alt1` (light weight 300, 15px, letter-spacing: 0.045em)

**Character:** A deliberate tension between classical editorial literature (Palatino) and functional contemporary minimalism (Segoe UI), producing a sophisticated fashion-magazine reading experience.

### Hierarchy
- **Display** (weight 400, `clamp(4.5rem, 12vw, 11.5rem)`, line-height 0.72): Campaign hero titles and full-bleed section headers.
- **Headline** (weight 400, `clamp(2.5rem, 6vw, 5.5rem)`, line-height 0.9): Section titles, modal titles, and collection hero names.
- **Title** (weight 500, `1rem` / 16px, line-height 1.35, letter-spacing -0.015em): Product names on catalog cards and accordion headers.
- **Body** (weight 400, `0.9375rem` / 15px, line-height 1.65): Fabric descriptions, product specifications, and guidance copy (optimal line length 55–70ch).
- **Label** (weight 500, `0.625rem` / 10px, line-height 1, letter-spacing 0.18em, uppercase): Eyebrows, category kickers, status chips, table headers, and navigation links.

### Named Rules
**The Montserrat Isolation Rule.** `Montserrat Alt1` is strictly reserved for the canonical `PANDIONES` wordmark. It must never be used for headlines, buttons, body copy, or decorative text.

**The Editorial Kicker Rule.** Section titles and component groupings are preceded by an all-caps 10px label with letter-spacing ≥0.18em to establish clear spatial orientation.

## Layout

Pandiones uses a clean architectural layout with generous outer gutters (`5vw` to `6vw` on desktop, `16px` to `20px` on mobile). Grid structures are exposed through 1px hairline borders (`rgba(17, 16, 15, 0.18)`), creating a curated editorial gallery feel.

- **Desktop Grid:** 4-column product grid with 1px hairline dividing gaps; asymmetric editorial rhythms on collection and lookbook sections.
- **Mobile Grid:** 2-column or 1-column scroll-snap rhythm; sticky filters and simplified action bars.
- **Header Structure:** Sticky glass header (`height: 60px` desktop, `52px` mobile) with `backdrop-filter: blur(20px)` and subtle bottom border.
- **Vertical Spacing:** Generous breathing room between macro sections (`10vh` to `14vh`), tight and precise micro spacing within component clusters (`8px` to `24px`).

## Elevation & Depth

Surfaces in Pandiones are **flat at rest**. Depth is communicated purely through tonal layering (bone upon muted paper upon deep ink), deliberate contrast, fine 1px architectural lines, and backdrop blurs.

### Shadow Vocabulary
- **Ambient Frame** (`box-shadow: 0 24px 60px rgba(50, 33, 32, 0.14)`): Reserved exclusively for floating campaign photography frames against lighter backgrounds.
- **Default Surfaces**: `box-shadow: none`.

### Named Rules
**The Flat-By-Default Rule.** Standard cards, modals, dropdowns, and buttons carry no drop shadows. Structure is defined by background tonal difference and 1px border lines.

**The Atmospheric Scrim Rule.** Overlays and hero gradients use multi-stop linear and radial scrims instead of harsh solid black cutoffs.

## Shapes

The form language is **strictly sharp and architectural**. Corners are 0px radius across buttons, cards, containers, inputs, and image frames.

- **Border Radius:** `0px` (`--radius: 0rem`).
- **Dividers:** 1px hairline borders (`var(--border)`).
- **Exceptions:** Pure geometric circles are permitted only for functional compact circular targets: circular counter badges (`20px x 20px`), circular carousel arrows (`36px x 36px`), and color swatches (`12px x 12px`).

### Named Rules
**The Razor Edge Rule.** Rectangular components, image wrappers, buttons, dialogs, and cards must maintain a 0px border radius. Pill buttons and rounded cards are strictly forbidden.

## Components

### Buttons
- **Shape:** Razor sharp (0px radius).
- **Primary:** Background deep ink (`#11100f`), text bone (`#f1ede4`), padding `11px 24px` (`h-11`), uppercase 11px, letter-spacing `0.18em`.
- **Hover / Focus:** Transitions to wine (`#5f1227`) or subtle brightness shift in 0.2s ease. Focus-visible has 2px ring in wine (`#5f1227`) with 2px offset.
- **Outline:** Background transparent, border 1px `var(--border)`, text `var(--primary)`. On hover: background `var(--primary)`, text `var(--primary-foreground)`.
- **Wine Variant:** Background wine (`#5f1227`), text bone (`#f1ede4`), hover brightness 110%.

### Cards / Containers
- **Corner Style:** 0px radius (`rounded-none`).
- **Background:** Bone (`#f1ede4`) or transparent in catalog grids.
- **Border:** 1px hairline border (`var(--border)`).
- **Shadow Strategy:** Flat at rest (`box-shadow: none`).
- **Catalog Card Image:** Natural 2:3 vertical aspect ratio, subtle zoom (`scale(1.025)`) and slight saturation shift on hover. Quick action overlay translates from bottom (`translateY(0)`).

### Inputs / Fields
- **Style:** 1px hairline border (`var(--input)`), transparent or bone background, 0px radius, height `44px` (`h-11`), text 14px.
- **Focus:** 2px ring in wine (`#5f1227`) with outline none.
- **Placeholder:** Stone muted (`#6d665f`).

### Navigation
- **Header:** Sticky, 60px height, backdrop-filter blur(20px), 3-column layout (wordmark / links / actions).
- **Links:** Uppercase 11px, letter-spacing 0.1em, opacity 0.72 at rest, opacity 1.0 on hover/focus.

### Signature Component: Editorial Drop Reel / Catalog Card
- An asymmetric horizontal or 4-column product card exhibiting product image in 2:3 ratio, sharp numeral kicker (`01`, `02`), overlaid quick-look prompt (`İNCELE ↗`), and clean 2-line metadata below.

## Do's and Don'ts

### Do:
- **Do** preserve natural vertical image proportions (2:3 or 3:4.3) without forced horizontal cropping.
- **Do** use 0px border radius across all buttons, cards, dialogs, and inputs.
- **Do** reserve `Montserrat Alt1` solely for the `PANDIONES` wordmark.
- **Do** use `Palatino` for expressive editorial headings and `Segoe UI` for functional interface text.
- **Do** limit the wine accent color (`#5f1227`) to active indicators and deliberate hover accents.
- **Do** ensure all visible controls, links, and selections are fully functional and connected to real data.
- **Do** maintain visible keyboard focus rings using the wine accent token.

### Don't:
- **Don't** use rounded pill buttons or card border radii (e.g. `rounded-lg`, `rounded-full` on cards/buttons).
- **Don't** use drop shadows as a primary means of interface hierarchy.
- **Don't** use `Montserrat Alt1` on section titles, buttons, badges, or body text.
- **Don't** crowd navigation with excessive categories; keep primary paths curated and clean.
- **Don't** invent fake testimonials, placeholder discounts, or mock prices not backed by database truths.
- **Don't** compromise mobile usability for desktop parallax effects.
