# Tutoriel : Workflow multi‑agents et PR

Ce tutoriel explique comment utiliser l’architecture multi‑agents décrite dans `16_MULTI_AGENT_STUDIO_CONSTITUTION.md` pour soumettre et gérer des Pull Requests (PR).  Il illustre le rôle de chaque agent, la séquence des opérations et les garde‑fous à respecter pour automatiser le développement tout en conservant la cohérence et la sécurité.

## Rappel des règles de gouvernance

1. **Un objectif = une PR** : chaque PR doit poursuivre un objectif précis (bug fix, nouvelle fonctionnalité, mise à jour de documentation, ajout de tests).  Les tâches multiples doivent être découpées en plusieurs PR.
2. **Rôles distincts** : l’agent qui écrit le code n’est jamais celui qui le relit ou qui met à jour la documentation.  L’orchestrateur (Producer AI) est responsable de l’attribution des rôles et de l’ordre des opérations【765736915354946†L280-L321】.
3. **Pas de revendication de performance** : les PR ne doivent pas prétendre améliorer la force ou l’Elo.  Les verdicts `claim_verdict` restent par défaut à `NO_CLAIM_ALLOWED`【49218901315186†L286-L310】.  Les benchmarks servent uniquement à vérifier la santé du système, pas à prouver des gains scientifiques【132914919030256†L130-L141】.
4. **Automatisation contrôlée** : les automatisations (tests, génération de code, mise à jour de docs) s’exécutent dans des sandboxes et sont enregistrées dans la télémétrie.  Les actions sensibles nécessitent une validation humaine.
5. **Révision obligatoire** : toutes les PR passent par Review AI et, in fine, par un humain pour fusionner.  L’Engine Architect AI examine toutes les modifications touchant au runtime ou aux règles du moteur.

## Étapes d’un cycle PR orchestré

### 1. Demande initiale et découpage

Lorsqu’un humain ou un service externe soumet une requête (par exemple, « ajouter la possibilité de charger des parties d’échecs 960 »), le Producteur AI évalue la légitimité de la demande.  S’il l’accepte, il la découpe en **`TaskPacket`s** :

1. **Tâche de spécification (Game Design AI)** : rédiger un document décrivant la fonctionnalité (MVP, objectifs, non‑objectifs, risques).  Utiliser des modèles validés pour structurer la spécification.
2. **Tâche d’architecture (Engine Architect AI)** : vérifier que l’ajout n’impacte pas le déterminisme du runtime et respecte la séparation des couches.  Proposer des garde‑fous si nécessaire.
3. **Tâche d’implémentation (Code AI)** : produire le code correspondant en suivant la spécification et les recommandations de l’architecte.  Décomposer le travail en commits atomiques.
4. **Tâche de tests (Test/QA AI)** : générer des tests unitaires et d’intégration.  Exécuter les tests dans une sandbox.  Loguer les résultats.
5. **Tâche de documentation (Docs AI)** : mettre à jour les documents pour refléter la nouvelle fonctionnalité : cheatsheet, constitution, tutoriels.

Chaque tâche est envoyée séquentiellement ou en parallèle (selon les dépendances) par le Producteur.  Par exemple, la spécification et la validation d’architecture peuvent se faire avant l’implémentation.

### 2. Travail des agents

#### 2.1 Game Design AI

* Reçoit un `TaskPacket` de type `GameDesign`.
* Rédige un fichier Markdown dans le répertoire `MASTER_DOCS/` décrivant la fonctionnalité.  Inclut le MVP, les risques de gameplay et les non‑objectifs.  Exemple : `MASTER_DOCS/XX_FEATURE_DESIGN_960.md`.
* Soumet la PR avec ce fichier et ajoute un rapport succinct pour le Producteur.

#### 2.2 Engine Architect AI

