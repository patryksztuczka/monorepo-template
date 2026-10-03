# One Effect Schema as the universal validator

Domain input schemas live in `@example/shared` as Effect Schema wrapped with `Schema.toStandardSchemaV1`. The wrapper returns the schema itself with the Standard Schema interface attached, so the exact same object serves as the `HttpApi` endpoint payload on the server and the react-hook-form resolver on the client. We deliberately did not add Zod or Valibot: Effect Schema is already in the stack, and Standard Schema makes one definition validate both sides.
