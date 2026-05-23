from __future__ import annotations

import argparse
import html
import json
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ExtractedBlock:
    raw: str
    text: str
    score: int


_QUOTED_STRING_RE = re.compile(r'"((?:[^"\\]|\\.){200,})"')


def _repair_mojibake(s: str) -> str:
    # Many ChatGPT share pages end up with UTF-8 bytes mis-decoded as latin1
    # somewhere in the pipeline (Ã©, Ã , â€™, …). We attempt a safe repair.
    if "Ã" not in s and "â" not in s:
        return s
    try:
        return s.encode("latin1", errors="ignore").decode("utf-8", errors="ignore")
    except Exception:
        return s


def _unescape_jsonish(s: str) -> str:
    # Convert common JSON-style escaping back to usable text.
    try:
        # Wrap into a JSON string to leverage json unescaping rules.
        return json.loads(f'"{s}"')
    except Exception:
        # Fallback: handle a minimal subset.
        return (
            s.replace("\\n", "\n")
            .replace("\\t", "\t")
            .replace("\\r", "")
            .replace('\\"', '"')
            .replace("\\/", "/")
            .replace("\\\\", "\\")
        )


def extract_blocks_from_html(html_text: str) -> list[ExtractedBlock]:
    candidates: list[ExtractedBlock] = []
    for match in _QUOTED_STRING_RE.finditer(html_text):
        raw = match.group(1)
        if "\\n" not in raw:
            continue
        text = _unescape_jsonish(raw)
        text = html.unescape(text)
        text = _repair_mojibake(text)

        # Heuristic scoring: prefer large, structured, human-looking blocks.
        score = 0
        score += min(len(text), 20000)
        score += 2000 if "##" in text or "# " in text else 0
        score += 1500 if "```" in text else 0
        score += 1000 if "\n---\n" in text else 0
        score += 800 if "Matrice" in text or "matrix" in text.lower() else 0
        score -= 2500 if "cdn/assets" in text or "favicon" in text else 0
        score -= 2500 if "og:" in text or "viewport" in text else 0

        # Skip junky blocks that look like pure telemetry / ids
        if sum(ch.isalpha() for ch in text[:400]) < 40:
            continue

        candidates.append(ExtractedBlock(raw=raw, text=text, score=score))

    # Deduplicate by text prefix
    seen_prefixes: set[str] = set()
    uniq: list[ExtractedBlock] = []
    for block in sorted(candidates, key=lambda b: b.score, reverse=True):
        prefix = block.text[:200]
        if prefix in seen_prefixes:
            continue
        seen_prefixes.add(prefix)
        uniq.append(block)
    return uniq


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--topk", type=int, default=2)
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    html_files = sorted([p for p in args.input_dir.iterdir() if p.suffix.lower() == ".html"])
    if not html_files:
        raise SystemExit(f"No .html files found in {args.input_dir}")

    for html_path in html_files:
        content = html_path.read_text(encoding="utf-8", errors="ignore")
        blocks = extract_blocks_from_html(content)
        chosen = blocks[: max(1, args.topk)]

        out_path = args.output_dir / (html_path.stem + ".txt")
        with out_path.open("w", encoding="utf-8", newline="\n") as f:
            for i, block in enumerate(chosen, start=1):
                if i > 1:
                    f.write("\n\n" + ("=" * 80) + "\n\n")
                f.write(block.text.strip() + "\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

