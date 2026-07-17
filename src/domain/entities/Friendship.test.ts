import { describe, it, expect } from "vitest";
import { Friendship, type FriendshipProps } from "./Friendship";
import { ValidationError } from "../errors/DomainError";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("Friendship", () => {
  describe("request", () => {
    it("creates a pending request", () => {
      const f = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2", now: NOW });
      expect(f.status).toBe("pending");
      expect(f.requesterId).toBe("u1");
      expect(f.addresseeId).toBe("u2");
      expect(f.createdAt).toBe(NOW);
      expect(f.respondedAt).toBeNull();
    });

    it("rejects requesting yourself", () => {
      expect(() =>
        Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u1" }),
      ).toThrow(ValidationError);
    });
  });

  describe("rehydrate", () => {
    const validProps: FriendshipProps = {
      id: "f1",
      requesterId: "u1",
      addresseeId: "u2",
      status: "pending",
      createdAt: NOW,
      respondedAt: null,
    };

    it("accepts valid stored state", () => {
      expect(() => Friendship.rehydrate(validProps)).not.toThrow();
    });

    it("rejects a same-user pair even from storage", () => {
      expect(() =>
        Friendship.rehydrate({ ...validProps, requesterId: "u1", addresseeId: "u1" }),
      ).toThrow(ValidationError);
    });
  });

  describe("accept / decline / cancel", () => {
    it("accepts a pending request", () => {
      const f = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2" });
      f.accept(NOW);
      expect(f.status).toBe("accepted");
      expect(f.respondedAt).toBe(NOW);
    });

    it("declines a pending request", () => {
      const f = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2" });
      f.decline(NOW);
      expect(f.status).toBe("declined");
    });

    it("cancels a pending request", () => {
      const f = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2" });
      f.cancel(NOW);
      expect(f.status).toBe("cancelled");
    });

    it("rejects accepting/declining/cancelling a non-pending friendship", () => {
      const f = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2" });
      f.accept();
      expect(() => f.accept()).toThrow(ValidationError);
      expect(() => f.decline()).toThrow(ValidationError);
      expect(() => f.cancel()).toThrow(ValidationError);
    });
  });

  describe("otherUserId / involves", () => {
    const f = Friendship.request({ id: "f1", requesterId: "u1", addresseeId: "u2" });

    it("returns the other side regardless of which side is asking", () => {
      expect(f.otherUserId("u1")).toBe("u2");
      expect(f.otherUserId("u2")).toBe("u1");
    });

    it("involves returns true only for the two participants", () => {
      expect(f.involves("u1")).toBe(true);
      expect(f.involves("u2")).toBe(true);
      expect(f.involves("u3")).toBe(false);
    });
  });
});
