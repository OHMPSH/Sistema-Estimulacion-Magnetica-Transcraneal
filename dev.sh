#!/usr/bin/env bash
# Abre dos terminales y arranca server y frontend con `npm run dev`.
# Uso: ./dev.sh
ROOT="$(cd "$(dirname "$0")" && pwd)"

for dir in server frontend; do
  gnome-terminal --working-directory="$ROOT/$dir" -- zsh -ic "echo '▶ $dir'; npm run dev; exec zsh"
done
