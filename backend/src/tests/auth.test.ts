import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
});

describe("auth utils", () => {
  it("hashes a password and verifies it correctly", async () => {
    const { hashPassword, comparePassword } = await import("../utils/auth");
    const hash = await hashPassword("mySecret123");
    expect(await comparePassword("mySecret123", hash)).toBe(true);
    expect(await comparePassword("wrongPassword", hash)).toBe(false);
  });

  it("signs and verifies an access token round-trip", async () => {
    const { signAccessToken, verifyAccessToken } = await import("../utils/auth");
    const token = signAccessToken({ userId: "abc-123", role: "CUSTOMER" as any });
    const payload = verifyAccessToken(token);
    expect(payload.userId).toBe("abc-123");
    expect(payload.role).toBe("CUSTOMER");
  });

  it("rejects a tampered token", async () => {
    const { signAccessToken, verifyAccessToken } = await import("../utils/auth");
    const token = signAccessToken({ userId: "abc-123", role: "CUSTOMER" as any });
    expect(() => verifyAccessToken(token + "tampered")).toThrow();
  });
});
