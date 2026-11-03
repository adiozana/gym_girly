import { describe, expect, it } from "vitest";
import { detectPlatform } from "./platform";

describe("detectPlatform", () => {
  it("detects iPhones in Safari and in Chrome", () => {
    expect(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1")).toBe("ios");
    expect(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 CriOS/138.0 Mobile/15E148 Safari/604.1")).toBe("ios");
  });

  it("treats a touch Mac as an iPad", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.5 Safari/605.1.15";
    expect(detectPlatform(ua, 5)).toBe("ios");
    expect(detectPlatform(ua, 0)).toBe("other");
  });

  it("detects Android", () => {
    expect(detectPlatform("Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Chrome/138.0 Mobile Safari/537.36")).toBe("android");
  });

  it("falls back to other for desktops", () => {
    expect(detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0 Safari/537.36")).toBe("other");
  });
});
