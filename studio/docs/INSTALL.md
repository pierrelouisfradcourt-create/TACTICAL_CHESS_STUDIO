# Installation du studio — ordre P0 → P5

## P0 — Claude Code (maintenant)
1. bash studio/deploy_studio.sh (depuis la racine du repo)
2. claude → /start

## P0 — OpenClaw (jour 1 sur la machine)
Lancer /openclaw-install dans Claude Code pour le guide complet.
Ou manuellement :
  - WSL2 + mirrored networking + LM Studio 0.0.0.0
  - npm install -g openclaw@latest
  - openclaw onboard --install-daemon
  - cp -r studio/openclaw-workspace/* ~/.openclaw/workspace/

## P1 — L ancre (avant toute autonomie)
  - Oracles sandboxés + HMAC
  - studio_meta.py opérationnel
  - Gate Pierre en surface d action (Canvas)
  - Test : l agent ne peut PAS éditer un test

## P2-P5 — voir studio/docs/deploiement_studio.md
