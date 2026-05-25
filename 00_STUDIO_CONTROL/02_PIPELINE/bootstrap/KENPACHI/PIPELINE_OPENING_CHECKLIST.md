# Pipeline Opening Checklist

profile: KENPACHI
status: DOCUMENTED_ONLY
scope: machine bootstrap profile, not pipeline core

Use this checklist only for the Kenpachi bootstrap profile. Generic pipeline rules live in `11_PIPELINE_CORE`.

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
- [ ] TacticalChessPureLab cloned to the correct Kenpachi path.
- [ ] `00_STUDIO_CONTROL` copied from preparation package to `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\`.
- [ ] `.venv312` rebuilt on Kenpachi, not imported.
- [ ] `target` rebuilt on Kenpachi, not imported.

## Control Package Checks
- [ ] `AAA_STUDIO_CODEX_PLACEMENT_CONTRACT_V3_1.md` or mapped placement contract present and readable.
- [ ] `00_STUDIO_CONTROL` official placement verified on Kenpachi.
- [ ] CI billing blocked status accepted: BLOCKED_ACCEPTED_NO_PAYMENT.

## Import Guardrails
- [ ] No datasets imported.
- [ ] No models imported.
- [ ] No old parent imported.
- [ ] No Python/venv copied from current PC.
- [ ] No target/cache copied from current PC.
- [ ] No logs or runtime outputs copied as canonical evidence.

## Source Context
- Repo branch: main
- GitHub source HEAD: 9a5cbe36
- GitHub source: IMPLEMENTED
- TacticalChessPureLab clone: REQUIRED_ON_KENPACHI
- `00_STUDIO_CONTROL` prep package: IMPLEMENTED
- Kenpachi machine: NOT_AVAILABLE_YET
- Windows 11: REQUIRED
- Drivers: REQUIRED_FROM_TRUSTED_SOURCES
- Git/Codex/Rust/Python: REQUIRED
- Python/venv import: BLOCKED
- `.venv312` rebuild on Kenpachi: REQUIRED
- `target` rebuild on Kenpachi: REQUIRED
- Current PC retained

## Preserved Doctrine
- Rust = runtime truth.
- Python = ML / inference / tooling.
- Search = final gameplay authority.
- Neural = propose/rerank only.
- Dataset labels require ActionId, LegalAction, ActionMask, provenance, HumanGate.
- Logs, reports, latest.json, benchmarks, and runs are observations only.
- HumanGate decides activation, promotion, merge, reject, freeze, push, PR, CI, datasets, models, and claims.
- Default claim_verdict: NO_CLAIM_ALLOWED.
