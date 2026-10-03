/**
 * Shell-command hook for coding agents. Reads the hook payload on stdin and
 * denies commands that skip the git hooks (see ../vcs-command-policy.ts).
 *
 * - Claude Code and Codex (`PreToolUse` on `Bash`): `tool_input.command` in,
 *   `hookSpecificOutput.permissionDecision` out; silence means "no opinion".
 * - Cursor (`beforeShellExecution`): `command` in, `permission` out.
 *
 * Wired in .claude/settings.json, .codex/hooks.json and .cursor/hooks.json.
 * No dependencies on purpose: it runs on every agent shell command, and must
 * work in a fresh clone before `pnpm install`.
 */
import { text } from "node:stream/consumers";
import { applyCommandPolicy } from "../vcs-command-policy.ts";

interface HookPayload {
  // Claude Code / Codex
  readonly tool_input?: { readonly command?: string };
  // Cursor
  readonly command?: string;
}

const parsePayload = (raw: string): HookPayload | undefined => {
  try {
    const parsed: HookPayload | null = JSON.parse(raw);
    return parsed ?? undefined;
  } catch {
    return undefined;
  }
};

interface PreToolUseDecision {
  readonly hookSpecificOutput: {
    readonly hookEventName: "PreToolUse";
    readonly permissionDecision: "deny";
    readonly permissionDecisionReason: string;
  };
}

interface CursorDecision {
  readonly permission: "allow" | "deny";
  readonly user_message?: string;
  readonly agent_message?: string;
}

const write = (output: PreToolUseDecision | CursorDecision) =>
  process.stdout.write(`${JSON.stringify(output)}\n`);

const payload = parsePayload(await text(process.stdin));

// A payload we do not understand: stay out of the way.
if (payload !== undefined) {
  const isCursor = payload.tool_input === undefined;
  const result = applyCommandPolicy(String(payload.tool_input?.command ?? payload.command ?? ""));
  if (result.action === "block") {
    write(
      isCursor
        ? { permission: "deny", user_message: result.reason, agent_message: result.reason }
        : {
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              permissionDecision: "deny",
              permissionDecisionReason: result.reason,
            },
          },
    );
  } else if (isCursor) {
    write({ permission: "allow" });
  }
}
