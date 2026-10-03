import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode } from "@oxlint/plugins";

import { enclosingFunction, enclosingStatement } from "../shared/ast.ts";
import { isEffectGenerator } from "../shared/effect-generators.ts";
import { effectMember, isEffectBinding } from "../shared/effect-imports.ts";
import { ruleOptions } from "../shared/options.ts";
import { matchesAny, relativeFilename } from "../shared/paths.ts";

const defaultOptions = { marker: "THROW:", tests: ["**/*.test.ts"] };
const throwingGetters = new Set(["getOrThrow", "getOrThrowWith"]);
const throwingGetterModules = new Set(["Result", "Option"]);

const transparentWrappers = new Set([
  "ParenthesizedExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
]);

/** The node a value is used as, past parentheses and type assertions. */
const outermost = (node: ESTree.Node): ESTree.Node => {
  let current = node;
  while (current.parent !== null && current.parent !== undefined) {
    if (!transparentWrappers.has(current.parent.type)) break;
    current = current.parent;
  }
  return current;
};

type Call = ESTree.CallExpression | ESTree.NewExpression;

const callTakingArgument = (node: ESTree.Node): Call | undefined => {
  const parent = node.parent;
  if (parent?.type !== "CallExpression" && parent?.type !== "NewExpression") return undefined;
  return parent.arguments.some((argument) => argument === node) ? parent : undefined;
};

/**
 * The call a function is handed to: as an argument (`f(() => …)`), or as a method or
 * property of an object literal argument, at any depth (`new Transform({ transform() { … } })`,
 * `betterAuth({ databaseHooks: { session: { create: { before() { … } } } } })`).
 */
const receivingCall = (fn: ESTree.Node): Call | undefined => {
  let value = outermost(fn);
  for (;;) {
    const call = callTakingArgument(value);
    if (call !== undefined) return call;
    const property = value.parent;
    if (property?.type !== "Property" || property.value !== value) return undefined;
    const object = property.parent;
    if (object?.type !== "ObjectExpression") return undefined;
    value = outermost(object);
  }
};

/** Whether a callee is Effect API: `Module.member`, an imported function, or a curried `Module.member(…)`. */
const isEffectCallee = (sourceCode: SourceCode, callee: Call["callee"]): boolean => {
  if (callee.type === "Identifier") return isEffectBinding(sourceCode, callee);
  if (callee.type === "MemberExpression") {
    return callee.object.type === "Identifier" && isEffectBinding(sourceCode, callee.object);
  }
  if (callee.type === "CallExpression") return isEffectCallee(sourceCode, callee.callee);
  return false;
};

/** The callee as written, shortened to its last member when it spans lines or runs long. */
const calleeText = (sourceCode: SourceCode, callee: ESTree.Node): string => {
  const text = sourceCode.getText(callee);
  if (text.length <= 48 && !text.includes("\n")) return text;
  if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
    return `….${callee.property.name}`;
  }
  return "…";
};

const calleeLabel = (sourceCode: SourceCode, call: Call): string => {
  const text = calleeText(sourceCode, call.callee);
  return call.type === "NewExpression" ? `new ${text}` : text;
};

/** Whether a comment directly above the throw (or its statement) gives a reason after the marker. */
const hasReason = (sourceCode: SourceCode, node: ESTree.Node, marker: string): boolean => {
  const comments = [
    ...sourceCode.getCommentsBefore(node),
    ...sourceCode.getCommentsBefore(enclosingStatement(node)),
  ];
  return comments.some((comment) => {
    const at = comment.value.indexOf(marker);
    return at !== -1 && comment.value.slice(at + marker.length).trim() !== "";
  });
};

/**
 * Failures are values: only a library protocol that demands a throw may throw, with a reason.
 * `Result`/`Option` `getOrThrow` is a throw too, except in tests.
 */
export const noThrowRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `throw` outside library callbacks that need it, and require a reason there; disallow `Result`/`Option` `getOrThrow` outside tests.",
    },
    messages: {
      plainFunction:
        "Do not throw: callers cannot see the failure in the type. Return a `Result` (`Result.fail(new SomethingError(…))`) or fail an Effect with a tagged error (see docs/effect-style-guide/02-typed-errors.md).",
      effectThunk:
        "Do not throw inside a function passed to `{{callee}}`: write it as Effect code, failing with `return yield* new SomethingError(…)`, or `Effect.die` for a broken invariant (see docs/effect-style-guide/02-typed-errors.md).",
      libraryCallback:
        "This throw leaves a callback handed to `{{callee}}`. If that library's protocol needs a throw, say why in a `// {{marker}} …` comment directly above it; otherwise restructure so nothing throws (see docs/effect-style-guide/02-typed-errors.md).",
      hiddenThrow:
        "`{{getter}}` throws instead of returning the failure, so callers cannot see it in the type. In Effect code use `Effect.fromResult` / `Effect.fromOption`; in pure code use `Result.match` / `Option.match` or `getOrElse` (see docs/effect-style-guide/02-typed-errors.md).",
    },
    schema: [
      {
        type: "object",
        properties: {
          marker: { type: "string" },
          tests: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [defaultOptions],
  },
  createOnce(context) {
    return {
      ThrowStatement(node) {
        const sourceCode = context.sourceCode;
        const fn = enclosingFunction(node);
        if (fn === undefined) {
          context.report({ node, messageId: "plainFunction" });
          return;
        }
        // Left to no-throw-in-effect.
        if (isEffectGenerator(sourceCode, fn)) return;
        const call = receivingCall(fn);
        if (call === undefined) {
          context.report({ node, messageId: "plainFunction" });
          return;
        }
        const callee = calleeLabel(sourceCode, call);
        if (isEffectCallee(sourceCode, call.callee)) {
          context.report({ node, messageId: "effectThunk", data: { callee } });
          return;
        }
        const { marker } = ruleOptions(context, defaultOptions);
        if (hasReason(sourceCode, node, marker)) return;
        context.report({ node, messageId: "libraryCallback", data: { callee, marker } });
      },
      // Covers calls and references alike: `Result.getOrThrow(x)`, `x.pipe(Result.getOrThrow)`.
      MemberExpression(node) {
        const member = effectMember(context.sourceCode, node);
        if (member === undefined) return;
        if (!throwingGetterModules.has(member.module) || !throwingGetters.has(member.member)) {
          return;
        }
        // Tests may assert with them: a missing value fails the test.
        const { tests } = ruleOptions(context, defaultOptions);
        if (matchesAny(relativeFilename(context), tests)) return;
        const getter = `${member.module}.${member.member}`;
        context.report({ node, messageId: "hiddenThrow", data: { getter } });
      },
    };
  },
});
