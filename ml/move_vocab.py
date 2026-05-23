from __future__ import annotations

from typing import Dict, List, Optional, Sequence
import hashlib

FILES = "abcdefgh"
RANKS = "12345678"
PROMOTIONS = ("q", "r", "b", "n")


def all_squares() -> List[str]:
    return [f + r for r in RANKS for f in FILES]


def normalize_uci_move(move: str) -> str:
    if not isinstance(move, str):
        raise TypeError(f"move must be str, got {type(move).__name__}")

    mv = move.strip().lower()

    if len(mv) not in (4, 5):
        raise ValueError(f"invalid UCI move length: {move!r}")

    if mv[0] not in FILES or mv[2] not in FILES:
        raise ValueError(f"invalid UCI file in move: {move!r}")

    if mv[1] not in RANKS or mv[3] not in RANKS:
        raise ValueError(f"invalid UCI rank in move: {move!r}")

    if mv[:2] == mv[2:4]:
        raise ValueError(f"source and destination are identical: {move!r}")

    if len(mv) == 5 and mv[4] not in PROMOTIONS:
        raise ValueError(f"invalid promotion suffix: {move!r}")

    return mv


def _is_promotion_pair(src: str, dst: str) -> bool:
    src_file, src_rank = src[0], src[1]
    dst_file, dst_rank = dst[0], dst[1]

    file_delta = abs(ord(src_file) - ord(dst_file))
    if file_delta > 1:
        return False

    white_promo = src_rank == "7" and dst_rank == "8"
    black_promo = src_rank == "2" and dst_rank == "1"

    return white_promo or black_promo


def build_vocab() -> List[str]:
    moves: List[str] = []
    squares = all_squares()

    for src in squares:
        for dst in squares:
            if src == dst:
                continue

            base = src + dst

            if _is_promotion_pair(src, dst):
                for promo in PROMOTIONS:
                    moves.append(base + promo)
            else:
                moves.append(base)

    seen = set()
    vocab: List[str] = []

    for mv in moves:
        if mv not in seen:
            seen.add(mv)
            vocab.append(mv)

    return vocab


MOVE_VOCAB: List[str] = build_vocab()
MOVE_TO_INDEX: Dict[str, int] = {mv: i for i, mv in enumerate(MOVE_VOCAB)}
INDEX_TO_MOVE: Dict[int, str] = {i: mv for i, mv in enumerate(MOVE_VOCAB)}


def vocab_fingerprint() -> str:
    """Compute stable SHA256 fingerprint of the ordered MOVE_VOCAB."""
    content = "\n".join(MOVE_VOCAB)
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def move_to_index(move: str) -> int:
    mv = normalize_uci_move(move)
    return MOVE_TO_INDEX[mv]


def try_move_to_index(move: str) -> Optional[int]:
    try:
        mv = normalize_uci_move(move)
    except (TypeError, ValueError):
        return None
    return MOVE_TO_INDEX.get(mv)


def index_to_move(index: int) -> str:
    if index not in INDEX_TO_MOVE:
        raise KeyError(f"unknown move index: {index}")
    return INDEX_TO_MOVE[index]


def vocab_size() -> int:
    return len(MOVE_VOCAB)


def contains_move(move: str) -> bool:
    return try_move_to_index(move) is not None


def encode_moves_strict(moves: Sequence[str]) -> List[int]:
    return [move_to_index(mv) for mv in moves]


def encode_moves_safe(moves: Sequence[str]) -> List[int]:
    out: List[int] = []
    for mv in moves:
        idx = try_move_to_index(mv)
        if idx is not None:
            out.append(idx)
    return out


def decode_indices(indices: Sequence[int]) -> List[str]:
    return [index_to_move(i) for i in indices]


def legal_move_indices(legal_moves: Sequence[str], strict: bool = False) -> List[int]:
    if strict:
        return encode_moves_strict(legal_moves)
    return encode_moves_safe(legal_moves)


def build_legal_move_mask(legal_moves: Sequence[str]) -> List[float]:
    mask = [0.0] * vocab_size()
    for idx in legal_move_indices(legal_moves, strict=False):
        mask[idx] = 1.0
    return mask


def validate_vocab() -> None:
    if len(MOVE_VOCAB) != len(MOVE_TO_INDEX):
        raise RuntimeError("duplicate moves detected in MOVE_VOCAB")

    if len(MOVE_VOCAB) != len(INDEX_TO_MOVE):
        raise RuntimeError("index mapping mismatch")

    samples = [
        "e2e4",
        "g1f3",
        "e1g1",
        "e1c1",
        "e8g8",
        "e8c8",
        "a7a8q",
        "a7b8n",
        "h2h1r",
        "h2g1b",
    ]

    for mv in samples:
        idx = move_to_index(mv)
        decoded = index_to_move(idx)
        if decoded != normalize_uci_move(mv):
            raise RuntimeError(f"roundtrip failed for {mv}")

    if try_move_to_index("e2e2") is not None:
        raise RuntimeError("invalid identical-square move should not exist")

    for promo in PROMOTIONS:
        if try_move_to_index(f"a7a8{promo}") is None:
            raise RuntimeError(f"missing white promotion {promo}")
        if try_move_to_index(f"h2h1{promo}") is None:
            raise RuntimeError(f"missing black promotion {promo}")


if __name__ == "__main__":
    validate_vocab()
    print("MOVE VOCAB REPORT")
    print(f"vocab size: {vocab_size()}")
    print(f"vocab fingerprint: {vocab_fingerprint()}")
    print(f"e2e4 -> {move_to_index('e2e4')}")
    print(f"g1f3 -> {move_to_index('g1f3')}")
    print(f"a7a8q -> {move_to_index('a7a8q')}")
    print(f"index 0 -> {index_to_move(0)}")
    print("validation: OK")