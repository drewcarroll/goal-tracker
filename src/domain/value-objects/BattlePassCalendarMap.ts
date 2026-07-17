import type { Trinket } from "./Trinket";

export type BattlePassTrinketDay = 5 | 10 | 15 | 20 | 25;

export interface BattlePassMonthDefinition {
  year: number;
  month: number; // 1-12
  theme: string;
  trinketByDay: Readonly<Record<BattlePassTrinketDay, Trinket>>;
}

function monthOf(
  year: number,
  month: number,
  theme: string,
  days: Record<BattlePassTrinketDay, [string, string]>,
): BattlePassMonthDefinition {
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const trinketByDay = Object.fromEntries(
    (Object.entries(days) as [string, [string, string]][]).map(([day, [emoji, name]]) => [
      day,
      { id: `bp:${key}:d${day}`, emoji, name } satisfies Trinket,
    ]),
  ) as Record<BattlePassTrinketDay, Trinket>;
  return { year, month, theme, trinketByDay };
}

/**
 * The battle-pass reward calendar, July 2026 -> June 2027 — keyed by literal
 * (year, month), NOT a cycling/modulo-12 lookup (explicit user requirement,
 * 2026-07-16): this map is structurally guaranteed to run out after exactly
 * these 12 months rather than silently repeating stale content forever. If
 * the app is ever run outside this range, isBattlePassMonthSupported()
 * returns false and the (app) layout renders a full-screen maintenance
 * banner instead of the app (see MaintenanceBanner.tsx / GetMaintenanceStatusUseCase).
 *
 * Day 25 is the "rare, limited edition" trinket for the month; days 5/10/15/20
 * are smaller trinkets from the same monthly theme. All ids are `bp:`
 * namespaced, disjoint from the 100-trinket shop pool (ShopTrinketCatalog.ts).
 */
const BATTLE_PASS_MONTH_DEFINITIONS: readonly BattlePassMonthDefinition[] = [
  monthOf(2026, 7, "Independence Day / summer", {
    5: ["🎆", "Fireworks"],
    10: ["🌊", "Ocean Wave"],
    15: ["🕶️", "Sunglasses"],
    20: ["🏖️", "Beach Day"],
    25: ["🗽", "Liberty"],
  }),
  monthOf(2026, 8, "Late-summer / Perseids", {
    5: ["🍦", "Soft Serve"],
    10: ["🌻", "Sunflower"],
    15: ["🏕️", "Campsite"],
    20: ["☀️", "High Noon"],
    25: ["🌠", "Perseid"],
  }),
  monthOf(2026, 9, "Back to school / harvest moon", {
    5: ["✏️", "Sharp Pencil"],
    10: ["📚", "Stack of Books"],
    15: ["🍂", "Falling Leaf"],
    20: ["🌾", "Harvest Sheaf"],
    25: ["🥮", "Harvest Moon Cake"],
  }),
  monthOf(2026, 10, "Halloween", {
    5: ["🕸️", "Cobweb"],
    10: ["🦇", "Bat"],
    15: ["🍬", "Candy"],
    20: ["👻", "Ghost"],
    25: ["🎃", "Jack-o'-Lantern"],
  }),
  monthOf(2026, 11, "Thanksgiving", {
    5: ["🌽", "Corn"],
    10: ["🥧", "Pie"],
    15: ["🦃", "Turkey"],
    20: ["🍁", "Maple Leaf"],
    25: ["🙏", "Gratitude"],
  }),
  monthOf(2026, 12, "Winter holidays", {
    5: ["❄️", "Snowflake"],
    10: ["🧦", "Stocking"],
    15: ["🕯️", "Candle"],
    20: ["🎁", "Gift"],
    25: ["🎄", "Holiday Tree"],
  }),
  monthOf(2027, 1, "New year", {
    5: ["🎉", "Confetti"],
    10: ["🥂", "Toast"],
    15: ["⛄", "Snowman"],
    20: ["📅", "Fresh Calendar"],
    25: ["🌟", "New Year's Star"],
  }),
  monthOf(2027, 2, "Valentine's", {
    5: ["💌", "Love Letter"],
    10: ["🍫", "Chocolate"],
    15: ["🌹", "Rose"],
    20: ["💘", "Cupid's Arrow"],
    25: ["❤️", "Heart"],
  }),
  monthOf(2027, 3, "Spring / St. Patrick's", {
    5: ["🍀", "Clover"],
    10: ["🌱", "Seedling"],
    15: ["🌦️", "April Shower"],
    20: ["🏀", "March Madness"],
    25: ["🌷", "Tulip"],
  }),
  monthOf(2027, 4, "Spring / Easter / Earth Day", {
    5: ["🐣", "Hatchling"],
    10: ["☔", "Spring Rain"],
    15: ["🌍", "Earth"],
    20: ["🥚", "Egg"],
    25: ["🌸", "Cherry Blossom"],
  }),
  monthOf(2027, 5, "Cinco de Mayo / graduation", {
    5: ["🌮", "Taco"],
    10: ["💐", "Bouquet"],
    15: ["🌞", "Sunshine"],
    20: ["🎓", "Graduation Cap"],
    25: ["🌺", "Hibiscus"],
  }),
  monthOf(2027, 6, "Pride / Father's Day / solstice", {
    5: ["🏳️‍🌈", "Pride Flag"],
    10: ["👔", "Necktie"],
    15: ["🌅", "Solstice Sunrise"],
    20: ["🏄", "Surf's Up"],
    25: ["🎇", "Sparkler"],
  }),
];

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

const BATTLE_PASS_CALENDAR_MAP: ReadonlyMap<string, BattlePassMonthDefinition> = new Map(
  BATTLE_PASS_MONTH_DEFINITIONS.map((definition) => [
    monthKey(definition.year, definition.month),
    definition,
  ]),
);

export function getBattlePassMonthDefinition(
  year: number,
  month: number,
): BattlePassMonthDefinition | undefined {
  return BATTLE_PASS_CALENDAR_MAP.get(monthKey(year, month));
}

export function isBattlePassMonthSupported(year: number, month: number): boolean {
  return BATTLE_PASS_CALENDAR_MAP.has(monthKey(year, month));
}

export function allBattlePassTrinkets(): readonly Trinket[] {
  return BATTLE_PASS_MONTH_DEFINITIONS.flatMap((definition) => Object.values(definition.trinketByDay));
}
