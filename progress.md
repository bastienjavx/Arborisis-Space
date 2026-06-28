Original prompt: analsye le projet et ameloire les anamiation et grafismes 3d du jeux

## 2026-06-23

- Direction retenue: organique premium.
- Implementation pass started: improve existing React Three Fiber scenes procedurally, keep overlays in DOM, avoid backend/API changes.
- Added seeded visual helpers and upgraded Hero/Organic background, PlanetView, GalaxyView, and FleetView with deterministic premium-organic effects.
- TODO: verify web typecheck/lint, run dev server, capture and inspect Playwright screenshots for `/play`, `/galaxy`, and `/fleets`.

## 2026-06-28

- Current prompt: analyser le projet et améliorer le NPC pour qu'il devienne une vraie IA intelligente qui joue.
- Analysis: current NPC layer is static PvE encounter spawning + deterministic difficulty combat. No autonomous player-like state exists yet.
- Direction: add server-authoritative NPC battle planning in shared formulas, driven by encounter type, fleet composition, health ratio, and deterministic tactical choices; expose the selected tactic in PvE results.
- Implemented: NPC behavior profiles, tactical battle planning, adaptive encounter spawn near player empires, PvE result tactical reporting, and UI labels for hostile AI tactics.
- Verified: shared tests, API tests, shared/API/web typecheck, shared/API/web lint, targeted Prettier check, shared build, API build.
- Note: `npm run build -w apps/web` reached "Creating an optimized production build ..." but stayed silent for several minutes and ignored Ctrl-C; process was killed. Web typecheck/lint passed.
- Current implementation pass: branch `codex/mycosynth-full-ai` from updated `main`; added shared `MYCOSYNTH_AI_CONFIG` and a pure Mycosynth planner for building, fleet, attack, market, and trade-route decisions.
- Implemented full autonomous Mycosynth loop: one empire action, one economy action, and one mission action per bot tick; covers construction, research, colonization, ship mix, production lines, crafting, internal trade routes, market orders, spy-before-attack PvP, PvE, and expeditions through existing server services.
- Verified: shared typecheck/tests, API typecheck/tests/lint/build. E2E not run because Docker daemon is unavailable in this session.
