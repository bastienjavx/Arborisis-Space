# Arborisis UI — Design conventions

## Theme

All components are built for a **dark organic background** (`#060b09` = `bark-950`). Preview
cards and design canvases should use this background; white canvases will wash out the
transparencies and make glassmorphism cards invisible.

Color palette (from Tailwind config):
| Token | CSS variable | Hex (center) | Role |
|---|---|---|---|
| `canopy` | green | `#16bf6c` | Primary / growth / success |
| `sap` | gold | `#e0a93f` | Energy / warning / secondary |
| `spore` | purple | `#7b66f0` | Research / special |
| `bark` | dark green-black | `#060b09` (950) | Background |

## Resources

Arborisis has 4 resource types: `BIOMASS`, `SAP`, `MINERALS`, `SPORES`.

`ResourceState` shape (for `ResourceBar`):
```ts
{
  amounts:  Record<'BIOMASS'|'SAP'|'MINERALS'|'SPORES', number>;
  perHour:  Record<'BIOMASS'|'SAP'|'MINERALS'|'SPORES', number>;
  capacity: Record<'BIOMASS'|'SAP'|'MINERALS'|'SPORES', number>;
  energyProduced: number; energyConsumed: number; energyRatio: number;
  stability: number;   // 0–100
}
```

`ResourceBundle` shape (for `ResourceCost`): same keys, pass 0 for resources not required —
the component filters out zeros automatically.

## Language

In-game text is **French** (genre: sci-fi organic civilization). Use French labels and
units in designs that show game content (e.g. "Construire", "Démanteler", "Vaisseaux",
"Germination…", "Biomasse", "Sève", etc.).

## Export style

Most components are named exports. Two exceptions that are **default exports**:
- `GlowText`
- `LoadingScreen`

## Component notes

### LoadingScreen
`fixed inset-0` — fills the viewport. In preview contexts set `body { height: 240px }`.
Always pass `visible: true` to see it; `visible: false` (default) renders nothing.

### ResourceBar
Renders 6 tiles: BIOMASS, SAP, MINERALS, SPORES, energy balance, stability. Designed as a
full-width horizontal strip (`sm:grid sm:grid-cols-5`). The 5-column grid layout needs at
least 600 px to render without scroll.

### GlowText
Wraps inline text in an animated text-shadow pulse. Works inside headings or large spans.
Three colors: `green` (default), `purple`, `gold`.

### AnimatedButton
Three variants: `primary` (canopy green, filled), `ghost` (transparent with border),
`danger` (red). Supports `loading` (spinner) and `disabled` states.

### StatCard
Four color schemes: `green`, `gold`, `purple`, `red`. Stack horizontally with `display: flex; gap: 10px`.
