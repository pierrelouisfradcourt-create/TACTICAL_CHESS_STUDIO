TACTICAL CHESS — RUST ARCHITECTURE PATCH

OBJECTIF
Ajouter 3 modules Rust pivots :
- ruleset_compiler.rs
- telemetry_logger.rs
- experiment_orchestrator.rs

ET préparer une architecture studio plus propre :

src/
  analytics/
  compiler/
  orchestrator/
  rules/
  telemetry/

CE PATCH EST UN SQUELETTE PROPRE
Il n'écrase pas ton moteur existant.
Il ajoute des modules prêts à brancher progressivement.

INSTALLATION
1. Dézipper dans TACTICAL_CHESS_STUDIO
2. Ouvrir TacticalChessV1
3. Copier les dossiers / fichiers dans src/
4. Ajouter les `mod` indiqués dans PATCH_INTEGRATION_GUIDE.txt

ORDRE CONSEILLÉ
1. compiler
2. telemetry
3. orchestrator

BUT
- charger des blueprints / paramètres de règles
- enregistrer la télémétrie des runs
- orchestrer des campagnes de simulation
