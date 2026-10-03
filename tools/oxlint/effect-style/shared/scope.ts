import type { ESTree, Scope, SourceCode, Variable } from "@oxlint/plugins";

/** Resolve an identifier to its binding by walking lexical scopes upward. */
export const resolveVariable = (
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): Variable | undefined => {
  let scope: Scope | null = sourceCode.getScope(identifier);
  while (scope !== null) {
    const variable = scope.set.get(identifier.name);
    if (variable !== undefined) return variable;
    scope = scope.upper;
  }
  return undefined;
};

/**
 * Whether an identifier refers to the ambient global of that name: it has no local
 * binding (imports, declarations, parameters) anywhere in its scope chain.
 */
export const isAmbientGlobal = (
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): boolean => {
  const variable = resolveVariable(sourceCode, identifier);
  return variable === undefined || variable.defs.length === 0;
};
