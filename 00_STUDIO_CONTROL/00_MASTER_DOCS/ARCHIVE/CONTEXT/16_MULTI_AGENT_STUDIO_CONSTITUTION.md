# Multi‑Agent Studio Constitution

## Objectif

Ce document définit la **constitution** d’une usine de jeux et d’applications pilotée par IA destinée à un développeur solo.  Il s’inspire de l’architecture en couches existante du dépôt * TacticalChessPureLab * et des retours d’expérience récents sur les systèmes multi‑agents et la gouvernance des agents.  Il sert de contrat de référence pour organiser, gouverner et sécuriser les interactions entre un orchestrateur central et une collection d’agents spécialisés.

Ce document **n’est pas une preuve scientifique d’amélioration de performances**, conformément aux règles d’**Evidence Plane**.  Il décrit simplement une architecture et des pratiques de gouvernance pour l’automatisation de la production de jeux et d’applications.

## Principes fondamentaux

1. **Séparation des responsabilités** : Chaque agent a une mission bien délimitée et ne doit pas empiéter sur les responsabilités des autres.  Le cœur du runtime (moteur de jeu, règles déterministes et recherche) reste l’autorité finale sur l’état et les actions légales【49218901315186†L82-L104】.
2. **Orchestrateur central (Producer AI)** : À la place d’une IA monolithique, on utilise un orchestrateur qui découpe les demandes humaines en *task packets*, planifie l’ordre des opérations, applique les règles de gouvernance et distribue les tâches aux agents spécialisés【244599497066416†L33-L89】.  L’orchestrateur ne code rien, ne modifie pas le moteur et ne prend pas de décisions scientifiques ; il coordonne et vérifie.
3. **Isolation et gouvernance** : Les agents communiquent via des *packets* définis.  Ils n’accèdent qu’aux informations nécessaires (principe du *least privilege*).  Une politique *zero‑trust* est imposée : chaque message est inspecté pour éviter les injections de prompt, la contamination de contexte et la dérive comportementale【942511202706884†L271-L343】.
4. **Pipelines contrôlés** : Les workflows automatisés (par ex. génération de code, tests, documentation) sont exécutés dans des sandboxes séparées et enregistrés.  Les verdicts par défaut sont `NO_CLAIM_ALLOWED` pour tous les travaux automatisés【49218901315186†L286-L310】.  Les humains restent les seules autorités pour fusionner une PR ou déclarer un résultat.
5. **Adoption progressive** : Ajouter des agents augmente la complexité, la latence et la surface d’attaque.  On n’ajoute un nouvel agent que lorsque le contexte, la parallélisation ou la spécialisation justifie ce coût【244599497066416†L33-L89】.

## Rôles et services IA

Le tableau ci‑dessous propose une liste d’agents et de leurs rôles.  Ces rôles sont inspirés à la fois de l’architecture interne existante, de la plateforme **Factory AI** et des pratiques documentées en 2026【765736915354946†L280-L321】.  Les rôles décrits sont des **guidelines** ; ils peuvent évoluer selon les besoins.

