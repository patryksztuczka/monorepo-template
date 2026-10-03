import type { Context } from "@oxlint/plugins";

type OptionValue = string | boolean | ReadonlyArray<string> | Readonly<Record<string, string>>;

/** Read the first rule option object, falling back to defaults per key. */
export const ruleOptions = <Defaults extends Readonly<Record<string, OptionValue>>>(
  context: Context,
  defaults: Defaults,
): Defaults => {
  const first: unknown = context.options[0];
  if (first === null || typeof first !== "object" || Array.isArray(first)) return defaults;
  return { ...defaults, ...first };
};
