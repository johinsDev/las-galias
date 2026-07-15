#!/usr/bin/env bash
#
# PreToolUse(Bash) gate — runs in the Claude Code harness (the model doesn't
# decide whether it runs, so Arnold can't skip it).
#
#   - Blocks `--no-verify` (and `-n` on commit) → nobody skips lefthook.
#   - Before a `git push`, runs the full suite (check · lint · format ·
#     knip). If anything fails, aborts the push with exit 2 and tells Claude
#     what to fix.
#
# Exit codes: 0 = allow · 2 = block (stderr goes back to the model).

input=$(cat)

# Fast path: if "git" doesn't appear anywhere in the payload, skip parsing.
case "$input" in
  *git*) ;;
  *) exit 0 ;;
esac

# Extract the command from the PreToolUse JSON. bun is guaranteed in this repo.
cmd=$(printf '%s' "$input" | bun -e 'const t=await Bun.stdin.text(); try{process.stdout.write((JSON.parse(t).tool_input?.command)||"")}catch{}' 2>/dev/null)
[ -z "$cmd" ] && exit 0

# Is this a git invocation? (start of line or after ; & | && ||)
printf '%s' "$cmd" | grep -Eq '(^|[;&|[:space:]])git([[:space:]]|$)' || exit 0

# --- Block hook bypasses ------------------------------------------------------
# Strip quoted text (e.g. the -m message) so message content isn't mistaken
# for real flags.
flags=$(printf '%s' "$cmd" | sed -E "s/'[^']*'//g; s/\"[^\"]*\"//g")

if printf '%s' "$flags" | grep -Eq -- '--no-verify'; then
  echo "🚫 Blocked: '--no-verify' skips lefthook. Quality checks are mandatory." >&2
  exit 2
fi
# On 'git commit', -n = --no-verify (on push -n = --dry-run, which is allowed).
if printf '%s' "$flags" | grep -Eq 'git[[:space:]]+commit' \
   && printf '%s' "$flags" | grep -Eq -- '(^|[[:space:]])-[a-zA-Z]*n'; then
  echo "🚫 Blocked: 'git commit -n' skips lefthook. Drop the flag." >&2
  exit 2
fi

# --- Quality gate before push --------------------------------------------------
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push'; then
  root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
  cd "$root" 2>/dev/null || { echo "🚫 Push blocked: can't find the repo root." >&2; exit 2; }

  echo "▶ Quality gate before push (check · lint · format · knip)…" >&2

  if ! bun run check   >&2; then echo "🚫 Push blocked: 'bun run check' (typecheck) failed." >&2; exit 2; fi
  if ! bun run lint    >&2; then echo "🚫 Push blocked: 'bun run lint' failed." >&2; exit 2; fi
  if ! bun run format:check >&2; then echo "🚫 Push blocked: 'bun run format:check' failed. Run 'bun run format' and commit again." >&2; exit 2; fi
  if ! bun run knip    >&2; then echo "🚫 Push blocked: 'bun run knip' (dead code) failed." >&2; exit 2; fi

  echo "✅ Gate OK — push allowed." >&2
fi

exit 0
