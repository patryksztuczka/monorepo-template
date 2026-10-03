import { defineRule } from "@oxlint/plugins";

import { enclosingStatement } from "../shared/ast.ts";
import { effectMember } from "../shared/effect-imports.ts";
import { ruleOptions } from "../shared/options.ts";

// forkDaemon is the v3 name of forkDetach.
const detachingForks = new Set(["forkDetach", "forkDaemon"]);

/** A detached fiber outlives its scope; each one needs a written reason. */
export const forkDetachReasonRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require a reason comment before Effect.forkDetach." },
    messages: {
      missingReason:
        "`Effect.{{method}}` outlives its scope and is not interrupted on shutdown. Explain why in a `// {{marker}} …` comment above the statement, or use forkScoped / a FiberSet (see docs/effect-style-guide/09-concurrency-and-resources.md).",
    },
    schema: [
      {
        type: "object",
        properties: { marker: { type: "string" } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ marker: "DETACH:" }],
  },
  createOnce(context) {
    return {
      MemberExpression(node) {
        const member = effectMember(context.sourceCode, node);
        if (member?.module !== "Effect" || !detachingForks.has(member.member)) return;
        const { marker } = ruleOptions(context, { marker: "DETACH:" });
        const comments = context.sourceCode.getCommentsBefore(enclosingStatement(node));
        if (comments.some((comment) => comment.value.includes(marker))) return;
        context.report({
          node,
          messageId: "missingReason",
          data: { method: member.member, marker },
        });
      },
    };
  },
});
