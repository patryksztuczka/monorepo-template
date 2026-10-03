import { defineConfig } from "vite-plus";
import oxfmtrc from "./.oxfmtrc.json" with { type: "json" };
import oxlintrc from "./.oxlintrc.json" with { type: "json" };

// .oxfmtrc.json and .oxlintrc.json are the single source of truth for
// formatting/linting (used by editors and the standalone oxfmt/oxlint CLIs).
// vp fmt / vp lint / vp check only read vite.config, so we pass them through.
const { $schema: _fmtSchema, ...fmt } = oxfmtrc;
const { $schema: _lintSchema, ...lint } = oxlintrc;

export default defineConfig({
  fmt,
  lint,
  test: {
    // alchemy/Test/Vitest registers its sidecar cleanup after a test file's
    // `afterAll(destroy(Stack))` and needs hooks to run in registration order.
    // Vitest's default ("stack") closes the sidecar first and `destroy` hangs.
    // Only settable here, not per project.
    sequence: { hooks: "list" },
    // .agent-sources holds read-only source mirrors for reference — never test them
    projects: [
      {
        test: {
          name: "unit",
          include: ["**/*.test.ts"],
          exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/.agent-sources/**",
            "**/*-integration.test.ts",
            // node:test suites for the lint plugin, run by `pnpm test:lint-rules`
            "tools/oxlint/**",
          ],
        },
      },
      {
        test: {
          name: "integration",
          include: ["**/*-integration.test.ts"],
          exclude: ["**/node_modules/**", "**/dist/**", "**/.agent-sources/**"],
          // Deploys the stack locally (workerd + D1), see apps/infra/tests
          testTimeout: 120_000,
        },
      },
    ],
  },
});
