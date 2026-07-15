# Contexte courant TCS

## Session 2026-07-15 (GROSSE journée) — la Forge gagne sa MÉMOIRE QUI COMPOSE
Audit cognitif « studio cohérent ? » → cohérent en prod, dérivait au niveau studio. Puis grande session
« mémoire qui compose » (méthode : recherche sources béton → brainstorm → délégation → vérif → commit).
**Tout committé + poussé sur `feat/forge-oracle-gate`** (jusqu'à `9e2362e`).

**Ce que la Forge a gagné (généré depuis le réel, increvable) :**
- **4 tables générées** : `STUDIO_STATUS` (auto-audit L1, rafraîchi au pre-commit) · `AGENT_CONTEXT_MAP` ·
  `MASTER_INDEX` (sources de vérité) · `COMPONENT_DESIGN` (composants du code). Mémoire ADRESSABLE. [[forge_cognitive_audit]]
- **Boucle d'apprentissage FERMÉE des 2 côtés** : journal d'erreurs qui COMPOSE (erreur+réparation) + découpé
  par domaine (html/python/rust/godot/forge/_global_) + **auto-écrit sur échec** + **relu au retry** (driver) +
  **lire-d'abord/écrire-si-nouveau** (skill) + **date ISO lisible**. Fichiers `studio_link.py`, `driver.py`, skill.
- **Bug timeout Windows P0 CORRIGÉ** (`9e2362e`) : tue l'arbre de process (taskkill /T) + salvage le build au
  lieu de le jeter (prouvé sur un vrai petit-fils). → **le run shmup peut être repris pour un vrai verdict.**
- **Doctrine de délégation** gravée dans CLAUDE.md (orchestrateur = garde-fou à contexte propre) [[delegation_clean_verifier]].

**Étendu à NOUS (Claude↔Pierre), pas que la Forge :**
- `memory/session_lessons.md` — journal de leçons (erreur/fix/pourquoi), déclencheur = correction de Pierre.
- `memory/research_agent_selfimprovement.md` — recherche sourcée béton : studio DÉJÀ aligné SOTA (journal=Reflexion,
  oracle=vérificateur, délégation=Anthropic) ; **top levier neuf = skill library exécutable (Voyager)**.

**Décision d'architecture RATIFIÉE (diviser, pas de monolithe) :**
```
BIBLIOTHÈQUE {assets 3D | code (logique) | rôles}  = le vérifié réutilisable (knowledge_base = embryon)
DOSSIER RÉFÉRENCE {recherche | décisions}          = le savoir/pourquoi (Research + Project Bible)
```

## ⏸️ SUITE / GATES AU RETOUR (décisions Pierre)
- **cp1252/F5c** : correctif hérité prêt (mêle cp1252 + un changement de logique verdict F5c). Reco Fable : commiter le tout. **Gate toi.**
- **Dossier de référence** : en construction dans un AUTRE chat (prompt de reprise livré ; ce chat a drifté « bille en tête » → redirigé, cf. [[session_lessons]] L6). Structure à co-décider (candidate→validated ? confiance vs tier ?).
- **Project Bible du shmup** : 10 min avec ta vision (mécanisme prêt, aucune bible réelle écrite).
- **Skill library (rayon code)** : le gros levier suivant, APRÈS le dossier de référence. Réutiliser knowledge_base.
- **Re-run shmup** : timeout fixé → reprendre pour un vrai verdict signé.
- Petits que Fable fait : R1 CLAUDE.md (règles périmètre en positif) · dérive `memory/` dans l'ATLAS · L5 connecteurs dormants.
- **3D** : `RealESRGAN` téléchargé (`~/3d-pipeline/…/hy3dpaint/ckpt/`), texture NON testée ; pas de validateur 3D [[forge_3d_pipeline]].

## Sessions 2026-07-14 clôturées
- **shmup run1** (« Fable 5 Forge supervisor role ») : 1er run FULL réel s0→s12, jeu temps-réel 3 maps+3 boss
  jouable+solvable+e2e — MAIS **faux BLOCKED** (bug timeout Windows : petit-fils claude.exe non tué, build
  sonnet 2h15 jeté). Mutation 70.5% (tests faibles). Décision **AMÉLIORER AVANT PROCHAIN RUN**. [[forge_shmup_run1]]
- **Pipeline 3D locale** (« 3D asset generation ») : Hunyuan3D-2.1 + Blender 5.1.1 + CUDA sur RTX 5080, **HORS
  repo** (`~/3d-pipeline` WSL2). Génération de FORME prouvée bout-en-bout ; texture bloquée (RealESRGAN). [[forge_3d_pipeline]]

## Historique condensé (détail en git / RESULTS / journal)
- 2026-07-13 : s9 amendé SEARCH-d'abord + `reuse_ratio.mjs` ; 2 ROLE (pursuer-continuous, guardian-static) +
  `role_sim.mjs` généralisé ; test externe s9 (chase_prototype) → `search.mjs` corrigé (fiches autonomes).
  COMMITÉ `dbcfd2b`.. (dans les 27 non poussés). Détail : `knowledge_base/roles/RESULTS_*.md`.
- 2026-07-12 : plans archi studio (3 docs, maintenant commités+corrigés) ; KB par ingestion (`kb_tactics` oracle
  4/4) ; s10d E1 SUCCESS ; `forge-live.html`. Archives : `journal/context-archive-2026-07-12.md`.
- 2026-07-09→11 : /forge usine contractuelle MERGÉE master (13 contrats, ADR-002, e2e+gel+mutation).
  `a293723`→`87e9ec4` · [[forge_contract_dispatcher]]. Antérieur : `journal/context-archive-2026-07-05/06/08.md`.

## ⚠️ DÉCISION MAJEURE — PIVOT PRODUIT (ratifié Pierre, 2026-07-05/06)
> **Toute session future qui propose du travail Rocky ou de l'outillage builder DOIT renvoyer ici.**
- **Rocky : GEL.** Aucune session d'optimisation moteur sans HumanGate explicite.
- **Factory réorientée** : jeux de cartes FR — **Belote = produit 1**, **Tarot = produit 2** (moteur de plis commun).
- Actions pendantes : re-triage ledger (IMP Rocky → FROZEN, revue HumanGate avant écriture) ; spec produit Belote
  (IA à niveaux, défi-par-seed, PWA mobile-first) ; étage 2 = table WebRTC, multi public gated.

## Impasses / doctrine (portées)
- LEDGER canonique = `lab/chains/IMPROVEMENT_LEDGER.yaml` ; écrire via `kaizen_loop.py`.
  `settings.json` : `Write/Edit(lab/chains/**)` en **ask** (mitigation IMP-247) — attendu, pas un bug.
- **Forge** : `is_clean_pass()` = seul prédicat de passage propre ; `software_verdict` seul ≠ signal de promotion ;
  survivant mutation trié = objection, jamais READY propre. Recette d'audit : `grep -rn 'software_verdict.*==.*OK'`.
- `train.py` gelé (Rocky = GEL). Serveur builder : `node demo-server.ts` :3000.
- Une variable à la fois · fondations avant features · **aucun commit/push sans go explicite Pierre**.
