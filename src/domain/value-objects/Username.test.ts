import { describe, it, expect } from "vitest";
import { Username } from "./Username";
import { ValidationError } from "../errors/DomainError";

describe("Username", () => {
  it("normalizes to trimmed, lowercased form", () => {
    expect(Username.create("  DrewTest  ").toString()).toBe("drewtest");
  });

  it("rejects an empty username", () => {
    expect(() => Username.create("")).toThrow(ValidationError);
    expect(() => Username.create("   ")).toThrow(ValidationError);
  });

  it("rejects a username over the length cap", () => {
    expect(() => Username.create("a".repeat(61))).toThrow(ValidationError);
  });

  it("accepts a username at the length cap", () => {
    expect(() => Username.create("a".repeat(60))).not.toThrow();
  });

  it("does not restrict charset — matches the login flow's own lack of restriction", () => {
    expect(() => Username.create("drew.test_99!")).not.toThrow();
  });

  it("compares equal after normalization", () => {
    expect(Username.create("Drew").equals(Username.create("drew"))).toBe(true);
    expect(Username.create("drew").equals(Username.create("bob"))).toBe(false);
  });
});
