# AGENT_FACTORY — contrat d'entrée (préparation, la fabrique n'existe pas)

*2026-08-04. Ce document décrit **le point d'entrée** d'une Agent Factory future. Aucune
fabrique n'est construite ici, aucun code n'est livré. Il fixe ce que la fabrique aura le
droit de faire, avant que quiconque ait la tentation de l'écrire autrement.*

---

## La règle qui justifie ce document

**L'Agent Factory ne pourra sélectionner que des mutations `accepted: true`.**

Aucune expérimentation pendant la génération. Les expériences appartiennent au
`MUTATION_REGISTRY` et à lui seul. Une fabrique qui essaierait une mutation « pour voir »
pendant qu'elle produit un agent mélangerait deux choses qu'on a passé une session
entière à séparer : *mesurer* et *produire*. Le jour où cette frontière tombe, plus aucun
agent n'est explicable — on ne saura plus si un résultat vient de l'agent ou de
l'expérience qu'on a glissée dedans.

---

## Entrée

| Champ | Nature | Contrainte |
|---|---|---|
| `mission` | ce que l'agent doit produire | doit désigner un `layer` connu du registre |
| `contexte` | artefacts amont disponibles | chemins existants sur disque |
| `contraintes` | budget tokens, latence, modèle imposé | chiffres, jamais « au mieux » |

## Sortie

Un `AGENT_GENOME` valide au sens de `scripts/forge/agent_genome.mjs` — et **rien d'autre**.
Pas d'agent lancé, pas d'artefact produit : la fabrique décrit un worker, elle ne
l'exécute pas.

---

## Ce que la fabrique lit, et ce qu'elle n'a pas le droit d'écrire

```
MUTATION_REGISTRY  (source unique de vérité)
        │  lecture seule
        ▼
  findAccepted()  ──►  sélection  ──►  AGENT_GENOME (ids de mutations)
        │
        └── findRejected('REFUTED_FALSE_POSITIVE')  ──►  interdictions dures
```

- Le génome ne contient **que des identifiants** de mutations. Recopier une mesure dedans
  créerait deux versions d'un même fait, et deux faits identiques finissent par diverger.
- `confidence_profile` vaut toujours `AUTO` : il se **dérive** des mutations citées. Un
  chiffre saisi à la main est un chiffre dont personne ne retrouve l'origine.
- La fabrique n'écrit **jamais** dans le registre. Une fabrique qui pourrait s'auto-attester
  serait juge et partie.

---

## Règles de sélection (à respecter par toute implémentation future)

1. **`accepted: true` obligatoire.** Une mutation rejetée n'est jamais sélectionnable, quel
   que soit son code de rejet.
2. **`production_ready: false` ⇒ laboratoire uniquement.** Une mutation peut être
   scientifiquement retenue et pas encore assez éprouvée pour sortir. Distinguer les deux
   est ce qui permet d'accepter une mesure sans la mettre en production le jour même.
3. **`requires` transitif.** Sélectionner une mutation impose de sélectionner tout ce
   qu'elle requiert. `REPAIR-LOOP-V1` sans `M-rep-forme-fictive` reproduirait exactement le
   bug du gabarit vide : 3 cycles, 81 tokens, zéro résolution.
4. **`conflicts` bloquant.** Deux mutations en conflit ne peuvent pas coexister dans un
   génome. `M-retry-identique` et `REPAIR-LOOP-V1` sont incompatibles par construction.
5. **`oracle_stack` non vide.** Un worker qu'on ne sait pas juger n'a pas de raison
   d'exister ; c'est déjà refusé à la création d'un génome.
6. **`known_blind_spots` propagés.** Les angles morts des mutations sélectionnées
   remontent dans le génome. Le défaut migre vers ce que la mesure refuse de regarder :
   un angle mort qu'on n'écrit pas est un angle mort qu'on croira absent.

---

## Ce que la fabrique ne saura pas faire, et qu'il faut assumer

- **Elle ne découvrira aucune mutation.** Elle recombine ce qui a été mesuré. Le seul
  producteur de mutations nouvelles est une campagne d'expérience, hors fabrique.
- **Elle héritera de la faiblesse des mesures.** Aujourd'hui les confiances dérivées vont
  de 0,08 à 1,00, la plupart sur des échantillons de 1 à 12. Une fabrique alimentée par ce
  registre produira des agents dont on connaît surtout les limites — et c'est préférable à
  des agents dont on ne connaît rien.
- **Elle ne remplace aucun HumanGate.** Un génome est une proposition. Pierre décide.

---

## Préalables avant d'écrire la fabrique

1. Faire passer plusieurs mutations `PROMPT` de `NOT_REPRODUCIBLE` à `VERSIONED` — sans
   elles, la fabrique n'a presque rien à sélectionner sur la couche prompt.
2. Élargir l'échantillon de connus-bons au-delà de 12 : c'est le dénominateur de toutes les
   confiances dérivées.
3. Décider si `production_ready` se ratifie à la main (HumanGate) ou se dérive d'un seuil.
   **Ce choix n'est pas tranché**, et le trancher en écrivant la fabrique serait le
   trancher sans le voir.
