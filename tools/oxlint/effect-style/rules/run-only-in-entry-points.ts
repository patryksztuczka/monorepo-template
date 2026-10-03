import { defineRule } from "@oxlint/plugins";

import { effectMember } from "../shared/effect-imports.ts";
import { ruleOptions } from "../shared/options.ts";
import { matchesAny, relativeFilename } from "../shared/paths.ts";

const runners = new Map<string, ReadonlySet<string>>([
  [
    "Effect",
    new Set(["runPromise", "runPromiseExit", "runSync", "runSyncExit", "runFork", "runCallback"]),
  ],
  ["NodeRuntime", new Set(["runMain"])],
  ["BunRuntime", new Set(["runMain"])],
  ["ManagedRuntime", new Set(["make"])],
]);
const defaultAllow = [
  "apps/*/src/index.ts",
  "apps/*/src/jobs/*.ts",
  "apps/*/src/runtime.ts",
  "**/vitest.global-setup.ts",
];
const defaultTests = ["**/*.test.ts", "**/*.test.tsx"];

/** Only entry points start a runtime; everything else is composed into one. */
export const runOnlyInEntryPointsRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Restrict starting Effect runtimes to configured entry points." },
    messages: {
      notEntry:
        "`{{call}}` starts a runtime. Only entry points may do that (see the rule's `allow` list); export an Effect or a Layer from here instead (see docs/effect-style-guide/10-runtimes-and-entry-points.md).",
      inTests:
        "`{{call}}` bypasses @effect/vitest. Use `it.effect` / `layer(…)` so the test gets TestClock and a scope (see docs/effect-style-guide/11-testing.md).",
    },
    schema: [
      {
        type: "object",
        properties: {
          allow: { type: "array", items: { type: "string" } },
          tests: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allow: defaultAllow, tests: defaultTests }],
  },
  createOnce(context) {
    return {
      MemberExpression(node) {
        const member = effectMember(context.sourceCode, node);
        if (member === undefined || runners.get(member.module)?.has(member.member) !== true) return;
        const options = ruleOptions(context, { allow: defaultAllow, tests: defaultTests });
        const relative = relativeFilename(context);
        if (matchesAny(relative, options.allow)) return;
        const call = `${member.module}.${member.member}`;
        const messageId = matchesAny(relative, options.tests) ? "inTests" : "notEntry";
        context.report({ node, messageId, data: { call } });
      },
    };
  },
});
