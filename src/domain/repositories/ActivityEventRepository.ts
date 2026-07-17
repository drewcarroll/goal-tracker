export interface ActivityEvent {
  userId: string;
  type: "battle_pass_claim" | "shop_purchase";
  trinketId?: string;
  coins?: number;
  occurredAt: Date;
}

/**
 * The friend-feed source of truth. Read filtered by "user_id in (my accepted
 * friends)" at query time — no fan-out-on-write. Fine at this app's expected
 * scale (see docs/plan.md Phase 11).
 */
export interface ActivityEventRepository {
  record(event: ActivityEvent): Promise<void>;
  findForUsers(userIds: readonly string[], limit: number): Promise<ActivityEvent[]>;
}
