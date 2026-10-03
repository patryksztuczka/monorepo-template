# 02 · Typed errors

The E channel is how a function says what can go wrong. When every expected failure is a named, tagged value, the reason an order was refused is visible in the types, in logs and in traces.

## Rules

### errors.base: domain errors are `Schema.TaggedError`

Every domain error extends `Schema.TaggedError`. It is yieldable, it can be caught by tag, and it encodes over HTTP or RPC with the same schema. Nothing extends `Error` or another built-in error class, in tests either: a test uses a tagged error, or asserts on the failure itself.

```ts
import { Schema } from "effect";

export class CustomerNotVerifiedError extends Schema.TaggedError<CustomerNotVerifiedError>()(
  "CustomerNotVerifiedError",
  { customerId: CustomerId, reason: Schema.String },
) {}

// in an Effect.gen / Effect.fn body
return yield * new CustomerNotVerifiedError({ customerId, reason: "unknown customer" });
```

### errors.granularity: one class per failure, one union per module

```ts
// good: modules/product/product-errors.ts
export class ProductNotFoundError extends Schema.TaggedError<ProductNotFoundError>()(
  "ProductNotFoundError",
  { productId: ProductId },
) {}
export class InventoryUnavailableError extends Schema.TaggedError<InventoryUnavailableError>()(
  "InventoryUnavailableError",
  { warehouseId: WarehouseId },
) {}

export type ProductCatalogError = ProductNotFoundError | InventoryUnavailableError;

// bad: callers have to match on message strings
class AppError extends Data.TaggedError("AppError")<{ message: string }> {}
```

### errors.naming: the name ends in `Error` and equals the tag

```ts
// good
class OrderNotFoundError extends Schema.TaggedError<OrderNotFoundError>()("OrderNotFoundError", {
  /* ... */
}) {}

// bad: missing suffix, and the tag does not match the class name
class OrderNotFound extends Schema.TaggedError<OrderNotFound>()("NotFound", {/* ... */}) {}
```

### errors.defects: failures versus defects

- A **failure** is anything a caller could react to. It goes in E as a typed error.
- A **defect** is a broken invariant, meaning a bug. Use `Effect.orDie` or `Effect.die`. Defects are not retried and do not appear in the type.
- `Effect.try` and `Effect.tryPromise` always map the thrown value to one typed error in `catch`. The `catch` never checks whether the cause is already one of ours: that turns a bug in our own code into an expected failure. The `try` thunk only calls the foreign code; it does not throw itself.
- Never `throw` inside Effect code.

```ts
// expected: the caller can react
if (Option.isNone(customer))
  return yield * new CustomerNotVerifiedError({ customerId, reason: "unknown" });

// a throwing library: wrap it in a typed error
const rows =
  yield *
  Effect.tryPromise({
    try: () => client.query(sql),
    catch: () => new InventoryUnavailableError({ warehouseId }),
  });

// cannot happen unless we have a bug
const header = yield * parseHeader(bytes).pipe(Effect.orDie);

// bad: becomes an untyped defect that callers cannot catchTag
Effect.gen(function* () {
  if (!customer) throw new Error("unknown customer");
});
```

### errors.values: nothing throws

A plain function that can refuse returns a `Result`; it never throws. Effect code takes the refusal with `Effect.fromResult`.

`Result.getOrThrow` and `Option.getOrThrow` (and their `…With` forms) are a throw too: take the value with `Effect.fromResult` / `Effect.fromOption` in Effect code, or with `Result.match` / `Option.match` / `getOrElse` in pure code; only a test may use them, to assert on a value.

```ts
// good: the refusal is in the signature
export const parseLimit = (raw: string): Result.Result<number, InvalidLimitError> => {
  const limit = Number(raw);
  return Number.isInteger(limit) && limit > 0
    ? Result.succeed(limit)
    : Result.fail(new InvalidLimitError({ raw }));
};

Effect.gen(function* () {
  const limit = yield* Effect.fromResult(parseLimit(query.limit));
});

// bad: callers cannot see the refusal, and nothing makes them handle it
export const parseLimit = (raw: string): number => {
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1) throw new InvalidLimitError({ raw });
  return limit;
};
```

The one exception is a callback that a library calls and whose protocol needs a throw, such as drizzle's transaction callback, which rolls back only when it throws. Wrap that protocol once, in a helper, and put the reason in a `// THROW:` comment directly above the throw:

```ts
db.transaction(async (tx) => {
  // THROW: drizzle rolls the transaction back only when this callback throws
  throw rollback;
});
```

## Handling errors

```ts
effect.pipe(
  Effect.catchTag("ProductNotFoundError", () => Effect.succeed(Option.none())),
  Effect.catchTags({ InventoryUnavailableError: (e) => /* ... */ })
)
```

Recover by tag, never by class: no `instanceof …Error`. Outside `catchTag`, test a value with `Predicate.isTagged(cause, "ProductNotFoundError")` or `Schema.is(ProductNotFoundError)`. For a foreign value, `Predicate.isError` tells an `Error` from anything else.

v4 renamed `catchAll` to `Effect.catch`, `catchAllCause` to `catchCause` and `catchSome` to `catchFilter`. `Cause` is now flat: iterate `cause.reasons`.

Sources: [error-handling.md](https://github.com/Effect-TS/effect/blob/main/migration/error-handling.md), [cause.md](https://github.com/Effect-TS/effect/blob/main/migration/cause.md), [SCHEMA.md](https://github.com/Effect-TS/effect/blob/main/packages/effect/SCHEMA.md)
