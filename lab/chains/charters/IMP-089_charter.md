# CHARTER IMP-089 — Anti-Skynet + garde-fou + export Claude
# Lane : SAFE_AUTO
# Fichier autorise : autopilot.py uniquement
# claim_verdict: NO_CLAIM_ALLOWED

## DOCTRINE (anti-Skynet)
L idee humaine est une CONSTANTE dans tous les steps.
Qwen2.5 propose, filtre, critique — jamais decide seul.
Pour les zones d incertitude : lever la main (needs_human).

## FIX 1 — Flux humain constant (tous les steps)
Passer idea_title + idea_desc[:200] comme ancre explicite
dans les prompts ROADMAP, REDTEAM, FUSION, EXTRACT.
FUSION reçoit pour mission : "realiser L IDEE HUMAINE
en integrant la critique — pas fusionner deux textes machine"

## FIX 2 — Interdictions solo-dev dans EXTRACT
"INTERDIT : formation, support, deploiement, DevOps,
 gestion equipe. MAX 4 IMPs. 1 IMP = 1 fichier + 1 fonction."

## FIX 3 — Reasoning trace persiste
Dans _stage_proposals(), ajouter :
  human_anchor: {title, desc[:200]}
  reasoning_trace: {roadmap[:400], critique[:400], fusion[:400]}

## FIX 4 — Garde-fou Qwen2.5 (circuit-breaker)
Dans chaque prompt du pipeline, ajouter :
"Si l idee est trop vague ou tu n es pas certain,
 retourne UNIQUEMENT : {\"needs_human\": true, \"reason\": \"...\"}
 Ne produis jamais d IMPs approximatifs."
Apres chaque lm_call(), detecter needs_human → stopper pipeline
→ afficher raison dans le modal.

## FIX 5 — Bouton "Ouvrir dans Claude" (fallback extract)
Si extract produit 0 IMP ou signal needs_human :
→ bouton "Ouvrir dans Claude" dans le modal
→ zone texte avec prompt extract pre-rempli
→ champ pour coller le JSON retourne par Claude
→ bouton "Injecter ce JSON" bypasse Qwen2.5 → staging direct

## VALIDATION
.venv312\Scripts\python.exe -m py_compile autopilot.py

## RAPPORT FINAL
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
fixes: [flux_humain, interdictions, reasoning_trace, garde_fou, export_claude]
