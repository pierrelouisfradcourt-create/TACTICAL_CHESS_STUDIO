#!/usr/bin/env python3
"""web_reality_agent.py — Web Reality Agent (WRA, IMP-200).

Veille externe GitHub + HackerNews + arXiv, **READ ONLY** : lit des sources distantes,
les vérifie, les filtre/score de façon déterministe, et produit un brief injecté AVANT le
PLAN pour alimenter le council.

Garanties (cœur PUR, déterministe) :
  - aucune exécution / écriture à partir du contenu web (donnée opaque : jamais eval/exec/
    import/subprocess, jamais de chemin dérivé du contenu) ;
  - source non vérifiée (source inconnue ou host hors allowlist) -> rejet DUR (fail-closed) ;
  - scoring déterministe (now_ts explicite, poids fixes, tri stable) ;
  - borné : timeout (clock injectable) + max_calls + max_sources -> pas d'explosion d'appels ;
  - `governor.check()` OBLIGATOIRE avant toute écriture de cache (BLOCK -> aucune écriture).

Architecture : le cœur ne fait AUCUNE I/O. La frontière réseau = les `fetchers` callables
injectés dans `gather`. En test : fetchers factices offline. En live (`__main__`) :
`github_fetcher` / `hackernews_fetcher` / `arxiv_fetcher` = HTTP GET only via urllib.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from time import monotonic
from typing import Any, Callable, Iterable
from urllib.parse import urlparse

import governor  # noqa: E402  (gouvernance déterministe — garde l'écriture de cache)

# ── sources & allowlist d'hôtes (vérification stricte) ────────────────────────
SOURCES: tuple[str, ...] = ("github", "hackernews", "arxiv")

TRUSTED_HOSTS: dict[str, frozenset[str]] = {
    "github": frozenset({"api.github.com", "github.com"}),
    "hackernews": frozenset(
        {"hacker-news.firebaseio.com", "hn.algolia.com", "news.ycombinator.com"}
    ),
    "arxiv": frozenset({"export.arxiv.org", "arxiv.org"}),
}

POP_SCALE = 1000.0   # échelle de normalisation de la popularité (stars/points/citations)


# ── erreurs ───────────────────────────────────────────────────────────────────
class WraError(Exception):
    """Entrée invalide / état illégal."""


class SourceVerificationError(WraError):
    """Source non vérifiée (source inconnue, host hors allowlist, champ manquant) — rejet dur."""


class BudgetExceededError(WraError):
    """Budget (calls / timeout) dépassé de façon non récupérable."""


class CacheWriteBlocked(WraError):
    """governor.check() a refusé l'écriture du cache — aucune écriture effectuée."""


# ── modèles (immuables) ───────────────────────────────────────────────────────
@dataclass(frozen=True)
class Record:
    source: str
    id: str
    title: str
    url: str
    ts: int           # timestamp de provenance (unix seconds)
    popularity: int   # stars / points HN / citations (>= 0)
    summary: str = ""


@dataclass(frozen=True)
class ScoredRecord:
    record: Record
    score: float
    components: dict[str, float]


@dataclass(frozen=True)
class WraConfig:
    max_calls: int = 6          # nb max de fetchers appelés (anti explosion)
    max_sources: int = 30       # nb max de records retournés / par batch
    timeout_s: float = 20.0     # budget temps total (via clock injectable)
    half_life_days: float = 7.0
    w_relevance: float = 0.5
    w_popularity: float = 0.3
    w_recency: float = 0.2


DEFAULT = WraConfig()

# Mission de l'écriture de cache — DOIT rester hors governor.FORBIDDEN_MISSIONS.
CACHE_MISSION = "web_reality_cache"


# ── vérification (fail-closed, rejet dur) ─────────────────────────────────────
def _host(url: str) -> str:
    """Host (lower, sans port) d'une URL. '' si non parsable."""
    try:
        return (urlparse(url).hostname or "").lower()
    except (ValueError, TypeError):
        return ""


