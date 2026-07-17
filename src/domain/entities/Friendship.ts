import { ValidationError } from "../errors/DomainError";

export type FriendshipStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface FriendshipProps {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: Date;
  respondedAt: Date | null;
}

/**
 * Friendship entity — a directional friend request that becomes a mutual
 * friendship once accepted. A small, pure state machine (pending -> accepted
 * / declined / cancelled), no math, deliberately unlike Goal/CheckIn's
 * lock-formula territory.
 *
 * Ownership checks ("can THIS caller accept/cancel this request") are an
 * application concern (see the use cases), same as how Goal.pause() doesn't
 * check who's calling — the entity only enforces what's true regardless of
 * who's asking: you can't friend-request yourself, and a request can only
 * be responded to once.
 */
export class Friendship {
  private constructor(private props: FriendshipProps) {}

  static request(params: {
    id: string;
    requesterId: string;
    addresseeId: string;
    now?: Date;
  }): Friendship {
    if (params.requesterId === params.addresseeId) {
      throw new ValidationError("You can't send a friend request to yourself.");
    }
    return new Friendship({
      id: params.id,
      requesterId: params.requesterId,
      addresseeId: params.addresseeId,
      status: "pending",
      createdAt: params.now ?? new Date(),
      respondedAt: null,
    });
  }

  /** Reconstitute an existing friendship (e.g. from a repository). */
  static rehydrate(props: FriendshipProps): Friendship {
    if (props.requesterId === props.addresseeId) {
      throw new ValidationError("A friendship can't have the same user on both sides.");
    }
    return new Friendship(props);
  }

  accept(now?: Date): void {
    this.assertPending("accept");
    this.props.status = "accepted";
    this.props.respondedAt = now ?? new Date();
  }

  decline(now?: Date): void {
    this.assertPending("decline");
    this.props.status = "declined";
    this.props.respondedAt = now ?? new Date();
  }

  /** The requester withdrawing their own still-open request. */
  cancel(now?: Date): void {
    this.assertPending("cancel");
    this.props.status = "cancelled";
    this.props.respondedAt = now ?? new Date();
  }

  private assertPending(action: string): void {
    if (this.props.status !== "pending") {
      throw new ValidationError(`Cannot ${action} a friendship in state "${this.props.status}".`);
    }
  }

  /** Given one side's userId, the id of the other person in this friendship. */
  otherUserId(viewerId: string): string {
    return viewerId === this.props.requesterId ? this.props.addresseeId : this.props.requesterId;
  }

  /** Whether `userId` is either party to this friendship. */
  involves(userId: string): boolean {
    return this.props.requesterId === userId || this.props.addresseeId === userId;
  }

  // --- Getters ---

  get id(): string {
    return this.props.id;
  }
  get requesterId(): string {
    return this.props.requesterId;
  }
  get addresseeId(): string {
    return this.props.addresseeId;
  }
  get status(): FriendshipStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get respondedAt(): Date | null {
    return this.props.respondedAt;
  }
}
