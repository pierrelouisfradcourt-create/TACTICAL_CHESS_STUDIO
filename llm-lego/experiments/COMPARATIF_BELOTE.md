# Comparatif final — implémentations Belote

> Passe de comparaison, session 2026-07-05. **Aucun des jeux n'a été modifié** — lecture,
> exécution, test uniquement. Résultats issus des tests refaits MAINTENANT (pas des rapports
> antérieurs). node v24.16.0.

## ⚠ Correction de prémisse (avant tout)

Le prompt supposait **3** implémentations : (1) Claude, (2) « Qwen généraliste » cassé/jamais
corrigé, (3) « Qwen2.5-Coder » fonctionnelle du premier coup. **La réalité sur disque est
différente** — c'est exactement le genre d'incohérence que la passe devait révéler :

- Il n'existe que **2 dossiers** : `belote-claude/` et `belote-qwen/`. Aucun troisième dossier.
- `belote-qwen/` **est** la version Qwen2.5-**Coder** (`pilot.mjs` : `qwen/qwen2.5-coder-14b`),
  pas une version « généraliste ». Le pilote offre bien une option `--model instruct`
  (le généraliste), mais **aucun artefact séparé** n'a été produit avec.
- Cette version coder n'est **ni fonctionnelle du premier coup, ni jamais corrigée** : son
  propre `JOURNAL_ERREURS.md` documente 3 itérations pour `cards`, 3 pour `deal`, et un module
  `rules` **non finalisé**. Elle est **incomplète** (3 modules sur 6, pas de partie jouable).

Le comparatif ci-dessous porte donc sur les **2 implémentations réelles**. La colonne
« Qwen généraliste » du tableau demandé est marquée **N'EXISTE PAS**.

---

## Chantier A — Inventaire

### 1. `belote-claude/` — codée directement par Claude Code
Chemin : `llm-lego/experiments/belote-claude/`
Dates : 2026-07-04 17:24 → 18:46.

