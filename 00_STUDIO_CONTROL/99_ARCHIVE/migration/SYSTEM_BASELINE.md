# SYSTEM_BASELINE

status: DOCUMENTED_ONLY

## Kenpachi Fresh Windows Bootstrap Checklist

| component | installed_version | official_latest_candidate | status | action_required |
|---|---|---|---|---|
| Windows Update | UNKNOWN | UNKNOWN | UNKNOWN | HUMANGATE_REQUIRED |
| NVIDIA driver | UNKNOWN | UNKNOWN | UNKNOWN | HUMANGATE_REQUIRED |
| AMD chipset driver | UNKNOWN | UNKNOWN | UNKNOWN | HUMANGATE_REQUIRED |
| MSI motherboard drivers | UNKNOWN | UNKNOWN | UNKNOWN | HUMANGATE_REQUIRED |
| BIOS/firmware detect/report | UNKNOWN | UNKNOWN | UNKNOWN | HUMAN_REVIEW |
| Codex | UNKNOWN | UNKNOWN | UNKNOWN | HUMANGATE_REQUIRED |
| GitHub | UNKNOWN | UNKNOWN | UNKNOWN | HUMANGATE_REQUIRED |
| VPN | UNKNOWN | UNKNOWN | UNKNOWN | HUMANGATE_REQUIRED |
| Git | UNKNOWN | UNKNOWN | UNKNOWN | HUMANGATE_REQUIRED |
| Rust | UNKNOWN | UNKNOWN | UNKNOWN | HUMANGATE_REQUIRED |
| Python | UNKNOWN | UNKNOWN | UNKNOWN | HUMANGATE_REQUIRED |

Allowed on fresh Kenpachi:

- Automatic Windows/driver update bootstrap when HumanGate authorizes the bootstrap policy.
- Record versions after update.

Manual review boundary:

- BIOS/firmware flash requires manual review unless explicitly allowed.

## Status Values

- CURRENT
- UPDATE_AVAILABLE
- UNKNOWN
- BLOCKED

## Action Required Values

- NONE
- HUMAN_REVIEW
- HUMANGATE_REQUIRED
