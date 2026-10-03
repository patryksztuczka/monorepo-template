# 06 · Schema

Schema turns untrusted input into trusted data, and it lets two apps agree on a shape without copy-pasting types. Import it from `effect`: `import { Schema } from "effect"`. `@effect/schema` is gone.

## Rules

### r2.models.style: domain records are `Schema.Class`

An instance cannot exist unvalidated, because `new` validates and throws on bad input. Updates go through `new` so they are re-validated.

```ts
export class Payment extends Schema.Class<Payment>("Payment")({
  customerId: CustomerId,
  orderId: OrderId,
  paidAt: Schema.DateTimeUtc,
  amount: Schema.Number,
}) {}

const p = new Payment({ customerId, orderId, paidAt, amount: 49.9 }); // validates
const maybe = Payment.makeOption(input); // Option<Payment>
const refunded = new Payment({ ...p, amount: 0 }); // re-validated

export class CardPayment extends Payment.extend<CardPayment>("CardPayment")({
  cardId: CardId,
}) {}
```

Use `Schema.Struct` for shapes that are not domain records, such as wire messages in `packages/shared`, DB rows and config groups.

### schema.ids: every identifier is branded

```ts
export const CustomerId = Schema.String.pipe(Schema.brand("CustomerId"));
export type CustomerId = typeof CustomerId.Type;

ledger.forCustomer(product.id); // compile error: ProductId is not a CustomerId
```

### schema.decode: decode at the boundary, trust types inside

Input from outside the process (HTTP bodies, queue messages, DB rows, files) is decoded with `Schema.decodeUnknownEffect` at the boundary. The resulting `SchemaError` is a typed failure. Internal code trusts types and never re-validates.

```ts
// good
const checkout = yield * Schema.decodeUnknownEffect(CheckoutRequest)(body);
const parsed = yield * Schema.decodeUnknownEffect(Schema.fromJsonString(CheckoutRequest))(raw);

// bad: lies to the compiler; a bad request fails far from the cause
const checkout = JSON.parse(body) as CheckoutRequest;
const checkout = body as unknown as CheckoutRequest;

// bad: throws, so the failure becomes a defect
const checkout = Schema.decodeUnknownSync(CheckoutRequest)(body);
```

No type assertions (`as X`, `as unknown as X`) to get around typing, ever.

### schema.sharing: `packages/shared`

Any schema that crosses an app boundary is defined once in `packages/shared` and imported by every app. Encode and decode it with the same schema on both sides.

## v4 names

| v3                    | v4                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------ |
| `decodeUnknown`       | `decodeUnknownEffect`                                                                |
| `decodeUnknownEither` | `decodeUnknownExit`                                                                  |
| `Schema.transform`    | `from.pipe(Schema.decodeTo(to, SchemaTransformation.transform({ decode, encode })))` |
| `parseJson`           | `Schema.fromJsonString`                                                              |
| `Union(A, B)`         | `Union([A, B])`                                                                      |

Sources: [SCHEMA.md](https://github.com/Effect-TS/effect/blob/main/packages/effect/SCHEMA.md), [schema.md](https://github.com/Effect-TS/effect/blob/main/migration/schema.md)
