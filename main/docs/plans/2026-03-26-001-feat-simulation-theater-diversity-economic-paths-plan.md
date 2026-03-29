---
title: "feat: simulation theater geographic diversity + economic cascade paths"
type: feat
status: active
date: 2026-03-26
---

# feat: Simulation Theater Geographic Diversity + Economic Cascade Paths

## Overview

The simulation pipeline currently produces redundant, single-track outputs: multiple theaters from
the same macro-region (Red Sea + Middle East = both MENA), labels polluted with stateKind suffixes
("Black Sea maritime disruption state (supply_chain)"), and all three scenario paths framed as
conflict-actor narratives with no 2nd/3rd order economic cascades. This plan fixes all three root
causes in `scripts/seed-forecasts.mjs` and updates the matching tests.

## Problem Statement

Three cascading issues degrade simulation output quality:

1. **Geographic redundancy**: `buildSimulationPackageFromDeepSnapshot` takes the top 3 candidates
   by `rankingScore` with no macro-region diversity check. Red Sea and Strait of Hormuz (both MENA)
   can both qualify, producing two theaters analyzing the same geopolitical region.

2. **Label contamination**: The `label` field in `selectedTheaters` passes `c.candidateStateLabel`
   directly, which includes a `(stateKind)` suffix (e.g. "Black Sea maritime disruption state
   (supply_chain)"). This leaks into the theater card title displayed in the UI.

3. **Fixed conflict-actor path taxonomy**: Round 1 forces EXACTLY three paths named `escalation`,
   `containment`, and `spillover`. All three are conflict-actor framing. There is no economic
   cascade path — no energy price direction, freight rate delta, downstream sector effects, or FX
   stress. The prompt also uses `temperature: 0` on both rounds (fully deterministic), which limits
   output variation across runs.

## Proposed Solution

Four targeted changes to `scripts/seed-forecasts.mjs` + one test file update:

### Change 1 — Geographic diversity deduplication

Add a `THEATER_GEO_GROUPS` constant that maps CHOKEPOINT_MARKET_REGIONS values to macro-groups.
Replace `candidates.slice(0, 3)` with a dedup loop that skips candidates whose macro-group is
already represented.

### Change 2 — Label cleanup

Strip the `(stateKind)` suffix from the `label` field inside `buildSimulationPackageFromDeepSnapshot`
before writing to `selectedTheaters`.

### Change 3 — market_cascade path (economic cascade framing)

Rename `spillover` → `market_cascade` in:

- `buildSimulationPackageEvaluationTargets` (requiredPaths array + the evaluation question)
- `tryParseSimulationRoundPayload` (expectedIds set)
- `buildSimulationRound1SystemPrompt` (path name, path description, JSON template)
- `buildSimulationRound2SystemPrompt` (reference to the three path names)

The `market_cascade` path description instructs the LLM to model 2nd/3rd order economic
consequences: energy price direction ($/bbl or %), freight rate delta, downstream affected sectors,
FX stress on import-dependent economies. This is distinct from spillover (which was conflict-actor
spillover).

### Change 4 — Tests

Update existing `pathId` validation test + add 3 new tests:

- MENA geo-dedup: verify only 1 theater from MENA when 2 candidates from same group
- Label cleanup: verify `(supply_chain)` suffix stripped from theater label
- market_cascade prompt: verify Round 1 prompt contains `market_cascade`, `$/bbl`, `freight rate`

## Technical Considerations

- **Staleness gate (deferred)**: The Black Sea / Ukraine chronic conflict qualifies indefinitely
  because `isMaritimeChokeEnergyCandidate` has no recency check. Fixing this requires inspecting
  `continuityRecord` fields in the candidate — deferred to a follow-up PR after confirming the
  field exists in the current snapshot shape.
- **Temperature**: Keeping `temperature: 0` on both rounds for now. Introducing non-zero temperature
  is a separate decision that affects reproducibility.
- **Token budget**: `market_cascade` description adds ~80 tokens to the Round 1 prompt. Still well
  under `SIMULATION_ROUND1_MAX_TOKENS = 2200`.

## System-Wide Impact

- **Interaction graph**: Changes are confined to `scripts/seed-forecasts.mjs` (simulation package
  builder + prompt builders). `writeSimulationOutcome` shape is unchanged. `uiTheaters` array
  consumer (`ForecastPanel.ts`) is unaffected.
- **State lifecycle risks**: None — all changes are in the build/prompt path, not the Redis write
  or RPC read path.
- **API surface parity**: `GetSimulationOutcomeResponse.theater_summaries_json` shape unchanged.

## Acceptance Criteria

- [ ] No two theaters in a simulation run share the same macro-region group when 3+ distinct
      geo-groups have qualifying candidates
- [ ] Theater labels displayed in the UI do not contain `(supply_chain)`, `(energy_disruption)`,
      or any `(stateKind)` suffix
- [ ] Round 1 prompt contains `market_cascade` (not `spillover`)
- [ ] `tryParseSimulationRoundPayload` accepts `market_cascade` and rejects `spillover`
- [ ] All existing tests pass (103 baseline)
- [ ] 3 new tests pass covering geo-dedup, label cleanup, market_cascade prompt content

## Implementation Units

### Unit 1: Geographic deduplication constant + helper

**Goal**: Define `THEATER_GEO_GROUPS` mapping macro-regions to group names, add
`getTheaterGeoGroup(marketRegion)` helper, replace `candidates.slice(0, 3)` with dedup loop.

**Files**: `scripts/seed-forecasts.mjs`

**Approach**:

1. After `CHOKEPOINT_MARKET_REGIONS` (line ~136), add:
   ```javascript
   const THEATER_GEO_GROUPS = {
     'Red Sea': 'MENA', 'Middle East': 'MENA', 'Persian Gulf': 'MENA',
     'Strait of Hormuz': 'MENA', 'Gulf of Aden': 'MENA',
     'Black Sea': 'EastEurope', 'Turkish Straits': 'EastEurope',
     'South China Sea': 'AsiaPacific', 'Strait of Malacca': 'AsiaPacific',
     'Taiwan Strait': 'AsiaPacific',
     'Baltic Sea': 'NorthernEurope', 'Danish Straits': 'NorthernEurope',
     'Strait of Gibraltar': 'Mediterranean',
     'Panama Canal': 'LatinAmerica',
     'Cape of Good Hope': 'SouthernAfrica',
   };
   function getTheaterGeoGroup(marketRegion) {
     return THEATER_GEO_GROUPS[marketRegion] || marketRegion || 'unknown';
   }
   ```
2. In `buildSimulationPackageFromDeepSnapshot`, replace:
   ```javascript
   const top = candidates.slice(0, 3);
   ```
   with:
   ```javascript
   const usedGroups = new Set();
   const top = [];
   for (const c of candidates) {
     const group = getTheaterGeoGroup(
       CHOKEPOINT_MARKET_REGIONS[c.routeFacilityKey] || c.dominantRegion || ''
     );
     if (!usedGroups.has(group)) {
       usedGroups.add(group);
       top.push(c);
       if (top.length === 3) break;
     }
   }
   ```

**Patterns to follow**: `CHOKEPOINT_MARKET_REGIONS` constant style (line ~136), existing filter
loop in `buildSimulationPackageFromDeepSnapshot` (line ~12243).

**Verification**: Run `node --test tests/forecast-trace-export.test.mjs` — geo-dedup test passes,
no regressions.

---

### Unit 2: Label cleanup

**Goal**: Strip `(stateKind)` suffix from theater label before writing to `selectedTheaters`.

**Files**: `scripts/seed-forecasts.mjs`

**Approach**: In `buildSimulationPackageFromDeepSnapshot`, where `label` is set:
```javascript
// Before:
label: c.candidateStateLabel || c.dominantRegion || 'unknown theater',
// After:
label: (c.candidateStateLabel || c.dominantRegion || 'unknown theater').replace(/\s*\([^)]+\)\s*$/, '').trim(),
```

This regex strips a trailing parenthetical like `(supply_chain)` or `(energy_disruption)`.

**Patterns to follow**: Existing string cleanup patterns in the file.

**Verification**: Label cleanup test passes. Manual check: `candidateStateLabel = "Black Sea maritime disruption state (supply_chain)"` → `"Black Sea maritime disruption state"`.

---

### Unit 3: market_cascade path rename

**Goal**: Replace `spillover` with `market_cascade` across 4 sites, adding 2nd/3rd order economic
cascade framing to the Round 1 prompt description.

**Files**: `scripts/seed-forecasts.mjs`

**Approach**:

Site A — `buildSimulationPackageEvaluationTargets` (line ~12173), in `requiredPaths`:
```javascript
// Before:
{ pathType: 'spillover', question: '...' }
// After:
{
  pathType: 'market_cascade',
  question: 'What are the 2nd and 3rd order economic consequences? Model energy price direction ($/bbl or %), freight rate delta, downstream sector impacts, and FX stress on import-dependent economies.',
}
```

Site B — `tryParseSimulationRoundPayload` (line ~15582):
```javascript
// Before:
const expectedIds = new Set(['escalation', 'containment', 'spillover']);
// After:
const expectedIds = new Set(['escalation', 'containment', 'market_cascade']);
```

Site C — `buildSimulationRound1SystemPrompt` (line ~15493), path list + JSON template:
```
// Replace all instances of "spillover" with "market_cascade"
// Replace the spillover description with:
// "market_cascade: 2nd and 3rd order economic consequences — model energy price direction ($/bbl or %),
//  freight rate delta on affected trade lanes, downstream sector impacts (manufacturing, agriculture,
//  consumer prices), and FX stress on import-dependent economies."
```

Site D — `buildSimulationRound2SystemPrompt` (line ~15521), path reference:
```
// Replace "escalation, containment, spillover" with "escalation, containment, market_cascade"
```

**Patterns to follow**: Existing prompt builder structure in `buildSimulationRound1SystemPrompt`.

**Verification**: `tryParseSimulationRoundPayload` test updated; market_cascade prompt test passes.

---

### Unit 4: Tests

**Goal**: Update 1 existing test, add 3 new tests.

**Files**: `tests/forecast-trace-export.test.mjs`

**Tests**:

T1 (update existing — line ~5820): `pathId validation` — change expected IDs from
`['escalation', 'containment', 'spillover']` to `['escalation', 'containment', 'market_cascade']`.
Also update the rejection test: `spillover` should now be rejected.

T2 (new): `geo-dedup: MENA candidates → only 1 MENA theater selected`

- Build 3 fake candidates: Red Sea (MENA), Strait of Hormuz (MENA), Strait of Malacca (AsiaPacific)
- Call `buildSimulationPackageFromDeepSnapshot`
- Assert `pkg.theaters.length === 2` and only 1 theater has marketRegion in MENA

T3 (new): `label cleanup: (supply_chain) suffix stripped`

- Build candidate with `candidateStateLabel = 'Black Sea maritime disruption state (supply_chain)'`
- Call `buildSimulationPackageFromDeepSnapshot`
- Assert `pkg.theaters[0].label === 'Black Sea maritime disruption state'`

T4 (new): `Round 1 prompt: market_cascade path present with economic framing`

- Call `buildSimulationRound1SystemPrompt` (exported)
- Assert prompt includes `'market_cascade'`
- Assert prompt includes `'$/bbl'` or `'freight rate'`
- Assert prompt does NOT include `'spillover'`

**Patterns to follow**: Existing test structure at lines 5794-5897 in `forecast-trace-export.test.mjs`.

**Verification**: `node --test tests/forecast-trace-export.test.mjs` — all 103 existing + 4 new
(1 updated + 3 new) pass.

## Files

| File | Change |
|------|--------|
| `scripts/seed-forecasts.mjs` | 5 change sites across 4 functions |
| `tests/forecast-trace-export.test.mjs` | 1 updated test + 3 new tests |

## Dependencies & Risks

- **No proto changes**: `theater_summaries_json` shape is unchanged — no `buf generate` needed.
- **No Vercel changes**: RPC handler and ForecastPanel unchanged.
- **Risk — empty top array**: If all qualifying candidates share the same geo-group, `top` may
  have fewer than 3 theaters. Acceptable — simulation runs with fewer theaters, same as when
  `candidates.length < 3`. No guard needed.
- **Risk — regex too broad**: The `\([^)]+\)` pattern strips ANY trailing parenthetical. If a
  label legitimately ends with a parenthetical (e.g., "Gulf of Aden (Yemen)"), it will also be
  stripped. Acceptable for now — current labels only have stateKind suffixes.

## Deferred

- **Staleness gate for chronic conflicts** (Black Sea/Ukraine): Requires confirming
  `continuityRecord.daysSinceFirstSeen` or equivalent field exists in the snapshot. Follow-up PR.
- **`temperature` tuning**: Non-zero temperature for output variation. Separate decision.
- **Commodity lexicon expansion**: gold, copper, lithium deferred per Phase 2 plan rationale.

## Sources & References

- `scripts/seed-forecasts.mjs:136` — `CHOKEPOINT_MARKET_REGIONS`
- `scripts/seed-forecasts.mjs:12173` — `buildSimulationPackageEvaluationTargets`
- `scripts/seed-forecasts.mjs:12243` — `buildSimulationPackageFromDeepSnapshot`
- `scripts/seed-forecasts.mjs:15493` — `buildSimulationRound1SystemPrompt`
- `scripts/seed-forecasts.mjs:15582` — `tryParseSimulationRoundPayload`
- `tests/forecast-trace-export.test.mjs:5794` — existing prompt + parsing tests
- `.claude/plans/peppy-mixing-pike.md` — Phase 2 plan (scoring recalibration context)
