# GAME MANIFEST — « CERFA » DE JEU + DB DE MODÈLES AAA

*Le manifeste pré-rempli qui remplace l'IR mort. Une page vierge par jeu, pré-remplie, creusée en deux passes, qui devient le spec de build.*
*2026-06-28.*

---

## 0. PRINCIPE

Pour chaque nouveau jeu, on instancie ce manifeste. Il se remplit en **deux passes** :

- **PASSE 1 — Évidences (auto).** Dès qu'on a un *genre* + un *pitch*, le système pré-remplit tout ce qui est dicté par la doctrine, les defaults du genre, le kit réutilisable, et une recherche marché. Le reste est marqué `⟦à creuser⟧`.
- **PASSE 2 — Approfondissement (rebond).** On creuse chaque `⟦à creuser⟧` via le workflow `/plan` : Qwen propose → red team (Cowork + Gemini Flash) → **Pierre tranche** → champ marqué `[✓ Pierre]`.

Quand tous les champs **critiques** sont `[✓ Pierre]`, le manifeste **devient le spec de build** : Claude Code construit *strictement* depuis lui. C'est le « regarde tous les paramètres avant de coder, puis code ».

**Sources de pré-remplissage (passe 1) :** `D`=doctrine Studio V2 · `G`=defaults du genre · `K`=studio_kit (modèles réutilisables) · `M`=recherche marché · `⟦⟧`=à creuser.

---

## 1. IDENTITÉ & POSITIONNEMENT
| Champ | Valeur | Source |
|---|---|---|
| Titre provisoire | `⟦à creuser⟧` | ⟦⟧ |
| Genre / sous-genre | _(saisi par Pierre)_ | — |
| Pitch (1 phrase) | _(saisi par Pierre)_ | — |
| Hook / différenciateur | `⟦à creuser⟧` (obligatoire — un genre « sain » exige un hook fort) | D/M |
| Comparables Steam (3) + leurs wishlists/ventes | `⟦auto via recherche⟧` | M |
| Public cible | `⟦à creuser⟧` | ⟦⟧ |
| Plateformes | PC (Steam + itch) ; mobile exclu (pas de budget UA) | D |
| Prix cible | premium ; idle 4-7 € / survivor 6-10 € | D/G |
| Langues | FR + EN au lancement ; autres via loc IA | D/K |

## 2. MARCHÉ & DISTRIBUTION *(distribution-first — rempli tôt)*
| Champ | Valeur | Source |
|---|---|---|
| Tags Steam (×20, sous-genres précis) | `⟦auto-proposé⟧` puis validé | M |
| Concept capsule (à A/B tester) | `⟦à creuser⟧` (art humain/retravaillé) | D |
| Cible wishlists au lancement | ≥ 5 000 (viser 25 000) | M |
| Fenêtre de sortie | `⟦à creuser⟧` (éviter face à un AAA) | M |
| Stratégie démo / Next Fest | démo tôt (≈2,5× WL) ; entrer au fest ≥ 2 000 WL | M |
| Canaux organiques | Discord + 2-3 subreddits genre + 30-50 micro-streamers | M |
| Page Steam : date de mise en ligne | **le plus tôt possible** (chemin critique) | D |

## 3. BOUCLE DE JEU (core)
| Champ | Valeur | Source |
|---|---|---|
| Core loop (≤30 s) | `⟦à creuser⟧` | G |
| Objectif joueur | `⟦à creuser⟧` | ⟦⟧ |
| Condition de victoire / défaite | `⟦à creuser⟧` | G |
| Progression | `⟦à creuser⟧` | G |
| Méta-progression / prestige | idle: oui (prestige) · survivor: méta-upgrades | G |
| Durée de session cible | idle: continue/idle · survivor: run 10-20 min | G |
| Durée de vie / rejouabilité | `⟦à creuser⟧` | G |
| Courbe de difficulté | `⟦à creuser⟧` | G |

