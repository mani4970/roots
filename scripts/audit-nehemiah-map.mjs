import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));

let failed = 0;
function check(label, ok) {
  const pass = Boolean(ok);
  console.log(`  - ${pass ? "PASS" : "FAIL"} ${label}`);
  if (!pass) failed += 1;
}

console.log("Nehemiah Wall map audit (read-only)");
console.log(`Project: ${root}`);

const wall = read("lib/nehemiahWall.ts");
const wallText = read("lib/nehemiahWallText.ts");
const rewardMaps = read("lib/rewardMaps.ts");
const treeGrowth = read("components/TreeGrowth.tsx");
const rewardAction = read("components/RewardMapAction.tsx");
const nehemiahAction = read("components/NehemiahWallAction.tsx");
const home = read("app/page.tsx");
const rootsPopup = read("components/RootsManPopup.tsx");
const stagePopup = read("components/GardenUpdatePopup.tsx");
const preview = read("components/NehemiahWallPreview.tsx");

const expectedStages = [
  [1, 1, 7, "pray"],
  [2, 8, 10, "sealedLetter"],
  [3, 11, 15, "walkThrough"],
  [4, 16, 18, "lanternWalkThrough"],
  [5, 19, 30, "carryStone"],
  [6, 31, 40, "carryStone"],
  [7, 41, 50, "carryStone"],
  [8, 51, 60, "hammer"],
  [9, 61, 69, "carryStone"],
  [10, 70, 70, "wave"],
  [11, 71, 80, "wave"],
  [12, 81, 90, "listenNod"],
  [13, 91, 99, "tambourine"],
  [14, 100, 100, "tambourineLong"],
];

