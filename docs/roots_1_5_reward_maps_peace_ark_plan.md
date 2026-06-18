# Roots 1.5 Reward Maps Plan: Peace Ark

Status: planning document only. Do not implement in Roots 1.4 unless explicitly re-prioritized.

This file is intended to make the next work session easy to resume. It defines the future 100-day reward-map system and the first new map, **화평의 방주 / Peace Ark**.

## Why this exists

Roots currently uses the 100-day garden / Fruit of the Spirit reward idea. That is meaningful, but after a user completes one 100-day journey, repeating only the same seed/tree cycle can feel less fresh.

The future direction is:

```text
1~100 cumulative Bible Reflection days: current garden / tree journey
101~200 cumulative Bible Reflection days: Peace Ark journey
201~300 cumulative Bible Reflection days: future Bible-themed journey
...
```

The goal is to keep users warmly motivated without turning Roots into a pressure-based habit app.

## Non-negotiable rules

Do not change the core Bible Reflection completion flow.

```text
Bible Reflection completion
→ share prompt
→ final save succeeds
→ share/recipient save succeeds
→ streak_days / total_days / last_checkin persist immediately
→ completion celebration
→ Home
→ badge/garden reward popup if needed
→ watering guide popup
→ Rootsman watering
```

Important constraints:

- `streak_days` is cumulative Word-walk days, not a reset-on-missed-day streak.
- Do not reset or fork `streak_days` for reward maps.
- Do not make progress depend on watering.
- Watering remains reward UI only.
- Same-day duplicate progress must still be impossible.
- Past-date edits must not count for today.
- Drafts must not count.
- The existing Fruit of the Spirit badge cadence must stay intact:
  - 100 days → first Fruit badge
  - 200 days → second Fruit badge
  - 300 days → third Fruit badge
  - ... up to 900 days
- 1000 days → Angel badge remains intact.

## Current code references

As of 2026-06-18:

- Progress persistence is centralized in `lib/reflectionProgress.ts`.
- Home reward popup sequencing is in `app/page.tsx`.
- Current garden step popup uses `streak_days` and `cycleDay` logic.
- Fruit badges are awarded in `recordBibleReflectionProgress` when `nextStreak % 100 === 0`.

Do not rewrite `recordBibleReflectionProgress` unless the change is strictly necessary and separately tested.

## Recommended 1.5 implementation shape

Keep the MVP mostly computed from `profiles.streak_days`.

Recommended helper:

```ts
function getRewardMapState(streakDays: number) {
  const safeDays = Math.max(0, streakDays || 0);
  if (safeDays <= 0) {
    return { cycleIndex: 0, dayInCycle: 0, mapKey: "garden", stageIndex: 0 };
  }

  const cycleIndex = Math.floor((safeDays - 1) / 100); // 0 = first 100 days
  const dayInCycle = ((safeDays - 1) % 100) + 1;      // 1..100
  const stageIndex = Math.ceil(dayInCycle / 10);      // 1..10

  return { cycleIndex, dayInCycle, mapKey: getMapKey(cycleIndex), stageIndex };
}
```

Recommended file later:

```text
lib/rewardMaps.ts
```

Suggested constants:

```ts
const REWARD_MAPS = [
  { key: "garden", labelKo: "말씀의 정원", days: [1, 100] },
  { key: "peace_ark", labelKo: "화평의 방주", days: [101, 200] },
];
```

This keeps reward maps independent from the progress write logic.

## Peace Ark stages

The Peace Ark should use Roots' existing warm pixel-art style. Background images should be static; Rootsman animation should remain a separate sprite/layer where possible.

### Stage 1: days 101~110

Theme: wood/material preparation.

Visual:

- Land/forest background is okay.
- Wood, simple tools, and prepared materials.
- Rootsman can carry wood.

### Stage 2: days 111~120

Theme: measuring and foundation.

Visual:

- Early ark base lines or floor frame.
- Gentle construction scene.

### Stage 3: days 121~130

Theme: frame begins.

Visual:

- Visible ark skeleton.
- Wood beams and simple scaffold feel.

### Stage 4: days 131~140

Theme: lower structure.

Visual:

- Ark lower body becomes clearer.
- Forest/land background still okay.

### Stage 5: days 141~150

Theme: walls grow.

Visual:

- Ark side walls and body grow.
- Keep pixel/game background style, not semi-real illustration.

### Stage 6: days 151~160

Theme: roof and ramp.

Visual:

- Roof outline begins.
- Ramp/door details can appear.

### Stage 7: days 161~170

Theme: details and window.

Visual:

- Small window, planks, stronger ark silhouette.
- Optional tiny animals nearby, but not too busy.

### Stage 8: days 171~180

Theme: almost complete ark.

Visual:

- Completed or nearly completed ark on land.
- Some animals may be around.
- Trees/flowers are okay here.

### Stage 9: days 181~190

Theme: flood / ark on water.

Visual requirements from prior image direction:

- No trees or flowers should be visible.
- Ark floats on water.
- Simple water/sky-centered pixel background.
- Optional bird or very small animal detail is okay.

### Stage 10: days 191~200

Theme: mountain, rainbow, thanksgiving.

Visual:

- Ark resting near mountain/land.
- Rainbow visible.
- Rootsman can kneel in thankful prayer.
- Warm, peaceful ending scene.

## Asset guidelines

Do not commit large draft images accidentally.

Recommended final asset structure later:

```text
public/images/reward-maps/peace-ark/stage-01.webp
public/images/reward-maps/peace-ark/stage-02.webp
...
public/images/reward-maps/peace-ark/stage-10.webp
```

If sprites are added later:

```text
public/sprites/rootsman/peace-ark-carry-wood.webp
public/sprites/rootsman/peace-ark-hammer.webp
public/sprites/rootsman/peace-ark-wave.webp
public/sprites/rootsman/peace-ark-pray.webp
```

Character rules:

- Keep the official Rootsman base character.
- Do not change hair, face, clothing, proportions, or seed bag style.
- Change only the pose/action.
- Do not introduce tree-stump or plant-head variants.

## UI/UX proposal

MVP:

- Home reward area shows current map based on `streak_days`.
- Existing garden popup becomes a generic map-stage popup.
- Popup copy changes by map/stage.
- Watering/Rootsman reward flow remains after completion.

Do not add archive in the first implementation unless explicitly prioritized.

Later:

- Past map archive:
  - 사랑의 정원
  - 화평의 방주
  - future maps
- Users can revisit completed 100-day journeys.

## QA checklist for implementation later

Test users with these `streak_days` values:

```text
0, 1, 7, 10, 11, 99, 100, 101, 110, 111, 180, 181, 190, 191, 199, 200, 201
```

Must verify:

- Day 100 still awards Fruit badge.
- Day 101 starts Peace Ark, not another garden stage.
- Day 200 awards next Fruit badge and completes Peace Ark.
- Day 201 starts the next map placeholder/fallback safely.
- Existing completion popup → reward popup → watering popup order remains intact.
- No duplicate progress increments.
- No changes to past-date/draft rules.

## Suggested 1.5 sequence

1. Add `lib/rewardMaps.ts` with pure helper functions.
2. Add map metadata and placeholder assets only after final image selection.
3. Update Home reward display to use reward map metadata.
4. Keep badge award logic unchanged.
5. Test boundary days with mocked profile data.
6. Test real Bible Reflection completion on actual device.
