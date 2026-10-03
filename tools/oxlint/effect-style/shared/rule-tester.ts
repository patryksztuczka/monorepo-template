import { describe, it } from "node:test";

import { RuleTester } from "oxlint/plugins-dev";

RuleTester.describe = describe;
RuleTester.it = it;

/** A RuleTester that parses TypeScript and reports through `node:test`. */
export const tester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});
