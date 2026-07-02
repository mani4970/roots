# Roots 1.8 v2 planning: hearts, map decoration, and Rootsman customization

Date: 2026-07-02  
Status: planning document, no implementation yet

## Product goal

Roots 1.8 v2 should make Love Hearts feel meaningful without turning Roots into a popularity app.

The purpose of hearts is:

```text
Users bless, pray, and give thanks.
Hearts become a gentle trace of love given to others.
Later, hearts can unlock small visual encouragements.
```

Do not frame hearts as likes, rankings, competition, or popularity.

## Non-negotiable boundaries

Do not connect heart usage to:

- Bible Reflection completion progress
- `streak_days`
- `total_days`
- `last_checkin`
- garden / ark stage progression
- watering eligibility
- group challenge success
- badge completion requirements

Love Hearts must remain a separate cosmetic/encouragement layer.

## Recommended 1.8 v2 scope

Start small.

Recommended MVP:

```text
1. Explain what hearts will be used for
2. Add a preview/planning UI, not a full economy first
3. Add one very small cosmetic category
4. Keep spending server-side only
5. Avoid native build unless truly needed
```

Suggested in-app language:

```text
하트로 루츠맨의 작은 장식과 여정의 꾸밈을 열 수 있어요.
묵상의 길은 그대로, 사랑의 흔적은 더 따뜻하게 남겨보세요.
```

## Heart usage categories

### 1. Rootsman decoration

Safe first categories:

```text
small accessory
small hand item
small bag charm
small seasonal scarf
small background-side companion object
```

Avoid:

```text
face changes
hair changes
body shape changes
new mascot base
realistic illustration style
gold border / premium-looking frame
large accessories that hide the seed bag or hands
```

Rootsman base must remain unchanged:

- same pixel mascot
- same hair color
- same overalls
- same front pocket
- same visible seed cross-bag
- same overall proportions

Implementation idea:

```text
Base Rootsman sprite stays untouched.
Decorations are separate small pixel overlays or alternate approved sprite frames.
```

### 2. Map decoration

Safe first categories:

```text
garden flower pot
small lamp
tiny bench
small sign
path stone
seasonal leaf pile
ark-side flower/plant
small dove marker
```

Avoid:

```text
changing reward map stage logic
changing the 100-day cycle
covering important Ark/Garden progress visuals
adding decoration that implies extra progress
```

The decoration should feel like a visual blessing, not a second progress system.

### 3. Profile display

Later profile section:

```text
사랑 하트
서로를 축복하며 모은 마음이에요.
💛 12

[꾸미기 보러가기]
```

Keep the current small profile heart pill as the compact header display.

## Data model direction

Do not let the client directly subtract hearts from `love_heart_wallets`.

Future spending should happen through RPCs only.

Potential future tables:

```text
public.heart_shop_items
public.user_heart_items
public.user_rootsman_loadouts
public.user_map_decorations
public.love_heart_spend_events
```

Potential RPCs:

```text
public.redeem_love_heart_item_once(uuid)
public.equip_rootsman_item(uuid)
public.place_map_decoration(uuid, text)
```

Expected server-side rules:

```text
1. User must be authenticated.
2. Item must be active and available.
3. User must have enough balance.
4. Wallet decrement and spend event insert happen in one transaction.
5. User inventory insert is idempotent or duplicate-safe.
6. `lifetime_earned` does not decrease.
7. All new public tables include explicit GRANTs, RLS, and policies.
```

## Pricing direction

Use simple, low-pressure costs.

Possible MVP ranges:

```text
small decoration: 3–5 hearts
special small decoration: 8–12 hearts
seasonal item: 10–20 hearts
```

Do not introduce paid purchase of hearts in 1.8 v2.

Do not introduce leaderboards.

## UX flow idea

### Entry points

Possible entry points:

```text
Profile heart pill
Profile dedicated Love Hearts card
Home small future-use banner after heart intro has been seen
```

### First screen

Recommended first screen:

```text
하트로 여정을 꾸며보세요 💛
서로를 축복하고 함께 기도하며 모은 하트로,
루츠맨과 말씀의 여정을 조금 더 따뜻하게 꾸밀 수 있어요.
```

### Empty state

```text
아직 사용할 수 있는 하트가 없어요.
묵상에 축복을 남기고, 기도 소원에 함께 기도해보세요.
```

### Coming-soon state

If v2 starts with a preview only:

```text
곧 하트로 작은 장식을 열 수 있어요.
지금 모아둔 하트는 앞으로의 여정에 사용될 예정이에요.
```

## Art and asset rules

All decoration assets must follow existing Roots pixel style.

Rules:

```text
pixel art only
mobile-friendly small size
no semi-realistic rendering
no new mascot base
no large visual changes to Rootsman identity
no gold/premium border language
```

If assets are added under `public/`, this is still a web deployment in the current A-mode app because the native apps load the production URL.

Native build is not required just because a new web-served image is added.

## Suggested v2 implementation order

### Phase 0: planning only

```text
1. Choose first decoration category
2. Decide whether v2 is preview-only or includes first redemption
3. Define item catalog shape
4. Confirm whether assets are static bundled web assets or Supabase Storage
5. Write Supabase migration plan with explicit grants
```

### Phase 1: safe preview UI

```text
1. Add Love Hearts usage explanation page/card
2. Show current balance
3. Show coming-soon decorations
4. No spending yet
5. No database changes beyond what is already present, if possible
```

### Phase 2: first unlock

```text
1. Add item catalog table
2. Add user inventory table
3. Add spend ledger
4. Add server-side redeem RPC
5. Add profile/home display for equipped item
6. Keep regression scope small
```

### Phase 3: map decoration

```text
1. Add user map decoration placement table
2. Add placement RPC
3. Render small decorations on garden/ark map
4. Keep reward map stage logic untouched
```

## Supabase caution for v2

Because of the explicit-GRANT policy rollout, every new v2 table must include:

```text
1. create table
2. indexes
3. RLS enabled
4. policies
5. explicit GRANTs
6. no broad anon grants unless the table truly needs public read
7. regression notes
```

Do not rely on old public-schema defaults.

## Native build decision for v2

Most v2 UI/customization work can be web-only.

No native build/AAB needed for:

```text
web UI changes
Supabase migrations
new web-served images under public/
server-side RPCs
profile/home rendering changes
text/copy changes
```

Native build/AAB likely needed for:

```text
Capacitor config changes
new native plugin
permission changes
app icon/splash changes
native notification behavior changes
AndroidManifest.xml changes
Info.plist changes
Associated Domains / App Links entitlement changes
store-delivered binary changes
```

## Recommended next decision

Before writing code, decide this:

```text
Should 1.8 v2 be preview-only, or should it include the first actual heart redemption?
```

Recommended answer:

```text
Start with preview-only or one very small redemption category.
Do not build a full shop yet.
```
