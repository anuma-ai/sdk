# SDD progress — semantic-release versioning

Mode: stay on main, stage-only (no commits). Reviews run over working-tree diffs.

Task 1: complete (.releaserc.json staged, review clean — Spec ✅ / Quality Approved)
Task 2: complete (release.yml staged, actionlint clean, no tag-recursion, review clean — Spec ✅ / Quality Approved)
Task 3: complete (npm-publish.yml deletion staged, no dangling refs; review folded into final whole-branch review)
Final review: READY TO MERGE. Findings pending user adjudication:
  - Important(plan-mandated): unpinned npx --yes toolchain in release.yml (matches sibling plans verbatim)
  - Important(architectural/recoverable): tag pushed before exec publishCmd; partial publish recovered by re-run
  - Minor: concurrency group 'release-main' is static (fine given push:main-only trigger)
Final review fixes applied to release.yml: toolchain pinned (semantic-release@25.0.5 etc.), concurrency group scoped, tag-before-publish recovery documented. actionlint clean. All 3 files staged. Tasks 1-3 + final review COMPLETE. Remaining: T4/T5 are user-run.
