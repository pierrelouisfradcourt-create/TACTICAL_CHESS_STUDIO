# Pipeline Opening Checklist

status: DOCUMENTED_ONLY

Use before opening Codex automation on Kenpachi.

On the current PC, this package is preparation only.
On Kenpachi, `00_STUDIO_CONTROL` becomes the official control plane placement when copied to `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\`.

## A. Human / Machine Prerequisites Before Codex
- [ ] Kenpachi available.
- [ ] Windows 11 installed.
- [ ] Internet available.
- [ ] User/admin access available.
- [ ] GitHub/OpenAI/VPN credentials available if required.

## B. Codex Bootstrap Tasks
- [ ] Windows Update completed.
- [ ] Driver updates completed from trusted sources.
- [ ] Reboots completed if required.
- [ ] Git installed and verified.
- [ ] Codex installed and verified.
- [ ] Rust installed and verified.
- [ ] Python installed and verified.
- [ ] Repo cloned to the correct Kenpachi path.
- [ ] `00_STUDIO_CONTROL` copied from preparation package to `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\`.
- [ ] `.venv312` rebuilt on Kenpachi, not imported.
- [ ] `target` rebuilt on Kenpachi, not imported.

## Control Package Checks
- [ ] `AAA_STUDIO_CODEX_PLACEMENT_CONTRACT_V3_1.md` or mapped placement contract present and readable.
- [ ] CI billing blocked status accepted: BLOCKED_ACCEPTED_NO_PAYMENT.

## Import Guardrails
- [ ] No datasets imported.
- [ ] No models imported.
- [ ] No old parent imported.
- [ ] No Python/venv copied from current PC.
- [ ] No target/cache copied from current PC.

## Source Context
- Repo branch: main
- HEAD: 9a5cbe36
- GitHub source: IMPLEMENTED
- 00_STUDIO_CONTROL prep package: IMPLEMENTED
- Kenpachi machine: NOT_AVAILABLE_YET
- Python/venv import: BLOCKED
- Env rebuild on Kenpachi: REQUIRED
- Current PC retained

