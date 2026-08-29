# Archive des contrats one-shot

Décision Paquet A #7, ratifiée Pierre 2026-08-28. Critère d'archivage : mission
one-shot exécutée et terminée, preuve dispatch_audit — pas un contrat de la
chaîne canonique (13 étapes) ni un contrat encore câblé/consommé par du code.
Les contrats archivés restent lisibles ici ; rien n'est supprimé.

`wm1-wiremap-tetris.yaml` reste CONSERVÉ hors archive (décision 9) : c'est lui
qui porte l'exigence explicite des 10 lignes CORE (`docs/forge/FORGE_STATE_V2_0.md`
l.24, exigence décrite dans le contrat lui-même l.106-108). `wm1-wiremap-breakout.yaml`
reste également CONSERVÉ hors archive : référencé par du code exécutable
(`scripts/observer/pedagogy.py::_piece_wiremap`, `scripts/observer/system_artefacts.py`
`_WORKFLOW_BLOCKS`/`_FLOW_STEPS`), pas seulement en commentaire/doc.
