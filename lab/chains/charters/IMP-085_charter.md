# CHARTER IMP-085 — CEO-Decomposer V1
# Lane : SAFE_AUTO
# Fichier autorise : autopilot.py uniquement
# claim_verdict: NO_CLAIM_ALLOWED

## CONTEXTE (audit V1)
Le pipeline idee Step 4 (extract) tourne sur Qwen2.5-14B avec un
decoupage naif. Resultat : IMP-083 = 1 IMP vague (titre recopie).
Bug critique decouvert : _stage_proposals hardcode files:[] et
acceptance:TBD meme quand l extract les produit -> les champs sont perdus.

Conception : REMPLACER le modele + enrichir le prompt de l etape extract
existante (pas de nouvelle etape). 4 changements chirurgicaux.

## CHANGEMENTS

### [1] Step 4 extract — forcer Qwen3.6
Sur le SEUL appel lm_call de l etape extract, ajouter l argument explicite :
  model=LM_MODEL_CEO
Les 3 autres etapes (roadmap/redteam/fusion) restent SANS model=
-> elles continuent sur Qwen2.5-14B rapide. Ne pas y toucher.

### [2] Step 4 extract — enrichir le prompt
Avant le texte "Transforme ce plan en IMPs...", injecter le contexte ledger :

  open_imps = build_fusion_context()["open_imps"]  # ou source equivalente
  open_imps_context = "\n".join(
      f"  - {i['id']} [{i.get('lane','?')}] {i.get('title','')}"
      for i in open_imps[:15]
  ) or "  (aucun)"

Ajouter dans le prompt :
  "IMPs deja OPEN dans le ledger (eviter doublons, calculer blocked_by) :"
  {open_imps_context}
  "REGLE DE GRANULARITE : chaque IMP = 1 tache bornee (max 1-2 sessions)."
  "Si une etape est trop grosse, la decouper en 2-3 IMPs distincts."

Ajouter blocked_by dans le schema JSON exemple :
  "blocked_by": ["IMP-XXX"]   // IMPs OPEN existants dont ce IMP depend, [] sinon

Ne PAS toucher : contraintes stack, regles domain, claim_verdict (deja OK).

### [3] _stage_proposals — arreter de jeter files/acceptance (BUG CRITIQUE)
Actuellement files:[] et acceptance:TBD sont hardcodes.
Lire les vraies valeurs de l extract :
  "files": imp.get("files", [])
  "acceptance": imp.get("acceptance", "TBD")

### [4] _stage_proposals — propager blocked_by
Ajouter dans le YAML stage :
  "blocked_by": imp.get("blocked_by", [])

## HORS SCOPE V1 (-> V2)
- Dependances entre les NOUVEAUX IMPs entre eux (tri topologique)
- Validation que les IMP-IDs de blocked_by existent vraiment
- CEO-Intake (poste GO/NO-GO en amont) — separe

## VALIDATION
.venv312\Scripts\python.exe -m py_compile autopilot.py
# Test reel : relancer l idee "Cockpit Agents lecture seule"
# -> doit produire 3-4 IMPs nets avec files reels + acceptance testable
# (et non 1 IMP vague comme IMP-083)

## RAPPORT FINAL
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
changements: [qwen36_extract, prompt_ledger_contexte, fix_files_acceptance, blocked_by]
