# Obsidian Core — Zylith Visual DNA

> The design language for Zylith's interface layer.
> Not a theme. A discipline.

---

## Philosophy

Obsidian Core is not "black with gold."
It is **control, silence, and precision.**

Black is the space.
Gold is the intention.
Red is the warning.

If something ever feels like it "stands out too much," you have already broken the balance.

---

## 1. Color Architecture

### The Ratio

This is the single most important rule. Everything else follows from it.

| Role | Weight | Purpose |
|------|--------|---------|
| Black / deep grays | 80% | Structure, space, depth |
| Neutrals (muted whites, mid-grays) | 15% | Text, borders, secondary surfaces |
| Gold | 4% | Intention, active state, singular emphasis |
| Red | 1% | Signal only — error, warning, critical state |

If you exceed these proportions, the interface becomes ornamental.

### Black Owns the Canvas

Black is not decoration — it is structural.

Use it as the dominant background. But never use flat black everywhere. Work with two depth levels:

- **Deep background** — the infinite dark space (`#09090B` or similar).
- **Slightly elevated surfaces** — a faint carbon gray lift (`#111113`, `#18181B`).

Depth is not created with exaggerated shadows.
It is created with **subtle contrast**.

The interface should feel like it floats in an infinite dark space.

### Gold Does Not Decorate — It Guides

Gold is scarce. That is why it holds value.

**Correct uses:**

- Active line under a tab.
- A very thin border on a selected component.
- The single primary CTA per screen.
- Micro-details: active icons, status indicators, progress accents.

**Never:**

- Large golden buttons.
- Gold backgrounds or fills.
- Shiny gradients.

Gold should feel like **brushed metal**, not yellow paint.

If you use it too much, it stops being luxury and becomes cheap marketing.

**Tone guidance:** Avoid `#FFD700` (that is casino, not sophistication). Target muted, warm metallics — think `#C9A94E`, `#B8975A`, or similar desaturated golds. The gold should whisper, not shout.

### Red Is Not Identity — It Is Signal

Red is never the protagonist.

**Use only for:**

- Error states.
- Warnings.
- Critical status indicators.
- Destructive action confirmation.

**Never:**

- As a background.
- As a primary brand color.
- Decoratively.

Red is tension. And tension is used with purpose.

**Critical rule:** Never combine red and gold in the same component. That looks heavy and baroque — the opposite of what we want.

---

## 2. Typography

If the design is elegant but the typography is generic, everything collapses.

### Principles

- Modern sans-serif. Clean geometry.
- Medium weight as the base — not thin, not bold.
- Generous vertical spacing. Let lines breathe.
- Elegance comes from **rhythm and air**, not from the font itself.

### Hierarchy

| Level | Color | Weight | Usage |
|-------|-------|--------|-------|
| Display / Hero | Pure white (`#FAFAFA`) | Semibold | Page titles, hero headlines — use sparingly |
| Section headings | Softened white (`#E4E4E7`) | Medium | Card headers, section labels |
| Body text | Muted white (`#A1A1AA`) | Regular | Descriptions, values, secondary content |
| Captions / labels | Dim (`#71717A`) | Regular | Metadata, timestamps, tertiary info |
| Disabled / inactive | Very dim (`#52525B`) | Regular | Unavailable states |

Pure white is reserved for key titles only. For everything else, use softened whites. The eye should never be overwhelmed.

---

## 3. Composition and Spatial Hierarchy

Obsidian Core is built on:

- **Generous negative space.** Components need air.
- **Clear separation.** Nothing compressed.
- **Visual breathing room.** If elements are crammed together, it is no longer elegant.

Luxury needs to breathe.

### Spacing Philosophy

- Padding inside components: generous, never tight.
- Gaps between sections: large enough to create clear visual separation.
- Cards and panels: float with space around them — never edge-to-edge unless intentional.
- One piece of content per visual region. Avoid cognitive overload.

### Depth Model

Build depth through **layering**, not shadows:

