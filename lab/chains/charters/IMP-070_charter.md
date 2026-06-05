# CHARTER IMP-070 — Roadmap pages par domaine + triage auto + CEO transparence
# Lane : SAFE_AUTO
# Fichier autorisé : autopilot.py uniquement

## RÈGLES ABSOLUES
- Aucun git write
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF — 3 chantiers

### CHANTIER A — Connecter les pages Roadmap aux lanes par domaine

Chaque page roadmap doit afficher les IMPs de son domaine
depuis le ledger (comme page-roadmap-jeux qui marche deja).

1. Identifier l endpoint qui alimente roadmap-jeux (le modele qui marche)
2. Appliquer le meme pattern a :
   - Roadmap IA (page-roadmap-ia)          -> filtre domain=ia_apprentissage
   - Roadmap Studio (page-moteur ou creer) -> filtre domain=studio
   - Moteur & code                          -> filtre domain=rocky_moteur

Chaque page : GET /api/ledger-status -> filtrer open_imps par domain
-> afficher les IMPs du domaine avec statut + bouton "Workflow"

Si une page roadmap n existe pas (Studio), la creer sur le modele jeux.

### CHANTIER B — Triage automatique des IMPs sans domaine

Nouveau endpoint POST /api/triage-imps :
  - Parcourt tous les IMPs OPEN du ledger
  - Pour chaque IMP sans champ domain -> applique _ceo_domain()
    (logique keyword existante : chess fantasy->jeux, lora->ia, etc.)
  - Ecrit le domain dans le ledger (persistant)
  - Retourne {triaged: N, par_domaine: {...}}

Bouton "Trier les IMPs" dans la page Workflow IMP :
  -> appelle /api/triage-imps
  -> rafraichit le dropdown
  -> tous les IMPs dans le bon groupe (plus d Autres)

### CHANTIER C — Panneau transparence CEO Brief

Dans page-pilote, au-dessus du bouton CEO Brief, panneau depliable
"Comment fonctionne le CEO Brief" :

  Le CEO Brief :
  1. Lit les IMPs OPEN du ledger (par domaine)
  2. Les classe en 3 lanes : Rocky/Moteur, IA, Decisions
  3. Pour chaque lane, recommande la prochaine action
  4. Modele : Qwen2.5-14B (Director) ~3s

  Quand tu cliques autoloop sur une lane :
  -> genere le charter de l IMP prioritaire
  -> copie dans Claude Code -> execute -> colle rapport
  -> IMP ferme -> golden_examples +1 -> LoRA s ameliore

Panneau replie par defaut, depliable au clic.
Mini-panneau "i" a cote de Fusion et Pipeline expliquant la boucle.

## VALIDATION
.venv312\Scripts\python.exe -m py_compile autopilot.py

## RAPPORT FINAL
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
chantiers: [roadmap_domaines, triage_auto, ceo_transparence]
