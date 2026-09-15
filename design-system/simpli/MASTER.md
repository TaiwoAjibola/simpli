# Design System Master File — Simpli Notion

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Simpli
**Generated:** 2026-09-15 Notion Remodel
**Style:** Notion — Minimalism & Swiss Style + Flat
**Inspiration:** Notion.app (white canvas, 1px gray borders, Inter, no shadows, high whitespace)

---

## Global Rules — Notion

### Color Palette (Notion)

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Background | `#FFFFFF` | `--background` | Page canvas |
| Background muted | `#F7F7F5` | `--muted` | Hover, subtle fill |
| Border | `#E9E9E7` | `--border` | 1px dividers, card borders |
| Border strong | `#E0E0DE` | `--border-strong` | Input borders |
| Text primary | `#37352F` | `--foreground` | Headings, body (WCAG AAA on white) |
| Text secondary | `#787774` | `--muted-foreground` | Metadata, placeholders |
| Text tertiary | `#9B9A97` | `--muted-tertiary` | Captions |
| Accent | `#2383E2` | `--primary` | Links, active tab underline, primary button |
| Accent hover | `#1A6FC0` | `--primary-hover` | Hover |
| Success | `#0F7B6C` | `--success` | Completed, approved |
| Warning | `#EB5757` | `--destructive` | Urgent, blocked |
| Sidebar | `#FBFBFA` | `--sidebar` | Navigation bg |

**Notes:** Monochrome + single blue accent. No purple/orange. All cards are white with 1px `#E9E9E7` border. No shadows, no gradients. Hover is `#F7F7F5` background, not border glow.

### Typography (Notion)

- **Heading Font:** Inter (fallback ui-sans-system)
- **Body Font:** Inter
- **Mood:** minimal, clean, swiss, functional, neutral, professional, dense but breathable
- **Google Fonts:** https://fonts.google.com/specimen/Inter
- **CSS Import:** `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`
- **Scale:** H1 24px/600, H2 16px/600, H3 14px/600, Body 14px/400, Small 12px/400, Mono 13px
- **Line-height:** 1.5 for body, 1.3 for headings
- **Letter-spacing:** -0.01em for headings

### Spacing (Notion)

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | Tight |
| `--space-sm` | `8px` | Icon gaps |
| `--space-md` | `16px` | Card padding |
| `--space-lg` | `24px` | Section padding |
| `--space-xl` | `32px` | Page padding |

### Borders & Radius (Notion)

- **Border:** `1px solid #E9E9E7` everywhere. No 2px, no colored borders except active tab.
- **Radius:** `8px` for cards/buttons (Notion uses 3-8px), `6px` for inputs, `9999px` only for avatars
- **Shadow:** `none` — flat. No `box-shadow` anywhere. No `backdrop-filter`.
- **Active tab:** `border-bottom: 2px solid #2383E2`, text `#37352F` 600

### Component Specs (Notion)

```css
/* Page canvas */
.page { background: #FFFFFF; padding: 32px 48px; max-width: 900px; margin: 0 auto; }

/* Card — Notion block */
.card {
  background: #FFFFFF;
  border: 1px solid #E9E9E7;
  border-radius: 8px;
  padding: 16px;
  transition: background 150ms ease;
}
.card:hover { background: #F7F7F5; }

/* Button primary — Notion blue */
.btn-primary {
  background: #2383E2;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background 150ms ease;
}
.btn-primary:hover { background: #1A6FC0; }

/* Button secondary */
.btn-secondary {
  background: #FFFFFF;
  color: #37352F;
  border: 1px solid #E9E9E7;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}
.btn-secondary:hover { background: #F7F7F5; }

/* Input — Notion */
.input {
  background: #FFFFFF;
  border: 1px solid #E0E0DE;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 14px;
  color: #37352F;
}
.input:focus { border-color: #2383E2; outline: none; box-shadow: 0 0 0 1px #2383E2; }
.input::placeholder { color: #9B9A97; }

/* Nav item — Notion sidebar */
.nav-item { color: #787774; padding: 6px 8px; border-radius: 6px; font-size: 14px; }
.nav-item:hover { background: #F7F7F5; color: #37352F; }
.nav-item.is-active { background: #E9E9E7; color: #37352F; font-weight: 500; }

/* Tab bar — Notion page tabs */
.tab-bar { border-bottom: 1px solid #E9E9E7; display: flex; gap: 24px; }
.tab { padding: 8px 4px; font-size: 14px; color: #787774; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab.is-active { color: #37352F; border-bottom-color: #2383E2; font-weight: 500; }
```

### Key Effects

- No gradients, no shadows, no blur, no glow
- Hover is `background: #F7F7F5` only (150ms ease)
- No lift, no scale, no rotate
- Focus is `box-shadow: 0 0 0 1px #2383E2` + border
- Transitions `150ms ease` only

### Pattern

- **Name:** Notion Database + Page
- **Layout:** Centered 900px content column, sidebar fixed 240px, whitespace heavy, line length ~65ch

---

## Anti-Patterns (Do NOT Use)

- ❌ Colored card backgrounds (purple, teal, orange)
- ❌ Shadows / glows / gradients / aurora / backdrop-blur
- ❌ Emojis as icons — Lucide only, 16-18px, gray (#787774) or blue (#2383E2) when active
- ❌ Missing cursor:pointer
- ❌ Low contrast text — must be #37352F on white (15:1) or #787774 minimum
- ❌ Colored borders on cards — only #E9E9E7
- ❌ Large border-radius (>8px) except avatars

---

## Pre-Delivery Checklist

- [ ] Background is #FFFFFF or #FBFBFA (sidebar), not #FAF5FF purple
- [ ] All cards have `border: 1px solid #E9E9E7`, `background: white`, `shadow: none`
- [ ] Text is #37352F / #787774, not #4C1D95 or #6D28D9
- [ ] Accent is #2383E2 only, not #7C3AED purple
- [ ] Hover is #F7F7F5 background only
- [ ] Icons are Lucide 16-18px, gray, no micro-wiggle/scale
- [ ] Font is Inter, not Fira Sans/Code or Varela Round
- [ ] No box-shadow, no gradient, no backdrop-filter anywhere
- [ ] Responsive: 375px, 768px, 900px max-width content
