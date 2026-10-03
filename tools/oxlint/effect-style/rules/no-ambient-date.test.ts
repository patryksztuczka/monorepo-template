import { tester } from "../shared/rule-tester.ts";
import { noAmbientDateRule } from "./no-ambient-date.ts";

const error = { messageId: "ambientDate" };

tester.run("effect-style/no-ambient-date", noAmbientDateRule, {
  valid: [
    "const parsed = new Date(row.startedAt);",
    "const epoch = new Date(0);",
    "const utc = Date.UTC(2026, 0, 1);",
    "class Date {} const local = new Date();",
    "const Date = () => 1; Date();",
  ],
  invalid: [
    { code: "const startedAt = new Date();", errors: [error] },
    { code: "const label = Date();", errors: [error] },
    { code: "const startedAt = new Date;", errors: [error] },
  ],
});
