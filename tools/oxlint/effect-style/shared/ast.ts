import type { ESTree } from "@oxlint/plugins";

/** A string literal, or a template literal without substitutions. */
export const staticString = (node: ESTree.Node | null | undefined): string | undefined => {
  if (node?.type === "Literal" && typeof node.value === "string") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined;
  }
  return undefined;
};

/** The name of a non-computed identifier or string-literal key. */
export const keyName = (key: ESTree.Node): string | undefined => {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return undefined;
};

/** Find a non-computed property by name in an object literal. */
export const findProperty = (
  object: ESTree.ObjectExpression,
  name: string,
): ESTree.ObjectProperty | undefined =>
  object.properties.find(
    (property): property is ESTree.ObjectProperty =>
      property.type === "Property" && !property.computed && keyName(property.key) === name,
  );

const isFunctionNode = (node: ESTree.Node): boolean =>
  node.type === "FunctionExpression" ||
  node.type === "FunctionDeclaration" ||
  node.type === "ArrowFunctionExpression";

/** The closest enclosing function of a node, or undefined at module level. */
export const enclosingFunction = (node: ESTree.Node): ESTree.Node | undefined => {
  let current = node.parent;
  while (current !== null && current !== undefined) {
    if (isFunctionNode(current)) return current;
    current = current.parent;
  }
  return undefined;
};

/** The closest enclosing class of a node. */
export const enclosingClass = (node: ESTree.Node): ESTree.Class | undefined => {
  let current = node.parent;
  while (current !== null && current !== undefined) {
    if (current.type === "ClassDeclaration" || current.type === "ClassExpression") return current;
    current = current.parent;
  }
  return undefined;
};

/** The statement that contains a node (the node whose parent is a statement list). */
export const enclosingStatement = (node: ESTree.Node): ESTree.Node => {
  let current: ESTree.Node = node;
  while (current.parent !== null && current.parent !== undefined) {
    const parent: ESTree.Node = current.parent;
    if (
      parent.type === "BlockStatement" ||
      parent.type === "Program" ||
      parent.type === "StaticBlock" ||
      parent.type === "SwitchCase"
    ) {
      return current;
    }
    current = parent;
  }
  return current;
};

/**
 * The name a value is bound to: `const name = value`, `{ name: value }`,
 * or `static name = value` in a class body.
 */
export const boundName = (node: ESTree.Node): string | undefined => {
  const parent = node.parent;
  if (
    parent?.type === "VariableDeclarator" &&
    parent.init === node &&
    parent.id.type === "Identifier"
  ) {
    return parent.id.name;
  }
  if (parent?.type === "Property" && parent.value === node && !parent.computed) {
    return keyName(parent.key);
  }
  if (parent?.type === "PropertyDefinition" && parent.value === node && !parent.computed) {
    return keyName(parent.key);
  }
  return undefined;
};
