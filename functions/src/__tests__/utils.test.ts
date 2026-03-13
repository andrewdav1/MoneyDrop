import { safeEqual, haversineMetres } from "../utils";

// ── safeEqual ────────────────────────────────────────────────────────────────

describe("safeEqual", () => {
  test("returns true for identical strings", () => {
    expect(safeEqual("abc123", "abc123")).toBe(true);
  });

  test("returns false for different strings of the same length", () => {
    expect(safeEqual("abc123", "abc124")).toBe(false);
  });

  test("returns false when lengths differ", () => {
    expect(safeEqual("short", "longer-string")).toBe(false);
  });

  test("returns false for empty vs non-empty", () => {
    expect(safeEqual("", "x")).toBe(false);
  });

  test("returns true for empty strings", () => {
    expect(safeEqual("", "")).toBe(true);
  });

  test("is case-sensitive", () => {
    expect(safeEqual("Secret", "secret")).toBe(false);
  });

  test("handles unicode correctly", () => {
    expect(safeEqual("qr-🔑-secret", "qr-🔑-secret")).toBe(true);
    expect(safeEqual("qr-🔑-secret", "qr-🗝️-secret")).toBe(false);
  });
});

// ── haversineMetres ───────────────────────────────────────────────────────────

describe("haversineMetres", () => {
  // Known reference: SF City Hall → Union Square ≈ 1.1 km
  const SF_CITY_HALL = { lat: 37.7793, lng: -122.4193 };
  const UNION_SQUARE  = { lat: 37.7879, lng: -122.4075 };

  test("returns 0 for identical coordinates", () => {
    expect(haversineMetres(37.7749, -122.4194, 37.7749, -122.4194)).toBe(0);
  });

  test("SF City Hall to Union Square is approximately 1.4 km", () => {
    const dist = haversineMetres(
      SF_CITY_HALL.lat, SF_CITY_HALL.lng,
      UNION_SQUARE.lat,  UNION_SQUARE.lng
    );
    // Allow ±10% tolerance around the ~1.41 km true distance
    expect(dist).toBeGreaterThan(1_270);
    expect(dist).toBeLessThan(1_550);
  });

  test("is symmetric — A→B equals B→A", () => {
    const ab = haversineMetres(
      SF_CITY_HALL.lat, SF_CITY_HALL.lng,
      UNION_SQUARE.lat, UNION_SQUARE.lng
    );
    const ba = haversineMetres(
      UNION_SQUARE.lat, UNION_SQUARE.lng,
      SF_CITY_HALL.lat, SF_CITY_HALL.lng
    );
    expect(Math.abs(ab - ba)).toBeLessThan(0.001);
  });

  test("1 degree of latitude ≈ 111 km", () => {
    const dist = haversineMetres(0, 0, 1, 0);
    expect(dist).toBeGreaterThan(110_000);
    expect(dist).toBeLessThan(112_000);
  });

  test("handles cross-hemisphere coordinates", () => {
    // London to Sydney — roughly 16,900 km
    const dist = haversineMetres(51.5074, -0.1278, -33.8688, 151.2093);
    expect(dist).toBeGreaterThan(16_500_000);
    expect(dist).toBeLessThan(17_200_000);
  });
});
