import { tester } from "../shared/rule-tester.ts";
import { brandedIdsRule } from "./branded-ids.ts";

const error = { messageId: "unbranded" };

tester.run("effect-style/branded-ids", brandedIdsRule, {
  valid: [
    'import { Schema } from "effect"; class Payment extends Schema.Class<Payment>("Payment")({ customerId: CustomerId, confidence: Schema.Number }) {}',
    'import { Schema } from "effect"; const Row = Schema.Struct({ name: Schema.String, sourceId: WarehouseId });',
    'import { Schema } from "effect"; const CustomerId = Schema.String.pipe(Schema.brand("CustomerId"));',
    "const config = { customerId: Schema.String };",
    'import { Schema } from "effect"; const Row = Schema.Struct({ valid: Schema.Boolean, paid: Schema.String });',
  ],
  invalid: [
    {
      code: 'import { Schema } from "effect"; class Payment extends Schema.Class<Payment>("Payment")({ customerId: Schema.String }) {}',
      errors: [error],
    },
    {
      code: 'import { Schema } from "effect"; const Row = Schema.Struct({ id: Schema.UUID, sourceId: Schema.Number });',
      errors: [error, error],
    },
    {
      code: 'import { Schema } from "effect"; class CustomerNotVerifiedError extends Schema.TaggedError<CustomerNotVerifiedError>()("CustomerNotVerifiedError", { customerId: Schema.String }) {}',
      errors: [error],
    },
    {
      code: 'import { Schema } from "effect"; const Row = Schema.Struct({ segmentId: Schema.optional(Schema.String) });',
      errors: [error],
    },
    {
      code: 'import { Schema } from "effect"; const Row = Schema.Struct({ ref: Schema.String });',
      options: [{ keyPattern: "^ref$" }],
      errors: [error],
    },
  ],
});
