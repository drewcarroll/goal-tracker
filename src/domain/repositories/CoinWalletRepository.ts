/**
 * The coin wallet. Balance mutation is a single atomic operation
 * (`adjustBalance`, positive or negative delta) rather than separate
 * read-then-write calls — a battle-pass claim and a shop purchase can land
 * close together, and a naive read-modify-write would lose an update. The
 * Supabase implementation backs this with a Postgres function
 * (`increment_wallet_balance`, see supabase/schema.sql) since the Supabase
 * JS client has no transaction primitive for this.
 */
export interface CoinWalletRepository {
  getBalance(userId: string): Promise<number>;
  /** Adjusts the balance by `delta` (negative to spend) and returns the new balance. Throws if it would go negative. */
  adjustBalance(userId: string, delta: number): Promise<number>;
}
