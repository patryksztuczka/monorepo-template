import { tester } from "../shared/rule-tester.ts";
import { taggedErrorNamingRule } from "./tagged-error-naming.ts";

const schemaError = (name: string, tag: string): string =>
  `import { Schema } from "effect"; export class ${name} extends Schema.TaggedError<${name}>()("${tag}", { id: Schema.String }) {}`;

tester.run("effect-style/tagged-error-naming", taggedErrorNamingRule, {
  valid: [
    {
      code: schemaError("OrderNotFoundError", "OrderNotFoundError"),
      filename: "orders/order-errors.ts",
    },
    {
      code: 'import { Data } from "effect"; class WindowTooShortError extends Data.TaggedError("WindowTooShortError")<{ n: number }> {}',
      filename: "orders/order-errors.ts",
    },
    { code: "class Plain extends Base {}", filename: "orders/order-pricer.ts" },
    {
      code: schemaError("OrderNotFoundError", "OrderNotFoundError"),
      filename: "orders/order.errors.ts",
      options: [{ filePattern: "\\.errors\\.ts$" }],
    },
    {
      code: schemaError("OrderNotFoundError", "OrderNotFoundError"),
      filename: "orders/anywhere.ts",
      options: [{ filePattern: "" }],
    },
  ],
  invalid: [
    {
      code: schemaError("OrderNotFound", "OrderNotFound"),
      filename: "orders/order-errors.ts",
      errors: [{ messageId: "suffix" }],
    },
    {
      code: schemaError("OrderNotFoundError", "NotFound"),
      filename: "orders/order-errors.ts",
      errors: [{ messageId: "tag" }],
    },
    {
      code: schemaError("OrderNotFoundError", "OrderNotFoundError"),
      filename: "orders/order-pricer.ts",
      errors: [{ messageId: "location" }],
    },
    {
      code: 'import { Data as D } from "effect"; class Oops extends D.TaggedError("Boom")<{}> {}',
      filename: "orders/order-errors.ts",
      errors: [{ messageId: "suffix" }, { messageId: "tag" }],
    },
  ],
});
