# HUMANGATE EN ATTENTE — IDENTITÉ STRUCTURELLE DE L'AGENT DE PRODUCTION

> **statut** : décision d'architecture non prise · **claim_verdict** : NO_CLAIM_ALLOWED
> **evidence_verdict** : MECHANICAL_VALIDATION_ONLY · 2026-08-13
> Clôture de la chaîne d'audits ouverte le 2026-08-12. **Aucun patch. Aucun nouvel audit.**
> La branche « rendre le spawn impossible hors porte » est **close** : sa réponse est
> architecturale, pas technique.

## La question à trancher

Faut-il une **identité structurelle de production** — un `subagent_type` que le harnais
résout et que l'agent ne peut pas omettre —

    subagent_type = production
        -> contrat Forge obligatoire -> mission structurée -> permissions adaptées
        -> modèle / routage -> production -> observation

**ou** accepte-t-on que `general-purpose` puisse produire, en ne contrôlant que son
comportement **par interception** ?

Deux philosophies, pas deux réglages. Pierre penche nettement pour la première ; la décision
n'est pas prise et n'est **pas** transformée en patch.

## Ce qui est établi, et qui rend la question mûre

**Il n'existe aucun point unique de création de spawn.** Cinq mécanismes mesurés ; l'outil
`Agent` est une **capacité du harnais**, pas du dépôt. Le dépôt ne contient aucun code qui
crée un sous-agent interactif.
=> L'invariant « aucun payload ⇒ spawn impossible » **n'est pas réalisable structurellement**.
Au mieux comme propriété d'**interception** — garantie strictement plus faible, qui dépend de
la présence du hook, de son exécution et de sa configuration. C'est exactement ce qui a
échoué pour le jumeau ci-dessous.

**Asymétrie mesurée** : le seul chemin structurellement gardé (driver -> `claude -p`) est le
seul **invisible aux hooks** ; le seul chemin observable (outil `Agent`) est le seul **non
gardé**.

**Le prédicat de juridiction est écrit par le régulé.** `pretool_forge_guard.py:630` calcule
son périmètre depuis le *prompt*. Le design défend contre le **faussaire** (HMAC) et pas
contre le **silencieux**. Mesure : 23 spawns Bomberman, 0 marqueur, 0 refus, 0 audit.

**Le jumeau est pire que prévu — deux causes emboîtées.** `posttool_forge_executed.py` porte
le même prédicat auto-défini, MAIS son matcher est `Task` alors que la production émet
`Agent` (398 contre 0 sur les transcrits récents). Le commit `b51d667` a ajouté `Agent` au
`PreToolUse` **sans** toucher au `PostToolUse`. Les tests qui le protègent n'exercent que
`Task` : **verts sur un nom que la production n'émet plus.** Réparer le marqueur ne
ranimerait rien — l'organe ne s'exécute pas.

**L'observation non-omissible existe déjà, et n'appartient pas à la Forge.**
`SubagentStart` n'a **aucun matcher**, se déclenche à chaque démarrage, et `subagent.log`
porte **737 événements**, dont un ce jour. En face : **23 `spawn_authorized`**, toutes du
driver, **aucune d'un hook**.
=> L'écart **737 / 23** nomme exactement la population non gardée. Métrique disponible à
coût nul, jamais consommée.

**Et le trou central** : *il n'existe aucun type d'agent « de production ».* Les 17 types
sont des rôles d'analyse (15 en `disallowedTools: Write, Edit`) ; la fabrication passe par
`general-purpose`, sans frontmatter, donc **héritant du modèle du parent**.
=> Mesuré sur le run Bomberman : **110 écritures sur 178 par l'orchestrateur**, et les 68
déléguées l'ont été à des agents eux-mêmes sur Opus. **Aucune écriture de code par un modèle
non-Opus.**

## Le déplacement du diagnostic — c'est le vrai acquis

Le problème n'est **pas** que l'orchestrateur « choisit mal Opus ». C'est qu'il **n'a pas de
frontière structurelle entre un agent qui construit et un agent qui conseille**.

                        HUMAIN
                          |
                   ORCHESTRATEUR
                    /            \
              production        analyse
                  |                |
          ??? aucune identité   rôles spécialisés (17, tous conseil)
                  |
           general-purpose  ->  hérite d'Opus

Tant que cette frontière n'existe pas, **parler de routage Qwen/Claude est prématuré**. Et il
faut le redire, car l'audit l'a établi contre l'intuition : Qwen n'est pas censé être le
builder — ses trois rôles déclarés sont red-team, réparation ciblée, spec d'asset.

## Corrections spécifiées, NON implémentées

1. Déplacer le prédicat de périmètre du **contenu du prompt** vers **`subagent_type`** — seul
   champ typé résolu par le harnais, présent 85/85.
2. Ajouter `Agent` au matcher `PostToolUse` (`settings.json:73`), sans quoi l'organe de
   preuve reste mort quoi qu'on fasse.
3. **Conséquence obligatoire, pas une solution à écrire** : créer un type de production —
   sinon le prédicat n'a rien à tester. **C'est le HumanGate.**

Limite à ne pas maquiller : le prédicat par identité rend le périmètre **non-omissible**, il
ne rend pas le contournement **impossible** — un orchestrateur peut spawner `general-purpose`
et faire le même travail. La fermeture complète exigerait de restreindre l'écriture sur
`games/**`, ce qui tuerait aussi le builder Forge.

## Défauts latents consignés, non corrigés

- **Marqueur 2 champs vs 4** (`contract.py:457` / `driver.py:966`) : sur le chemin interactif,
  dès la 2ᵉ tentative la garde compte deux correspondances et **refuse un retry légitime**.
- **`dispatch_audit.jsonl` est pollué par la suite de tests** (413 lignes orphelines) — le
  garde lit un référentiel que les tests écrivent.
- **Panel Prisme** : 6 process pour 1 ligne d'audit, sous-comptage 6:1 sur le chemin gardé.
- **Lane STUDIO gelée** : `autopilot.py:1237` et `:7254` lancent `claude --print
  --dangerously-skip-permissions` ; effet sur les hooks **UNKNOWN**.
- **Aucun capteur de dérive du vocabulaire d'outil** : `Task` -> `Agent` a changé sous le
  dépôt sans qu'aucun test ni oracle ne le voie.

## État des surfaces à la clôture

    audit Bomberman              CLOS — cause racine démontrée
    hook advisory                CLOS — critère non discriminant (précision ~24 %)
    audit architecture           CLOS — limite du dépôt démontrée
    SubagentStart                disponible comme observation, 737 événements, inutilisé
    PostToolUse sur Agent        NOT_WIRED
    type d'agent de production   HUMAN_REQUIRED
    permissions de production    HUMAN_REQUIRED
    Qwen / routage               GELÉ — hors sujet tant que la frontière n'existe pas
    nouveau jeu                  BLOCKED

    NO_GLOBAL_READY_VERDICT: true
