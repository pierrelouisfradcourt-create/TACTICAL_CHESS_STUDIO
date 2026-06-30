# Mission Contract — template (IMP-222)

oracle_type: structure | claim_verdict: NO_CLAIM_ALLOWED

> Un IMP = un contrat explicite signé AVANT exécution. Le contrat borne le
> périmètre et rend les conditions d'arrêt non négociables. Copier ce fichier,
> remplacer chaque `{{placeholder}}`, supprimer l'exemple.

---

## Contrat : {{IMP-XXX}} — {{titre court}}

### Objectif
{{Une phrase. Le résultat attendu, pas la méthode. Ce qui sera vrai à la fin
qui n'est pas vrai maintenant.}}

### Périmètre
{{Ce qui est dans le scope, borné. Liste de livrables concrets. Si ça déborde,
ce n'est plus ce contrat — ouvrir un nouvel IMP.}}

### Surfaces autorisées
{{Chemins/fichiers/dossiers que l'agent PEUT modifier. Explicites.}}
- `{{chemin/autorise/**}}`

### Surfaces interdites
{{Chemins que l'agent NE touche JAMAIS. Collision avec un autre agent = stop.}}
- `src/` (sauf lane ROCKY_MOTEUR)
- `autopilot.py` (sauf lane STUDIO)
- `tests/`, `eval/`, `oracle/`, `bench/`, `puzzles/` (zone FORBIDDEN — gate Pierre)
- `lab/chains/golden_examples.jsonl` (ne jamais supprimer)
- `{{autres chemins hors-scope}}`

### Critères de succès
{{Mesurables. Adossés à un oracle non-LLM. oracle_type = structure | code | elo | ...}}
- [ ] {{critère 1 vérifiable}}
- [ ] {{critère 2 vérifiable}}

### Conditions d'arrêt
{{Quand l'agent DOIT s'arrêter et escalader plutôt que continuer.}}
- Oracle rouge (global_verdict FAIL) → hard-stop.
- Surface interdite touchée par nécessité → stop, escalade Pierre.
- Hypothèse non vérifiable sans plus de contexte → stop (pas de devinette).
- {{condition d'arrêt spécifique au contrat}}

### Validations obligatoires
{{Les preuves d'exécution à fournir avant tout verdict OK.}}
- {{ex : cargo build --release && cargo test}}
- {{ex : .venv312/Scripts/python.exe -m pytest <chemin>}}
- {{ex : structure des fichiers (ls) pour oracle_type=structure}}

### Artefacts attendus
{{Ce qui doit exister à la fin : fichiers, commits, clôture ledger.}}
- {{fichier(s) créé(s)}}
- commit scope strict `{{type}}({{scope}}): {{IMP-XXX}} — ...`
- clôture `kaizen_loop.py close {{IMP-XXX}}`

### Posture
- software_verdict: {{OK|FAIL|BLOCKED}}
- evidence_verdict: MECHANICAL_VALIDATION_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
- Push = gate Pierre explicite. Jamais de push autonome.

---

## Exemple rempli (court)

### Contrat : IMP-228 — Rocky audit checklist

- **Objectif** : disposer d'une pré-checklist obligatoire avant tout audit moteur,
  pour ne plus re-débuguer un bug déjà corrigé ni conclure sans trace.
- **Périmètre** : un seul fichier `studio/workflows/checklists/rocky_audit.md`.
- **Surfaces autorisées** : `studio/workflows/checklists/**`.
- **Surfaces interdites** : `src/`, `autopilot.py`, `tests/`.
- **Critères de succès** : `- [ ]` items présents (grep root_player, git log fixes,
  oracle ELO daté, benchmark, draw rate, decision trace) ; règle anti-hypothèse incluse.
- **Conditions d'arrêt** : aucune (oracle_type=structure, lecture/écriture markdown pure).
- **Validations obligatoires** : `ls` du fichier + relecture des sections.
- **Artefacts attendus** : le .md, le commit, la clôture ledger.
- **Posture** : software_verdict OK / evidence MECHANICAL_VALIDATION_ONLY /
  claim NO_CLAIM_ALLOWED.
