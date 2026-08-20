---
name: openclaw-install
description: Guide l installation complète d OpenClaw + déploiement du workspace studio.
---
## Prérequis
- Windows 11 + WSL2 Ubuntu 24.04
- LM Studio ouvert avec Qwen chargé
- Clés : GEMINI_API_KEY + ANTHROPIC_API_KEY + STUDIO_HMAC_KEY

## Étape 1 — WSL2 mirrored networking
Dans %USERPROFILE%\.wslconfig :
  [wsl2]
  networkingMode=mirrored
  memory=24GB
Dans LM Studio : %userprofile%\.cache\lm-studio\.internal\http-server-config.json
  → networkInterface: "0.0.0.0"
Puis : wsl --shutdown (PowerShell admin)
Test : curl http://127.0.0.1:1234/v1/models (depuis WSL)

## Étape 2 — Node 24 + OpenClaw
Dans WSL :
  sudo apt update && sudo apt install -y python3 make build-essential libvips-dev
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  nvm install 24 && nvm use 24
  npm install -g openclaw@latest
  openclaw onboard --install-daemon
  openclaw doctor

## Étape 3 — Variables d environnement
Dans ~/.openclaw/.env (jamais dans le repo) :
  GEMINI_API_KEY=...
  ANTHROPIC_API_KEY=...
  STUDIO_HMAC_KEY=$(openssl rand -hex 32)

## Étape 4 — Déployer le workspace studio
  cp -r /mnt/c/TACTICAL_CHESS_STUDIO/studio/openclaw-workspace/* ~/.openclaw/workspace/

## Étape 5 — Providers Gemini
baseUrl : https://generativelanguage.googleapis.com/v1beta/openai/
Modèle  : gemini-2.5-flash
Test : curl "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" \
  -H "Authorization: Bearer $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"ping"}]}'

## Étape 6 — Canvas
Servir studio/openclaw-workspace/../studio_canvas.html comme panneau Canvas OpenClaw.

## Vérification finale
  openclaw --version
  openclaw gateway status
  openclaw doctor
