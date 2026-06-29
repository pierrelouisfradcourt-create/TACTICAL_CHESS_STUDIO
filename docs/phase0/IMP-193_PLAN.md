# PLAN — IMP-193 : Lock TTL .autoloop.lock PID+timestamp auto-release

**Lane:** SAFE_AUTO · **Impact:** HIGH · **Effort:** SMALL
**Acceptance (ledger):** `pytest: simule crash (PID mort / age>30min) -> recovery auto-release`

## Contexte (état actuel)

`lab/chains/kaizen_autoloop.py` sérialise les autoloops via `lab/.autoloop.lock`
(création atomique `O_CREAT|O_EXCL`, `acquire_lock` ligne 72).

Le lock écrit déjà `pid={pid} {datetime.now().isoformat()}` (ligne 79) — donc PID + timestamp
sont **déjà présents**, mais **jamais relus**. Conséquence : si un autoloop crashe (Ctrl-C,
OOM, kill), le `finally: release_lock()` ne s'exécute pas et le lock reste **éternellement
détenu** → tout autoloop suivant abort (`main()` ligne 537-544), studio gelé jusqu'à
suppression manuelle. C'est un lock **sans TTL**.

## Changements exacts (fichier:ligne)

### `lab/chains/kaizen_autoloop.py`

1. **Imports / logging** (zone imports ~ligne 27) : ajouter `import logging` et un logger
   module `_log = logging.getLogger("kaizen_autoloop")`. (Mission : logging, pas print, pour
   le code neuf.)

2. **Constantes** (après `LOCK_PATH`, ligne 55) :
   ```python
   LOCK_TTL_SECONDS = 1800          # 30 min — au-delà le lock est considéré stale
   _LOCK_ACQUIRE_RETRIES = 3        # bornes anti-boucle sur vol de lock concurrent
   ```

