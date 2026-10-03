# 07 · Configuration

Config is a typed, validated description of what an app needs from its environment. A missing or malformed value fails at startup with a `ConfigError`, not halfway through a request.

## Rules

### r2.config.params and r2.config.where: every configurable layer has a pair

- `layer(options)` takes plain values. Tests use it.
- `layerConfig` reads `Config.*` and calls `layer(options)`. Only composition roots use it.

There is no global config object.

```ts
// packages/database/src/database.ts
export const layer = (options: { url: Redacted.Redacted; maxConnections: number }) =>
  PgClient.layer(options);

export const layerConfig = PgClient.layerConfig({
  url: Config.redacted("DATABASE_URL"),
  maxConnections: Config.int("DATABASE_POOL").pipe(Config.withDefault(10)),
});
```

```ts
// modules/order/order-pricer.ts: application config follows the same pattern
static readonly layer = (options: { maxDiscount: number }) =>
  Layer.effect(this, make(options))

static readonly layerConfig = Layer.unwrap(Effect.gen(function*() {
  const maxDiscount = yield* Config.number("MAX_DISCOUNT")
  return OrderPricer.layer({ maxDiscount })
}))
```

```ts
// bad: NaN at runtime, and invisible to tests
const pool = Number(process.env.DATABASE_POOL ?? 10);

// bad: tests would have to know env key names, and a forgotten override falls back to real env
const TestConfig = ConfigProvider.layer(ConfigProvider.fromUnknown({ DATABASE_URL: "..." }));
```

### config.secrets: secrets are `Config.Redacted`

A redacted value shows as `<redacted>` in logs, spans and error reports. Unwrap it only at the client that needs the raw value.

```ts
const apiKey = yield * Config.redacted("PAYMENT_API_KEY");
const gateway = new PaymentGatewayClient({ apiKey: Redacted.value(apiKey) });

// bad
const apiKey = yield * Config.string("PAYMENT_API_KEY");
```

## v4 names

`4.0.0-rc.112` uses camelCase constructors: `Config.string`, `Config.int`, `Config.number`, `Config.port`, `Config.duration`, `Config.redacted`, `Config.url`, `Config.literals`, and keeps `Config.mapOrFail`. Later release candidates rename them to PascalCase (`Config.String`, `Config.Redacted`, …) and `Config.mapOrFail` to `Config.mapEffect`; rename them on upgrade. `ConfigProvider.fromJson` is now `fromUnknown`.

Sources: [v4 configuration docs](https://effect.website/docs/v4/configuration), [PgClient.ts](https://github.com/Effect-TS/effect/blob/main/packages/sql/pg/src/PgClient.ts)
