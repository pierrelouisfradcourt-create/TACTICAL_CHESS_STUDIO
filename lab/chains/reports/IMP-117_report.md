# Rapport IMP-117 — Garde-fou longueur + mots-clés dans _auto_close_from_report()

**Session:** 2026-06-25
**Lane:** SAFE_AUTO
**Domaine:** studio
**Effort:** SMALL · **Impact:** LOW
**Fichier modifié:**
- `autopilot.py` → fonction `_auto_close_from_report()` (lignes ~1832-1847)

## Acceptance (ledger)

> Le code ajoute une condition qui vérifie la longueur du texte et des mots-clés
> spécifiques dans `_auto_close_from_report()`.

✅ Satisfaite — voir ci-dessous.

## Changement

Avant le parsing du rapport, lecture unique de `raw_text` puis deux gardes :

- **Longueur** : rejet si `len(raw_text.strip()) < MIN_REPORT_LEN` (`MIN_REPORT_LEN = 40`,
  constante nommée — pas de magic number).
- **Mots-clés** : rejet si l'un des `REQUIRED_KEYWORDS` manque —
  `software_verdict`, `evidence_verdict`, `claim_verdict` (les 3 clés de verdict
  émises par les templates de rapport valides, cf. `autopilot.py:952-954`).

En cas de rejet, `result["error"]` est renseigné dans le style existant de la
fonction et la fonction retourne avant `analyse_report` / `close_imp`. `imp_id`
est défini en amont de la garde → pas de `NameError`. `raw_text` est réutilisé
pour le parsing aval (pas de double lecture du fichier).

## Validation (oracle)

Aucun test n'existe sur `_auto_close_from_report` (`grep tests/` = rien). La garde
a été exercée directement ; `autopilot.py` s'importe proprement sous le python
Linux de WSL.

| Cas | Entrée | Comportement attendu | Verdict |
|---|---|---|---|
| 1 | rapport 5 car. | rejet « rapport trop court (5 car., minimum 40) » | ✓ |
| 2 | 50 car., 1 seul mot-clé | rejet « mots-clés manquants : evidence_verdict, claim_verdict » | ✓ |
| 3 | 3 mots-clés présents | passe la garde → atteint `analyse_report` | ✓ |

3/3. La garde rejette le tronqué/vide et laisse passer le valide.
`ast.parse` du fichier : OK (python3.12).

## Erreurs évitées

- Pas de double lecture du fichier — `raw_text` réutilisé.
- `MIN_REPORT_LEN` constante nommée — conforme règle « pas de magic numbers ».
- Aucune zone FORBIDDEN touchée (`tests/ eval/ oracle/ bench/ puzzles/ .github/`).
  `git diff` ne montre que `autopilot.py` comme modif fonctionnelle.

## Limite honnête

Le `.venv/Scripts/python.exe` (suite pytest complète) est un venv **Windows**, non
exécutable depuis WSL Linux — la suite complète n'a pas tourné. Sans objet ici :
aucun test ne couvre cette fonction ; l'oracle pertinent (comportement de la garde)
est vert ci-dessus.

## Verdicts

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
