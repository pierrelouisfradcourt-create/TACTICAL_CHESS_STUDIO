"""llm_logic_engine.py — remplit la LOGIQUE des regles via claude_proxy (IMP-188).

Frontiere stricte : ce module ne touche JAMAIS la structure du scaffold
(ids d'entites, noms de regles, layout). Il ne fait que remplir le slot
`logic` de chaque regle a partir de sa `condition` / `effect`.

Appel LLM : endpoint OpenAI-compatible (claude_proxy port 8765 par defaut,
modele claude-code-cli). Le client HTTP est injectable (`lm_call`) pour que
les tests ne dependent pas du reseau.

Degradation gracieuse : si le proxy est indisponible (cas frequent en
session dev), aucune exception ne remonte — les slots restent marques
FALLBACK et `logic_complete` reste False. factory_loop n'en promeut alors
rien (la structure existe, la logique est incomplete et signalee).
"""
from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any, Callable

logger = logging.getLogger("studio.factory.llm_logic_engine")

# Configuration reseau (surchargee par l'environnement).
PROXY_URL = os.environ.get("TCS_LLM_PROXY_URL", "http://127.0.0.1:8765")
PROXY_MODEL = os.environ.get("TCS_LLM_PROXY_MODEL", "claude-code-cli")
DEFAULT_TIMEOUT = float(os.environ.get("TCS_LLM_TIMEOUT", "60"))
DEFAULT_RETRIES = int(os.environ.get("TCS_LLM_RETRIES", "2"))

# Marqueur de slot non rempli faute de LLM joignable.
FALLBACK = "[FALLBACK: logique non generee — proxy LLM indisponible]"

LmCall = Callable[[str], str]

_SYSTEM = (
    "Tu es le moteur de logique de l'usine TCS. On te donne la CONDITION et "
    "l'EFFET d'une regle de jeu. Tu produis UNIQUEMENT le corps logique "
    "(pseudocode ou snippet) qui applique l'effet quand la condition est vraie. "
    "N'invente aucune entite, ne change aucune structure, pas de prose."
)


class LogicEngineError(RuntimeError):
    """Erreur non recuperable du moteur de logique (structure violee)."""


def _default_lm_call(prompt: str, *, timeout: float = DEFAULT_TIMEOUT,
                     retries: int = DEFAULT_RETRIES) -> str:
    """Appel reel au proxy LLM (OpenAI-compatible). urllib only, sans dependance.

    Retourne le contenu texte, ou leve `urllib.error.URLError` apres epuisement
    des essais — l'appelant (`fill_logic`) capture et bascule en FALLBACK.
    """
    payload = {
        "model": PROXY_MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 400,
        "temperature": 0.2,
        "stream": False,
    }
    data = json.dumps(payload).encode("utf-8")
    url = f"{PROXY_URL}/v1/chat/completions"
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        req = urllib.request.Request(
            url, data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                result = json.loads(resp.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"].strip()
        except (urllib.error.URLError, KeyError, IndexError,
                json.JSONDecodeError, TimeoutError) as exc:
            last_err = exc
            logger.warning("appel LLM echec (essai %d/%d) : %s", attempt, retries, exc)
    raise urllib.error.URLError(f"proxy injoignable apres {retries} essais : {last_err}")


def _build_prompt(rule: dict[str, Any]) -> str:
    return (
        f"REGLE: {rule['rule']}\n"
        f"CONDITION: {rule['condition']}\n"
        f"EFFET: {rule['effect']}\n"
        f"PARAMETRES: {json.dumps(rule.get('parameters', {}), ensure_ascii=False)}\n\n"
        "Corps logique :"
    )


def _assert_structure_preserved(before: dict[str, Any], after: dict[str, Any]) -> None:
    """Garde-fou : la structure (projet, entites, noms de regles) est intacte."""
    if before["project"] != after["project"]:
        raise LogicEngineError("violation : le bloc projet a ete modifie")
    if [e["id"] for e in before["entities"]] != [e["id"] for e in after["entities"]]:
        raise LogicEngineError("violation : les ids d'entites ont change")
    if [r["rule"] for r in before["rules"]] != [r["rule"] for r in after["rules"]]:
        raise LogicEngineError("violation : les noms de regles ont change")


def fill_logic(
    scaffold: dict[str, Any],
    *,
    lm_call: LmCall | None = None,
) -> dict[str, Any]:
    """Remplit le slot `logic` de chaque regle du scaffold.

    Ne mute PAS l'entree : retourne une copie enrichie. La structure est
    verifiee intacte avant retour. En cas de proxy indisponible, les slots
    concernes recoivent `FALLBACK` et `logic_complete` reste False.

    Parameters
    ----------
    scaffold : dict
        Sortie de template_engine.build_scaffold (slots logic = None).
    lm_call : callable, optionnel
        Fonction (prompt -> texte). Defaut : appel reel au proxy. Injectee
        dans les tests pour eviter le reseau.

    Returns
    -------
    dict
        Scaffold enrichi : { ..., logic_complete: bool, logic_report: {...} }.
    """
    call = lm_call or _default_lm_call
    out = json.loads(json.dumps(scaffold))  # deep copy serialisable

    filled = 0
    failed = 0
    for rule in out["rules"]:
        if rule.get("logic") not in (None, FALLBACK):
            continue  # deja rempli (idempotence)
        try:
            logic = call(_build_prompt(rule))
            if not isinstance(logic, str) or not logic.strip():
                raise LogicEngineError(f"reponse LLM vide pour la regle '{rule['rule']}'")
            rule["logic"] = logic.strip()
            filled += 1
        except LogicEngineError:
            raise
        except Exception as exc:  # noqa: BLE001 — degradation gracieuse voulue
            logger.warning("logique non generee pour '%s' : %s", rule["rule"], exc)
            rule["logic"] = FALLBACK
            failed += 1

    _assert_structure_preserved(scaffold, out)

    out["logic_complete"] = failed == 0 and all(
        r.get("logic") not in (None, FALLBACK) for r in out["rules"]
    )
    out["logic_report"] = {
        "rules_total": len(out["rules"]),
        "filled": filled,
        "fallback": failed,
        "complete": out["logic_complete"],
    }
    logger.info(
        "logique : %d remplies, %d fallback sur %d regles (complete=%s)",
        filled, failed, len(out["rules"]), out["logic_complete"],
    )
    return out


if __name__ == "__main__":
    import sys
    from studio.factory.template_engine import build_scaffold, load_ir  # noqa: E402

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    if len(sys.argv) < 2:
        print("usage: python llm_logic_engine.py <ir_path.json>")
        raise SystemExit(2)
    sc = build_scaffold(load_ir(sys.argv[1]))
    enriched = fill_logic(sc)
    print(json.dumps(enriched["logic_report"], indent=2, ensure_ascii=False))