* Analyse la spécification.  Vérifie la conformité aux principes du runtime (déterminisme, séparation search/neural, absence de side‑effects).  Utilise des scripts existants (simulate/undo) pour identifier les impacts possibles.
* Produit un rapport `lab/architecture_review/feature_960.md` contenant la liste des points validés et des risques éventuels.
* Ne modifie jamais le code lui‑même.  Recommande des modifications au plan si nécessaire.

#### 2.3 Code AI

* Reçoit un `TaskPacket` de type `Code` et la spécification validée.
* Prépare un plan d’implémentation : liste des fichiers à modifier, fonctions à créer ou à étendre.
* Ajoute des instructions dans `src_patch/` pour modifier les fichiers `src/`.  Par exemple, un fichier `src_patch/feature_960_patch.txt` qui décrit les modifications à appliquer.
* Crée également des squelettes de modules pour la nouvelle fonctionnalité, le cas échéant.
* Soumet une PR avec ces patchs et un rapport résumant les décisions prises.

#### 2.4 Test/QA AI

* Reçoit un `TaskPacket` de type `TestQA` et la liste des fichiers modifiés.
* Génère des tests unitaires (Rust) et d’intégration (Python si nécessaire) dans `tests/` ou `lab/tests/`.
* Exécute les tests dans une sandbox et fournit un rapport (succès/échec, logs).
* S’assure que la couverture de code est suffisante et qu’aucun scénario critique n’est oublié.

#### 2.5 Docs AI

* Met à jour les documents existants pour refléter la nouvelle fonctionnalité : `02_COMMAND_CHEATSHEET.md`, `CONSTITUTION.md`, tutos.
* Vérifie que l’architecture décrite reste cohérente avec le code et que les docs ne promettent pas de performances non prouvées.

#### 2.6 Review AI

* Reçoit une PR complète (code + tests + docs + rapports).  Lit le diff et vérifie : style, cohérence, respect des règles de dépendance, compatibilité avec la spécification.
* Fournit un avis structuré via des commentaires.  Peut demander des corrections.  N’approuve jamais ses propres modifications.

### 3. Fusion et finalisation

Après que toutes les tâches ont été complétées :

1. Le Producteur recueille les rapports des agents et vérifie qu’aucun garde‑fou n’a été contourné.
2. Review AI émet un verdict final.
3. L’humain (merge authority) examine la PR, vérifie la conformité au plan et décide de fusionner ou non.
4. Une fois la PR fusionnée, Memory AI écrit un **post‑mortem** : description de la fonctionnalité, décisions prises, erreurs rencontrées et améliorations possibles.  Le post‑mortem est indexé pour usage futur.

## Conseils pratiques

* **Structuration des `TaskPacket`s** : utilisez des champs explicites (id de tâche, description, dépendances, priorités).  Évitez les prompts en langage naturel non structurés pour limiter les injections【942511202706884†L271-L343】.
* **Branches courtes et focus** : créez des branches spécifiques (`feature/`, `bugfix/`, etc.) et fusionnez‑les rapidement après review.  Un travail trop long en branche augmente les risques de divergence.
* **Outils d’assistance** : pour la génération de code, utilisez des assistants (GitHub Copilot, Tabnine, Cursor).  Pour l’entrainement de modèles, choisissez PyTorch ou TensorFlow.  Pour la documentation, utilisez des plugins IA dans Notion ou des éditeurs Markdown.
* **Revues fréquentes** : n’attendez pas d’avoir énormément de commits pour demander une review.  Un feedback précoce évite d’accumuler une dette technique.
* **Transparence et audit** : toutes les actions des agents (inputs, outputs, rapports) doivent être sauvegardées dans un espace accessible (par ex. `lab/logs/`).  Cela permet de reproduire les bugs et d’améliorer le système.

## Conclusion

En suivant ce tutoriel, un développeur solo peut orchestrer un ensemble d’agents spécialisés pour produire du code, des tests et de la documentation de manière automatique, tout en respectant les principes de sécurité et de gouvernance du dépôt.  Cette approche permet de gagner en productivité sans sacrifier la rigueur ou la traçabilité.