import { eslintCompatPlugin } from "@oxlint/plugins";

import { boundedConcurrencyRule } from "./rules/bounded-concurrency.ts";
import { brandedIdsRule } from "./rules/branded-ids.ts";
import { effectFnNameRule } from "./rules/effect-fn-name.ts";
import { forkDetachReasonRule } from "./rules/fork-detach-reason.ts";
import { layerConfigOnlyInRootsRule } from "./rules/layer-config-only-in-roots.ts";
import { layerNamingRule } from "./rules/layer-naming.ts";
import { logLiteralMessageRule } from "./rules/log-literal-message.ts";
import { noAmbientDateRule } from "./rules/no-ambient-date.ts";
import { noDecodeSyncRule } from "./rules/no-decode-sync.ts";
import { noErrorInstanceofRule } from "./rules/no-error-instanceof.ts";
import { noErrorSubclassRule } from "./rules/no-error-subclass.ts";
import { noNewPromiseRule } from "./rules/no-new-promise.ts";
import { noThrowRule } from "./rules/no-throw.ts";
import { noThrowInEffectRule } from "./rules/no-throw-in-effect.ts";
import { noTryInTestsRule } from "./rules/no-try-in-tests.ts";
import { noUntypedFailureRule } from "./rules/no-untyped-failure.ts";
import { redactedSecretsRule } from "./rules/redacted-secrets.ts";
import { retryRequiresWhileRule } from "./rules/retry-requires-while.ts";
import { runOnlyInEntryPointsRule } from "./rules/run-only-in-entry-points.ts";
import { serviceExplicitShapeRule } from "./rules/service-explicit-shape.ts";
import { serviceIdMatchesPathRule } from "./rules/service-id-matches-path.ts";
import { taggedErrorNamingRule } from "./rules/tagged-error-naming.ts";
import { tryRequiresCatchRule } from "./rules/try-requires-catch.ts";

/** Rules that enforce the Effect v4 style guide in `docs/effect-style-guide`. */
const effectStylePlugin = eslintCompatPlugin({
  meta: { name: "effect-style" },
  rules: {
    "bounded-concurrency": boundedConcurrencyRule,
    "branded-ids": brandedIdsRule,
    "effect-fn-name": effectFnNameRule,
    "fork-detach-reason": forkDetachReasonRule,
    "layer-config-only-in-roots": layerConfigOnlyInRootsRule,
    "layer-naming": layerNamingRule,
    "log-literal-message": logLiteralMessageRule,
    "no-ambient-date": noAmbientDateRule,
    "no-decode-sync": noDecodeSyncRule,
    "no-error-instanceof": noErrorInstanceofRule,
    "no-error-subclass": noErrorSubclassRule,
    "no-new-promise": noNewPromiseRule,
    "no-throw": noThrowRule,
    "no-throw-in-effect": noThrowInEffectRule,
    "no-try-in-tests": noTryInTestsRule,
    "no-untyped-failure": noUntypedFailureRule,
    "redacted-secrets": redactedSecretsRule,
    "retry-requires-while": retryRequiresWhileRule,
    "run-only-in-entry-points": runOnlyInEntryPointsRule,
    "service-explicit-shape": serviceExplicitShapeRule,
    "service-id-matches-path": serviceIdMatchesPathRule,
    "tagged-error-naming": taggedErrorNamingRule,
    "try-requires-catch": tryRequiresCatchRule,
  },
});

export default effectStylePlugin;
