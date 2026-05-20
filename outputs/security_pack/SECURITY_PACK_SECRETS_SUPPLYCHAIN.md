# Security Pack - Secrets + Supply Chain

## Scope
- Secrets hygiene
- Dependency/plugin/asset risk
- CI runner isolation
- GitHub hardening

## Controls (minimum)
1. MFA enabled on Microsoft, GitHub, email, password manager.
2. Use non-admin daily account (`Studio-Dev`), admin only for maintenance.
3. BitLocker active on all studio data volumes.
4. Defender real-time + tamper protection + firewall enabled.
5. RDP disabled unless strict VPN + MFA use-case.

## Secrets
1. `.env`, SSH keys, API tokens, signing certs never committed.
2. Rotate exposed tokens immediately.
3. Prefer short-lived/fine-grained tokens.
4. Store secrets in password manager / secure vault.

## Repo Hygiene
1. `.gitignore` includes `.env*`, key/cert patterns, build secrets.
2. Pre-commit secret scan (gitleaks or detect-secrets).
3. Dependency updates reviewed and pinned.

## Supply Chain
1. Unknown plugin/asset/tool runs first in Sandbox/VM.
2. Record source, hash, version, approver.
3. No unknown scripts as admin.

## CI/Runners
1. No self-hosted runner on primary workstation.
2. Dedicated VM/host for runners.
3. Least privilege on GitHub Actions token permissions.

## Cadence
- Weekly quick audit
- Monthly hardening review
- Immediate review after major toolchain changes
