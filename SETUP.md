# Setup & maintenance guide

This document explains how to get `create-j1ma` onto GitHub, turn on the
self-updating automation, and publish it to npm. Follow the sections in order.

---

## 0. Local development

```sh
pnpm install        # install dependencies
pnpm build          # compile src/ -> build/index.js (via tsup)
pnpm test           # run the vitest suite
pnpm lint           # eslint
pnpm format         # prettier --check   (format:fix to write)
```

Try the CLI locally without publishing:

```sh
node build/index.js my-app --template next-ts
# or link it globally so `create-j1ma` works anywhere on your machine:
pnpm link-cli
```

Templates live in `src/templates/<name>/`. Dependency versions for generated
projects live in `src/dependencies/<layer>/package.json` (base / next / react /
typescript / vite) — **this split is what lets Dependabot bump them cleanly.**

---

## 1. Push to GitHub

The repo is already `git init`'d with an initial commit. Create the remote repo
and push:

```sh
# Option A: with the GitHub CLI (creates the repo for you)
gh repo create j1madev/create-j1ma --public --source . --remote origin --push

# Option B: manually (create the empty repo on github.com first)
git remote add origin git@github.com:j1madev/create-j1ma.git
git push -u origin main
```

Once it's on GitHub, **Dependabot starts working automatically** — it will open
PRs for outdated dependencies on the schedule in `.github/dependabot.yml`
(monthly). No token is required just to *open* those PRs.

---

## 2. Turn on auto-merge (the "self-updating" part)

Dependabot opens PRs, but merging them by hand is the tedious part. The workflow
`.github/workflows/dependabot-auto-merge.yml` merges **patch and minor** bumps
automatically once CI passes. **Major** bumps are left for you to review by hand,
because those can contain breaking changes.

Three GitHub-side steps make it work:

1. **Create the token the workflow needs.**
   - GitHub → Settings (your account) → Developer settings → **Personal access
     tokens → Fine-grained tokens** → Generate new token.
   - Repository access: only `j1madev/create-j1ma`.
   - Permissions: **Contents: Read and write**, **Pull requests: Read and write**.
   - Copy the token.
2. **Add it as a repo secret.**
   - Repo → Settings → Secrets and variables → **Actions** → New repository secret.
   - Name it exactly `DEPENDABOT_AUTO_MERGE_TOKEN` and paste the token.
3. **Enable auto-merge + protect `main`.**
   - Repo → Settings → General → check **Allow auto-merge**.
   - Repo → Settings → Branches → add a branch protection rule for `main`:
     require the CI status check (from `.github/workflows/pull-request.yml`) to
     pass before merging. This guarantees a broken bump can't auto-merge.

That's the whole "keeps itself updated" machine. After this, most months you do
nothing; you only step in for the occasional major-version PR.

---

## 3. Publish to npm

So that `pnpm create j1ma` / `npx create-j1ma` works for anyone:

```sh
npm login                 # one-time, uses your npmjs.com account
npm publish --dry-run     # preview exactly what will be published
npm publish               # publish for real (public by default for unscoped names)
```

- Only the `build/` folder and `README.md` are published (see the `files` field
  in `package.json`), so **always run `pnpm build` before publishing.**
- Bump the `version` in `package.json` before each publish (npm rejects
  re-publishing the same version). See section 4 for automating this.

---

## 4. Optional / advanced workflows

These were copied from the original and need extra setup. They are **not**
required for the core initiator or for Dependabot + auto-merge to work. Delete
them if you want to keep things minimal.

- **`.github/workflows/release-please.yml`** — automates version bumps,
  CHANGELOG generation, and GitHub releases from your conventional commits.
  Needs a token with `contents: write` + `pull-requests: write`. State is tracked
  in `.release-please-manifest.json` (currently `1.0.0`).
- **`.github/settings.yml`** — declaratively manages repo settings (branch
  protection, labels, etc.). Requires installing the **Probot "Settings"** GitHub
  App on the repo, otherwise it does nothing.
- **`.github/workflows/{pr-labeler,pr-size-labeler,sync-labels,lint-pr-title}.yml`**
  — PR hygiene automation (auto-labeling, PR-title linting). Harmless to keep;
  optional to remove.

---

## Quick reference: how it all fits together

| Piece | Role |
|-------|------|
| `src/index.ts` | CLI entry (commander) |
| `src/generators/create-project.ts` | Orchestrates: copy template → merge deps → git init → install |
| `src/templates/<name>/` | The files copied into a new project |
| `src/dependencies/<layer>/package.json` | Dependency **versions** for generated projects (Dependabot-friendly) |
| `.github/dependabot.yml` | Tells GitHub what to keep updated, and how often |
| `.github/workflows/dependabot-auto-merge.yml` | Auto-merges safe (patch/minor) bumps |
| `pnpm-workspace.yaml` | Approves `esbuild`'s build script (required by pnpm 11+) |
