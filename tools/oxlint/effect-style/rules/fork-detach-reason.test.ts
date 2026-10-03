import { tester } from "../shared/rule-tester.ts";
import { forkDetachReasonRule } from "./fork-detach-reason.ts";

const error = { messageId: "missingReason" };

tester.run("effect-style/fork-detach-reason", forkDetachReasonRule, {
  valid: [
    'import { Effect } from "effect";\n// DETACH: webhook delivery must survive the request that triggered it\nnotifyWebhook(event).pipe(Effect.forkDetach);',
    'import { Effect } from "effect"; function f() {\n  // DETACH: outlives the handler by design\n  return Effect.forkDetach(task);\n}',
    'import { Effect } from "effect"; task.pipe(Effect.forkScoped);',
    {
      code: 'import { Effect } from "effect";\n/* WHY: long-lived */\ntask.pipe(Effect.forkDetach);',
      options: [{ marker: "WHY:" }],
    },
  ],
  invalid: [
    {
      code: 'import { Effect } from "effect"; notifyWebhook(event).pipe(Effect.forkDetach);',
      errors: [error],
    },
    {
      code: 'import { Effect } from "effect";\n// fire and forget\nEffect.forkDaemon(task);',
      errors: [error],
    },
  ],
});