| Service IA              | Rôle principal                                                                                                                                                                | Contrôles/Gardes‑fous                                                                                                                                                                                                                                                                       |
|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Producer AI (orchestrateur)** | Découpe les demandes humaines en paquets de tâches, planifie la roadmap, fixe les priorités et gère l’ordre d’exécution.  Ne code pas, ne modifie pas le moteur.  Vérifie que les tâches proposées respectent la constitution. | Vérifie la légitimité d’un ticket avant de l’assigner.  Déclenche l’**Engine Architect AI** pour valider toute modification touchant au runtime.  Applique un scorecard pour éviter d’enchaîner des tâches risquées.  Peut figer ou débloquer des *lanes*. |
| **Engine Architect AI**     | Gardien du moteur : protège le déterminisme, les règles, la séparation entre recherche et réseau de neurones.  Vérifie que chaque patch respecte les couches et les dépendances.                | Peut rejeter une PR qui modifie le runtime sans tests ou qui introduit de la non‑déterminisme.  Utilise des scripts de simulation/undo pour détecter des changements dangereux.  Ne fusionne jamais ; soumet au Producteur une recommandation. |
| **Game Design AI**         | Transforme une idée de gameplay en spécification structurée : MVP, objectifs ludiques, risques de fun, non‑objectifs.  Propose des PR dans un format interopérable avec le moteur.             | Doit s’appuyer sur des gabarits validés par l’Engine Architect.  Ne modifie pas directement le runtime.  Utilise la bibliothèque d’unités/objets existante. |
| **Code AI**                | Écrit le code pour la partie runtime ou gameplay spécifiée par le Producteur.  Ne sort pas de son périmètre.                                                            | Fonctionne comme un *Code droid*.  Doit fournir un plan d’implémentation et des commits atomiques.  Ne s’auto‑note jamais. |
| **Review AI**              | Critique les PR.  Lit le diff, vérifie la cohérence et la conformité aux normes de code et d’architecture.  Ne code rien.                                            | Doit s’exprimer via des commentaires structurés.  Peut demander des corrections.  N’approuve jamais ses propres modifications. |
| **Docs AI**                | Met à jour la documentation après toute modification.  Veille à ce que l’architecture décrite reste fidèle au code.                                                   | Doit déclencher une alerte si la documentation et le code divergent. |
| **Test/QA AI**             | Génère et exécute des tests unitaires et contractuels.  Détecte les régressions.  Refuse de masquer un échec.                                                         | Utilise des sandboxes hermétiques.  Les résultats sont enregistrés dans la télémétrie.  Refuse un commit si un test échoue. |
| **Content AI**             | Génère des unités, factions, cartes ou scénarios avec des budgets de puissance et de rareté.  Valide la cohérence avec les règles.                                   | Doit être couplé à des scripts de validation déterministes.  Ne génère pas de contenu cassé. |
| **AI Gameplay**            | Conçoit les comportements d’IA (stratégies, priorités) sans prendre l’autorité de la recherche.  Propose des reward shaping ou des fonctions de coût.                | Doit être validé par l’Engine Architect.  Utilise l’analyse de parties et la télémétrie pour identifier les faiblesses.  Ne reprogramme jamais le moteur. |
| **Balance AI**             | Analyse les résultats des simulations pour détecter des déséquilibres (taux de victoire, stratégies dominantes).  Recommande des ajustements de puissance.                 | Ses recommandations ne sont pas appliquées automatiquement ; elles passent par le Game Design AI et le Producteur pour validation. |
| **Simulation Lab AI**      | Planifie des expériences et des campagnes de simulation : hypothèses, scénarios, métriques, taille d’échantillon.  Distingue exploration et évaluation.                 | Doit respecter la séparation entre benchmark de santé et preuves de performance【132914919030256†L61-L76】.  Les rapports n’ont pas valeur de preuve scientifique sans validation humaine. |
| **Memory AI**              | Indexe tous les documents, PR, décisions et erreurs passées.  Fournit un contexte partagé aux autres agents.                                                           | Applique le principe de confidentialité et de pertinence : on ne fournit que les informations nécessaires à l’agent demandeur.  Vérifie les droits d’accès avant chaque requête. |
| **Business/Analytics AI**   | Suit les budgets temps, estime les coûts, hiérarchise les ROI, gère l’économie du jeu et la monétisation.                                                             | Ses analyses ne doivent pas influencer les décisions de design sans passer par le Producteur. |
| **Community/Marketing AI** | Rédige les patch notes, les actualités et la communication avec les joueurs.                                                                                            | Ne promet jamais des performances non démontrées.  Toutes les annonces passent par la revue humaine. |

## Architecture technique

### 1. Couches du runtime

Le projet repose sur une architecture en **cinq couches** :

