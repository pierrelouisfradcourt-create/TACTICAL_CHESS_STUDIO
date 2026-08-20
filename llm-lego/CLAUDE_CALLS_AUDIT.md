# Audit — Appels Claude dans autopilot.py et TCS

> Passe **audit uniquement**. Aucun code écrit, **aucun appel réseau, aucun subprocess
> lancé**. Lecture statique seule. Citations `fichier:ligne` vérifiées de première main.
> Aucune clé API affichée (présence signalée, jamais la valeur). Date : 2026-07-03.

---

## 0. TL;DR

- **autopilot.py appelle Claude par UN mécanisme réel : le CLI local `claude --print`**
  en subprocess (`autopilot.py:1238`), pour générer un charter, avec **fallback Qwen**.
  C'est **local, non payant** (auth Claude Code CLI de la machine, pas d'API key).
- **autopilot.py IGNORE `claude_proxy.py` pour l'inférence** : il ne le contacte QUE pour
  un **health-check** (`:8765`, `autopilot.py:1715/1731/1811`). Il surveille le proxy mais
  ne l'utilise pas → il refait sa propre méthode.
- **TCS a 3 chemins LOCAUX distincts vers le même CLI `claude`** (subprocess direct, `npx
  @anthropic-ai/claude-code`, HTTP proxy :8765) + **1 chemin API PAYANT mort et interdit**
  (`ml/claude_bridge.py`). C'est **dispersé**, pas unifié.
