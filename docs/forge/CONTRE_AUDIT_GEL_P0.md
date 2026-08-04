# CONTRE-AUDIT P0 — les décisions de gel figent-elles un état complet ?

*2026-08-03. Contre-audit demandé par Pierre. **Aucune réparation** n'a été faite ni proposée sans
démonstration de besoin. Mesures directes sur `lab/forge_runs/*/state.json` et `verdict.json`.*

```
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED
```

## Réponse à la question centrale

> « Si nous devions reconstruire un nouveau jeu demain avec cette Forge, est-ce que les composants
> gelés garantissent que la chaîne complète existe ? »

**NON.** Les trois projets gelés ont tous traversé **exactement 5 étapes sur 14** :

```
Production → Oracle code → Oracle standard → Red-team → Verdict
```

Aucun n'a traversé :

```
World Scan → Prisme → Bible → Architecture → Wiremap → (gel des règles)
```

Le fait mesuré, sans exception :

| projet | profil | étapes | étapes AMONT jouées |
|---|---|---|---|
| Pong | `standard` | 5 | **aucune** |
| pong_r2_ref | `standard` | 5 | **aucune** |
| Snake (16 runs) | `standard_godot` | 5 | **aucune** |
| Breakout V2 (3 runs) | `standard_godot` | 5 | **aucune** |
| **Tetris** | `full_godot` | **14** | s0 · s1 · s2 · s3 · s4 · s5 · s6 |

**La chaîne complète n'est prouvée que par UN run : Tetris — qui est OUVERT et `FAIL / BLOCKED`.**
Autrement dit : le seul projet qui démontre la Forge entière est celui qui a échoué, et les trois
projets qui ont réussi ne démontrent qu'un tiers de la chaîne.

## 1. Étage conception amont — **absent des trois gels**

| capacité | existe dans la Forge ? | exercée par un projet gelé ? |
|---|---|---|
| Prisme (s1) | OUI, `IMPLEMENTED` | **NON** |
| World Scan (s2) | OUI, `IMPLEMENTED` | **NON** |
| Fouille bibliothèque | OUI (code + journal) | **NON** — `search_consulted.count = 0` sur Snake, Breakout V2 ET Tetris |
| Récupération KB | OUI (`kb_proposal`) | **NON** pendant les campagnes ; les leçons Pong/Snake ont été récupérées *a posteriori* le 2026-08-03, hors chaîne |
| Contraintes gameplay dérivées | OUI depuis ce jour (`objectives[]`) | **NON** — postérieur aux trois gels |

**Classement : manque de capacité EXERCÉE, pas bug.** Les composants existent et sont implémentés.
Ce qui manque, c'est la preuve qu'ils fonctionnent en conditions de production sur un jeu abouti.

## 2. Étage réutilisation — **jamais exercé, sur aucun projet**

| capacité | état | mesure |
|---|---|---|
| Pool de builders | construit, **jamais déclenché** | condition de bascule jamais vraie ; aucun run n'a de reprise de pool |
| Sélection d'assets existants (s2.5-artbible) | construit | n'a tourné que sur `shmup_slice_art` — **aucun projet gelé** |
| Propositions de briques (`propose_brick`) | **BLOQUÉ** | prédicat `oracles.code.status == "OK"` ; file jamais peuplée |
| Capitalisation automatique | partielle | la KB contient 50 entrées (21 patterns, 19 assets, 7 systèmes, 3 rôles), mais **aucune brique n'a été importée dans un jeu gelé** |

**Impact sur la promesse de la Forge.** La promesse de l'étage 2 est explicite dans le Master
Schéma : *« pièces trouvées → import réel → seuls les deltas se codent »*, sous le titre **« fin du
from-scratch »**. Mesure : `search_consulted.count = 0` partout. **Les trois jeux gelés ont été
écrits intégralement from-scratch.** La fin du from-scratch n'a jamais commencé.

