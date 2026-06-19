# .design-sync/NOTES.md — Arborisis UI sync notes

## Initial sync (2026-06-19)

### Package shape rationale

Arborisis is a Next.js 14 app, not a standalone component library. It has no Storybook
and no `dist/`. We use `shape: "package"` with:
- An explicit `--entry apps/web/src/components/ds-index.ts` to exclude Next.js/Three.js
  components that can't bundle to browser IIFE.
- Explicit `componentSrcMap` entries (non-null) so the component list is populated even
  though there's no DTS output from Next.js.

### Components excluded from the bundle

`ds-index.ts` excludes these intentionally:
| Component | Reason |
|---|---|
| `Nav` | imports `next/link`, `next/image`, `next/navigation` |
| `AuthForm` | imports `next/navigation` |
| `GameTopBar` | API queries via TanStack Query |
| `OrganicBackground` / `OrganicBackgroundInner` | `next/dynamic` dynamic import |
| `PlanetProvider` / `Providers` | context providers, not renderable components |
| Everything in `three/` dir | WebGL / Three.js / @react-three/fiber |

### GlowText and LoadingScreen are default exports

Both components use `export default function` not named exports. In `ds-index.ts` they
need `export { default as GlowText } from './GlowText'` (not `export { GlowText }`).

### Tailwind CSS compilation

Must compile from `apps/web/` directory (to find `tailwind.config.ts`):
```
cd apps/web && npx tailwindcss -i src/app/globals.css -o ds-built.css --content 'src/**/*.{ts,tsx}'
```
Output goes to `apps/web/ds-built.css` (cssEntry bounded to pkgRoot = `apps/web/`).

### Rebuild overwrites authored HTML files

`package-build.mjs` regenerates component HTML files on every run. After authoring:
1. Keep the authored HTML files in a script or re-apply after rebuild.
2. Run `/tmp/reauthor-and-hash.mjs` (or equivalent) to rewrite HTML + update `_ds_sync.json`.
3. The script at `/tmp/reauthor-and-hash.mjs` contains the hash-update logic.

**Better approach for next re-sync**: Before running build, back up authored HTML dirs:
```
cp -r ds-bundle/components ds-bundle/components-authored-backup
```
Then after build, restore authored files and run hash update.

### Inter font

Inter is loaded at runtime by Next.js from Google Fonts — no local `@font-face`. Added
`"runtimeFontPrefixes": ["Inter"]` to config to suppress `[FONT_MISSING]` warning.
Design tool renders with system-ui as fallback — acceptable for this game.

### PKG_DIR path resolution

All config paths in `.design-sync/config.json` are relative to PKG_DIR, which resolves to
`node_modules/@arborisis/web` → symlinked to `apps/web/`. So:
- `"srcDir": "src/components"` (NOT `"apps/web/src/components"`)
- `"tsconfig": "tsconfig.json"` (NOT `"apps/web/tsconfig.json"`)
- `"cssEntry": "ds-built.css"` (NOT `"../../ds-built.css"`)

### Component preview backgrounds

All components are designed for dark backgrounds (`bark-950` = `#060b09`). HTML preview
files must set `body { background: #060b09 }` or components render washed-out on white.
Default auto-generated HTML uses `background: #fff` — always override when authoring.

### LoadingScreen preview

Uses `position: fixed; inset: 0` so the root div has zero height. The standard
`r.getBoundingClientRect().height < 2` fallback check must be skipped for this component.
Use `body { height: 240px; overflow: hidden; position: relative }` and skip the height check.

### buildCmd (current)
```
cd apps/web && npx tailwindcss -i src/app/globals.css -o ds-built.css --content 'src/**/*.{ts,tsx}' && cd ../.. && node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules node_modules --entry apps/web/src/components/ds-index.ts --out ./ds-bundle
```