1. **Runtime Core (Rust)** : autorité ultime sur l’état du jeu ; applique les règles, gère la recherche déterministe, l’évènementiel et la télémétrie.
2. **Game Adapter Layer** : adapte le runtime générique à un jeu spécifique (échecs classiques, variantes, jeux de cartes, etc.).
3. **Environment Boundary** : expose une API stable (`reset()`, `legal_actions()`, `step()`, `observation()`, `is_done()`) pour les agents.
4. **Agent Layer** : implémente des agents (aléatoire, heuristique, recherche, réseau de neurones) sans jamais modifier l’état directement ; toutes les actions passent par l’API de l’environnement.
5. **Automation/Data/Telemetry** : gère la génération de données, la télémétrie et l’automatisation (self‑play, entraînement, évaluation).  Cette couche n’a pas de prise sur le runtime【132914919030256†L76-L96】.

Cette séparation garantit que les innovations (recherche, réseau de neurones, contenu) ne corrompent pas le cœur déterministe.

### 2. Pipeline de décision

Le cheminement d’une action dans le système suit la séquence suivante : `GameState -> RuleExecutor -> Vec<LegalAction> -> Observation + Mask -> DecisionController -> (neural guidance + search) -> Action -> Telemetry -> Evaluation -> Training`.  Le moteur reste l’autorité du monde, la recherche reste l’autorité de la décision, et les réseaux de neurones ne décident jamais seuls.

### 3. Orchestrateur multi‑agents

L’orchestrateur, appelé **Producer AI**, gère la coordination des agents.  Il reçoit une demande humaine, la découpe en tâches, vérifie la légitimité de chaque tâche et la transmet à l’agent approprié.  Après exécution, il collecte les rapports (test, revue, doc) et vérifie qu’ils respectent la constitution et les règles du dépôt.

Chaque tâche est encapsulée dans un **`TaskPacket`** :

```rust
pub enum AgentTask {
    GameDesign,
    EngineArchitect,
    Code,
    Review,
    Docs,
    TestQA,
    Content,
    AIGameplay,
    Balance,
    SimulationLab,
    Memory,
    BusinessAnalytics,
    CommunityMarketing,
}

pub struct TaskPacket {
    pub task: AgentTask,
    pub description: String,
    // metadata : contexte, priorités, dépendances
}

pub struct Orchestrator {
    // file d’attente de tâches
}

impl Orchestrator {
    pub fn enqueue(&mut self, packet: TaskPacket) {
        // ajouter à la queue
    }

    pub fn dispatch_next(&mut self) {
        // dépiler et transmettre à l’agent approprié
    }
}
```

Le code ci‑dessus n’est qu’un squelette non connecté au runtime.  Il illustre la structure souhaitée : l’orchestrateur maintient une file de tâches et les distribue.

### 4. Sécurité et gouvernance

Un système multi‑agents augmente la surface d’attaque : prompt injection, contamination de contexte, escalade de privilèges.  Pour se défendre :

1. **Rôles et permissions** : chaque agent a un identifiant unique et des permissions explicites.  Le Producteur contrôle les autorisations et applique une politique du *moindre privilège*.  Un agent ne peut pas agir en dehors de son rôle【942511202706884†L344-L355】.
2. **Contexte isolé** : les agents opèrent dans des contextes sandboxés.  Les communications passent via des structures de données sérialisées (par exemple des JSON ou des enums) et non via des prompts textuels libres.  Les messages sont inspectés pour éviter les injections de prompt【942511202706884†L271-L343】.
3. **Supervision et logs** : toutes les interactions sont journalisées.  Les écarts de comportement (par ex. un agent qui tente d’accéder à un fichier non autorisé) déclenchent une alerte.  Des audits réguliers détectent la dérive de prompts ou la contamination de modèles.
4. **Hardening de l’orchestrateur** : la couche d’orchestration est renforcée.  Elle valide la structure des paquets, vérifie les signatures des agents et applique des filtres de contenu avant d’exécuter une action【942511202706884†L344-L355】.

