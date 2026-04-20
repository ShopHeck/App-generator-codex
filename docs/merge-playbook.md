# Merge Playbook

This playbook defines how changes are reviewed and merged into `main`.

## Branch naming

Use short, searchable names with a type prefix:

- `feature/<ticket-or-scope>` for product work
- `fix/<ticket-or-scope>` for bug fixes
- `chore/<scope>` for maintenance
- `hotfix/<incident-or-ticket>` for production-critical fixes

Examples:

- `feature/onboarding-upsell`
- `fix/payment-webhook-timeout`
- `hotfix/checkout-500`

## PR size guideline

Prefer small PRs to reduce review time and deployment risk.

- Target: **under 400 changed lines** (excluding generated assets and lockfiles)
- Split work when a PR combines unrelated concerns
- Keep PRs focused on one user or business outcome

## Required reviewers

Each PR requires:

1. **One code owner approval** for impacted paths
2. **One additional engineering reviewer** for non-trivial changes

For high-risk changes (auth, billing, data model, migrations), require **two code owner approvals**.

## Required checks

All required checks must pass before merge:

- CI pipeline (build + tests)
- Lint/type checks

If a required check is flaky, rerun and link the flaky failure in the PR before merge.

### `main` branch protection baseline

`main` is protected with the following rules:

- pull request required before merge
- required CI status checks must pass
- branch must be up to date before merge (`strict` checks)
- force pushes blocked

Repository admins can apply/update this configuration with:

```bash
scripts/configure-branch-protection.sh <owner/repo>
```

## Squash vs rebase policy

- Default: **Squash merge** into `main` to keep history concise
- Allowed exception: **Rebase merge** for long-running branches where commit history is intentionally meaningful (for example, staged infra migrations)
- Do not use merge commits into `main`

## Hotfix flow

1. Create `hotfix/<incident-or-ticket>` from latest `main`
2. Ship the smallest safe fix with focused tests
3. Open PR with `HOTFIX` in title and include:
   - incident summary
   - rollback plan
   - customer impact
4. Require expedited review from one code owner and one on-call engineer
5. Merge once required checks pass
6. Post-merge:
   - verify in production
   - document root cause
   - create follow-up hardening tasks
