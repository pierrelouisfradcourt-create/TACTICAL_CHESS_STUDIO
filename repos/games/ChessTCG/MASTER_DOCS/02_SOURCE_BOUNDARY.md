# Chess TCG Source Boundary

status: DOCUMENTED_ONLY

## Source Classes

| source class | status | use |
|---|---|---|
| active Chess TCG code | NOT_FOUND | no runtime exists |
| Chess TCG canonical docs | DOCUMENTED_ONLY | local project anchor only |
| TacticalChessPureLab code | PASSIVE | reference only unless explicitly reused |
| TacticalChessPureLab master docs | PASSIVE | architecture context only |
| external bibles/downloads | PASSIVE | non-canonical design input |
| datasets/models/runs | BLOCKED | not part of Chess TCG docs-only phase |

## Canonization Rule

created != registered != loaded != enforced != evidenced

No external file becomes Chess TCG truth just because it exists locally or was mentioned in conversation.

## Claim Rule

Default:

```text
claim_verdict: NO_CLAIM_ALLOWED
```

No gameplay, balance, strength, training, benchmark, scientific, or product-readiness claim is allowed from this docs-only shell.

