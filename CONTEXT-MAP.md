# Context Map

## Contexts

- [Todo](./apps/api/src/modules/todo/CONTEXT.md): capturing and listing the things a user intends to get done

## Relationships

- **Todo → web**: `apps/web/src/modules/todo` is a client of the Todo context. It calls the api through a client derived from the shared `AppApi` contract (`@example/shared/api`) and holds no domain rules of its own.
- **Todo ↔ shared**: the context's `Todo` record, `TodoId` and input schemas live in `@example/shared/todo`, and its endpoints in `@example/shared/api`. Both sides use them verbatim: the api implements the endpoints, and the web app calls them and validates forms with the same schemas.
