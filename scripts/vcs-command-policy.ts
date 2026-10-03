/**
 * The one rule every agent hook enforces (Claude Code, Codex, Cursor, Pi):
 * agents may not skip the git hooks. The pre-commit hook (lefthook.yml) runs
 * the checks and tests; an agent whose commit fails there must fix the code,
 * or ask a human, rather than commit around it.
 */

export type CommandPolicyResult =
  | { readonly action: "allow" }
  | { readonly action: "block"; readonly reason: string };

export const HOOK_BYPASS_REASON =
  "Blocked hook bypass. Do not skip git hooks (--no-verify, commit -n, LEFTHOOK=0, core.hooksPath). Fix what the hook reports, or ask before changing the hook policy.";

const GIT = /(?:^|[\s;&|()"'`])(?:[^\s;&|()"'`]*\/)?git(?=$|[\s;&|()"'`])/u;
const NO_VERIFY = /(?:^|[\s"'`])--no-verify(?=$|[\s;&|()="'`])/u;
// `git commit -n` / `-an` / `-nm "…"`: `-n` is commit's short --no-verify.
const COMMIT_SHORT_NO_VERIFY = /\bcommit\b[^;&|]*?\s-[a-zA-Z]*n[a-zA-Z]*(?=$|[\s;&|()])/u;
// `LEFTHOOK=0 git commit` and `LEFTHOOK=false` disable every lefthook hook.
const LEFTHOOK_OFF = /(?:^|[\s;&|()"'`])LEFTHOOK=(?:0|false)(?=$|[\s;&|()"'`])/u;
// `git -c core.hooksPath=/dev/null commit` points git at no hooks at all.
const HOOKS_PATH = /core\.hooksPath/iu;
const QUOTED = /"(?:\\.|[^"\\])*"|'[^']*'/gu;

export const applyCommandPolicy = (command: string): CommandPolicyResult => {
  if (!GIT.test(command)) {
    return { action: "allow" };
  }
  const bypass =
    NO_VERIFY.test(command) ||
    // Quoted text is dropped first, so a message like "fix -n parsing" passes.
    COMMIT_SHORT_NO_VERIFY.test(command.replaceAll(QUOTED, '""')) ||
    LEFTHOOK_OFF.test(command) ||
    HOOKS_PATH.test(command);
  return bypass ? { action: "block", reason: HOOK_BYPASS_REASON } : { action: "allow" };
};
