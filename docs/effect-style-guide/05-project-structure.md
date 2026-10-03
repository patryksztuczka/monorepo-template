# 05 · Project structure

Each module is a folder under `apps/<app>/src/modules/`. The layout should show the modules at a glance, and keep each module's schemas and errors next to it.

## Rules

### r2.structure.modules: module folders under `modules/`

File names are kebab-case. Each module owns these files:

- `<module>.ts`: schemas and branded ids
- `<module>-errors.ts`: its `*Error` classes
- one `<module>-<role>.ts` file per service, such as `order-pricer.ts`
- pure-function files, also in kebab-case
- tests in the module's `tests/` folder: `*-unit.test.ts`, and `*-integration.test.ts` for tests that need a database
- `index.ts`: the module's public surface

```
apps/api/src/
  layers.ts                              # AppLayer: composes the modules' layers
  modules/
    order/                               # module
      index.ts
      order.ts                           # schemas + branded ids
      order-errors.ts                    # *Error classes
      order-pricer.ts                    # service
      order-pricing.ts                   # pure functions
      tests/
        order-unit.test.ts
        order-pricing-unit.test.ts       # property tests
    product/
      index.ts
      product.ts
      product-errors.ts
      product-catalog.ts
      tests/
        product-integration.test.ts
```

Avoid organising by technical kind (`services/`, `layers/`, `errors/`): the module boundaries disappear. Avoid fixed file names (`errors.ts`, `schema.ts`) too, because editor tabs become unreadable.

### r2.structure.imports: three levels of visibility

```ts
// inside order/: import sibling files directly
import { bestOffer } from "./order-pricing.ts";

// another module: only through its index
import { ProductCatalog } from "../product/index.ts";

// another workspace package: only through its package name
import { Database } from "@example/database";

// bad: a deep import across a module boundary
import { ProductCatalog } from "../product/product-catalog.ts";

// test code only: another module's test helpers, through its testing index
import { CatalogStub } from "../product/testing/index.ts";
```

No lint rule checks these imports; review does.

Test helpers never go in a module's `index.ts`. Production code loads that index, so anything it exports runs when the service starts, including a helper that reads a fixture file the build does not ship. A module that shares test helpers gives them their own `testing/index.ts`.

### r2.structure.ids: the service id mirrors the path

The id is `@example/<directory below apps/<app>/src>/<ServiceClass>`, so it matches where the service lives.

```ts
// file: apps/api/src/modules/order/order-pricer.ts
Context.Service<OrderPricer, {/* ... */}>()("@example/modules/order/OrderPricer");
```

### schema.sharing: shared contracts live in `packages/shared`

Schemas that cross an app boundary live in `packages/shared`, and apps never redefine them. Apps also never import each other's `src/`.

Source for the id convention: [LLMS.md](https://github.com/Effect-TS/effect/blob/main/LLMS.md). The rest is our own convention.
