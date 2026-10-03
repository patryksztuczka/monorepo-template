# 03 · Retry and scheduling

Retrying, backing off, timing out and running on a schedule are solved problems in Effect. A `Schedule` is a value, so TestClock can drive it.

## Rules

### retry.policies and retry.which: retry inline, and only transient errors

Retries are declared at the call site with `Effect.retry({ schedule, times, while })`. Only failures explicitly listed as transient are retried, so every retry has a `while`.

```ts
// good
const offers =
  yield *
  catalog.offersFor(line).pipe(
    Effect.retry({
      schedule: Schedule.exponential("100 millis"),
      times: 3,
      while: Predicate.isTagged("InventoryUnavailableError"),
    }),
  );

// bad: retries ProductNotFoundError and validation errors too
effect.pipe(Effect.retry({ times: 5 }));

// bad: not interruptible, invisible to TestClock, swallows error types
for (let i = 0; i < 3; i++) {
  try {
    return await findProduct(id);
  } catch {
    await new Promise((r) => setTimeout(r, 200 * 2 ** i));
  }
}
```

Use `Predicate.isTagged("…")` for the `while` predicate, not a hand-written `e._tag === "…"` comparison (the `anti-slop-effect/no-manual-tag-comparison` rule enforces this).

`Effect.retry` always runs the effect once first, so `times: 3` means up to three retries. Defects and interruptions are never retried.

v4 renamed several `Schedule` combinators: `union` → `Schedule.min([…])`, `intersect` → `Schedule.max([…])`, `andThen` → `concat`, `whileInput` → `while`.

### Timeouts

External calls get a timeout. It adds `Cause.TimeoutError` to E.

```ts
yield * catalog.offersFor(line).pipe(Effect.timeout("5 seconds"));
```

## Scheduled jobs

### r2.jobs.criterion: in-process schedule or Cloud Scheduler

There is no rule. Both are allowed, and the choice is a judgment call per job. Keep in mind that an in-process schedule runs in **every replica**.

In-process recurring work is a layer:

```ts
export const CacheRefresh = Layer.effectDiscard(
  refreshCatalogCache.pipe(Effect.repeat(Schedule.spaced("5 minutes")), Effect.forkScoped),
);
```

### r2.jobs.trigger: Cloud Scheduler triggers Cloud Run Jobs

Each job is its own entry point, `jobs/<name>.ts`. Cloud Scheduler calls the Run Admin API `…/jobs/<name>:run` with an OAuth token.

```
Cloud Scheduler  "0 3 * * *" Europe/Warsaw
   |  POST https://run.googleapis.com/v2/projects/P/locations/R/jobs/compact-ledger:run
   v
Cloud Run Job "compact-ledger"  -> node dist/jobs/compact-ledger.js
   |  task failed?  -> retried up to max-retries (default 3)
   v
LedgerCompaction.run(yesterday)  -> already completed?  -> skip
```

### r3.jobs.shape: a job is `run(period)`; the entry point picks the period

A Cloud Run Job receives no HTTP request, so it cannot read the scheduler's timestamp header. The entry point computes the period it is responsible for from the Clock, then calls the service.

```ts
// apps/api/src/jobs/compact-ledger.ts
const program = Effect.gen(function* () {
  const job = yield* LedgerCompaction;
  const now = yield* DateTime.now;
  const yesterday = DateTime.subtract(DateTime.startOf(now, "day"), { days: 1 });
  yield* job.run(yesterday);
});

program.pipe(Effect.provide(JobLayer), NodeRuntime.runMain);
```

### r3.jobs.idempotency: every job claims `<job>/<period>` before working

Cloud Scheduler delivers at least once, and Cloud Run retries failed tasks. A job must therefore be safe to run twice for the same period.

```sql
CREATE TABLE job_runs (
  key         text PRIMARY KEY,        -- "ledger-compaction/2026-09-28"
  status      text NOT NULL,           -- running | completed
  started_at  timestamptz NOT NULL,
  finished_at timestamptz
);
```

```ts
const run = Effect.fn("LedgerCompaction.run")(function* (day: DateTime.Utc) {
  const key = "ledger-compaction/" + DateTime.formatIsoDate(day);
  const claim = yield* jobRuns.claim(key); // INSERT … ON CONFLICT DO NOTHING RETURNING
  if (claim === "completed") return CompactionReport.skipped(key);
  if (claim === "running") return yield* new LedgerCompactionInProgressError({ key });
  const report = yield* ledger.compact(day);
  yield* jobRuns.complete(key);
  return report;
});
```

A crashed run leaves its row in `running`, so the claim needs a staleness timeout.

Sources: [v3-to-v4.md](https://github.com/Effect-TS/effect/blob/main/migration/v3-to-v4.md), [Cloud Scheduler retries](https://docs.cloud.google.com/scheduler/docs/configuring/retry-jobs), [Cloud Run jobs on a schedule](https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule), [Cloud Run job retries](https://docs.cloud.google.com/run/docs/jobs-retries)
