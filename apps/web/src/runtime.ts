import { ManagedRuntime } from "effect";
import { ApiClient } from "./lib/api-client";

// The bridge between React / TanStack Query and Effect.
export const runtime = ManagedRuntime.make(ApiClient.layer);