## 4. SYSTÈMES & MÉCANIQUES
| Champ | Valeur | Source |
|---|---|---|
| Liste des systèmes | `⟦à creuser⟧` (ex idle: ressources, upgrades, prestige, offline gains) | G |
| Entités | `⟦à creuser⟧` (joueur, ennemis, items, ressources) | G |
| Règles clés | `⟦à creuser⟧` | ⟦⟧ |
| Économie (monnaies, sources, puits) | `⟦à creuser⟧` (sources ↔ puits équilibrés) | G |
| Paramètres d'équilibrage initiaux | `⟦à creuser⟧` (réglés ensuite par télémétrie) | G |
| Autorité de décision en-jeu | moteur déterministe (Rust/GDScript) ; jamais le LLM en temps réel | D |

## 5. CONTENU
| Champ | Valeur | Source |
|---|---|---|
| Volume (niveaux/vagues/cartes) | `⟦à creuser⟧` (MVP minimal d'abord) | ⟦⟧ |
| Ennemis / obstacles | `⟦à creuser⟧` | ⟦⟧ |
| Items / armes / upgrades | `⟦à creuser⟧` | ⟦⟧ |
| Événements / variété | `⟦à creuser⟧` | ⟦⟧ |
| Narration (si applicable) | idle/survivor: minimale | G |

## 6. PRÉSENTATION & DIRECTION ARTISTIQUE
| Champ | Valeur | Source |
|---|---|---|
| Style / palette / références | `⟦à creuser⟧` | ⟦⟧ |
| **Règle art** | humain / CC0 (Kenney) / brouillon IA **retravaillé** — jamais d'IA brute shippée | D |
| Écrans UI | menu, HUD, game over, options, boutique → **modèles du kit** | K |
| Feedback / juice | SFX, particules, screenshake → presets kit | K |
| Musique / SFX | CC0 / licencié / Stable Audio (risque légal bas) | D |

## 7. TECHNIQUE GODOT
| Champ | Valeur | Source |
|---|---|---|
| Moteur | Godot 4 | D |
| 2D / 3D | `⟦à creuser⟧` (idle: 2D ; survivor: 2D) | G |
| Résolution / aspect | `⟦à creuser⟧` | ⟦⟧ |
| Architecture scènes/nodes | depuis template du genre + studio_kit | K |
| **Modèles AAA réutilisés** | `⟦liste depuis la DB §13⟧` | K |
| Perf cible | `⟦à creuser⟧` ; Rust/GDExtension seulement si profilé | D |
| Save system | studio_kit (versionné, anti-casse-patch) | K |
| Export | Win/Web (macOS/iOS = coût CI, évités) | D |

## 8. ASSETS REQUIS *(chaque asset: statut brouillon→retravaillé→shippable)*
| Champ | Valeur | Source |
|---|---|---|
| Sprites / modèles / figurines | `⟦liste à creuser⟧` (atelier local + retravail) | K |
| SFX | `⟦liste⟧` (CC0 / Stable Audio) | K |
| Musique | `⟦liste⟧` | K |
| Fonts / UI assets | depuis kit | K |
| Sources & licences | CC0 / Kenney / atelier IA retravaillé | D |

## 9. TÉLÉMÉTRIE & ORACLES
| Champ | Valeur | Source |
|---|---|---|
| Events trackés | session start/end, complétion, deaths, rage-quit, retry, durée | D/K |
| KPIs fun | rétention J1 (cible idle >25%), complétion tuto, courbe rage-quit | D |
| Seuils balance | `⟦à creuser⟧` (déclenche re-équilibrage) | G |
| Oracle build | export Godot vert + tests | D |
| Oracle marché | vélocité wishlists, conversion visite→WL (>4%) | D/M |

## 10. SCOPE & PLANNING
| Champ | Valeur | Source |
|---|---|---|
| Vertical slice (def) | `⟦à creuser⟧` | ⟦⟧ |
| MVP vs full | MVP jouable d'abord, page Steam tôt | D |
| Effort estimé | `⟦à creuser⟧` (S/M/L) | ⟦⟧ |
| Jalons | proto → page Steam → démo → Next Fest → lancement | D |
| Risques spécifiques | `⟦à creuser⟧` | ⟦⟧ |
| **Kill-criteria** | `⟦à creuser⟧` (ex: <1000 WL à J-30 → reporter/tuer) | D |

## 11. BUSINESS
| Champ | Valeur | Source |
|---|---|---|
| Modèle | premium (pas de F2P/UA) | D |
| Prix | cf. §1 | D/G |
| Point mort | ~150 € de ventes (récup. 100 $ Steam + outils) | D |
| Cible revenu (scénarios) | conservateur / probable / agressif | D |

## 12. PRODUCTION (devient le plan de build)
| Champ | Valeur | Source |
|---|---|---|
| Réutilisé du kit | `⟦liste modèles DB⟧` | K |
| Nouveau à construire | `⟦à creuser⟧` | ⟦⟧ |
| Étapes build | scaffold → systèmes → contenu → juice → export | D |
| Dépendances | `⟦à creuser⟧` | ⟦⟧ |
| Nouveaux modèles à reverser dans la DB | `⟦à identifier⟧` | K |

---

## 13. DB DE MODÈLES AAA RÉUTILISABLES (`studio_kit/models/`)

Le manifeste pioche dans une **bibliothèque qui grossit à chaque jeu**. Chaque modèle = une scène/composant Godot propre, versionné, documenté, réutilisable.

**Structure :**
```
studio_kit/
  models/
    ui/        menu, options, HUD, boutique, pause, game_over   (scènes .tscn)
    systems/   save, audio_bus, settings, achievements, localization, telemetry
    feel/      camera_shake, particles_presets, tweens/juice, transitions, shaders
    gameplay/  idle_engine, wave_spawner, upgrade_tree, economy, inventory
    assets/    CC0 + brouillons retravaillés (sprites, sfx, fonts) — taggés licence
  CATALOG.yaml   index : nom · catégorie · version · jeux utilisateurs · statut qualité
```

**Règles de la DB :**
1. **AAA = qualité, pas volume.** Un modèle entre dans la DB seulement s'il est propre, paramétrable, et réutilisable (pas de copier-coller spécifique).
2. **Chaque jeu reverse ses modèles génériques** dans la DB (champ §12). La DB grossit → coût marginal de chaque jeu décroît.
3. **Versionné + catalogué** (`CATALOG.yaml`) : on sait quel jeu utilise quoi (utile pour patcher un modèle partagé).
4. **Génération assistée** : Qwen/Claude Code scaffolent de nouveaux modèles ; l'atelier d'assets produit les brouillons visuels (retravaillés avant intégration).
5. **Oracle qualité kit** : un modèle de la DB doit passer un test d'instanciation isolée (s'ouvre, tourne, exporte) avant d'être catalogué `shippable`.

C'est ce qui rend la factory réelle : pas un compilateur universel, mais un **stock de briques AAA + un manifeste qui les assemble par genre**.

---

## 14. LE CYCLE COMPLET (du CERFA au build)

```
idée (Pierre)
   ↓
PASSE 1 : système pré-remplit les évidences (D/G/K/M) + marque ⟦à creuser⟧
   ↓
PASSE 2 : rebond /plan champ par champ → [✓ Pierre]
   ↓
manifeste critique complet  =  SPEC DE BUILD
   ↓
Claude Code scaffolde depuis le manifeste + pioche dans studio_kit/models
   ↓
build → playtest → télémétrie → patch (rebond) → publish
   ↓
modèles génériques reversés dans la DB  ⟳  (jeu suivant moins cher)
```

---

## 15. PROCHAIN PAS

Le template est prêt. Pour le rendre vivant : **donne-moi ta première idée de jeu** (même en une phrase). Je fais la **passe 1 en direct** — je pré-remplis toutes les évidences (dont les comparables Steam via recherche) et je te rends le CERFA avec uniquement les `⟦à creuser⟧` restants. Ensuite on creuse ensemble, champ par champ, en rebond.
