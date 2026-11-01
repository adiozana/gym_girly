import { describe, expect, it } from "vitest";
import { moveById, moveItem } from "./reorder";

describe("moveItem", () => {
  const list = ["a", "b", "c", "d"];

  it("moves an item down and up", () => {
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("does not mutate the input", () => {
    moveItem(list, 0, 3);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });

  it("clamps the target and ignores an invalid source", () => {
    expect(moveItem(list, 0, 10)).toEqual(["b", "c", "d", "a"]);
    expect(moveItem(list, 1, -5)).toEqual(["b", "a", "c", "d"]);
    expect(moveItem(list, 7, 0)).toEqual(list);
  });
});

describe("moveById", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("moves the dragged item to the position of the one it was dropped on", () => {
    expect(moveById(items, "a", "c").map((i) => i.id)).toEqual(["b", "c", "a"]);
    expect(moveById(items, "c", "a").map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("returns the same order for unknown ids", () => {
    expect(moveById(items, "x", "a").map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});
