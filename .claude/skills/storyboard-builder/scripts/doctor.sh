#!/usr/bin/env bash
# doctor.sh — check everything storyboard-builder needs and say EXACTLY what's missing and how to install it.
# Run this on first use or whenever anything fails. Works on macOS, Linux, and Windows (Git Bash).
ok(){ printf '  [OK]      %s\n' "$1"; }
miss(){ printf '  [MISSING] %s\n      -> install: %s\n' "$1" "$2"; FAIL=1; }
FAIL=0

# load keys from a project .env if present (values are never printed)
for _envf in ./.env ../.env ../../.env ../../../.env ../../../../.env; do
  if [ -f "$_envf" ]; then
    while IFS= read -r _line || [ -n "$_line" ]; do
      case "$_line" in \#*|"") continue;; esac
      _k="${_line%%=*}"; _v="${_line#*=}"
      case "$_k" in OPENAI_API_KEY|GEMINI_API_KEY) ;; *) continue;; esac
      case "$_v" in \"*|\'*) ;; *) _v="${_v%%[[:space:]]#*}";; esac
      _v="${_v%\"}"; _v="${_v#\"}"; _v="${_v%\'}"; _v="${_v#\'}"
      [ -n "$_v" ] && [ -z "${!_k:-}" ] && export "$_k=$_v"
    done < "$_envf"
    break
  fi
done
case "$(uname -s 2>/dev/null)" in Darwin) OS=mac;; MINGW*|MSYS*|CYGWIN*) OS=win;; *) OS=linux;; esac
echo "storyboard-builder doctor — OS: $OS (only needed if your agent has no built-in image tool)"
echo "REQUIRED:"
command -v curl >/dev/null 2>&1 && ok "curl" \
  || miss "curl" "$([ $OS = mac ] && echo 'brew install curl' || ([ $OS = win ] && echo 'winget install cURL.cURL' || echo 'apt install curl'))"
command -v jq >/dev/null 2>&1 && ok "jq (JSON parsing)" \
  || miss "jq" "$([ $OS = mac ] && echo 'brew install jq' || ([ $OS = win ] && echo 'winget install jqlang.jq' || echo 'apt install jq'))"

echo "AT LEAST ONE IMAGE API KEY:"
if [ -n "${OPENAI_API_KEY:-}" ]; then ok "OPENAI_API_KEY is set"; HAVE_KEY=1; fi
if [ -n "${GEMINI_API_KEY:-}" ]; then ok "GEMINI_API_KEY is set"; HAVE_KEY=1; fi
if [ -z "${HAVE_KEY:-}" ]; then
  miss "no API key found" "put OPENAI_API_KEY=... (platform.openai.com/api-keys) or GEMINI_API_KEY=... (aistudio.google.com/apikey) in your own .env file (copy .env.example) — never paste it into chat or commit it. Codex users with built-in image generation do not need a key."
fi

echo
if [ "$FAIL" = 1 ]; then echo "RESULT: fix the [MISSING] items above, then re-run."; exit 1
else echo "RESULT: ready. Run scripts/generate-image.sh for each storyboard scene."; fi
