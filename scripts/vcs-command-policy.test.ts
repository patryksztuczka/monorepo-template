import { describe, expect, it } from "vite-plus/test";
import { applyCommandPolicy } from "./vcs-command-policy.ts";

const blocked = [
  "git commit --no-verify -m wip",
  'git commit -m "wip" --no-verify',
  "git push --no-verify",
  "cd apps/api && git commit --no-verify",
  "/usr/bin/git commit --no-verify",
  "git commit -n -m wip",
  'git commit -nm "wip"',
  "git commit -an",
  "LEFTHOOK=0 git commit -m wip",
  "LEFTHOOK=false git commit -m wip",
  "git -c core.hooksPath=/dev/null commit -m wip",
  "git config core.hooksPath .nothing",
  "sh -c 'git commit --no-verify'",
];

const allowed = [
  "git commit -m wip",
  'git commit -am "fix -n flag parsing"',
  "git status",
  "git log -n 5",
  "git diff --name-only",
  "pnpm test --no-verify",
  "echo --no-verify",
  "gitk --no-verify",
];

describe("applyCommandPolicy", () => {
  it.each(blocked)("blocks %s", (command) => {
    expect(applyCommandPolicy(command).action).toBe("block");
  });

  it.each(allowed)("allows %s", (command) => {
    expect(applyCommandPolicy(command).action).toBe("allow");
  });
});