3. **Helpers neufs** (avant `acquire_lock`, ~ligne 72) — tous typés :
   ```python
   def _pid_alive(pid: int) -> bool:
       """True si le process existe. PermissionError => existe (autre user)."""
       if pid <= 0:
           return False
       try:
           os.kill(pid, 0)          # signal 0 = test d'existence (Windows: OK en py3)
       except ProcessLookupError:
           return False
       except PermissionError:
           return True
       except OSError:
           return False             # fail-closed: doute => pas vivant => steal autorisé
       return True

   def _parse_lock(content: str) -> tuple[int | None, datetime | None]:
       """Parse 'pid=<n> <iso>'. (None, None) si illisible."""
       ...

   def _lock_is_stale(lock_path: Path) -> bool:
       """True si PID mort OU age > TTL. Illisible => age via mtime fichier."""
       ...
   ```
   - `_lock_is_stale` lit le contenu ; si pid parseable et `_pid_alive(pid)` False → stale.
   - Si timestamp parseable et `now - ts > TTL` → stale.
   - Si contenu **illisible/vide** (race write partiel) → fallback **mtime fichier** :
     `now - mtime > TTL` → stale ; sinon **non-stale** (fail-closed : on ne vole pas un
     lock récent qu'on ne sait pas parser).

4. **`acquire_lock()` (ligne 72)** — boucle bornée avec auto-release :
   ```python
   def acquire_lock(lock_path: Path = LOCK_PATH) -> bool:
       for _ in range(_LOCK_ACQUIRE_RETRIES):
           try:
               fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
           except FileExistsError:
               if _lock_is_stale(lock_path):
                   _log.warning("autoloop.lock stale -> auto-release (%s)", lock_path)
                   try:
                       lock_path.unlink()
                   except FileNotFoundError:
                       pass          # un autre process l'a déjà volé
                   continue          # retry O_EXCL
               return False          # détenu par un process vivant et récent
           # acquis
           try:
               os.write(fd, f"pid={os.getpid()} {datetime.now().isoformat()}\n".encode("utf-8"))
           finally:
               os.close(fd)
           return True
       return False                  # contention persistante après N essais
   ```

## Ce qui NE change PAS

- Format du contenu du lock (`pid=<n> <iso>`) — compat avec lock écrits par version actuelle.
- `release_lock()` — inchangé.
- `AUTOLOOP_LOCK_INHERITED` (lock hérité du parent dispatch_bridge) — inchangé.
- Tout le reste de la boucle Kaizen.

## Risques

- **R1 — réutilisation de PID** : un PID mort peut être réattribué à un process sans rapport.
  `_pid_alive` renverrait True → on ne vole pas un lock pourtant stale. Mitigé par le 2e
  critère (age > TTL) qui finit par déclencher. Acceptable.
- **R2 — race de vol** : deux process voient le lock stale simultanément, tous deux `unlink`
  puis `O_EXCL`. Seul un gagne (O_EXCL atomique) ; l'autre reprend la boucle (retries bornés)
  et soit acquiert au tour suivant soit voit le lock frais → False. Pas de double-détention.
- **R3 — unlink du lock d'autrui** : si le lock devient non-stale entre le test et l'unlink
  (process repart ?), on supprimerait un lock vivant. Fenêtre étroite ; un PID mort ne
  ressuscite pas. Le critère age borne le pire cas. Noté.
- **R4 — horloge** : timestamp naïf local (pas de tz). Saut d'horloge → faux stale/non-stale.
  Fallback mtime atténue. Hors scope d'un vrai monotonic clock.

## Oracle pytest exact

```powershell
.\.venv312\Scripts\python.exe -m pytest scripts/phase0_tests/test_imp193_lock.py -v
```

Cas couverts (lock_path = tmp_path, jamais le vrai lab/.autoloop.lock) :
- pas de lock → acquire True, contenu = pid courant
- lock détenu par PID vivant (os.getpid()) et frais → acquire **False**
- lock PID mort (pid bidon ex. 2**31-1) → acquire **True** (auto-release)
- lock timestamp vieux (>30min) même PID vivant → acquire **True** (auto-release TTL)
- lock illisible + mtime récent → acquire **False** (fail-closed)
- lock illisible + mtime vieux → acquire **True**
- `_pid_alive(os.getpid())` True ; `_pid_alive(-1)` False

---

## RÉVISION RED TEAM (post-adversaire) — CHANGEMENTS MAJEURS

- **RT-193-1 (CRITICAL) — `os.kill(pid, 0)` sur Windows = `TerminateProcess` !** Il TUE le
  process au lieu de le sonder ; le test `_pid_alive(os.getpid())` aurait tué pytest.
  **Fix retenu :** liveness via **psutil** (présent dans .venv312 : 7.2.2) — jamais `os.kill`.
  ```python
  def _pid_alive(pid: int, create_time: float | None = None) -> bool:
      if pid <= 0: return False
      try:
          import psutil
          if not psutil.pid_exists(pid): return False
          if create_time is not None:           # RT-193-4: défense PID-reuse
              try: return abs(psutil.Process(pid).create_time() - create_time) < 1.0
              except psutil.Error: return False
          return True
      except ImportError:
          return True   # fail-closed: psutil absent => on NE vole PAS (suppose vivant)
  ```
- **RT-193-4 (MEDIUM) — réutilisation de PID.** Le lock stocke désormais `pid`, `create_time`
  (psutil), `ts` (epoch). Liveness = pid_exists **ET** create_time concordant → un PID recyclé
  par un process sans rapport est détecté comme stale.
- **RT-193-5 (LOW) — timestamp naïf/DST.** Champ d'âge = **epoch `time.time()`**, plus iso pour
  lisibilité. Format lock v2 : `pid=<n> ts=<epoch> create=<ct> iso=<iso>` (parse clé=valeur).
- **RT-193-3 (HIGH) — lock zéro-octet / write partiel → freeze 30 min.** **Fix :** contenu
  illisible/vide considéré stale dès que `mtime age > GRACE` (10 s, pas 30 min). Une création
  saine remplit le contenu en < ms ; après 10 s un lock vide = créateur mort. Test : lock vide
  + mtime frais → **non volé** (<10s) ; lock vide + mtime vieux → volé.
- **RT-193-2 (HIGH) — unlink-by-path vole un lock FRAIS (double détenteur).** Mitigation :
  re-confirmer la staleness **juste avant** l'unlink ; si redevenu frais (pid vivant + ts
  récent) → abort steal, return False. La re-création `O_EXCL` reste atomique (un seul gagnant).
  Fenêtre résiduelle read→unlink documentée comme **limite connue** (machine mono-utilisateur,
  proba faible ; durcissement futur = verrou OS advisory type `msvcrt.locking`). Hors scope strict.
- **RT-193-6 (test-gap).** Tests ajoutés : lock vide+mtime frais/vieux, clock-skew (epoch vieux),
  pid recyclé (create_time discordant via stub), `_pid_alive(-1)`/(0). La vraie course 2-process
  n'est pas testable de façon déterministe → documentée, pas simulée faussement.
- **GRACE_SECONDS = 10**, **LOCK_TTL_SECONDS = 1800** ajoutés aux constantes.
