import { test as base } from '@playwright/test';

// Application suites start after boot. boot.spec.ts uses the unmodified fixture
// to exercise the real opening sequence, audio permission and first visit.
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => { sessionStorage.setItem('pedroos.boot.seen.v1', '1'); });
    await use(context);
  },
});
export { expect } from '@playwright/test';
export type { Page, Locator, BrowserContext } from '@playwright/test';
