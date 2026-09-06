import { describe, it, expect } from "vitest";
import { OrderStatus, isTransitionAllowed } from "@abuelzoz/shared";

describe("Order status state machine", () => {
  it("allows restaurant to accept a pending order", () => {
    expect(isTransitionAllowed(OrderStatus.PENDING, OrderStatus.ACCEPTED, "RESTAURANT")).toBe(true);
  });

  it("blocks a driver from resetting an order back to PENDING", () => {
    expect(isTransitionAllowed(OrderStatus.DRIVER_ASSIGNED, OrderStatus.PENDING, "DRIVER")).toBe(false);
  });

  it("blocks skipping PREPARING straight to DELIVERED", () => {
    expect(isTransitionAllowed(OrderStatus.PREPARING, OrderStatus.DELIVERED, "RESTAURANT")).toBe(false);
  });

  it("blocks a customer role from making any transition", () => {
    expect(isTransitionAllowed(OrderStatus.PENDING, OrderStatus.ACCEPTED, "CUSTOMER")).toBe(false);
  });

  it("allows a driver to mark an assigned order as picked up", () => {
    expect(isTransitionAllowed(OrderStatus.DRIVER_ASSIGNED, OrderStatus.PICKED_UP, "DRIVER")).toBe(true);
  });

  it("terminal states (DELIVERED/CANCELLED) allow no further transitions", () => {
    expect(isTransitionAllowed(OrderStatus.DELIVERED, OrderStatus.ON_THE_WAY, "ADMIN")).toBe(false);
    expect(isTransitionAllowed(OrderStatus.CANCELLED, OrderStatus.PENDING, "ADMIN")).toBe(false);
  });
});
