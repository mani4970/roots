import type { RootsAvatarType } from "@/lib/avatar";
import type { HeartShopCharacterSlot } from "@/lib/heartShopItems";
import type { Lang } from "@/lib/i18n";

type Crop = readonly [x: number, y: number, width: number, height: number];
type Layer = { file: string; crop?: Crop };
type ItemSpec = {
  slot: HeartShopCharacterSlot;
  names: Record<Lang, string>;
  layers: { shared: Layer } | Record<RootsAvatarType, Layer>;
};

// Preview bounds follow the visible pixels of the approved 1086 × 1448 layers.
// The layers themselves retain their avatar-specific position and scale.
const items = {
  advent_2026_sheep: {
    slot: "pet",
    names: { ko: "양 프로필 소품", en: "Sheep Profile Decoration", de: "Schaf-Profildeko", fr: "Décoration de profil Mouton", es: "Decoración de perfil de oveja" },
    layers: { shared: { file: "sheep.webp", crop: [702, 1020, 247, 248] } },
  },
  advent_2026_red_scarf: {
    slot: "muffler",
    names: { ko: "붉은 체크 머플러", en: "Red Plaid Scarf", de: "Rot karierter Schal", fr: "Écharpe rouge à carreaux", es: "Bufanda roja a cuadros" },
    layers: {
      rootsman: { file: "wardrobe/rootsman-red-plaid-scarf.webp", crop: [411, 622, 287, 290] },
      rootswoman: { file: "wardrobe/rootswoman-red-plaid-scarf.webp", crop: [431, 560, 225, 200] },
    },
  },
  advent_2026_bethlehem: {
    slot: "background",
    names: { ko: "베들레헴 배경", en: "Bethlehem Background", de: "Hintergrund Bethlehem", fr: "Arrière-plan de Bethléem", es: "Fondo de Belén" },
    layers: { shared: { file: "bethlehem.webp" } },
  },
  advent_2026_cream_knit: {
    slot: "top",
    names: { ko: "크림 성탄 니트", en: "Cream Christmas Sweater", de: "Cremefarbener Weihnachtspullover", fr: "Pull de Noël crème", es: "Suéter navideño crema" },
    layers: {
      rootsman: { file: "wardrobe/rootsman-christmas-knit.webp", crop: [277, 636, 544, 343] },
      rootswoman: { file: "wardrobe/rootswoman-christmas-knit.webp", crop: [333, 566, 420, 284] },
    },
  },
  advent_2026_tree: {
    slot: "pet",
    names: { ko: "성탄트리 프로필 소품", en: "Christmas Tree Profile Decoration", de: "Weihnachtsbaum-Profildeko", fr: "Décoration de profil Sapin de Noël", es: "Decoración de perfil de árbol de Navidad" },
    layers: { shared: { file: "tree.webp", crop: [665, 728, 300, 540] } },
  },
  advent_2026_hat: {
    slot: "headwear",
    names: { ko: "성탄 모자", en: "Christmas Hat", de: "Weihnachtsmütze", fr: "Bonnet de Noël", es: "Gorro navideño" },
    layers: {
      rootsman: { file: "wardrobe/rootsman-christmas-beret.webp", crop: [206, 32, 698, 330] },
      rootswoman: { file: "wardrobe/rootswoman-snowflake-hat.webp", crop: [303, 93, 505, 620] },
    },
  },
  advent_2026_cream_scarf: {
    slot: "muffler",
    names: { ko: "크림 골지 머플러", en: "Cream Ribbed Scarf", de: "Cremefarbener Rippstrickschal", fr: "Écharpe côtelée crème", es: "Bufanda acanalada crema" },
    layers: {
      rootsman: { file: "wardrobe/rootsman-cream-knit-scarf.webp", crop: [412, 624, 285, 196] },
      rootswoman: { file: "wardrobe/rootswoman-cream-knit-scarf.webp", crop: [431, 560, 225, 160] },
    },
  },
  advent_2026_church: {
    slot: "background",
    names: { ko: "성탄 교회 배경", en: "Christmas Church Background", de: "Hintergrund Weihnachtskirche", fr: "Arrière-plan Église de Noël", es: "Fondo de iglesia en Navidad" },
    layers: { shared: { file: "church.webp" } },
  },
  advent_2026_cardigan: {
    slot: "top",
    names: { ko: "초록 눈사람 가디건", en: "Green Snowman Cardigan", de: "Grüne Strickjacke mit Schneemann", fr: "Gilet vert bonhomme de neige", es: "Cárdigan verde con muñeco de nieve" },
    layers: {
      rootsman: { file: "wardrobe/rootsman-christmas-cardigan.webp", crop: [276, 636, 545, 344] },
      rootswoman: { file: "wardrobe/rootswoman-christmas-cardigan.webp", crop: [333, 566, 420, 284] },
    },
  },
  advent_2026_snowman: {
    slot: "pet",
    names: { ko: "눈사람 프로필 소품", en: "Snowman Profile Decoration", de: "Schneemann-Profildeko", fr: "Décoration de profil Bonhomme de neige", es: "Decoración de perfil de muñeco de nieve" },
    layers: { shared: { file: "snowman.webp", crop: [703, 922, 256, 346] } },
  },
  advent_2026_home: {
    slot: "background",
    names: { ko: "따뜻한 집 안 배경", en: "Cozy Home Background", de: "Hintergrund Gemütliches Zuhause", fr: "Arrière-plan Maison chaleureuse", es: "Fondo de hogar acogedor" },
    layers: { shared: { file: "home.webp" } },
  },
} as const satisfies Record<string, ItemSpec>;

export type AdventHeartShopBaseItemId = keyof typeof items;
export type AdventHeartShopItemId = {
  [Key in AdventHeartShopBaseItemId]: "shared" extends keyof typeof items[Key]["layers"]
    ? Key
    : `${Key}_${RootsAvatarType}`;
}[AdventHeartShopBaseItemId];

type AdventHeartShopItem = {
  id: AdventHeartShopItemId;
  avatarType: RootsAvatarType | "shared";
  slot: ItemSpec["slot"];
  names: ItemSpec["names"];
} & Layer;

const catalog = new Map<string, AdventHeartShopItem>();
const avatarTypes = ["rootsman", "rootswoman"] as const;

for (const [baseId, entry] of Object.entries(items) as [AdventHeartShopBaseItemId, ItemSpec][]) {
  const { names, layers, slot } = entry;
  if ("shared" in layers) {
    const id = baseId as AdventHeartShopItemId;
    catalog.set(id, { id, avatarType: "shared", names, slot, ...layers.shared });
  } else {
    for (const avatarType of avatarTypes) {
      const id = `${baseId}_${avatarType}` as AdventHeartShopItemId;
      catalog.set(id, { id, avatarType, names, slot, ...layers[avatarType] });
    }
  }
}

export const ADVENT_HEART_SHOP_ITEM_IDS = [...catalog.values()].map(item => item.id);

export function getAdventHeartShopItemMetadata(itemId: string) {
  return catalog.get(itemId);
}

export function getAdventHeartShopItemId(baseId: string, avatarType: RootsAvatarType): AdventHeartShopItemId | null {
  return (catalog.get(`${baseId}_${avatarType}`) ?? catalog.get(baseId))?.id ?? null;
}
