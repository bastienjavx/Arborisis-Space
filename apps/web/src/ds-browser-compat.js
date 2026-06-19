// Defines process.env for libraries bundled into a browser IIFE (Next.js,
// zod) that reference it at module-evaluation time.
if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {} };
}
export {};
