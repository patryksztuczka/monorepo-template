import path from "node:path";

import type { Context } from "@oxlint/plugins";

/** The linted file's path relative to the working directory, with `/` separators. */
export const relativeFilename = (context: Context): string =>
  path.relative(context.cwd, context.filename).split(path.sep).join("/");

const escapeRegExp = (text: string): string => text.replace(/[.+^$()|[\]\\]/g, "\\$&");

/**
 * Convert a glob to a regular expression source.
 * Supports `**`, `*`, `?` and `{a,b}`; everything else is literal.
 */
export const globSource = (glob: string): string => {
  let source = "";
  for (let index = 0; index < glob.length; index++) {
    const char = glob[index];
    if (char === "*" && glob[index + 1] === "*") {
      const slash = glob[index + 2] === "/";
      source += slash ? "(?:.*/)?" : ".*";
      index += slash ? 2 : 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else if (char === "{") {
      const end = glob.indexOf("}", index);
      const options = glob
        .slice(index + 1, end)
        .split(",")
        .map(escapeRegExp);
      source += `(?:${options.join("|")})`;
      index = end;
    } else if (char !== undefined) {
      source += escapeRegExp(char);
    }
  }
  return source;
};

/** Whether a relative path matches any of the globs. */
export const matchesAny = (relative: string, globs: ReadonlyArray<string>): boolean =>
  globs.some((glob) => new RegExp(`^${globSource(glob)}$`).test(relative));

/** Split a path at the first prefix matching `rootGlob`: `{ root, rest }`. */
export const splitAtRoot = (
  relative: string,
  rootGlob: string,
): { readonly root: string; readonly rest: string } | undefined => {
  const match = new RegExp(`^(${globSource(rootGlob)})/(.+)$`).exec(relative);
  if (match === null || match[1] === undefined || match[2] === undefined) return undefined;
  return { root: match[1], rest: match[2] };
};

/** Strip a TypeScript/JavaScript extension. */
export const withoutExtension = (file: string): string =>
  file.replace(/\.(?:d\.)?[cm]?[jt]sx?$/, "");