def coerce_and_verify(raw: dict[str, Any]) -> Record:
    """Coerce un dict brut -> Record vérifié. Lève SourceVerificationError sinon (rejet dur).

    Vérifie : type dict ; champs requis présents/typés ; source ∈ SOURCES ; host(url) ∈
    allowlist de cette source. Le contenu (title/summary) reste une string opaque — jamais
    interprété/exécuté.
    """
    if not isinstance(raw, dict):
        raise SourceVerificationError(f"record non-dict: {type(raw).__name__}")

    source = raw.get("source")
    if source not in SOURCES:
        raise SourceVerificationError(f"source inconnue/non vérifiée: {source!r}")

    url = raw.get("url")
    if not isinstance(url, str) or not url:
        raise SourceVerificationError(f"url manquante/invalide pour source {source!r}")

    host = _host(url)
    if host not in TRUSTED_HOSTS[source]:
        raise SourceVerificationError(
            f"host non vérifié pour source {source!r}: {host!r} ∉ {sorted(TRUSTED_HOSTS[source])}"
        )

    rid = raw.get("id")
    if not isinstance(rid, (str, int)) or isinstance(rid, bool):
        raise SourceVerificationError(f"id manquant/invalide: {rid!r}")

    title = raw.get("title")
    if not isinstance(title, str):
        raise SourceVerificationError(f"title manquant/non-string: {title!r}")

    ts = raw.get("ts")
    if not isinstance(ts, int) or isinstance(ts, bool):
        raise SourceVerificationError(f"ts manquant/non-int: {ts!r}")

    pop = raw.get("popularity", 0)
    if not isinstance(pop, int) or isinstance(pop, bool) or pop < 0:
        raise SourceVerificationError(f"popularity invalide (int>=0 attendu): {pop!r}")

    summary = raw.get("summary", "")
    if not isinstance(summary, str):
        raise SourceVerificationError(f"summary non-string: {summary!r}")

    return Record(source=source, id=str(rid), title=title, url=url,
                  ts=ts, popularity=pop, summary=summary)


def verify_batch(raws: Iterable[dict[str, Any]]) -> list[Record]:
    """Vérifie chaque record ; lève au 1er non vérifié (fail-closed, rejet dur)."""
    return [coerce_and_verify(r) for r in raws]


# ── scoring déterministe (now_ts explicite -> reproductible) ──────────────────
def _normalize_query(query: str | Iterable[str]) -> tuple[str, ...]:
    if isinstance(query, str):
        terms = query.lower().split()
    else:
        terms = [str(t).lower() for t in query]
    return tuple(t for t in terms if t)


def score_record(rec: Record, query_terms: tuple[str, ...], now_ts: int,
                 cfg: WraConfig = DEFAULT) -> ScoredRecord:
    """Score déterministe ∈ [0,1] d'un record. Pur : aucune horloge cachée, aucune I/O."""
    haystack = f"{rec.title} {rec.summary}".lower()
    if query_terms:
        hits = sum(1 for t in set(query_terms) if t in haystack)
        relevance = hits / len(set(query_terms))
    else:
        relevance = 0.0

    popularity = min(1.0, math.log1p(max(0, rec.popularity)) / math.log1p(POP_SCALE))

    age_days = max(0.0, (now_ts - rec.ts) / 86400.0)
    recency = 0.5 ** (age_days / cfg.half_life_days) if cfg.half_life_days > 0 else 0.0

    wsum = cfg.w_relevance + cfg.w_popularity + cfg.w_recency
    raw = (cfg.w_relevance * relevance
           + cfg.w_popularity * popularity
           + cfg.w_recency * recency)
    score = raw / wsum if wsum > 0 else 0.0

    return ScoredRecord(
        record=rec,
        score=round(score, 6),
        components={
            "relevance": round(relevance, 6),
            "popularity": round(popularity, 6),
            "recency": round(recency, 6),
        },
    )


def rank(records: Iterable[Record], query: str | Iterable[str], now_ts: int,
         cfg: WraConfig = DEFAULT) -> list[ScoredRecord]:
    """Classe les records par score décroissant. Tri STABLE, tie-break (-score, source, id)."""
    terms = _normalize_query(query)
    scored = [score_record(r, terms, now_ts, cfg) for r in records]
    scored.sort(key=lambda s: (-s.score, s.record.source, s.record.id))
    return scored


# ── orchestration bornée (READ ONLY : aucune I/O ici, fetchers injectés) ──────
Fetcher = Callable[[], Iterable[dict[str, Any]]]