const stagePattern = /\{ stageNumber: (\d+), startDay: (\d+), endDay: (\d+), label: "[^"]+", action: "([^"]+)" \}/g;
const parsedStages = [...wall.matchAll(stagePattern)].map((match) => [
  Number(match[1]), Number(match[2]), Number(match[3]), match[4],
]);

console.log("\nStage boundaries");
check("14 approved stages are present", parsedStages.length === 14);
check("Stage ranges and actions match the approved 1–100 plan", JSON.stringify(parsedStages) === JSON.stringify(expectedStages));
check("Day 70 and days 71–80 both use the approved 4-frame wave action", wall.includes('{ stageNumber: 10, startDay: 70, endDay: 70, label: "완성된 성벽 앞에서 인사", action: "wave" }') && wall.includes('{ stageNumber: 11, startDay: 71, endDay: 80, label: "돌아오는 사람들을 환영", action: "wave" }'));
check("Days 16–18 are lantern walk-through only", wall.includes('startDay: 16, endDay: 18') && wall.includes('action: "lanternWalkThrough"') && !wall.includes("lanternInspect"));

console.log("\nBackground assets");
let backgroundCount = 0;
for (let stage = 1; stage <= 14; stage += 1) {
  for (const time of ["morning", "evening"]) {
    const relative = `public/images/reward-maps/nehemiah-wall/backgrounds/nehemiah_stage${String(stage).padStart(2, "0")}_${time}.webp`;
    if (exists(relative)) backgroundCount += 1;
  }
}
check("All 28 morning/evening backgrounds exist", backgroundCount === 28);

console.log("\nSprite assets");
const requiredSprites = [
  "rootsman_carry_stone_sheet.png",
  "rootsman_lantern_walk_sheet.png",
  "rootsman_listen_nod_sheet.png",
  "rootsman_place_stone_sheet.png",
  "rootsman_sealed_letter_sheet.png",
  "rootsman_tambourine_sheet.png",
  "rootsman_wave_sheet.png",
  "rootswoman_carry_stone_sheet.png",
  "rootswoman_lantern_walk_sheet.png",
  "rootswoman_listen_nod_sheet.png",
  "rootswoman_place_stone_sheet.png",
  "rootswoman_sealed_letter_sheet.png",
  "rootswoman_tambourine_sheet.png",
  "rootswoman_wave_sheet.png",
];
check("All 14 used Nehemiah sprite sheets exist", requiredSprites.every((name) => exists(`public/images/reward-maps/nehemiah-wall/sprites/${name}`)));
check("Unused Rootsman lantern-inspect sheet is deleted", !exists("public/images/reward-maps/nehemiah-wall/sprites/rootsman_lantern_inspect_sheet.png"));
check("Unused Rootswoman lantern-inspect sheet is deleted", !exists("public/images/reward-maps/nehemiah-wall/sprites/rootswoman_lantern_inspect_sheet.png"));
check("No runtime code references lantern-inspect sprites", !`${wall}\n${nehemiahAction}\n${treeGrowth}\n${rewardAction}`.includes("lantern_inspect"));

console.log("\nReward-map integration");
check("RewardMapKind includes nehemiahWall", rewardMaps.includes('"nehemiahWall"'));
check("The third 100-day cycle is nehemiahWall", /"garden",\s*"peaceArk",\s*"nehemiahWall",\s*"futureJourney"/s.test(rewardMaps));
check("Unchosen maps do not wrap back to Garden after day 300", rewardMaps.includes("Math.min(safeIndex, MAP_SEQUENCE.length - 1)") && !rewardMaps.includes("cycleIndex % MAP_SEQUENCE.length"));
check("Nehemiah background is wired into Reward Map", rewardMaps.includes("getNehemiahWallBackground"));
check("Nehemiah irregular stage progress is wired into Reward Map", rewardMaps.includes("getNehemiahStageProgress"));
check("TreeGrowth uses localized Nehemiah labels/descriptions", treeGrowth.includes("getNehemiahWallStageLabel") && treeGrowth.includes("getNehemiahWallStageDescription"));
check("TreeGrowth passes the exact Nehemiah action to RewardMapAction", treeGrowth.includes("nehemiahAction={nehemiahAction}"));
check("RewardMapAction delegates Nehemiah motion to NehemiahWallAction", rewardAction.includes('action === "nehemiah"') && rewardAction.includes("<NehemiahWallAction"));
check("Future journey card uses a neutral placeholder instead of a Garden image", treeGrowth.includes('cycle.kind === "futureJourney" || cycle.kind === "futureMap"') && treeGrowth.includes("roots-logo-transparent-160.png"));
check("Dev preview includes the actual TreeGrowth production renderer", preview.includes("<TreeGrowth") && preview.includes("days={200 + normalizedDay}"));

console.log("\nMotion invariants");
check("Shared Peace Ark walk sheets are reused", nehemiahAction.includes("peace-ark/sprites/rootsman_walk_sheet.png") && nehemiahAction.includes("peace-ark/sprites/rootswoman_walk_sheet.webp"));
check("Common action X is 57%", nehemiahAction.includes('const ACTION_LEFT = "57%"'));
check("Common ground baseline is 7%", nehemiahAction.includes('const GROUND_BOTTOM = "7%"'));
check("Normal entry/return uses the right-side 104% anchor", nehemiahAction.includes('const ENTER_FROM = "104%"') && nehemiahAction.includes('const EXIT_RIGHT = "104%"'));
check("Only walk-through motions use the left exit", nehemiahAction.includes('action === "walkThrough"') && nehemiahAction.includes('action === "lanternWalkThrough"') && nehemiahAction.includes("exitTo: EXIT_LEFT"));
check("70–80 wave remains 4 frames for both avatars", /wave:\s*\{[\s\S]*?frames: 4/.test(nehemiahAction) && (nehemiahAction.match(/frames: 4/g) ?? []).length >= 4);

console.log("\nFive-language copy");
for (const lang of ["ko", "en", "de", "fr", "es"]) {
  check(`${lang} Nehemiah copy exists`, new RegExp(`\\n  ${lang}: \\{`).test(wallText));
}
check("Five stage label arrays are present", (wallText.match(/\n    stageLabels:/g) ?? []).length === 5);
check("Five stage description arrays are present", (wallText.match(/\n    stageDescriptions:/g) ?? []).length === 5);
check("Day 300 copy says the next Word journey is being prepared", wallText.includes("다음 말씀 여정은 준비 중이에요") && wallText.includes("The next Word journey is being prepared"));

console.log("\nHome/reward flow protection");
check("Nehemiah has a dedicated Roots character popup", rootsPopup.includes('currentMap.kind === "nehemiahWall"') && rootsPopup.includes("getNehemiahWallStageDescription"));
check("Nehemiah stage-change popup uses irregular boundaries", home.includes("nehemiah_stage_shown_") && home.includes("currentRewardMap.progressDay === stage.startDay"));
check("Unchosen post-300 map does not launch Garden/Ark actions", home.includes('currentMap.kind === "futureJourney" || currentMap.kind === "futureMap"'));
check("Day 300 completion launches the approved final praise on the completed wall", home.includes('notice?.type === "complete" && notice.kind === "nehemiahWall"') && home.includes("setShowRootsMan(true)"));
check("GardenUpdatePopup renders Nehemiah localized stage copy", stagePopup.includes('currentRewardMap.kind === "nehemiahWall"') && stagePopup.includes("getNehemiahWallStageDescription"));

console.log("\nBoundary simulation");
const sequence = ["garden", "peaceArk", "nehemiahWall", "futureJourney"];
function kindForDays(days) {
  const cycleIndex = days <= 0 ? 0 : Math.floor((days - 1) / 100);
  return sequence[Math.min(cycleIndex, sequence.length - 1)];
}
check("Day 200 remains Peace Ark", kindForDays(200) === "peaceArk");
check("Day 201 starts Nehemiah Wall", kindForDays(201) === "nehemiahWall");
check("Day 300 completes Nehemiah Wall", kindForDays(300) === "nehemiahWall");
check("Day 301 stays unassigned/future", kindForDays(301) === "futureJourney");
check("Later days remain unassigned instead of cycling back to Garden", kindForDays(501) === "futureJourney");

console.log(`\nChecks failed: ${failed}`);
if (failed > 0) {
  console.error("Nehemiah Wall map audit failed.");
  process.exit(1);
}
console.log("Nehemiah Wall map audit passed.");
