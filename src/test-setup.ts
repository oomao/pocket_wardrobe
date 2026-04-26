// Vitest setup — runs before each test file. Polyfills browser APIs that
// happy-dom doesn't ship with so localforage and similar libs work.
import 'fake-indexeddb/auto';
