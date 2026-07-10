# Releasing CodeLobby

CodeLobby ships as a downloadable macOS `.dmg` attached to GitHub Releases. The
release pipeline is **PR-based** and driven by **Conventional Commits** on PR titles.

## The pipeline at a glance

```
PR opened/edited
  └─ pr-title-lint.yml   → PR title must be a valid Conventional Commit (required check)
Merge to main (squash)
  └─ squash commit message = PR title  → guaranteed-conventional history on main
  └─ release-drafter.yml → updates the rolling DRAFT release (categorized, next version)
You publish the draft release (one click)
  └─ release.yml (macos-latest) → electron-builder builds CodeLobby-<version>-arm64.dmg
                                  and uploads it to that same release
```

Nothing builds the DMG by hand — publishing the draft is the only manual step.

## Files

| File | Role |
|------|------|
| `.github/workflows/pr-title-lint.yml` | Validates PR titles against Conventional Commits |
| `.github/release-drafter.yml` | Changelog categories, autolabeler, version-resolver, template |
| `.github/workflows/release-drafter.yml` | Maintains the draft release + autolabels PRs |
| `.github/workflows/release.yml` | Builds & publishes the macOS DMG on release publish |
| `package.json` → `build.publish` | Points electron-builder at the GitHub repo |

## How versioning works

The autolabeler reads the PR title and labels the PR:

| PR title prefix | Label | Version bump |
|-----------------|-------|--------------|
| `feat:` | `feature` | minor |
| `fix:` | `fix` | patch |
| `chore/ci/build/docs/refactor/perf/test/style:` | `maintenance` | patch |
| `feat!:` / `fix!:` / `BREAKING CHANGE` in body | `breaking` | major |

Release Drafter computes the next tag (`vX.Y.Z`) from the highest bump among the PRs
since the last release. `release.yml` derives the electron-builder version from that tag,
so `package.json`'s `version` field is only a fallback and does not need bumping per release.

## Cutting a release

1. Merge PRs into `main` (squash) with conventional titles.
2. Open **Releases → Draft** — Release Drafter has already written the notes and picked the version.
3. Review/edit the notes, then click **Publish release**.
4. `release.yml` builds the DMG on a macOS runner and attaches it (~a few minutes). Done.

## One-time repo setup (not in this PR — these are GitHub settings, not files)

Run once (requires `gh` auth with repo admin):

```bash
# 1. Force squash merges + make the PR title the commit message + auto-delete branches
gh api -X PATCH /repos/SouhaibBenFarhat/code-lobby \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY \
  -F delete_branch_on_merge=true

# 2. Create the labels the autolabeler applies (also auto-created on first run, but explicit is safer)
gh label create feature     -c '#0E8A16' -d 'New feature'        --force
gh label create fix         -c '#D73A4A' -d 'Bug fix'            --force
gh label create maintenance -c '#FBCA04' -d 'Chore/CI/docs/etc'  --force
gh label create breaking    -c '#B60205' -d 'Breaking change'    --force
```

Then, in **Settings → Branches → `main` branch protection**, add **PR Title Lint** as a
required status check (alongside the existing `test` check) so non-conventional titles can't merge.

## Code signing / notarization (future)

The DMG is currently **unsigned** — it downloads and installs, but macOS Gatekeeper warns on
first open (right-click → **Open**, or `xattr -cr /Applications/CodeLobby.app`). To ship a
signed + notarized build:

1. Enroll in the Apple Developer Program and export a **Developer ID Application** cert.
2. Add repo secrets: `CSC_LINK` (base64 .p12), `CSC_KEY_PASSWORD`, `APPLE_ID`,
   `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
3. In `release.yml`, remove `CSC_IDENTITY_AUTO_DISCOVERY: false` and pass the `APPLE_*` env vars;
   electron-builder handles signing + notarization automatically.

No other changes are needed — signing drops into the existing workflow.

## Adding auto-update later (optional)

`release.yml` already publishes electron-builder's `latest-mac.yml` + blockmap alongside the DMG,
so wiring up `electron-updater` in the main process is the only remaining step if you later want
the installed app to self-update from GitHub Releases (requires signed builds on macOS).