| Fichier | LOC | rôle |
|---|---|---|
| src/cards.mjs | 45 | 32 cartes, barèmes atout/non-atout, ordre de force |
| src/deal.mjs | 65 | distribution 3-2 + retournée + complément à 8 |
| src/rules.mjs | 69 | légalité (fournir/monter/couper/surcouper/partenaire), trickWinner, belote |
| src/scoring.mjs | 62 | contrat, dedans, belote+20, capot, dix de der |
| src/bidding.mjs | 58 | enchère (choix preneur + atout), 2 tours |
| src/game.mjs | 90 | IA légale, playTrick/playDeal/playGame |
| cli.mjs | 51 | partie complète jouable (auto-play), --verbose |
| **prod total** | **440** | |
| test/*.mjs | 320 | 30 tests unitaires (6 fichiers) |
| tools/real-play.mjs | ~250 | vrai test de jeu + auditeur de légalité indépendant |
| autres | — | README, JOURNAL_ERREURS (14.9 ko), wm-feed, roadmap/build-layer, 3 result.json, PNG |

### 2. `belote-qwen/` — code écrit par Qwen2.5-Coder-14b, piloté par Claude Code
Chemin : `llm-lego/experiments/belote-qwen/`
Dates : 2026-07-04 19:31 → 20:59.

| Fichier | LOC | rôle |
|---|---|---|
| src/cards.mjs | 59 | 32 cartes, barèmes, comparaison |
| src/deal.mjs | 69 | distribution 2 temps |
| src/rules.mjs | 74 | légalité — **casse à l'import** (voir Chantier B) |
| **prod total** | **202** | scoring / bidding / game / cli **ABSENTS** |
| test/*.mjs | 45 | 2 fichiers (cards, deal). **Pas de test rules.** |
| qwen-raw/ | — | 5 sorties LLM brutes (cards, cards.retry, deal, deal.retry, rules) |
| tools/pilot.mjs | 5.6 ko | harnais « Claude pilote Qwen » (modèle coder par défaut) |
| JOURNAL_ERREURS.md | 6.4 ko | 3 itérations cards, 3 deal, rules non finalisé |

### 3. « Qwen généraliste » (broken) / troisième version
**N'EXISTE PAS** en tant que dossier ou artefact. Voir la correction de prémisse.

### Confirmation de non-mélange
Aucune fuite entre les deux dossiers : `package.json` distincts, `src/` distincts, et surtout
**conventions de nommage divergentes** (preuve de séparation) — Claude : `pique/coeur/carreau/trefle`
(minuscules FR) ; Qwen : `SUITS=['COEUR','CARREAU','TREFLE','PIQUE']` (majuscules FR) **plus** des
noms anglais `hearts/diamonds` codés en dur dans `rules.mjs`. Rien n'a fuité de l'un vers l'autre.

---

## Chantier B — Test « clic » réel (résultats bruts, refaits maintenant)

### Belote (Claude) — ✅ JOUE JUSQU'AU BOUT
- `node --test` → **30/30 pass** (cards, deal, rules, scoring, bidding, game).
- `node cli.mjs --seed 7 --target 301 --verbose` → **partie complète** : distribution, atout
  annoncé (♠/♣/♦ selon la donne), 8 plis par donne joués carte par carte avec coupes légales
  (ex. donne 1 pli 3 : J1 coupe ♥ avec 10♠), décompte, cumul, **vainqueur équipe A 429-57 en 3 donnes**.
- `node tools/real-play.mjs` → **3 parties à mélange aléatoire réel** (seeds 718961056, 414417774,
  1860058809), jouées jusqu'à 501 :
  - **576 coups audités** par un prédicat de légalité **indépendant** (ne rappelle pas `legalMoves`),
    **0 violation**.
  - Obligations réellement déclenchées : fournir 235, monter 25, **coupe 59, surcoupe 12**,
    partenaire-libre 46, défausse-libre 51.
  - Recompte **manuel** des points d'une donne = **162**, identique à `scoreDeal`.
  - Moteur `game.mjs` ⇔ replay instrumenté = **résultats identiques** sur les 3 parties.
  - Verdict script : `✅ VRAI TEST DE JEU — TOUT COHÉRENT`.

### Belote (Qwen généraliste) — N/A
Cette implémentation **n'existe pas**. Rien à lancer.

### Belote (Qwen2.5-Coder = dossier `belote-qwen/`) — ❌ NE DÉMARRE PAS EN TANT QUE JEU
- `node --test` → **6/6 pass**, mais ces tests ne couvrent **que** `cards` et `deal`.
- **Impossible de jouer une partie** : aucun point d'entrée (`package.json` n'a que `"test"`),
  et il manque **bidding** (annonce d'atout), **scoring** (décompte) et **game** (boucle de jeu).
  On ne peut ni annoncer l'atout, ni jouer un pli complet, ni marquer.
- Le module `rules.mjs` (censé porter la coupe obligatoire) **crashe à l'import** :
  ```
  import { cards } from './cards.mjs';
  → SyntaxError: The requested module './cards.mjs' does not provide an export named 'cards'
  ```
  De plus il opère sur un **modèle de données incohérent** avec le reste : `suits=['hearts',
  'diamonds','clubs','spades']`, `atouts=['hearts','diamonds']` en anglais codé en dur, alors
  que `cards.mjs` expose `COEUR/CARREAU/TREFLE/PIQUE`. Même import réparé, les règles ne
  s'appliqueraient à aucune carte réelle.
- **Où ça plante** : dès qu'on tente de charger la logique de règles, et de toute façon avant
  tout début de partie faute de moteur. Résultat final : **aucun**.

---

## Chantier C — Tableau comparatif fonctionnel (résultats réels du Chantier B)

| Critère | Belote (Claude) | Belote (Qwen généraliste) | Belote (Qwen2.5-Coder) |
|---|---|---|---|
| Démarre sans erreur | ✅ 30/30 tests + CLI | ⚪ N'EXISTE PAS | ⚠️ tests cards/deal OK ; **pas de jeu à lancer** |
| Distribution correcte (8/joueur, sans doublon) | ✅ vérifié (audit distr, 32 uniques) | ⚪ | ✅ (deal testé : 5+retournée+talon 11, puis 8) |
| Système d'atout fonctionnel | ✅ enchère 2 tours + jeu | ⚪ | ❌ module **bidding absent** |
| Règle de coupe obligatoire respectée | ✅ **prouvée** (coupe 59×, surcoupe 12×, 0 violation) | ⚪ | ❌ `rules.mjs` **crashe à l'import**, modèle FR/EN incohérent |
| Calcul des points correct | ✅ recompte manuel = 162 = scoreDeal | ⚪ | ❌ module **scoring absent** |
| Partie va jusqu'à la fin naturelle | ✅ 3 donnes → vainqueur ; +3 parties aléatoires | ⚪ | ❌ **aucune boucle de jeu** |
| Lignes de code (prod) | **440** (6 modules + CLI) | ⚪ | **202** (3 modules, incomplet) |
| Itérations/corrections en cours de route | ~1/module (test-first ; E1-E4 auto-corrigés) | ⚪ | 3 (cards) + 3 (deal) + rules **non finalisé** (source : son JOURNAL) |
| Qualité du code (brève) | Cohérent, modulaire, noms FR homogènes, IA de jeu + audit indépendant. Solide. | ⚪ | Correct sur cards ; **rules non intégrable** (mauvais exports + FR/EN mélangés). Partiel. |

Légende : ✅ vérifié maintenant · ❌ échoue/absent · ⚠️ partiel · ⚪ non applicable (n'existe pas).

---

## Chantier D — Tableau comparatif Wire Map

Un seul Wire Map existe : `llm-lego/wireframes/belote.json` (celui de **belote-claude**, alimenté
par `belote-claude/tools/wm-feed.mjs`). **belote-qwen n'a pas de Wire Map.** Le troisième n'existe pas.

| Critère Wire Map | Belote (Claude) | Belote (Qwen généraliste) | Belote (Qwen2.5-Coder) |
|---|---|---|---|
| Wire Map présent | ✅ `wireframes/belote.json` | ⚪ N'EXISTE PAS | ❌ aucun |
| Nb entrées | 8 (wm-001 → wm-008) | ⚪ | 0 |
| PASS / FAIL / PENDING | 8 / 0 / 0 | ⚪ | — |
| Reflète fidèlement le réel testé ? | ✅ **OUI** — j'ai re-vérifié les 8 (30 tests unit + CLI e2e + real-play e2e), tout concorde | ⚪ | — |

### Incohérences signalées
- **belote-claude : aucune incohérence bloquante.** Les 8 entrées PASS correspondent au réel
  re-testé. *Nuance mineure* : wm-008 note « coupe 62×/surcoupe 15× » alors que mon exécution a
  donné 59×/12× — simple **variation de seed aléatoire** (les compteurs changent à chaque run),
  l'invariant (0 violation sur 576 coups) tient. Pas une fausse déclaration.
- **belote-qwen : pas de Wire Map**, donc aucune déclaration PASS à contredire. À noter tout de
  même : ses 6 tests verts **ne couvrent pas `rules.mjs`** (qui est cassé à l'import). Un Wire Map
  qui aurait affiché « rules PASS » aurait été incohérent — mais il n'y en a pas, et le
  `JOURNAL_ERREURS` de qwen est **honnête** (« module non finalisé »). Pas de dissimulation.

---

## Verdict global

**Belote (Claude) est la seule implémentation complète, jouable et vérifiée.** Preuve factuelle :
30/30 tests, partie CLI complète, et surtout 3 parties à mélange aléatoire réel avec 576 coups
audités par un juge de légalité indépendant, 0 violation, coupe/surcoupe réellement exercées,
points recomptés à la main (162) et moteur⇔replay identiques.

**Belote (Qwen2.5-Coder)** est un **prototype partiel** : 3 modules sur 6, `cards`/`deal` testés
et corrects, mais `rules` **non intégrable** (crash import + modèle FR/EN incohérent) et
**aucun moteur de jeu** — on ne peut pas jouer une partie. Son intérêt est **méthodologique**
(le JOURNAL documente honnêtement les 6+ itérations Qwen vs ~1 pour Claude), pas ludique.

**« Belote Qwen généraliste »** n'existe pas : la prémisse à 3 implémentations est factuellement
inexacte. Il y a 2 jeux ; le seul piloté par Qwen l'a été avec le **bon** modèle (coder), et il
reste **incomplet**, ce qui contredit aussi l'idée d'un « fonctionnel du premier coup ».

Classement factuel : **1. Claude (complet, prouvé) · 2. Qwen-Coder (partiel, non jouable) ·
3. Qwen-généraliste (inexistant).**

```
software_verdict: PARTIAL
```
(Belote-Claude : OK/prouvé end-to-end. Belote-Qwen : incomplet & rules cassé. Le « 3ᵉ jeu »
n'existe pas — la prémisse ne peut être satisfaite telle quelle. La passe de comparaison,
elle, s'est exécutée entièrement avec preuves.)

```
evidence_verdict: INCLUDES_UX_VALIDATION
claim_verdict: NO_CLAIM_ALLOWED
```