def gather(fetchers: list[tuple[str, Fetcher]], query: str | Iterable[str], now_ts: int,
           cfg: WraConfig = DEFAULT, clock: Callable[[], float] = monotonic) -> list[ScoredRecord]:
    """Appelle les fetchers (frontière I/O injectée), vérifie, score, classe — borné.

    Bornage : stop si `calls >= cfg.max_calls` (anti explosion) ou si `clock()-start >=
    cfg.timeout_s` (budget temps). Chaque batch et le résultat final sont tronqués à
    `cfg.max_sources`. Toute source non vérifiée -> rejet DUR (verify_batch lève).
    Ne fait AUCUNE écriture / exécution ; le contenu est opaque.
    """
    if not isinstance(fetchers, list):
        raise WraError(f"fetchers attendu list[(name, callable)], reçu {type(fetchers).__name__}")

    start = clock()
    calls = 0
    raws: list[dict[str, Any]] = []
    for name, fn in fetchers:
        if calls >= cfg.max_calls:
            break  # anti explosion d'appels
        if clock() - start >= cfg.timeout_s:
            break  # budget timeout dépassé
        if not callable(fn):
            raise WraError(f"fetcher {name!r} non callable")
        calls += 1
        batch = list(fn() or [])
        raws.extend(batch[: cfg.max_sources])

    records = verify_batch(raws)  # rejet dur des sources non vérifiées
    ranked = rank(records, query, now_ts, cfg)
    return ranked[: cfg.max_sources]


# ── injection avant le PLAN (texte READ ONLY pour le council) ─────────────────
def to_council_brief(ranked: list[ScoredRecord], top_n: int = 5) -> str:
    """Brief déterministe (texte) à injecter AVANT le PLAN — alimente le council. READ ONLY."""
    head = "WEB REALITY (READ ONLY — sources vérifiées GitHub/HackerNews/arXiv)"
    if not ranked:
        return head + "\n  (aucune source vérifiée)"
    lines = [head]
    for i, s in enumerate(ranked[:top_n], 1):
        r = s.record
        lines.append(f"  {i}. [{r.source}] {r.title}  (score={s.score:.3f}) {r.url}")
    return "\n".join(lines)


# ── seul écrivain : gardé par governor.check() ────────────────────────────────
def write_cache(ranked: list[ScoredRecord], path: Path | str,
                generated_ts: int | None = None) -> Path:
    """Écrit le cache JSON — UNIQUEMENT si governor autorise. BLOCK -> CacheWriteBlocked.

    L'écriture est une action SAFE_AUTO / mission `web_reality_cache` (hors FORBIDDEN). En cas
    de refus governor : aucune écriture (fail-closed, side-effect nul).
    """
    decision = governor.check({"lane": "SAFE_AUTO", "mission": CACHE_MISSION})
    if not decision.allowed:
        raise CacheWriteBlocked(f"governor BLOCK: {decision.reason}")

    import json
    payload = {
        "version": 1,
        "generated_ts": generated_ts,
        "count": len(ranked),
        "sources": [
            {
                "source": s.record.source,
                "id": s.record.id,
                "title": s.record.title,
                "url": s.record.url,
                "ts": s.record.ts,
                "popularity": s.record.popularity,
                "score": s.score,
                "components": s.components,
            }
            for s in ranked
        ],
    }
    path = Path(path)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


# ── frontière I/O live (HTTP GET only) — NON exercée par l'oracle (réseau) ─────
def _http_get(url: str, timeout_s: float) -> bytes:
    """GET borné, lecture seule. Importé localement pour garder le cœur sans réseau."""
    from urllib.request import Request, urlopen
    req = Request(url, headers={"User-Agent": "TCS-WRA/1.0 (read-only)"})
    with urlopen(req, timeout=timeout_s) as resp:  # noqa: S310 — host validé en aval par verify
        return resp.read()


def github_fetcher(query: str, cfg: WraConfig = DEFAULT) -> Fetcher:
    """Fetcher GitHub (recherche repos). Lecture seule ; records tagués source='github'."""
    from urllib.parse import quote

    def _fetch() -> list[dict[str, Any]]:
        import json
        url = (f"https://api.github.com/search/repositories?q={quote(query)}"
               f"&sort=stars&order=desc&per_page={min(cfg.max_sources, 30)}")
        data = json.loads(_http_get(url, cfg.timeout_s))
        out = []
        for it in data.get("items", []):
            pushed = it.get("pushed_at", "")
            out.append({
                "source": "github",
                "id": str(it.get("id")),
                "title": it.get("full_name", ""),
                "url": it.get("html_url", ""),
                "ts": _iso_to_ts(pushed),
                "popularity": int(it.get("stargazers_count", 0) or 0),
                "summary": it.get("description") or "",
            })
        return out

    return _fetch


