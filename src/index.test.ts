import { describe, it, expect } from "vitest";
import { helloWorld } from "./index";

describe("helloWorld", () => {
  it('should return "hello world"', () => {
    expect(helloWorld()).toBe("hello world");
  });
});
