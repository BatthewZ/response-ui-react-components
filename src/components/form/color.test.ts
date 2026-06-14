import { describe, expect, it } from "vitest";

import {
  hexToHsv,
  hexToRgb,
  hsvToHex,
  hsvToRgb,
  normalizeHex,
  rgbToHex,
  rgbToHsv,
} from "./color";

describe("color conversions", () => {
  it("parses 3- and 6-digit hex, with or without #", () => {
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("000000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb("#3366CC")).toEqual({ r: 51, g: 102, b: 204 });
  });

  it("rejects malformed hex", () => {
    expect(hexToRgb("#12")).toBeNull();
    expect(hexToRgb("nope")).toBeNull();
    expect(hexToRgb("#1234")).toBeNull();
  });

  it("normalizes to canonical lowercase #rrggbb", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("FFFFFF")).toBe("#ffffff");
    // "xyz" has non-hex characters, unlike "bad" (b/a/d are valid hex digits).
    expect(normalizeHex("xyz")).toBeNull();
  });

  it("round-trips rgb <-> hex", () => {
    const hex = "#3366cc";
    expect(rgbToHex(hexToRgb(hex)!)).toBe(hex);
  });

  it("converts primary colors rgb -> hsv", () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 1, v: 1 });
    const green = rgbToHsv({ r: 0, g: 255, b: 0 });
    expect(green.h).toBe(120);
    const blue = rgbToHsv({ r: 0, g: 0, b: 255 });
    expect(blue.h).toBe(240);
  });

  it("treats greys as zero-saturation", () => {
    const grey = rgbToHsv({ r: 128, g: 128, b: 128 });
    expect(grey.s).toBe(0);
    expect(grey.h).toBe(0);
  });

  it("round-trips hsv <-> hex across the hue wheel", () => {
    for (const hex of ["#ff0000", "#00ff00", "#0000ff", "#3366cc", "#7f3fbf", "#123456"]) {
      const hsv = hexToHsv(hex)!;
      expect(hsvToHex(hsv)).toBe(hex);
    }
  });

  it("clamps and wraps out-of-range hsv inputs", () => {
    // Hue wraps; 360 === 0.
    expect(hsvToHex({ h: 360, s: 1, v: 1 })).toBe("#ff0000");
    // Negative hue wraps too.
    expect(hsvToRgb({ h: -360, s: 1, v: 1 })).toEqual({ r: 255, g: 0, b: 0 });
  });
});
