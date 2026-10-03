import type { ESTree, SourceCode } from "@oxlint/plugins";

import { resolveVariable } from "./scope.ts";

/** What an identifier imported from a module stands for. */
export interface ImportedModule {
  /** The import specifier source, e.g. `"effect"` or `"effect/Effect"`. */
  readonly source: string;
  /** The module name the binding stands for: `Effect` for `import { Effect as E }`. */
  readonly module: string;
}

const importedModule = (
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): ImportedModule | undefined => {
  const definition = resolveVariable(sourceCode, identifier)?.defs[0];
  if (definition?.type !== "ImportBinding") return undefined;
  const declaration = definition.parent;
  if (declaration?.type !== "ImportDeclaration") return undefined;
  const source = declaration.source.value;
  const specifier = definition.node;
  if (specifier.type === "ImportSpecifier") {
    const imported = specifier.imported;
    const module = imported.type === "Identifier" ? imported.name : imported.value;
    return { source, module };
  }
  if (specifier.type === "ImportNamespaceSpecifier") {
    const module = source.split("/").at(-1);
    return module === undefined ? undefined : { source, module };
  }
  return undefined;
};

/** Sources that belong to Effect: `effect`, `effect/*` and `@effect/*`. */
export const isEffectSource = (source: string): boolean =>
  source === "effect" || source.startsWith("effect/") || source.startsWith("@effect/");

/** Whether an identifier is bound by an import from an Effect package. */
export const isEffectBinding = (
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): boolean => {
  const imported = importedModule(sourceCode, identifier);
  return imported !== undefined && isEffectSource(imported.source);
};

/**
 * For `X.member` where `X` is bound by an import from an Effect package,
 * the module `X` stands for and the accessed member. Shadowed locals
 * (e.g. `const Effect = { … }`) resolve to their own binding and do not match.
 */
export const effectMember = (
  sourceCode: SourceCode,
  node: ESTree.Node | null | undefined,
): { readonly module: string; readonly member: string } | undefined => {
  if (node?.type !== "MemberExpression" || node.computed) return undefined;
  if (node.object.type !== "Identifier" || node.property.type !== "Identifier") return undefined;
  const imported = importedModule(sourceCode, node.object);
  if (imported === undefined || !isEffectSource(imported.source)) return undefined;
  return { module: imported.module, member: node.property.name };
};

/** Whether `node` is `Module.member` for one of the given members, imported from Effect. */
export const isEffectMember = (
  sourceCode: SourceCode,
  node: ESTree.Node | null | undefined,
  module: string,
  members: ReadonlySet<string> | string,
): boolean => {
  const found = effectMember(sourceCode, node);
  if (found === undefined || found.module !== module) return false;
  return typeof members === "string" ? found.member === members : members.has(found.member);
};

/** Whether `node` is a call of `Module.member(...)` imported from Effect. */
export const isEffectCall = (
  sourceCode: SourceCode,
  node: ESTree.Node | null | undefined,
  module: string,
  members: ReadonlySet<string> | string,
): node is ESTree.CallExpression =>
  node?.type === "CallExpression" && isEffectMember(sourceCode, node.callee, module, members);
