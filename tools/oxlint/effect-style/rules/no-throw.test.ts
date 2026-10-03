import { tester } from "../shared/rule-tester.ts";
import { noThrowRule } from "./no-throw.ts";

const plain = { messageId: "plainFunction" };
const effectThunk = { messageId: "effectThunk" };
const libraryCallback = { messageId: "libraryCallback" };
const hiddenThrow = (getter: string) => ({ messageId: "hiddenThrow", data: { getter } });
const source = "apps/api/src/http/cursor.ts";
const test = "apps/api/src/http/cursor.test.ts";

const streamHandler = (comment: string): string =>
  `import { Transform } from "node:stream";
new Transform({
  transform(chunk, _encoding, done) {
    ${comment}
    throw new FrameTooLargeError({ size: chunk.length });
  },
});`;

const transactionCallback = (comment: string): string =>
  `const settle = () => db.transaction(async (tx) => {
  const rows = await tx.select().from(claims);
  ${comment}
  if (rows.length === 0) throw new ClaimLost();
});`;

tester.run("effect-style/no-throw", noThrowRule, {
  valid: [
    streamHandler("// THROW: the stream protocol turns a throw into an 'error' event"),
    transactionCallback("// THROW: drizzle rolls back only when the callback throws"),
    `db.transaction(async (tx) => {
  if (lost) {
    /* THROW: drizzle rolls back only when the callback throws */
    throw new ClaimLost();
  }
});`,
    'betterAuth({\n  databaseHooks: {\n    session: {\n      create: {\n        before: async (session) => {\n          // THROW: Better Auth refuses the session only when the hook throws an APIError\n          throw new APIError("FORBIDDEN");\n        },\n      },\n    },\n  },\n});',
    'import { Effect } from "effect"; Effect.gen(function* () { if (!customer) throw new Error("unknown"); });',
    'import { Effect } from "effect"; const verify = Effect.fn("CustomerVerification.verify")(function* (id) { throw new Error(id); });',
    'import { Result } from "effect"; const parseLimit = (raw) => raw === "" ? Result.fail(new InvalidLimitError({ raw })) : Result.succeed(Number(raw));',
    'import { Effect } from "effect"; Effect.gen(function* () { return yield* new CustomerNotVerifiedError({}); });',
    {
      code: 'pool.on("error", (cause) => {\n  // ROLLBACK: the driver expects the listener to throw\n  throw cause;\n});',
      options: [{ marker: "ROLLBACK:" }],
    },
    'const Effect = { try: (options) => options };\nEffect.try({\n  try: () => {\n    // THROW: not Effect, a local object\n    throw new Error("x");\n  },\n});',
    {
      code: 'import { Result } from "effect"; assert.deepStrictEqual(Result.getOrThrow(names), ["a"]);',
      filename: test,
    },
    {
      code: 'import { Option } from "effect"; const id = Option.getOrThrowWith(found, () => new Error("none"));',
      filename: test,
    },
    {
      code: 'import { Result } from "effect"; const cursor = decodeCursor(raw).pipe(Result.getOrThrow);',
      filename: "apps/api/src/modules/orders/checkout/testing/checkout-fixtures.ts",
      options: [{ tests: ["**/*.test.ts", "**/testing/**"] }],
    },
    {
      code: "const Result = { getOrThrow: (result) => result.value };\nconst cursor = Result.getOrThrow(decodeCursor(raw));",
      filename: source,
    },
    {
      code: 'import { Result } from "effect"; const read = (Result) => Result.getOrThrow(decodeCursor(raw));',
      filename: source,
    },
    {
      code: 'import { Result } from "./result.ts"; const cursor = Result.getOrThrow(decodeCursor(raw));',
      filename: source,
    },
    {
      code: 'import { Effect, Option, Result } from "effect";\nEffect.gen(function* () {\n  const cursor = yield* Effect.fromResult(decodeCursor(raw));\n  const id = Option.getOrElse(found, () => "none");\n  return Result.match(parsed, { onFailure: () => 0, onSuccess: (n) => n });\n});',
      filename: source,
    },
  ],
  invalid: [
    { code: 'function parseCursor(raw) { throw new Error("bad cursor"); }', errors: [plain] },
    {
      code: 'const parseLimit = (raw) => { if (raw === "") throw new InvalidLimitError({ raw }); return Number(raw); };',
      errors: [plain],
    },
    {
      code: "const parseLimit = (raw) => {\n  // THROW: a reason does not excuse a plain function\n  throw new InvalidLimitError({ raw });\n};",
      errors: [plain],
    },
    { code: 'throw new Error("module level");', errors: [plain] },
    {
      code: 'class FrameReader { next() { throw new Error("truncated"); } }',
      errors: [plain],
    },
    {
      code: 'const handlers = { parse() { throw new Error("x"); } };',
      errors: [plain],
    },
    {
      code: 'import { Effect } from "effect"; Effect.gen(function* () { const check = () => { throw new Error("x"); }; });',
      errors: [plain],
    },
    {
      code: 'import { Effect } from "effect";\nEffect.try({\n  try: () => {\n    // THROW: a reason does not excuse an Effect thunk\n    throw new MalformedHeaderError({});\n  },\n  catch: (cause) => new MalformedHeaderError({ cause }),\n});',
      errors: [{ ...effectThunk, data: { callee: "Effect.try" } }],
    },
    {
      code: 'import { Effect } from "effect"; Effect.sync(() => { throw new Error("x"); });',
      errors: [effectThunk],
    },
    {
      code: 'import { Effect as E } from "effect"; E.tryPromise({ try: async () => { throw new Error("x"); }, catch: () => new UnavailableError({}) });',
      errors: [effectThunk],
    },
    {
      code: 'import * as Stream from "effect/Stream"; Stream.map((chunk) => { throw new Error("x"); });',
      errors: [effectThunk],
    },
    {
      code: streamHandler("// the stream protocol needs this"),
      errors: [{ ...libraryCallback, data: { callee: "new Transform", marker: "THROW:" } }],
    },
    {
      code: transactionCallback(""),
      errors: [{ ...libraryCallback, data: { callee: "db.transaction", marker: "THROW:" } }],
    },
    { code: transactionCallback("// THROW:"), errors: [libraryCallback] },
    {
      code: 'betterAuth({ databaseHooks: { session: { create: { before: async () => { throw new APIError("FORBIDDEN"); } } } } });',
      errors: [{ ...libraryCallback, data: { callee: "betterAuth", marker: "THROW:" } }],
    },
    {
      code: "db.transaction(async (tx) => {\n  // THROW: a comment above another statement does not count\n  const rows = await tx.select().from(claims);\n  if (rows.length === 0) throw new ClaimLost();\n});",
      errors: [libraryCallback],
    },
    {
      code: 'import { Result } from "effect"; const cursor = Result.getOrThrow(decodeCursor(raw));',
      filename: source,
      errors: [hiddenThrow("Result.getOrThrow")],
    },
    {
      code: 'import { Result } from "effect"; const cursor = decodeCursor(raw).pipe(Result.getOrThrow);',
      filename: source,
      errors: [hiddenThrow("Result.getOrThrow")],
    },
    {
      code: 'import { Result } from "effect"; const cursor = Result.getOrThrowWith(decodeCursor(raw), (issue) => new Error(String(issue)));',
      filename: source,
      errors: [hiddenThrow("Result.getOrThrowWith")],
    },
    {
      code: 'import { Option } from "effect"; const projectId = Option.getOrThrowWith(Option.fromNullishOr(raw), () => new Error("missing"));',
      filename: source,
      errors: [hiddenThrow("Option.getOrThrowWith")],
    },
    {
      code: 'import { Option as O } from "effect"; const ids = rows.map((row) => row.id).map(O.getOrThrow);',
      filename: source,
      errors: [hiddenThrow("Option.getOrThrow")],
    },
    {
      code: 'import * as Result from "effect/Result"; const pkg = Result.getOrThrow(decode(body));',
      filename: source,
      errors: [hiddenThrow("Result.getOrThrow")],
    },
    {
      code: 'import { Effect, Result } from "effect"; Effect.gen(function* () { const cursor = Result.getOrThrow(decodeCursor(raw)); });',
      filename: source,
      errors: [hiddenThrow("Result.getOrThrow")],
    },
    {
      code: 'import { Result } from "effect"; assert.deepStrictEqual(Result.getOrThrow(names), ["a"]);',
      filename: test,
      options: [{ tests: ["**/*.spec.ts"] }],
      errors: [hiddenThrow("Result.getOrThrow")],
    },
  ],
});
