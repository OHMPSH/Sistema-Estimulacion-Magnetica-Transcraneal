#!/usr/bin/env bash
# Abre dos terminales: primero el backend (escuchando en toda la red, para que
# la Pico W lo alcance) y después el frontend de Vite.
# Uso: ./dev.sh
ROOT="$(cd "$(dirname "$0")" && pwd)"

gnome-terminal --working-directory="$ROOT/server" -- \
  zsh -ic "echo '▶ server'; HOST=0.0.0.0 npm run dev; exec zsh"

sleep 1

gnome-terminal --working-directory="$ROOT/frontend" -- \
  zsh -ic "echo '▶ frontend'; npm run dev; exec zsh"
