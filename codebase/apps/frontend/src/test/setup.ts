import "fake-indexeddb/auto";
import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "node:util";

Object.assign(globalThis, {
  structuredClone:
    globalThis.structuredClone ??
    (<Value>(value: Value): Value => JSON.parse(JSON.stringify(value)) as Value),
  TextDecoder,
  TextEncoder,
});

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    addEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: jest.fn(),
  }),
});