- **Pour la Passe 5**, `claude_proxy.py` reste le meilleur candidat *au sens interface*
  (endpoint OpenAI-compatible, drop-in pour l'adapter llm-lego), mais autopilot exhibe un
  candidat **plus simple en infra** (subprocess `claude --print` direct, sans serveur).
  Les deux sont locaux — présenté sans trancher.

---

## 1. Appels trouvés dans autopilot.py

| Fichier:ligne | Mécanisme | Usage | Payant ou local ? |
|---|---|---|---|
| `autopilot.py:1238` | **subprocess `["claude","--print","--dangerously-skip-permissions", prompt]`** (timeout 120s) | `_generate_charter_claude` — génère un charter IMP ; fallback Qwen2.5 si stdout vide / absent / timeout / erreur (`:1247-1253`) | **LOCAL** (CLI Claude Code, aucune API key) |
| `autopilot.py:7254` (JS front) | **`ws.send('npx @anthropic-ai/claude-code --dangerously-skip-permissions lab/chains/charters/<imp>_charter.md')`** | `launchClaudeCode` — lance le CLI dans le **terminal WebSocket** pour exécuter un charter | **LOCAL** (CLI via npx, terminal) |
| `autopilot.py:1715/1731/1811` | **probe de port `:8765`** (health uniquement) | `SERVICE_PORTS`/`services_status` — affiche l'état de `claude_proxy` ; **ne l'appelle PAS pour inférer** | **LOCAL** (monitoring, pas un appel LLM) |
| `autopilot.py:8529-8531` | endpoints `/api/claude-annotate|fuse|fusion-complete|mode-run` → **HTTP 410** | « backend Claude supprimé — système local Devstral uniquement » | **N/A** (chemin **retiré**) |

**Non-appels (faux positifs écartés)** : `sendPromptClaude` (`:6731`) remplit un input et
navigue (pas d'appel) ; `_build_extract_prompt_for_claude` (`:1395`) construit un *texte*
de prompt à coller à la main (fallback FIX 5, IMP-089) ; `injectClaudeJson` (`:7682`) colle
un JSON produit hors-ligne ; `ux_claude_runs.jsonl` (`:57`) = comptage de tokens. Aucun
n'exécute Claude.

> **Résumé autopilot** : un seul appel Claude *exécutable côté backend* — le CLI local
> `claude --print` (`:1238`), pour les charters, en fallback derrière Qwen. Le reste est
> soit du monitoring (`:8765`), soit une commande terminal front (`:7254`), soit un chemin
> mort (410).

---

## 2. Cohérence des mécanismes à travers TCS

**Il y a QUATRE mécanismes distincts pour « appeler Claude » — trois locaux vivants + un
API payant mort. C'est une dispersion réelle.**

| # | Mécanisme | Fichier:ligne | Local / Payant | Statut |
|---|---|---|---|---|
| M1 | subprocess **`claude --print`** direct | `autopilot.py:1238` · `kaizen_autoloop.py:551` | **LOCAL CLI** | **VIVANT** (charters) |
| M2 | subprocess **`npx @anthropic-ai/claude-code --print`** | `kaizen_autoloop.py:550` · `autopilot.py:7254` (front) | **LOCAL CLI** (npx) | **VIVANT** (exécution IMP + terminal UI) |
| M3 | **HTTP → `claude_proxy.py` `:8765`** (OpenAI-compatible, enveloppe `claude --print`) | `council.py:46,300-305,562` → `scripts/claude_proxy.py:107` | **LOCAL proxy** | **VIVANT** (council PLAN_REVIEW) |
| M4 | **SDK `anthropic` → api.anthropic.com** | `ml/claude_bridge.py:17,65,73` (`model="claude-sonnet-4-6"`, `ANTHROPIC_API_KEY`) | **PAYANT (API externe)** | **MORT + INTERDIT** (voir §2.3) |

### 2.1 autopilot vs claude_proxy — mécanismes DIFFÉRENTS, et redondance signalée
- autopilot **n'appelle jamais** `claude_proxy` pour inférer. Il **le monitore** (`:8765`
  health, `autopilot.py:1731`) puis **refait sa propre méthode** (subprocess direct
  `:1238`). → **redondance** : le proxy existe et est surveillé, mais autopilot le
  contourne. C'est le pattern « surface affichée > surface câblée » déjà identifié
  ailleurs, appliqué ici : la carte de santé montre `claude_proxy`, le code ne s'en sert pas.

### 2.2 Trois façons pour la même chose (M1/M2/M3)
- M1, M2 et M3 **aboutissent tous au même binaire local `claude`** (`claude_proxy.py`
  enveloppe littéralement `claude --print`, `scripts/claude_proxy.py:2,107`). Ce sont
  **trois chemins d'accès** au même outil : subprocess direct (autopilot), npx subprocess
  (kaizen/front), HTTP OpenAI-compatible (council). Aucune couche partagée — chaque
  consommateur a réimplémenté son accès. **Dispersion, pas unification.**

### 2.3 M4 — la violation de doctrine (morte mais présente)
- `ml/claude_bridge.py` **instancie le SDK payant** : `anthropic.Anthropic(api_key=…)`
  (`:65`) + `client.messages.create(model="claude-sonnet-4-6", …)` (`:73-78`), requiert
  **`ANTHROPIC_API_KEY`** (`:6,60`). C'est **api.anthropic.com**, pas local.
- **Contredit frontalement la doctrine** : `CLAUDE.md` (Jamais → « Utiliser API Anthropic
  externe », lignes 170/186) ; council.py garde-fou dur (`council.py:17,303-304` : refuse
  toute `base_url` non-locale, « jamais anthropic.com ») ; autopilot (`:1521` « Pas d'API
  Claude externe — LM Studio local uniquement »).
- **Déjà signalé et catégorisé** par `docs/audit/AUDIT_COMPLET_2026-06-27.md` :
  « **DEAD + FORBIDDEN** », « orphelin (0 import live) », P2-6 « retirer/gater ». **Toujours
  présent au 2026-07-03** (non retiré depuis).
- **Inerte aujourd'hui** : (a) **0 appelant** — `grep claude_bridge` ne trouve que des
  *rapports d'audit* et le cache graphify, aucun code live ; (b) `run_chain.py` ne produit
  **pas** d'enveloppe `ready_for_arbitrage` (grep vide) → le pipeline qui l'alimenterait
  n'existe pas ; (c) **aucune clé** : `ANTHROPIC_API_KEY` **absente** du shell et **non
  trouvée** dans `.env` (69 o, présent, couvert par `.gitignore` selon l'audit du 27-06) —
  vérifié en *présence seule*, valeur jamais lue. → `arbitrate()` renverrait `BLOCKED`
  (`:56-63`) même si invoqué. **Danger latent, pas actif.**

---

## 3. Recoupement `lab/chains/` et autres scripts

| Source | Mécanisme Claude | Local/Payant | Note |
|---|---|---|---|
| `scripts/claude_proxy.py` | **enveloppe** `claude --print` derrière FastAPI `:8765`, endpoint OpenAI `/v1/chat/completions` (`:2,107`) | **LOCAL** | Le seul « adapter » propre (HTTP standardisé). `PROXY_MODEL_ID="claude-code-cli"` (`:42`). |
| `scripts/council.py` | **HTTP → claude_proxy :8765** via `ClaudeProxyAdapter` (`:300-305,562`) ; garde-fou anti-externe | **LOCAL** | Le **seul consommateur** de M3. Fallback Qwen (`:5`). |
| `lab/chains/kaizen_autoloop.py` | **subprocess** : `npx @anthropic-ai/claude-code --print` **puis** `claude --print` (liste de candidats, `:550-551`) ; charter via `run_chain.py --mode charter` (`:373`) | **LOCAL CLI** | Combine M1+M2. `execute_via_claude_code` (`:533`). |
| `lab/chains/run_chain.py` | **AUCUN appel Claude** — `call_lm_studio` (Qwen `:1234`) uniquement (`:287,335,345,357,370`) | **LOCAL Qwen** | Le rôle « Formatter » **produit un texte** « prompt Claude Code » (`:232-245`) — c'est une **sortie**, pas un appel. |
| `00_STUDIO_CONTROL/05_AUDIT/chains/*.ps1` | **AUCUN** (cargo/py_compile/tailles disque) | — | Zéro Claude (grep vide). |
| `ml/claude_bridge.py` | **SDK payant** (M4) | **PAYANT** | Mort + interdit (§2.3). |

**Constat §3** : la matière est **dispersée sur 3 chemins locaux** (subprocess direct /
npx / proxy HTTP) sans couche commune, plus **1 relique payante**. `run_chain.py` et les
`.ps1` ne touchent jamais Claude. Seul `council.py` passe proprement par le proxy.

---

## 4. Implication pour la Passe 5 (vrai appel LLM dans llm-lego)

Rappel : les `mockAdapters` llm-lego sont « drop-in replaceable by real API-backed adapters
implementing the same interface » (`llm-lego/src/adapters/mock.ts:6-8`). Deux candidats
LOCAUX ressortent des faits :

| Candidat | Ce que c'est | Pour | Contre |
|---|---|---|---|
| **A. `claude_proxy.py` :8765** (M3) | endpoint **OpenAI-compatible** local (`/v1/chat/completions`), enveloppe `claude --print` | **Match l'interface adapter** (llm-lego parle déjà « chat/completions ») ; déjà utilisé par council ; concurrence gérée (workers) | exige que le **proxy Python tourne** (un service de plus, `:8765`) |
| **B. subprocess `claude --print`** direct (M1) | ce que fait autopilot (`autopilot.py:1238`) et kaizen (`:551`) | **Plus simple en infra** : aucun serveur, aucun port ; juste `spawn("claude", ["--print", prompt])` + lire stdout | **Ne matche PAS** la forme OpenAI de l'adapter (il faudrait un adapter « CLI » spécifique, parse stdout) ; timeout à gérer |

**FAIT, pas opinion :**
- `claude_proxy.py` est le **seul** mécanisme qui expose déjà la **forme d'interface**
  attendue par un adapter llm-lego (HTTP OpenAI-compatible, drop-in). → confirmé « adapter
  local exact ».
- **MAIS** autopilot prouve qu'il existe un chemin **encore plus direct** (subprocess CLI,
  sans serveur) — plus simple à démarrer, au prix d'un adapter d'un type différent (process,
  pas HTTP). Ce n'est pas « à la place OU en complément » à trancher ici — juste un fait :
  **le proxy gagne sur la conformité d'interface ; le subprocess gagne sur la simplicité
  d'infra.** Décision Pierre.
- **À ne PAS considérer** : M4 (`claude_bridge.py` / SDK payant) — interdit par doctrine.

---

## 5. Verdict honnête

**Dispersé — pas propre.** La situation des appels Claude dans TCS reproduit le pattern
« surface > câblage » déjà repéré ailleurs :

1. **Trois chemins locaux redondants** vers le **même** binaire `claude` (subprocess direct,
   npx, proxy HTTP), sans couche commune — chaque consommateur a réimplémenté son accès.
2. **autopilot monitore `claude_proxy:8765` mais ne l'utilise pas** — il refait un subprocess
   direct. La carte de santé affiche un service que le code contourne : incohérence câblage
   vs affichage, exactement le motif récurrent.
3. **Une relique API payante interdite (`ml/claude_bridge.py`) survit** malgré un flag
   explicite « DEAD + FORBIDDEN » dans `AUDIT_COMPLET_2026-06-27.md` (P2-6, recommandé
   retiré). Inerte aujourd'hui (0 appelant, 0 clé), mais c'est de la **dette de doctrine
   non soldée** : le fichier viole `CLAUDE.md` et n'a pas été retiré.

**Ce qui EST propre** : le chemin *local, non payant* est réel et fonctionne (le CLI
`claude --print` marche partout, fallback Qwen systématique) ; `council.py` passe
proprement par le proxy avec un garde-fou anti-externe ; aucun secret n'est exposé (clé
absente, `.env` gitignored). Le problème n'est pas la sécurité — c'est la **fragmentation**
(3 façons de faire la même chose) et **une relique interdite non nettoyée**.

**Recommandation factuelle (non-décision)** : avant de brancher la Passe 5, il serait
cohérent de (a) choisir UN mécanisme canonique local et (b) retirer/gater `claude_bridge.py`
comme déjà recommandé — mais ce sont des décisions HumanGate, hors périmètre de cet audit.

---

*Fin de l'audit — lecture statique seule, aucun code touché, aucun appel réseau/subprocess,
aucune clé affichée.*
*software_verdict: OK (audit produit) · evidence_verdict: MECHANICAL_VALIDATION_ONLY
(autopilot.py, council.py, claude_proxy.py, kaizen_autoloop.py, run_chain.py, claude_bridge.py,
CLAUDE.md, AUDIT_COMPLET_2026-06-27.md vérifiés de première main ; présence de clé vérifiée
sans lecture de valeur) · claim_verdict: NO_CLAIM_ALLOWED*
