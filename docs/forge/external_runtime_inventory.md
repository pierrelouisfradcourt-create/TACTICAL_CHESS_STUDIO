# external_runtime_inventory — runtimes hors contrat Forge

*2026-08-04. **Rapport seul.** Aucun de ces fichiers n'a été modifié, déplacé, gelé ou
supprimé. Ils appellent réellement un modèle et aucun `runtime_contract` ne les décrit :
c'est un fait remonté, pas une décision prise.*

Source : `scripts/forge/runtime_inventory_oracle.py`, catégorie
`observed_code_not_declared`. Rappel de vocabulaire — **`code_possible` ≠
`execution_observed`** : ces entrées disent « ce fichier peut appeler un modèle », jamais
« ce fichier a tourné ».

---

## 1. `scripts/council.py` — **dépendance active de la Forge, pas un vestige**

| | |
|---|---|
| emplacement | `scripts/council.py` |
| modèles | **Qwen** — `requests.post` LM Studio `:1234/chat/completions` (l.292) · **Gemini Flash** — `requests.post GEMINI_URL`, clé via `os.getenv` (l.333) · Claude via `claude_proxy:8765` |
| écrit | `PLAN.md`, `CONSENSUS.md` (append-only) |
| taille · dernière modif | 572 lignes · **2026-06-30** (`a1b15d4`) |
| statut | `CALLS_MODEL`, aucun `runtime_contract` |
| observé par événement | **non** — ne passe pas par la porte de dispatch |

**Correction d'un fait publié ce matin.** `RUNTIME_INVENTORY_ORACLE_AUDIT_V1` le classait
« hors périmètre Forge, legacy ». C'est faux :

```
scripts/forge/runtime.py:64   from council import QwenAdapter
```

`run_qwen_step()` — le chemin d'exécution du rôle **déclaré** `redteam_reviewer` — passe
par `council.QwenAdapter`. Un fichier importé par le routeur runtime de la Forge est une
**dépendance**, pas un vestige. Autres importeurs : `scripts/council_contract.py` et trois
fichiers de tests.

**Conséquence à porter** : geler ou déplacer `council.py` casserait l'exécution Qwen de la
Forge. La sonde `qwen_available()` l'importe elle aussi — un échec d'import se traduit
silencieusement par « LM Studio indisponible », donc par un basculement en
`claude-blind`. Le rôle continuerait de tourner, avec un autre modèle, sans erreur visible.

**Point à trancher (humain)** : `council.py` appelle une **API LLM tierce** (Gemini,
`generativelanguage.googleapis`). Ce n'est pas l'API Anthropic externe que la doctrine
interdit nommément, mais c'est une sortie réseau vers un fournisseur tiers dans un script
qu'aucun contrat ne décrit. Le chemin Forge (`QwenAdapter`) ne l'emprunte pas — seul le
rôle `DIVERGENCE` du council le fait.

**Propriétaire humain requis** : Pierre. Trois options possibles, aucune appliquée —
(a) déclarer un `runtime_contract` pour la partie réellement utilisée par la Forge,
(b) extraire `QwenAdapter` vers `scripts/forge/`, (c) laisser tel quel en assumant la
dépendance implicite.

---

## 2. `scripts/claude_proxy.py` — proxy HTTP, aucun importeur

| | |
|---|---|
| emplacement | `scripts/claude_proxy.py` |
| modèle | `claude --print` via `subprocess.run` (l.119), exposé en OpenAI `/v1/chat/completions` sur `:8765` |
| écrit | rien |
| taille · dernière modif | 263 lignes · **2026-06-26** (`247383c`) |
| statut | `CALLS_MODEL`, aucun `runtime_contract` |
| importé par | **aucun module** (référencé seulement par des tables de ports : `cockpit_server.py`, `director.py`, `dispatch_bridge.py`) |
| observé par événement | **non** |

Contrairement à `council.py`, celui-ci n'est importé nulle part : il est consommé **par le
réseau**, donc invisible à toute analyse d'import. Un service HTTP qui expose un modèle
sans contrat est le cas le plus difficile à inventorier — il n'a ni trace d'exécution, ni
lien statique.

**Propriétaire humain requis** : Pierre (lane STUDIO).

---

## 3. `scripts/forge/run_real.py` — signalé, mais ce n'est pas une dérive

L'oracle le liste (`which("claude")` + `subprocess.run`, l.77). C'est le **driver** : il
exécute les étapes dont le `capability_role` est déclaré et résolu par le registry. Il n'a
pas de runtime propre — il est l'exécutant des autres. Classé ici pour que personne n'aille
lui chercher un contrat qui n'a pas lieu d'être.

---

## Ce que cet inventaire ne prouve pas

- **Qu'ils ont tourné.** Aucun n'émet de trace. `code_possible`, rien de plus.
- **Qu'il n'y en a pas d'autres.** Un appel par client wrappé, import dynamique ou binaire
  tiers échappe aux motifs de détection. `autopilot.py` (9 029 lignes) est hors du
  périmètre `scripts/` et n'a pas été scanné.
- **Que le classement est stable.** L'heuristique a deux niveaux (`CALLS_MODEL` /
  `MENTIONS_MODEL`) et 12 tests la protègent, mais elle reste une heuristique.