### 5. Cycle de conseil et amélioration continue

Pour éviter que le système ne s’embourbe ou qu’une erreur se propage, on met en place un **conseil d’agents**.  Lorsque le Producteur reçoit une demande stratégique ou un changement majeur, il sollicite plusieurs agents pour qu’ils proposent des plans.  Ces plans sont ensuite soumis à des rounds de **défi** et d’**amélioration** :

1. **Proposition initiale** : un agent (par ex. Game Design AI) propose un plan.
2. **Défi croisé** : un autre agent (par ex. Balance AI ou Simulation Lab AI) critique le plan, détecte les zones d’ombre (par exemple, absence de métriques de déséquilibre, risque de surcoût) et propose des correctifs.
3. **Révision** : l’agent initial intègre les corrections ou justifie ses choix.
4. **Validation** : Engine Architect AI vérifie la compatibilité avec les règles du runtime, puis Review AI vérifie la forme.
5. **Boucle répétée** : ce cycle se répète **au moins dix fois** ou jusqu’à ce que le consensus soit atteint.  L’objectif n’est pas la perfection théorique mais une amélioration incrémentale et la détection des angles morts.

Ce processus de confrontation structuré renforce la robustesse des décisions et limite l’apparition de dettes techniques ou de dérives de gouvernance.

### 6. Choix de moteurs de recherche et de neurones

Pour piloter efficacement l’usine, plusieurs types de moteurs et de stratégies de recherche sont nécessaires :

1. **Recherche déterministe (Minimax/Alpha‑Beta)** : sert de référence pour la correction et la sécurité du moteur.  Toujours disponible pour vérifier les suggestions de neurones.
2. **Monte‑Carlo Tree Search (MCTS)** : couplée à une *policy network* et à une *value network*.  Permet de concentrer l’exploration sur des lignes prometteuses et de produire des statistiques pour la Balance AI.
3. **Heuristiques spécialisées** : pour des jeux avec des caractéristiques spécifiques (graphes, combos, deck‑building), des heuristiques adaptées peuvent accélérer la recherche sans recourir immédiatement à un réseau de neurones.
4. **Réseaux de neurones** : 
   - **Policy network** (réseau de politique) : propose des coups plausibles, sert de filtre de priorisation pour MCTS.  Formé sur des parties humaines et les expériences internes.  Exécute sur GPU via PyTorch ou TensorFlow.
   - **Value network** : estime la valeur d’un état (victoire, équilibre, danger) pour accélérer MCTS et guider la recherche.  Doit être entraîné en tenant compte de la variance et de la profondeur limitée des parties【132914919030256†L130-L141】.
   - **Retrieval‑assisted networks** : utilisent un index (vectoriel ou base de données) pour récupérer des motifs ou des parties similaires et fournir un contexte au réseau de politique【132914919030256†L96-L99】.
5. **Apprentissage par renforcement (RL)** : utilisé pour entraîner les réseaux de politique et de valeur à partir d’autoplay.  La boucle `jeu -> log -> cluster -> entraîner -> améliorer` décrit un processus RL basé sur des auto‑parties et des données adaptatives【132914919030256†L20-L29】.  Attention : ces apprentissages ne sont pas des preuves de force tant qu’ils ne sont pas validés par un benchmark contrôlé.

## Conclusion

L’usine multi‑agents proposée offre une architecture ambitieuse et réaliste pour un développeur solo.  La clé réside dans la **discipline** : séparation des responsabilités, orchestration centralisée, sécurité renforcée, limitation des claims et boucles de défi itératives.  Les agents spécialisés se complètent, l’orchestrateur veille à la cohérence, et l’humain demeure l’ultime arbitre.  Ce document doit évoluer avec les retours d’expérience, mais il constitue une base solide pour automatiser la production de jeux et d’applications tout en respectant les principes du dépôt et de la science ouverte.