/**
 * Single-user identity.
 *
 * This app has exactly one user (the owner). Every goal and log is stamped with
 * this fixed id in the `user_id` column, and use cases scope by it just as they
 * did with an authenticated user id — the value is simply a constant now rather
 * than something derived from a session. It is not a secret.
 */
export const OWNER_ID = "00000000-0000-0000-0000-000000000001";