def hackernews_fetcher(query: str, cfg: WraConfig = DEFAULT) -> Fetcher:
    """Fetcher HackerNews via Algolia. Lecture seule ; source='hackernews'."""
    from urllib.parse import quote

    def _fetch() -> list[dict[str, Any]]:
        import json
        url = (f"https://hn.algolia.com/api/v1/search?query={quote(query)}"
               f"&tags=story&hitsPerPage={min(cfg.max_sources, 30)}")
        data = json.loads(_http_get(url, cfg.timeout_s))
        out = []
        for it in data.get("hits", []):
            out.append({
                "source": "hackernews",
                "id": str(it.get("objectID")),
                "title": it.get("title") or "",
                "url": f"https://news.ycombinator.com/item?id={it.get('objectID')}",
                "ts": int(it.get("created_at_i", 0) or 0),
                "popularity": int(it.get("points", 0) or 0),
                "summary": it.get("story_text") or "",
            })
        return out

    return _fetch


def arxiv_fetcher(query: str, cfg: WraConfig = DEFAULT) -> Fetcher:
    """Fetcher arXiv (Atom). Lecture seule ; source='arxiv'."""
    from urllib.parse import quote

    def _fetch() -> list[dict[str, Any]]:
        import xml.etree.ElementTree as ET
        url = (f"http://export.arxiv.org/api/query?search_query=all:{quote(query)}"
               f"&sortBy=submittedDate&sortOrder=descending"
               f"&max_results={min(cfg.max_sources, 30)}")
        root = ET.fromstring(_http_get(url, cfg.timeout_s))
        ns = {"a": "http://www.w3.org/2005/Atom"}
        out = []
        for e in root.findall("a:entry", ns):
            link = e.find("a:id", ns)
            pub = e.find("a:published", ns)
            title = e.find("a:title", ns)
            summ = e.find("a:summary", ns)
            arxiv_url = (link.text or "").strip() if link is not None else ""
            # normalise vers le host export.arxiv.org pour passer la vérification
            out.append({
                "source": "arxiv",
                "id": arxiv_url.rsplit("/", 1)[-1],
                "title": (title.text or "").strip() if title is not None else "",
                "url": arxiv_url.replace("http://arxiv.org", "https://arxiv.org"),
                "ts": _iso_to_ts(pub.text if pub is not None else ""),
                "popularity": 0,
                "summary": (summ.text or "").strip() if summ is not None else "",
            })
        return out

    return _fetch


def _iso_to_ts(iso: str) -> int:
    """ISO8601 -> unix seconds. 0 si non parsable (ne crash jamais)."""
    from datetime import datetime, timezone
    if not iso:
        return 0
    try:
        s = iso.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int(dt.timestamp())
    except (ValueError, TypeError):
        return 0


if __name__ == "__main__":
    import argparse
    import sys
    from time import time as _time

    ap = argparse.ArgumentParser(description="Web Reality Agent — veille READ ONLY (live)")
    ap.add_argument("query", help="termes de recherche")
    ap.add_argument("--cache", help="chemin du cache JSON (gardé par governor)", default=None)
    ap.add_argument("--top", type=int, default=5)
    args = ap.parse_args()

    cfg = DEFAULT
    now = int(_time())
    fetchers: list[tuple[str, Fetcher]] = [
        ("github", github_fetcher(args.query, cfg)),
        ("hackernews", hackernews_fetcher(args.query, cfg)),
        ("arxiv", arxiv_fetcher(args.query, cfg)),
    ]
    try:
        ranked = gather(fetchers, args.query, now, cfg)
    except WraError as exc:
        print(f"[WRA] rejet: {exc}", file=sys.stderr)
        sys.exit(1)

    print(to_council_brief(ranked, top_n=args.top))
    if args.cache:
        try:
            p = write_cache(ranked, args.cache, generated_ts=now)
            print(f"[WRA] cache écrit: {p}")
        except CacheWriteBlocked as exc:
            print(f"[WRA] cache refusé: {exc}", file=sys.stderr)
            sys.exit(2)
