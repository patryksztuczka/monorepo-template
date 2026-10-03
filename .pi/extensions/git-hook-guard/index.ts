/**
 * Pi extension, auto-loaded from .pi/extensions once the project is trusted.
 * Blocks bash commands that skip the git hooks; same rule as the Claude Code,
 * Codex and Cursor hooks (scripts/vcs-command-policy.ts).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { applyCommandPolicy } from "../../../scripts/vcs-command-policy.ts";

export default function gitHookGuard(pi: ExtensionAPI) {
  pi.on("tool_call", (event) => {
    if (event.toolName !== "bash") {
      return undefined;
    }
    const result = applyCommandPolicy(String(event.input.command ?? ""));
    return result.action === "block" ? { block: true, reason: result.reason } : undefined;
  });
}
