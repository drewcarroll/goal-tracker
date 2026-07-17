export interface BattlePassDayCellDTO {
  day: number;
  date: string;
  kind: "coins" | "trinket";
  coinAmount?: number;
  trinketId?: string;
  trinketEmoji?: string;
  trinketName?: string;
  claimed: boolean;
  claimable: boolean;
}

export interface BattlePassCalendarDTO {
  year: number;
  month: number;
  theme: string;
  daysInMonth: number;
  visibleDayCount: number;
  missesSoFar: number;
  cells: BattlePassDayCellDTO[];
}

export interface GetBattlePassCalendarDTO {
  userId: string;
  year: number;
  month: number;
  todayDate: string;
}

export interface ClaimBattlePassDayDTO {
  userId: string;
  date: string;
}

export type ClaimBattlePassDayResultDTO =
  | { kind: "coins"; coinAmount: number; balance: number }
  | { kind: "trinket"; trinket: { id: string; emoji: string; name: string }; quantity: number };
