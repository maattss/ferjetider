import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only cleans up on its own when test globals are on; without
// this, earlier renders stay mounted and keep polling into later tests.
afterEach(() => {
  cleanup();
});
