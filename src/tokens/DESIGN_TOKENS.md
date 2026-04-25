# TestForge Design Tokens

**Version:** 1.0  
**Last Updated:** 2026-04-24  
**Author:** Design System

---

## Overview

TestForge uses a curated design token system to ensure visual consistency, accessibility, and legal compliance across the platform. All UI components derive from these tokens rather than arbitrary color/spacing values.

**Key Principles:**
- Single source of truth in `tailwind.config.js`
- Blue as primary brand color (#3b6bff)
- Electric lime (#7DFF00) as developer-tool accent
- Semantic colors for status (green, red, amber, purple)
- 8px spacing grid throughout
- Two font families: DM Sans (UI) + JetBrains Mono (code)
- Light and dark mode parity

---

## Color Palette

### Primary Brand Color

**Blue Gradient (Primary across all themes)**
```
brand-50:    #eef4ff
brand-100:   #dde9ff
brand-300:   #9ebaff
brand-500:   #3b6bff  ← DEFAULT PRIMARY
brand-700:   #1d3ce0
brand-900:   #0f1a4d
brand-950:   #0a0d18
```

**Usage:**
- Links, buttons, focus states, highlights
- Headings and primary CTAs
- Borders on active/focus elements
- Apply to both light and dark modes equally

---

### Secondary Accent Color

**Electric Lime (Developer-Tool Feel)**
```
lime-50:     #f0ffd9
lime-400:    #b3ff00
lime-500:    #7DFF00  ← PRIMARY ACCENT
lime-600:    #5dd900
lime-700:    #4fa700
lime-900:    #1a3300
```

**Usage:**
- Command palette highlights
- "Live" / "Active" state indicators
- Loading spinners and progress bars
- Code syntax highlighting (if applicable)
- Notification badges for new features
- **Do not use on interactive elements that also use brand-500** (causes confusion)

**Accessibility note:** Lime has lower contrast on light backgrounds. Use only on dark backgrounds or with text color adjustments.

---

### Neutral / Surface Colors

**Gray Scale (Light Mode)**
```
surface-50:    #fafbff  ← Page background
surface-100:   #f5f6fa
surface-200:   #e8eaf2  ← Card borders
surface-300:   #dde0eb
surface-400:   #b4b9ce
surface-500:   #6b7383
surface-600:   #555d6e
surface-700:   #3d4249  ← Body text
surface-800:   #2a2d33
surface-900:   #1a1d23  ← Headers
surface-950:   #0a0d18  ← Dark sidebar/header backgrounds
```

**Usage:**
- surface-50: Page/section backgrounds (light mode)
- surface-200: Input borders, dividers
- surface-500: Placeholder text, disabled state text
- surface-700: Body text (dark mode context)
- surface-900: Headings (light mode)
- surface-950: Dark sidebar, overlay backgrounds

---

### Semantic Colors

**Success (Green)**
```
emerald-50:   #f0fdf4
emerald-500:  #10b981
emerald-600:  #059669
emerald-700:  #047857
```
**Usage:** Passing tests, success badges, positive indicators

**Danger/Failure (Red)**
```
red-50:       #fef2f2
red-500:      #ef4444
red-600:      #dc2626
red-700:      #b91c1c
```
**Usage:** Failed tests, errors, critical alerts, destructive buttons

**Warning (Amber)**
```
amber-50:     #fffbeb
amber-500:    #f59e0b
amber-600:    #d97706
amber-700:    #b45309
```
**Usage:** Warnings, flaky tests, medium priority, pending states

**Info (Blue)**
```
brand-50:     #eef4ff
brand-500:    #3b6bff
brand-600:    #1d3ce0
```
**Usage:** Informational badges, secondary highlights

**Secondary (Purple)**
```
purple-50:    #faf5ff
purple-500:   #a855f7
purple-600:   #9333ea
purple-700:   #7e22ce
```
**Usage:** Insights, secondary accent, complementary highlights

---

### Color Reference by Component

| Component | Light Mode | Dark Mode |
|-----------|-----------|----------|
| Page Background | surface-50 | surface-950 |
| Card Background | white | surface-900 |
| Card Border | surface-200 | surface-800 |
| Input Field | white | surface-800 |
| Input Border (default) | surface-200 | surface-700 |
| Input Border (focus) | brand-500 | brand-500 |
| Text (body) | surface-900 | surface-100 |
| Text (muted) | surface-500 | surface-400 |
| Button (primary) | brand-500 bg | brand-500 bg |
| Button (secondary) | surface-50 bg, surface-700 text | surface-900 bg, surface-100 text |
| Badge (success) | emerald-50 bg, emerald-700 text | emerald-950 bg, emerald-400 text |
| Badge (danger) | red-50 bg, red-700 text | red-950 bg, red-400 text |
| Badge (warning) | amber-50 bg, amber-700 text | amber-950 bg, amber-400 text |
| Status (pass) | emerald-600 | emerald-400 |
| Status (fail) | red-600 | red-400 |
| Status (warn) | amber-600 | amber-400 |

---

## Typography

### Font Families

**UI Font:** DM Sans (Google Fonts, OFL license)
- Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- Used for: All UI text, labels, buttons, headings
- Letter-spacing: -0.01em (headers only)

**Code Font:** JetBrains Mono (OFL license)
- Weights: 400 (Regular), 600 (Semibold)
- Used for: Monospace code, test IDs, environment variables, log output
- Line-height: 1.6 (increased for readability)

### Type Scale

Defined in `tailwind.config.js`:

```
text-xs:    12px / 16px line-height (muted, secondary labels)
text-sm:    14px / 20px (body, secondary text)
text-base:  16px / 24px (default body text)
text-lg:    18px / 28px (section headings)
text-xl:    20px / 28px (page subheadings)
text-2xl:   24px / 32px (page headings)
text-3xl:   30px / 36px (hero/large section title)
text-4xl:   36px / 40px (rarely used)
```

**Font Weight Scale:**
- `font-normal` (400): Default, body text
- `font-medium` (500): Buttons, labels, emphasis
- `font-semibold` (600): Section headings, strong emphasis
- `font-bold` (700): Page titles, hero text

---

## Spacing

### Base Unit: 4px

All spacing values are multiples of 4px:

```
1:    4px
2:    8px   ← Preferred margin/padding minimum
3:    12px
4:    16px  ← Standard component padding
6:    24px  ← Standard section margin
8:    32px  ← Large section margin
12:   48px  ← Extra-large spacing
16:   64px  ← Page-level spacing
```

**Common Patterns:**
- Card padding: `p-4` or `p-6`
- Section margin: `mb-6` or `mb-8`
- Element margin: `mb-2` or `mb-4`
- Form field margin: `mb-4`
- Grid gap: `gap-4` or `gap-6`

---

## Border Radius

```
rounded-sm:   2px   (minimal radius)
rounded:      4px   (default)
rounded-md:   6px
rounded-lg:   8px   (common for cards)
rounded-xl:   12px  (larger cards, modals)
rounded-2xl:  16px  (hero sections)
rounded-full: 9999px (circles, avatars)
rounded-xl2:  14px  (custom, defined in tailwind.config.js)
```

**Usage Guidelines:**
- Input fields: `rounded-lg`
- Cards: `rounded-lg` or `rounded-xl`
- Buttons: `rounded-lg`
- Modals: `rounded-xl`
- Badges: `rounded-full` or `rounded`
- Icons: Match component radius

---

## Shadows

### Shadow System (4 levels)

```
shadow-soft:    0 1px 2px 0 rgba(0, 0, 0, 0.04)     → Minimal elevation
shadow-soft-md: 0 4px 6px -1px rgba(0, 0, 0, 0.06)  → Card shadow
shadow-soft-lg: 0 12px 16px -2px rgba(0, 0, 0, 0.12) → Modal/elevated shadow
shadow-glow:    0 0 12px rgba(59, 107, 255, 0.25)    → Brand accent glow
```

**Usage:**
- Cards, buttons: `shadow-soft` or `shadow-soft-md`
- Modals, popovers: `shadow-soft-lg`
- Focus/highlight effect: `shadow-glow` (combine with ring)
- Hover state: Increase shadow level (e.g., card goes from soft → soft-md)

---

## Animations

**Predefined transitions** (in tailwind.config.js):

```
animate-fade-in:   200ms opacity fade-in
animate-slide-up:  260ms translateY slide-up
animate-pulse-ring: 1.6s radial pulse (for spinners)
```

**Transition utility:**
- `transition-colors`: 150ms color changes
- `transition-opacity`: 150ms opacity changes
- `transition-all`: 150ms all properties

**Usage:**
- Page load: `animate-fade-in`
- Modal/drawer open: `animate-slide-up`
- Hover states: `hover:shadow-soft-lg transition-all`
- Loading spinners: `animate-pulse-ring`

---

## Dark Mode

### Implementation

Dark mode uses Tailwind's `dark:` prefix. Every light-mode class has a corresponding dark-mode override.

**Activation:** Toggle via `prefers-color-scheme` media query OR JavaScript class toggle on `<html>` element.

**Color Mapping (Light → Dark):**

| Component | Light | Dark |
|-----------|-------|------|
| Page bg | surface-50 | surface-950 |
| Card bg | white | surface-900 |
| Text (primary) | surface-900 | surface-50 |
| Text (secondary) | surface-600 | surface-400 |
| Border (default) | surface-200 | surface-800 |
| Border (focus) | brand-500 | lime-500 |
| Button primary | brand-500 bg white text | brand-600 bg white text |

**Example:**
```html
<div class="bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-50">
  Light and dark safe
</div>
```

---

## Accessibility

### Color Contrast

All color combinations meet WCAG AA standards (4.5:1 for text, 3:1 for large text).

**Verified Combos:**
- brand-500 text on surface-50 bg ✓
- surface-900 text on surface-50 bg ✓
- white text on brand-500 bg ✓
- surface-50 text on surface-950 bg ✓
- lime-500 text on surface-950 bg ✓
- red-600 text on red-50 bg ✓

### Focus States

All interactive elements use:
```css
focus-visible: outline 2px solid brand-500 offset 2px;
```

For dark mode:
```css
dark:focus-visible: outline 2px solid lime-500 offset 2px;
```

---

## Implementation

### Where to Update

1. **Colors:** `/testgenie-frontend/tailwind.config.js` → `theme.colors`
2. **Typography:** `/testgenie-frontend/tailwind.config.js` → `theme.fontSize`, `theme.fontFamily`
3. **Spacing:** Tailwind default (4px base, no custom needed)
4. **Shadows:** `/testgenie-frontend/tailwind.config.js` → `theme.boxShadow`
5. **Animations:** `/testgenie-frontend/tailwind.config.js` → `theme.animation`

### How to Use in Components

**Good (uses token):**
```jsx
<button className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg p-4">
  Action
</button>
```

**Bad (hardcoded value):**
```jsx
<button className="bg-blue-600 hover:bg-blue-700 p-4">
  Action
</button>
```

---

## Changelog

### v1.0 (2026-04-24)
- Initial design token system
- Blue primary brand color (#3b6bff)
- Electric lime accent (#7DFF00)
- Full dark mode support
- 4 shadow levels
- Semantic color palette
- 8px spacing grid
- Typography scale (DM Sans + JetBrains Mono)

---

## Questions / Updates

If you need to update a token:
1. Update in `/testgenie-frontend/tailwind.config.js`
2. Test in both light and dark modes
3. Update this document with changelog
4. Verify accessibility (WCAG AA)
5. Deploy to staging first
