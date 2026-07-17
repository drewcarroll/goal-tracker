import type { Trinket, TrinketRarity } from "./Trinket";

export interface ShopTrinket extends Trinket {
  rarity: TrinketRarity;
}

/**
 * The 100-trinket shop pool — completely disjoint from the 12 battle-pass
 * exclusives (BattlePassCalendarMap.ts) by the `shop:` id prefix, which is
 * structural (never overlaps, even by bug) rather than a runtime check.
 * Every trinket costs the same (EconomyConfig.shopTrinketPrice, user
 * decision 2026-07-16: "Price of each trinket should be exactly the same")
 * — rarity only affects how often it's offered in the daily 5-slot rotation
 * (ShopRollService), never its price. Counts (55/30/12/3) mirror the
 * default rarity-weight split so the catalog and the weights agree.
 */
const COMMON: readonly [string, string][] = [
  ["🍀", "Four-Leaf Clover"],
  ["⭐", "Star"],
  ["🎈", "Balloon"],
  ["🍭", "Lollipop"],
  ["🧦", "Odd Sock"],
  ["🪁", "Kite"],
  ["🎯", "Dart"],
  ["🧩", "Puzzle Piece"],
  ["🖍️", "Crayon"],
  ["🎨", "Palette"],
  ["🪀", "Yo-Yo"],
  ["🧸", "Teddy Bear"],
  ["🎲", "Die"],
  ["🪃", "Boomerang"],
  ["🧵", "Spool of Thread"],
  ["🪆", "Nesting Doll"],
  ["🎏", "Carp Streamer"],
  ["🪅", "Piñata"],
  ["🎀", "Ribbon"],
  ["🧶", "Ball of Yarn"],
  ["🥊", "Boxing Glove"],
  ["🏓", "Ping Pong Paddle"],
  ["🛹", "Skateboard"],
  ["🪘", "Drum"],
  ["🎷", "Saxophone"],
  ["🎸", "Guitar"],
  ["🎺", "Trumpet"],
  ["🪕", "Banjo"],
  ["🎻", "Violin"],
  ["🥁", "Drum Kit"],
  ["🍄", "Mushroom"],
  ["🌵", "Cactus"],
  ["🌴", "Palm Tree"],
  ["🌻", "Sunflower"],
  ["🌈", "Rainbow"],
  ["☂️", "Umbrella"],
  ["🧭", "Compass"],
  ["🔭", "Telescope"],
  ["🔬", "Microscope"],
  ["🧲", "Magnet"],
  ["⚙️", "Gear"],
  ["🔩", "Bolt"],
  ["🪛", "Screwdriver"],
  ["🧰", "Toolbox"],
  ["🗝️", "Old Key"],
  ["🔒", "Lock"],
  ["📯", "Postal Horn"],
  ["🔔", "Bell"],
  ["🪗", "Accordion"],
  ["🥋", "Martial Arts Belt"],
  ["🏹", "Bow and Arrow"],
  ["🛶", "Canoe"],
  ["⛺", "Tent"],
  ["🧨", "Firecracker"],
  ["🪄", "Magic Wand"],
];

const RARE: readonly [string, string][] = [
  ["💎", "Gem"],
  ["🔮", "Crystal Ball"],
  ["🗿", "Moai"],
  ["🏺", "Amphora"],
  ["🪬", "Hamsa"],
  ["🧿", "Nazar Amulet"],
  ["🎭", "Twin Masks"],
  ["🕰️", "Mantel Clock"],
  ["📜", "Ancient Scroll"],
  ["🗺️", "Treasure Map"],
  ["🧬", "Double Helix"],
  ["⚗️", "Alembic"],
  ["🛡️", "Shield"],
  ["⚔️", "Crossed Swords"],
  ["🏆", "Trophy"],
  ["🥇", "Gold Medal"],
  ["🎖️", "Military Medal"],
  ["🪩", "Disco Ball"],
  ["🎆", "Fireworks Burst"],
  ["🌠", "Shooting Star"],
  ["🪐", "Ringed Planet"],
  ["🌌", "Milky Way"],
  ["🦋", "Butterfly"],
  ["🐚", "Spiral Shell"],
  ["🪸", "Coral"],
  ["🦢", "Swan"],
  ["🦚", "Peacock"],
  ["🐬", "Dolphin"],
  ["🦉", "Owl"],
  ["🦊", "Fox"],
];

const EPIC: readonly [string, string][] = [
  ["🔱", "Trident"],
  ["⚡", "Storm Bolt"],
  ["🌋", "Volcano"],
  ["🦂", "Scorpion"],
  ["🐺", "Wolf"],
  ["🦁", "Lion"],
  ["🐯", "Tiger"],
  ["🦅", "Eagle"],
  ["🦈", "Shark"],
  ["🐘", "Elephant"],
  ["🦏", "Rhino"],
  ["🦖", "T-Rex"],
];

const LEGENDARY: readonly [string, string][] = [
  ["🐉", "Dragon"],
  ["🦄", "Unicorn"],
  ["👑", "Crown"],
];

function buildTier(entries: readonly [string, string][], rarity: TrinketRarity): ShopTrinket[] {
  return entries.map(([emoji, name], index) => ({
    id: `shop:${rarity}:${String(index + 1).padStart(2, "0")}`,
    emoji,
    name,
    rarity,
  }));
}

export const SHOP_TRINKETS: readonly ShopTrinket[] = [
  ...buildTier(COMMON, "common"),
  ...buildTier(RARE, "rare"),
  ...buildTier(EPIC, "epic"),
  ...buildTier(LEGENDARY, "legendary"),
];

const SHOP_TRINKETS_BY_ID: ReadonlyMap<string, ShopTrinket> = new Map(
  SHOP_TRINKETS.map((trinket) => [trinket.id, trinket]),
);

export function getShopTrinketById(id: string): ShopTrinket | undefined {
  return SHOP_TRINKETS_BY_ID.get(id);
}

export function shopTrinketsByRarity(rarity: TrinketRarity): readonly ShopTrinket[] {
  return SHOP_TRINKETS.filter((trinket) => trinket.rarity === rarity);
}
