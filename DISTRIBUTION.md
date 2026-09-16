# Distributing StudyFlow for free

## Building locally

Requires Windows, since better-sqlite3 compiles a native binary for the
platform you build on:

    npm install
    npm run dist

Produces an installer in `release/` (e.g. `StudyFlow Setup 0.1.0.exe`).
`npm install`'s postinstall hook rebuilds better-sqlite3 against Electron's
Node ABI automatically — without that step the packaged app would crash on
launch with a version-mismatch error rather than failing at build time.

## Building without owning a Windows PC

`.github/workflows/release.yml` builds on GitHub's free hosted Windows
runners. Once `package-lock.json` exists (commit it after your first local
`npm install`) and this is pushed to a GitHub repo:

    git tag v0.1.0
    git push origin v0.1.0

That's it — GitHub builds the installer and attaches it directly to a
Release. No Windows machine, no cost, no manual upload.

## The unsigned-installer warning

Windows shows "Windows protected your PC" the first time someone runs an
installer that isn't code-signed. A certificate costs money — which
conflicts with "free for everyone, nothing from me" — so this ships
unsigned on purpose. People can still install it (More info → Run anyway);
it's a one-time warning per version, not per launch. Mentioned here so it's
a known tradeoff, not a surprise.

## Still needed before a real release

- `build/icon.ico` — see `build/README.txt`. Builds and runs fine without
  it, just with Electron's generic default icon.
- If you want auto-update later via `electron-updater`, fill in
  `electron-builder.yml`'s `publish.owner`/`publish.repo` with your real
  GitHub username/repo. Not required to build or distribute manually.