1. **Canvas** — the deepest black. The void.
2. **Surface** — slightly elevated panels and cards. Faint border or tonal shift.
3. **Element** — interactive components sitting on surfaces.
4. **Emphasis** — gold accents, active states. The rarest layer.

Avoid drop shadows. If you must use them, they should be nearly invisible — a 1-2px soft blur at very low opacity. The dark palette already provides natural contrast.

---

## 4. Component Guidelines

### Buttons

- **Primary CTA:** Solid gold background, dark text. Only one per screen. Compact, not oversized.
- **Secondary:** Ghost style — transparent with a thin neutral border. White text.
- **Destructive:** Ghost with red text/border. Never a solid red fill.
- **Disabled:** Reduced opacity, no gold.

Buttons are never large. They are precise, compact, purposeful.

### Cards and Panels

- Background: one step above the canvas depth.
- Border: 1px, very subtle (`#27272A` or similar). Or no border at all — just the tonal shift.
- Corner radius: small and consistent. Nothing excessively rounded.
- Content inside: well-spaced, never cramped.

### Inputs and Forms

- Understated. Thin borders, generous height.
- Focus state: thin gold border or underline.
- Error state: thin red border. Never a red background fill.
- Placeholder text: dim, never distracting.

### Tables and Data

- Minimal grid lines. Use spacing and alternating subtle tonal rows instead of heavy borders.
- Header row: slightly bolder text, no background fill.
- Selected/active row: faint gold left-border accent or subtle background shift.

### Navigation

- Active tab/item: gold underline or left-border accent. Small, precise.
- Inactive items: muted neutral text.
- Hover: slight brightness increase, never a color change.

### Modals and Overlays

- Dark backdrop with subtle opacity.
- Modal surface: elevated card treatment.
- Focus is maintained through contrast, not animation.

---

## 5. Motion and Animation

Obsidian Core does not perform. It transitions.

- Animations are subtle and functional: state changes, page transitions, micro-feedback.
- Duration: fast (150-250ms). Never slow or dramatic.
- Easing: ease-out for entrances, ease-in for exits.
- No bouncing, no spring physics, no flashy effects.
- Loading states: minimal — a thin gold progress bar or a quiet spinner.

If the animation draws attention to itself, it is wrong.

---

## 6. What to Avoid

This is where most implementations fail.

- **Overloaded hero sections.** Keep them stark and powerful.
- **Bright illustrations** or images with saturated colors. They clash with the palette.
- **Giant golden buttons.** Kills the scarcity of gold.
- **Red as identity.** Red is strictly signal.
- **Excessive animation.** No shimmer effects, no particle backgrounds, no parallax.
- **Shiny gradients, glows, or fake reflections.** None.
- **Golden lines everywhere.** Empty space is part of the design.
- **Mixing red and gold in one component.** Heavy and baroque.
- **Using bright gold (`#FFD700`).** That is a casino.

Obsidian Core does not need to prove anything.
And that is precisely what makes it powerful.

---

## 7. Psychology Behind the Style

This matters for product positioning.

**Black + gold communicates:**

- Exclusivity
- Security
- Solidity
- Financial confidence
- Technical maturity

**It does not communicate:**

- Fun
- Youth
- Casual community

**It is ideal for:**

- Financial infrastructure
- DeFi dashboards and protocols
- Block explorers
- Developer tools
- Institutional crypto products
- Premium platforms

Zylith is a shielded concentrated liquidity protocol. Users are trusting it with private financial operations. The interface must project that trust through visual discipline.

---

## 8. Where This Aesthetic Excels

- Minimalist landing page with a powerful headline.
- Financial dashboards with dense but breathable data.
- Serious blockchain explorers.
- Institutional-grade crypto products.
- Technical infrastructure interfaces.

If the product demands solidity, this aesthetic elevates it.

---

## 9. The Hidden Truth

The real luxury is not the color.
It is the **proportion**.

Gold always looks better on small elements than on large surfaces.

Space always communicates more than decoration.

Restraint always wins.

---

*Obsidian Core lives in structured minimalism. Every pixel earns its place.*
