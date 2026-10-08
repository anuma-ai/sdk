# Claude Code Guidelines

## Pull Requests

When asked to create a PR, use `gh pr create` with:

- Title: semantic, comparing current branch to main (e.g., "feat: add new hook", "fix: resolve memory leak")
- Use bang notation for breaking changes (e.g., "feat!: important feature")
- Description should be concise and include:
  - Summary of changes
  - **Integration**: how to integrate changes from the SDK into a client app (can be empty if nothing required)
  - **Breaking Changes**: what will break by upgrading the SDK (if any)
- Do not include the "🤖 Generated with Claude Code" footer
- Before creating a PR, run `pnpm test` and `pnpm check` to verify everything passes

## Branches

When asked to create a branch, run `git diff` to analyze the changes, then use `git checkout -b` with a semantic branch name based on the diff (e.g., "feat/add-new-hook", "fix/resolve-memory-leak"). Do not ask the user what the branch should be for.

## Code comments

- Do not add comments. Code should explain itself through names and structure; put the reasoning in the PR description or commit message.
- Allowed: tool/linter/compiler directives, license headers, and concise TSDoc on public exported APIs (one sentence plus tags).
- Never add commented-out code, TODO notes, narrative explanations, change history, or references to issues/incidents in comments.
- When editing a file, do not add comments to it; existing comments that violate this rule may be removed.
