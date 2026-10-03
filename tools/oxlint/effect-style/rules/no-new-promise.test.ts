import { tester } from "../shared/rule-tester.ts";
import { noNewPromiseRule } from "./no-new-promise.ts";

const error = { messageId: "newPromise" };

tester.run("effect-style/no-new-promise", noNewPromiseRule, {
  valid: [
    "const ready = Promise.resolve(1);",
    'import { Promise } from "./local-promise"; const p = new Promise(1);',
    'import { Effect } from "effect"; const ready = Effect.callback((resume) => socket.once("ready", () => resume(Effect.void)));',
  ],
  invalid: [
    {
      code: 'const ready = new Promise((resolve) => socket.once("ready", resolve));',
      errors: [error],
    },
    { code: "await new Promise((r) => setTimeout(r, 200));", errors: [error] },
  ],
});
