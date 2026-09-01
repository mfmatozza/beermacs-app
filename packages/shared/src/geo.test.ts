import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distanceKm, formatDistance } from "./geo";

const duomo = { latitude: 45.4642, longitude: 9.19 };
const navigli = { latitude: 45.4508, longitude: 9.1745 };

describe("distanceKm", () => {
  it("is zero for the same point", () => {
    assert.strictEqual(distanceKm(duomo, duomo), 0);
  });

  it("measures a known short hop across Milan", () => {
    // Duomo → Navigli is a shade under 2km on the ground.
    const d = distanceKm(duomo, navigli);
    assert.ok(d > 1.8 && d < 2.1, `expected ~1.9km, got ${d}`);
  });

  it("is symmetric", () => {
    assert.strictEqual(distanceKm(duomo, navigli), distanceKm(navigli, duomo));
  });
});

describe("formatDistance", () => {
  it("uses metres below a kilometre, rounded to the nearest ten", () => {
    assert.strictEqual(formatDistance(0.42), "420 m");
    assert.strictEqual(formatDistance(0.037), "40 m");
  });

  it("uses one decimal for walkable distances and none beyond ten km", () => {
    assert.strictEqual(formatDistance(1.94), "1.9 km");
    assert.strictEqual(formatDistance(23.4), "23 km");
  });
});
