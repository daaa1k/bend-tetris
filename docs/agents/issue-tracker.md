# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- Create: `gh issue create --title "..." --body "..."`.
- Read: `gh issue view <number> --comments`; fetch labels as needed.
- List: `gh issue list --state open --json number,title,body,labels,comments`.
- Comment: `gh issue comment <number> --body "..."`.
- Label: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- Close: `gh issue close <number> --comment "..."`.

Infer the repository from `git remote -v`.

## Pull requests as a triage surface

**PRs as a request surface: no.** Set to `yes` if external PRs should enter triage.

## Skill operations

- “Publish to the issue tracker”: create a GitHub issue.
- “Fetch the relevant ticket”: run `gh issue view <number> --comments`.

## Wayfinding operations

- Map: one issue labelled `wayfinder:map`, containing Notes, Decisions-so-far, and Fog.
- Child: a GitHub sub-issue linked to the map, labelled `wayfinder:<type>` (`research`, `prototype`, `grilling`, or `task`). If sub-issues are unavailable, use a task list in the map and `Part of #<map>` in the child.
- Blocking: use native issue dependencies. If unavailable, put `Blocked by: #<n>, #<n>` at the top of the child body.
- Frontier: choose the first open, unassigned child in map order with no open blockers.
- Claim: `gh issue edit <n> --add-assignee @me` before starting work.
- Resolve: comment with the answer, close the child, then add a context pointer to the map's Decisions-so-far.
