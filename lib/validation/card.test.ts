import { describe, expect, it } from "vitest";
import { normalizeCardNumber, isLuhnValid } from "./card"; // adjust import

describe("card validation", () => {
  it("normalizes spaces and hyphens", () => {
    expect(normalizeCardNumber("4242 4242-4242 4242")).toBe("4242424242424242");
  });

  it("accepts valid Luhn numbers", () => {
    expect(isLuhnValid("4242424242424242")).toBe(true);
    expect(isLuhnValid("5555555555554444")).toBe(true);
    expect(isLuhnValid("378282246310005")).toBe(true);
  });

  it("rejects invalid Luhn numbers", () => {
    expect(isLuhnValid("4242424242424241")).toBe(false);
    expect(isLuhnValid("1234567812345678")).toBe(false);
  });
  
  it("rejects non-numeric characters", () => {
    expect(isLuhnValid("4242-4242-4242-4242a")).toBe(false);
    expect(isLuhnValid("4242 4242 4242 424!")).toBe(false);
  });
});