## 3. Étage production — ce que les gels prouvent réellement

Les trois gels prouvent, et c'est réel : un builder Godot ou web produit un jeu qui démarre, des
oracles déterministes le vérifient, un red-team advisory le relit, un verdict signé HMAC est émis et
re-vérifiable. **C'est un socle solide.** Ce n'est pas la chaîne.

## 4. Contestation des décisions humaines

| gel | verdict de contestation | motif |
|---|---|---|
| **Pong** | **A — correcte, périmètre volontairement limité** | Pong était un premier run STANDARD, jamais présenté comme une démonstration de chaîne. `FROZEN_HUMAN` est le statut honnête : ni réussi (aucun verdict signé n'a jamais existé) ni échoué. |
| **Snake** | **B — correcte, mais la Forge n'est pas complète** | Clôture `WITH_OBJECTION`, objection consignée (wiremap jamais gelée). La décision est honnête ; ce qu'elle fige est partiel. |
| **Breakout V2** | **B — correcte, mais le mot « baseline » est trop fort** | Les 3 `humangate_flags` ont été acceptés en connaissance de cause, et l'intégrité est AUTHENTIQUE. Rien à reprocher à la décision. **Mais** le projet est enregistré comme *baseline* et *témoin de régression* : un lecteur futur en déduira que la chaîne complète est acquise. Elle ne l'est pas. |

Aucun gel n'est classé **C** (prématuré) ni **D** (empêche l'apprentissage) : les trois décisions
sont défendables et les leçons ont pu être récupérées. **Le problème n'est pas dans les gels.**

## 5. DECISIONS_A_RECONSIDERER

Seules les décisions qui **empêchent la Forge d'atteindre son objectif initial**.

**D1 — Le profil `standard` / `standard_godot` comme voie normale du curriculum.**
Ratifié le 2026-07-22. C'est la décision structurante : elle exclut par construction s0→s6, donc
tout l'amont de conception ET tout déclenchement de l'étage réutilisation. Conséquence mesurée :
**100 % des projets aboutis du studio ont contourné la moitié de la Forge.** Tant qu'elle tient,
aucun jeu ne pourra démontrer la chaîne complète. Ce n'est pas un bug du profil — il fait
exactement ce qu'on lui a demandé.

**D2 — `check_search_consulted` en advisory.**
Le seul point qui pourrait forcer la fouille avant build ne bloque rien : *« n'affecte jamais
oracle_ok »*. Résultat : `count = 0` sur les trois derniers projets. La « fin du from-scratch »
restera une déclaration tant que rien ne l'impose. *(Rappel : le durcissement direct a été mesuré et
casse 36 tests — la portée du journal de recherche doit être tranchée d'abord.)*

**D3 — Le prédicat de `propose_brick` (`oracles.code.status == "OK"`).**
Gelé volontairement, à raison. Mais c'est le verrou terminal de la capitalisation de briques : un
run qui échoue ne verse rien, alors que ce sont les runs difficiles qui produisent les briques les
plus utiles. À reconsidérer **après** D1, pas avant.

## Conclusion

Un gel protège un état — et les trois gels protègent honnêtement ce qu'ils ont mesuré. Le risque
n'est pas dans les décisions, il est dans **ce que leur accumulation laisse croire** : trois projets
clos avec verdicts verts suggèrent une Forge éprouvée, alors que l'amont de conception n'a été joué
qu'une fois, sur le projet qui a échoué, et que l'étage de réutilisation n'a jamais été joué du tout.

**Recommandation, sans réparation associée** : ne pas retirer les gels, mais **cesser de traiter
Breakout V2 comme la baseline de la Forge**. La vraie baseline de chaîne complète n'existe pas
encore — et c'est Tetris, la seule campagne ouverte et la seule à avoir traversé les 14 étapes, qui
est en position de la produire.

---
*`claim_verdict: NO_CLAIM_ALLOWED` — constat, pas décision. HumanGate Pierre.*
