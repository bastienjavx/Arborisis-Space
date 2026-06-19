# Design QA — Arborisis landing page

- Source visual truth: `/home/evil2root/.codex/generated_images/019edc46-9e31-7043-b857-674cbb1398a9/exec-f2a58ed7-9561-46a6-862a-0d9677e8ebb3.png`
- Implementation screenshots: `/home/evil2root/Bureau/Arborisis/qa-desktop.png`, `/home/evil2root/Bureau/Arborisis/qa-mobile.png`
- Viewports: 1440 × 1024 desktop; 390 × 844 mobile
- State: landing page, animations settled after 3 seconds, mobile menu closed
- Full-view comparison evidence: `/home/evil2root/Bureau/Arborisis/qa-comparison.png`
- Focused hero comparison evidence: `/home/evil2root/Bureau/Arborisis/qa-hero-comparison.png`

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: Inter is retained from the product. The implementation strengthens the mock's headline hierarchy while preserving its compact sans-serif character, readable line lengths, and clear CTA labels.
- Spacing and layout rhythm: the desktop hero keeps the mock's text-left/image-right balance. The implementation intentionally moves the feature imagery below the first fold to support a scrollable production landing page. Desktop and mobile margins, card gaps, radii, and CTA stacking are consistent.
- Colors and visual tokens: existing bark, canopy, spore, and sap tokens are preserved. The generated images match those tokens and maintain sufficient separation from editable UI text.
- Image quality and asset fidelity: the hero and three feature visuals are dedicated WebP assets generated from the selected art direction. Crops are sharp and fit their containers without stretching, placeholders, CSS drawings, inline SVG artwork, or emoji substitutes.
- Copy and content: all visible copy is Arborisis-specific, concise, and aligned with existing gameplay terminology. Login and registration routes remain unchanged.
- Responsive behavior: the hero copy, CTAs, art crop, feature grid, and navigation collapse correctly at 390 px. The mobile menu uses library icons and exposes its expanded state accessibly.

## Patches made during QA

- Replaced the former abstract 3D-only landing hero with a generated image-led hero matching the selected concept.
- Added three separately generated gameplay visuals for Empire, Recherche, and Galaxie.
- Added responsive navigation and a functional mobile menu.
- Replaced text-glyph menu controls with Feather icons from `react-icons`.
- Converted project assets to optimized WebP files (91–166 KB each).

## Follow-up polish

- P3: the reference places all three gameplay previews inside the initial desktop viewport; the implementation prioritizes a calmer hero and reveals them on scroll. This is an intentional production-layout deviation.

## Verification

- Production build: passed.
- ESLint: passed.
- TypeScript: passed.
- Jest: blocked by the repository's existing Jest runtime mismatch (`clearMocksOnScope`) before any tests execute; unrelated to this page change.

final result: passed
