import random
from collections import Counter
import chess

FAMILY = {
    "ladder_mate": "finisher",
    "kq_vs_k": "finisher",
    "kr_vs_k": "finisher",
    "passed_pawn_push": "fundamental",
    "queen_trade_simplify": "fundamental",
    "hanging_piece_punish": "fundamental",
    "knight_fork": "tactical",
}

THEMES = [
    "ladder_mate",
    "kq_vs_k",
    "kr_vs_k",
    "passed_pawn_push",
    "queen_trade_simplify",
    "hanging_piece_punish",
    "knight_fork",
]

DISABLED_THEMES = {"ladder_mate"}
ACTIVE_THEMES = tuple(sorted(THEMES))

CURRICULUM_WEIGHTS = {
    "early": {"tactical": 0.45, "finisher": 0.35, "fundamental": 0.20},
    "mid": {"tactical": 0.45, "finisher": 0.35, "fundamental": 0.20},
    "late": {"tactical": 0.45, "finisher": 0.35, "fundamental": 0.20},
}

INTRA_FAMILY_WEIGHTS = {
    "fundamental": {
        "passed_pawn_push": 0.34,
        "queen_trade_simplify": 0.33,
        "hanging_piece_punish": 0.33,
    },
    "tactical": {
        "knight_fork": 1.0,
    },
    "finisher": {
        "ladder_mate": 0.34,
        "kq_vs_k": 0.33,
        "kr_vs_k": 0.33,
    },
}

DIFFICULTY_WEIGHTS = {1: 0.25, 2: 0.50, 3: 0.25}

PIECE_VALUE = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 0,
}

LAST_GENERATION_SUMMARY = {
    "requested_samples": 0,
    "generated_samples": 0,
    "rejected_samples": 0,
    "counts_by_theme": {},
}

THEME_FAILURES = Counter()


def _place(board: chess.Board, square_name: str, piece: chess.Piece) -> None:
    square = chess.parse_square(square_name)
    if board.piece_at(square) is not None:
        raise ValueError(f"Spawn collision on {square_name}")
    board.set_piece_at(square, piece)


def _place_many(board: chess.Board, placements):
    seen = set()
    for square_name, piece in placements:
        sq = chess.parse_square(square_name)
        if sq in seen:
            raise ValueError(f"Duplicate placement requested on {square_name}")
        seen.add(sq)
        _place(board, square_name, piece)


def _legal_moves(board: chess.Board):
    return [m.uci() for m in board.legal_moves]


def _move_from_uci(board: chess.Board, uci: str) -> chess.Move:
    move = chess.Move.from_uci(uci)
    if move not in board.legal_moves:
        raise ValueError(f"Illegal move {uci} in {board.fen()}")
    return move


def _material_score(board: chess.Board, color: chess.Color) -> int:
    total = 0
    for piece in board.piece_map().values():
        if piece.color == color:
            total += PIECE_VALUE[piece.piece_type]
    return total


def _mirror_square_horizontal(square: chess.Square) -> chess.Square:
    return chess.square(7 - chess.square_file(square), chess.square_rank(square))


def _mirror_square_vertical(square: chess.Square) -> chess.Square:
    return chess.square(chess.square_file(square), 7 - chess.square_rank(square))


def _rotate_square_180(square: chess.Square) -> chess.Square:
    return chess.square(7 - chess.square_file(square), 7 - chess.square_rank(square))


def _transform_move_uci(uci: str, transform_fn) -> str:
    move = chess.Move.from_uci(uci)
    return chess.Move(transform_fn(move.from_square), transform_fn(move.to_square), promotion=move.promotion).uci()


def _transform_board(board: chess.Board, transform_name: str) -> chess.Board:
    if transform_name == "identity":
        return board.copy(stack=False)
    if transform_name == "mirror_h":
        transform_fn = _mirror_square_horizontal
    elif transform_name == "mirror_v":
        transform_fn = _mirror_square_vertical
    elif transform_name == "rot180":
        transform_fn = _rotate_square_180
    else:
        raise ValueError(f"Unknown transform: {transform_name}")

    new_board = chess.Board(None)
    new_board.turn = board.turn
    new_board.castling_rights = 0
    new_board.ep_square = None
    new_board.halfmove_clock = board.halfmove_clock
    new_board.fullmove_number = board.fullmove_number
    for square, piece in board.piece_map().items():
        new_board.set_piece_at(transform_fn(square), piece)
    return new_board


def _apply_random_symmetry(board: chess.Board, best_move: str, rng: random.Random):
    transform_name = rng.choice(["identity", "mirror_h", "mirror_v", "rot180"])
    if transform_name == "identity":
        return board, best_move
    if transform_name == "mirror_h":
        fn = _mirror_square_horizontal
    elif transform_name == "mirror_v":
        fn = _mirror_square_vertical
    else:
        fn = _rotate_square_180
    return _transform_board(board, transform_name), _transform_move_uci(best_move, fn)


def _validate_position(board: chess.Board, best_move: str) -> None:
    if board.king(chess.WHITE) is None or board.king(chess.BLACK) is None:
        raise ValueError("Both kings must be present")
    wk = board.king(chess.WHITE)
    bk = board.king(chess.BLACK)
    if chess.square_distance(wk, bk) <= 1:
        raise ValueError("Kings adjacent")
    if not board.is_valid():
        raise ValueError(f"Invalid board: {board.fen()}")
    if board.is_game_over():
        raise ValueError(f"Position already terminal: {board.fen()}")
    legal = _legal_moves(board)
    if not legal:
        raise ValueError(f"No legal moves in generated position: {board.fen()}")
    if best_move not in legal:
        raise ValueError(f"Best move {best_move} is not legal in {board.fen()}")


def _black_king_legal_count(board: chess.Board) -> int:
    return sum(
        1
        for m in board.legal_moves
        if board.piece_at(m.from_square)
        and board.piece_at(m.from_square).piece_type == chess.KING
        and board.piece_at(m.from_square).color == chess.BLACK
    )


def _king_box_area(board: chess.Board) -> int:
    bk = board.king(chess.BLACK)
    squares = [bk]
    for m in board.legal_moves:
        piece = board.piece_at(m.from_square)
        if piece and piece.color == chess.BLACK and piece.piece_type == chess.KING:
            squares.append(m.to_square)
    files = [chess.square_file(s) for s in squares]
    ranks = [chess.square_rank(s) for s in squares]
    return (max(files) - min(files) + 1) * (max(ranks) - min(ranks) + 1)


def _queen_safe_from_black_king(board: chess.Board) -> bool:
    qsq = None
    for sq, piece in board.piece_map().items():
        if piece.color == chess.WHITE and piece.piece_type == chess.QUEEN:
            qsq = sq
            break
    if qsq is None:
        return False
    bk = board.king(chess.BLACK)
    return chess.square_distance(qsq, bk) > 1


def _rook_not_capturable_by_black_king(board: chess.Board) -> bool:
    rsq = None
    for sq, piece in board.piece_map().items():
        if piece.color == chess.WHITE and piece.piece_type == chess.ROOK:
            rsq = sq
            break
    if rsq is None:
        return False
    for m in board.legal_moves:
        piece = board.piece_at(m.from_square)
        if piece and piece.color == chess.BLACK and piece.piece_type == chess.KING and m.to_square == rsq:
            return False
    return True


def _rook_cuts_off_line(board_after: chess.Board) -> bool:
    bk = board_after.king(chess.BLACK)
    rsq = None
    for sq, piece in board_after.piece_map().items():
        if piece.color == chess.WHITE and piece.piece_type == chess.ROOK:
            rsq = sq
            break
    if rsq is None:
        return False
    return (
        chess.square_file(rsq) == chess.square_file(bk)
        or chess.square_rank(rsq) == chess.square_rank(bk)
    )


def _other_white_rook_mates(board: chess.Board, best_move: str) -> bool:
    best = chess.Move.from_uci(best_move)
    rooks = [sq for sq, p in board.piece_map().items() if p.color == chess.WHITE and p.piece_type == chess.ROOK]
    for move in board.legal_moves:
        piece = board.piece_at(move.from_square)
        if not piece or piece.color != chess.WHITE or piece.piece_type != chess.ROOK:
            continue
        if move == best:
            continue
        child = board.copy(stack=False)
        child.push(move)
        if child.is_checkmate():
            return True
    return False


def _assert_ladder_mate(board: chess.Board, best_move: str) -> None:
    if sum(1 for p in board.piece_map().values() if p.color == chess.WHITE and p.piece_type == chess.ROOK) != 2:
        raise ValueError("ladder_mate: expected two white rooks")
    child = board.copy(stack=False)
    child.push(_move_from_uci(board, best_move))
    if not child.is_checkmate():
        raise ValueError("ladder_mate: move must be mate")
    if _other_white_rook_mates(board, best_move):
        raise ValueError("ladder_mate: alternative rook mate exists")


def _assert_kq_vs_k(board: chess.Board, best_move: str) -> None:
    pieces = list(board.piece_map().values())
    if len(pieces) != 3:
        raise ValueError("kq_vs_k: expected KQ vs K")
    if sum(1 for p in pieces if p.color == chess.WHITE and p.piece_type == chess.QUEEN) != 1:
        raise ValueError("kq_vs_k: missing white queen")
    move = _move_from_uci(board, best_move)
    if board.piece_at(move.from_square).piece_type != chess.QUEEN:
        raise ValueError("kq_vs_k: best move must be queen move")
    old_mobility = _black_king_legal_count(board)
    old_box = _king_box_area(board)
    old_dist = chess.square_distance(board.king(chess.WHITE), board.king(chess.BLACK))
    child = board.copy(stack=False)
    child.push(move)
    if child.is_stalemate():
        raise ValueError("kq_vs_k: stalemate")
    if _black_king_legal_count(child) >= old_mobility:
        raise ValueError("kq_vs_k: black mobility must decrease")
    new_box = _king_box_area(child)
    new_dist = chess.square_distance(child.king(chess.WHITE), child.king(chess.BLACK))
    if not (new_box < old_box or new_dist < old_dist):
        raise ValueError("kq_vs_k: no structural improvement")
    if not _queen_safe_from_black_king(child):
        raise ValueError("kq_vs_k: queen unsafe")


def _assert_kr_vs_k(board: chess.Board, best_move: str) -> None:
    pieces = list(board.piece_map().values())
    if len(pieces) != 3:
        raise ValueError("kr_vs_k: expected KR vs K")
    if sum(1 for p in pieces if p.color == chess.WHITE and p.piece_type == chess.ROOK) != 1:
        raise ValueError("kr_vs_k: missing white rook")
    move = _move_from_uci(board, best_move)
    if board.piece_at(move.from_square).piece_type != chess.ROOK:
        raise ValueError("kr_vs_k: best move must be rook move")
    old_mobility = _black_king_legal_count(board)
    child = board.copy(stack=False)
    child.push(move)
    if child.is_stalemate():
        raise ValueError("kr_vs_k: stalemate")
    if _black_king_legal_count(child) >= old_mobility:
        raise ValueError("kr_vs_k: black mobility must decrease")
    if not _rook_cuts_off_line(child):
        raise ValueError("kr_vs_k: rook does not cut off line")
    if not _rook_not_capturable_by_black_king(child):
        raise ValueError("kr_vs_k: rook capturable")


def _assert_passed_pawn_push(board: chess.Board, best_move: str) -> None:
    move = _move_from_uci(board, best_move)
    piece = board.piece_at(move.from_square)
    if piece is None or piece.piece_type != chess.PAWN or piece.color != board.turn:
        raise ValueError("passed_pawn_push: best move must be pawn move")
    if chess.square_file(move.from_square) != chess.square_file(move.to_square):
        raise ValueError("passed_pawn_push: expected forward pawn push")
    if board.turn == chess.WHITE and chess.square_rank(move.to_square) <= chess.square_rank(move.from_square):
        raise ValueError("passed_pawn_push: no progress")


def _assert_queen_trade_simplify(board: chess.Board, best_move: str) -> None:
    move = _move_from_uci(board, best_move)
    mover = board.piece_at(move.from_square)
    target = board.piece_at(move.to_square)
    if mover is None or mover.piece_type != chess.QUEEN:
        raise ValueError("queen_trade_simplify: mover must be queen")
    if target is None or target.piece_type != chess.QUEEN or target.color == mover.color:
        raise ValueError("queen_trade_simplify: must capture enemy queen")
    us = board.turn
    them = not board.turn
    if _material_score(board, us) <= _material_score(board, them):
        raise ValueError("queen_trade_simplify: side to move is not ahead")
    child = board.copy(stack=False)
    child.push(move)
    remaining_queens = sum(1 for p in child.piece_map().values() if p.piece_type == chess.QUEEN)
    if remaining_queens != 0:
        raise ValueError("queen_trade_simplify: queens not fully traded")


def _assert_hanging_piece_punish(board: chess.Board, best_move: str) -> None:
    move = _move_from_uci(board, best_move)
    mover = board.piece_at(move.from_square)
    target = board.piece_at(move.to_square)
    if mover is None or target is None:
        raise ValueError("hanging_piece_punish: expected capture")
    if mover.color == target.color:
        raise ValueError("hanging_piece_punish: target must be enemy")
    defenders = len(board.attackers(target.color, move.to_square))
    if defenders != 0:
        raise ValueError("hanging_piece_punish: target is not hanging")


def _assert_knight_fork(board: chess.Board, best_move: str) -> None:
    move = _move_from_uci(board, best_move)
    piece = board.piece_at(move.from_square)
    if piece is None or piece.piece_type != chess.KNIGHT:
        raise ValueError("knight_fork: best move must be knight move")
    child = board.copy(stack=False)
    child.push(move)
    knight_square = move.to_square
    attacked = 0
    for sq, p in child.piece_map().items():
        if p.color == chess.BLACK and p.piece_type in (chess.KING, chess.QUEEN, chess.ROOK):
            if knight_square in child.attackers(chess.WHITE, sq):
                attacked += 1
    if attacked < 2:
        raise ValueError("knight_fork: no real fork created")


def _validate_theme(board: chess.Board, theme: str, best_move: str) -> None:
    if theme == "hanging_piece_punish":
        _assert_hanging_piece_punish(board, best_move)
    elif theme == "passed_pawn_push":
        _assert_passed_pawn_push(board, best_move)
    elif theme == "queen_trade_simplify":
        _assert_queen_trade_simplify(board, best_move)
    elif theme == "knight_fork":
        _assert_knight_fork(board, best_move)
    elif theme == "ladder_mate":
        _assert_ladder_mate(board, best_move)
    elif theme == "kq_vs_k":
        _assert_kq_vs_k(board, best_move)
    elif theme == "kr_vs_k":
        _assert_kr_vs_k(board, best_move)
    else:
        raise ValueError(f"Unknown or disabled theme {theme}")


def _row(board: chess.Board, theme: str, difficulty: int, best_move: str, rng: random.Random) -> dict:
    board, best_move = _apply_random_symmetry(board, best_move, rng)
    _validate_position(board, best_move)
    _validate_theme(board, theme, best_move)
    return {
        "fen": board.fen(),
        "side": "w" if board.turn else "b",
        "legal_moves": _legal_moves(board),
        "best_move": best_move,
        "theme": theme,
        "family": FAMILY[theme],
        "difficulty": difficulty,
        "source": "exercise_v4_clean",
    }


SKELETONS = {
    "hanging_piece_punish": {
        1: [
            {"pieces": [("g1", chess.Piece(chess.KING, chess.WHITE)), ("g2", chess.Piece(chess.BISHOP, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("c6", chess.Piece(chess.KNIGHT, chess.BLACK))], "best_move": "g2c6"},
            {"pieces": [("g1", chess.Piece(chess.KING, chess.WHITE)), ("h5", chess.Piece(chess.QUEEN, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("g6", chess.Piece(chess.PAWN, chess.BLACK))], "best_move": "h5g6"},
            {"pieces": [("c1", chess.Piece(chess.KING, chess.WHITE)), ("c7", chess.Piece(chess.ROOK, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("b7", chess.Piece(chess.BISHOP, chess.BLACK))], "best_move": "c7b7"},
        ],
        2: [
            {"pieces": [("g1", chess.Piece(chess.KING, chess.WHITE)), ("g2", chess.Piece(chess.BISHOP, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("c6", chess.Piece(chess.KNIGHT, chess.BLACK)), ("f3", chess.Piece(chess.KNIGHT, chess.WHITE))], "best_move": "g2c6"},
            {"pieces": [("g1", chess.Piece(chess.KING, chess.WHITE)), ("h5", chess.Piece(chess.QUEEN, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("g6", chess.Piece(chess.PAWN, chess.BLACK)), ("e1", chess.Piece(chess.ROOK, chess.WHITE))], "best_move": "h5g6"},
            {"pieces": [("c1", chess.Piece(chess.KING, chess.WHITE)), ("c7", chess.Piece(chess.ROOK, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("b7", chess.Piece(chess.BISHOP, chess.BLACK)), ("d1", chess.Piece(chess.QUEEN, chess.WHITE))], "best_move": "c7b7"},
        ],
        3: [
            {"pieces": [("g1", chess.Piece(chess.KING, chess.WHITE)), ("g2", chess.Piece(chess.BISHOP, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("c6", chess.Piece(chess.KNIGHT, chess.BLACK)), ("a2", chess.Piece(chess.PAWN, chess.WHITE)), ("h7", chess.Piece(chess.PAWN, chess.BLACK))], "best_move": "g2c6"},
            {"pieces": [("g1", chess.Piece(chess.KING, chess.WHITE)), ("h5", chess.Piece(chess.QUEEN, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("g6", chess.Piece(chess.PAWN, chess.BLACK)), ("a2", chess.Piece(chess.PAWN, chess.WHITE)), ("h7", chess.Piece(chess.PAWN, chess.BLACK))], "best_move": "h5g6"},
            {"pieces": [("c1", chess.Piece(chess.KING, chess.WHITE)), ("c7", chess.Piece(chess.ROOK, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("b7", chess.Piece(chess.BISHOP, chess.BLACK)), ("h2", chess.Piece(chess.PAWN, chess.WHITE)), ("a7", chess.Piece(chess.PAWN, chess.BLACK))], "best_move": "c7b7"},
        ],
    },
    "passed_pawn_push": {
        1: [
            {"pieces": [("e6", chess.Piece(chess.KING, chess.WHITE)), ("e7", chess.Piece(chess.PAWN, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "e7e8q"},
            {"pieces": [("c6", chess.Piece(chess.KING, chess.WHITE)), ("d6", chess.Piece(chess.PAWN, chess.WHITE)), ("e8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "d6d7"},
            {"pieces": [("f5", chess.Piece(chess.KING, chess.WHITE)), ("g6", chess.Piece(chess.PAWN, chess.WHITE)), ("h8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "g6g7"},
        ],
        2: [
            {"pieces": [("d6", chess.Piece(chess.KING, chess.WHITE)), ("e6", chess.Piece(chess.PAWN, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("a6", chess.Piece(chess.PAWN, chess.BLACK))], "best_move": "e6e7"},
            {"pieces": [("c5", chess.Piece(chess.KING, chess.WHITE)), ("d5", chess.Piece(chess.PAWN, chess.WHITE)), ("e8", chess.Piece(chess.KING, chess.BLACK)), ("h6", chess.Piece(chess.PAWN, chess.BLACK))], "best_move": "d5d6"},
            {"pieces": [("f4", chess.Piece(chess.KING, chess.WHITE)), ("g5", chess.Piece(chess.PAWN, chess.WHITE)), ("h8", chess.Piece(chess.KING, chess.BLACK)), ("a2", chess.Piece(chess.PAWN, chess.WHITE))], "best_move": "g5g6"},
        ],
        3: [
            {"pieces": [("d5", chess.Piece(chess.KING, chess.WHITE)), ("e5", chess.Piece(chess.PAWN, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("h5", chess.Piece(chess.PAWN, chess.BLACK))], "best_move": "e5e6"},
            {"pieces": [("c4", chess.Piece(chess.KING, chess.WHITE)), ("d4", chess.Piece(chess.PAWN, chess.WHITE)), ("e8", chess.Piece(chess.KING, chess.BLACK)), ("a5", chess.Piece(chess.PAWN, chess.BLACK))], "best_move": "d4d5"},
            {"pieces": [("f3", chess.Piece(chess.KING, chess.WHITE)), ("g4", chess.Piece(chess.PAWN, chess.WHITE)), ("h8", chess.Piece(chess.KING, chess.BLACK)), ("h3", chess.Piece(chess.PAWN, chess.WHITE))], "best_move": "g4g5"},
        ],
    },
    "queen_trade_simplify": {
        1: [
            {"pieces": [("g1", chess.Piece(chess.KING, chess.WHITE)), ("d1", chess.Piece(chess.QUEEN, chess.WHITE)), ("a1", chess.Piece(chess.ROOK, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("d8", chess.Piece(chess.QUEEN, chess.BLACK))], "best_move": "d1d8"},
            {"pieces": [("c2", chess.Piece(chess.KING, chess.WHITE)), ("h7", chess.Piece(chess.QUEEN, chess.WHITE)), ("a7", chess.Piece(chess.ROOK, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("h4", chess.Piece(chess.QUEEN, chess.BLACK))], "best_move": "h7h4"},
            {"pieces": [("f3", chess.Piece(chess.KING, chess.WHITE)), ("e4", chess.Piece(chess.QUEEN, chess.WHITE)), ("b1", chess.Piece(chess.ROOK, chess.WHITE)), ("g7", chess.Piece(chess.KING, chess.BLACK)), ("e6", chess.Piece(chess.QUEEN, chess.BLACK))], "best_move": "e4e6"},
        ],
        2: [
            {"pieces": [("g2", chess.Piece(chess.KING, chess.WHITE)), ("d2", chess.Piece(chess.QUEEN, chess.WHITE)), ("a2", chess.Piece(chess.ROOK, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("d7", chess.Piece(chess.QUEEN, chess.BLACK))], "best_move": "d2d7"},
            {"pieces": [("c3", chess.Piece(chess.KING, chess.WHITE)), ("h6", chess.Piece(chess.QUEEN, chess.WHITE)), ("a6", chess.Piece(chess.ROOK, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("h3", chess.Piece(chess.QUEEN, chess.BLACK))], "best_move": "h6h3"},
            {"pieces": [("f4", chess.Piece(chess.KING, chess.WHITE)), ("e5", chess.Piece(chess.QUEEN, chess.WHITE)), ("b2", chess.Piece(chess.ROOK, chess.WHITE)), ("g7", chess.Piece(chess.KING, chess.BLACK)), ("e7", chess.Piece(chess.QUEEN, chess.BLACK))], "best_move": "e5e7"},
        ],
        3: [
            {"pieces": [("g3", chess.Piece(chess.KING, chess.WHITE)), ("d3", chess.Piece(chess.QUEEN, chess.WHITE)), ("a3", chess.Piece(chess.ROOK, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("d6", chess.Piece(chess.QUEEN, chess.BLACK))], "best_move": "d3d6"},
            {"pieces": [("c4", chess.Piece(chess.KING, chess.WHITE)), ("h5", chess.Piece(chess.QUEEN, chess.WHITE)), ("a5", chess.Piece(chess.ROOK, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("h2", chess.Piece(chess.QUEEN, chess.BLACK))], "best_move": "h5h2"},
            {"pieces": [("f5", chess.Piece(chess.KING, chess.WHITE)), ("e6", chess.Piece(chess.QUEEN, chess.WHITE)), ("b3", chess.Piece(chess.ROOK, chess.WHITE)), ("g7", chess.Piece(chess.KING, chess.BLACK)), ("e8", chess.Piece(chess.QUEEN, chess.BLACK))], "best_move": "e6e8"},
        ],
    },
    "knight_fork": {
        1: [
            {"pieces": [("g1", chess.Piece(chess.KING, chess.WHITE)), ("e5", chess.Piece(chess.KNIGHT, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("d7", chess.Piece(chess.QUEEN, chess.BLACK)), ("f7", chess.Piece(chess.ROOK, chess.BLACK))], "best_move": "e5f7"},
            {"pieces": [("c1", chess.Piece(chess.KING, chess.WHITE)), ("f6", chess.Piece(chess.KNIGHT, chess.WHITE)), ("h7", chess.Piece(chess.KING, chess.BLACK)), ("e8", chess.Piece(chess.ROOK, chess.BLACK)), ("g8", chess.Piece(chess.QUEEN, chess.BLACK))], "best_move": "f6e8"},
            {"pieces": [("g2", chess.Piece(chess.KING, chess.WHITE)), ("d6", chess.Piece(chess.KNIGHT, chess.WHITE)), ("f8", chess.Piece(chess.KING, chess.BLACK)), ("h7", chess.Piece(chess.QUEEN, chess.BLACK)), ("e8", chess.Piece(chess.ROOK, chess.BLACK))], "best_move": "d6f7"},
        ],
        2: [
            {"pieces": [("g1", chess.Piece(chess.KING, chess.WHITE)), ("e5", chess.Piece(chess.KNIGHT, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("d7", chess.Piece(chess.QUEEN, chess.BLACK)), ("f7", chess.Piece(chess.ROOK, chess.BLACK))], "best_move": "e5f7"},
            {"pieces": [("c1", chess.Piece(chess.KING, chess.WHITE)), ("f6", chess.Piece(chess.KNIGHT, chess.WHITE)), ("h7", chess.Piece(chess.KING, chess.BLACK)), ("e8", chess.Piece(chess.ROOK, chess.BLACK)), ("g8", chess.Piece(chess.QUEEN, chess.BLACK))], "best_move": "f6e8"},
            {"pieces": [("g2", chess.Piece(chess.KING, chess.WHITE)), ("d6", chess.Piece(chess.KNIGHT, chess.WHITE)), ("f8", chess.Piece(chess.KING, chess.BLACK)), ("h7", chess.Piece(chess.QUEEN, chess.BLACK)), ("e8", chess.Piece(chess.ROOK, chess.BLACK))], "best_move": "d6f7"},
        ],
        3: [
            {"pieces": [("g1", chess.Piece(chess.KING, chess.WHITE)), ("d5", chess.Piece(chess.KNIGHT, chess.WHITE)), ("g8", chess.Piece(chess.KING, chess.BLACK)), ("c7", chess.Piece(chess.QUEEN, chess.BLACK)), ("e7", chess.Piece(chess.ROOK, chess.BLACK)), ("a2", chess.Piece(chess.PAWN, chess.WHITE)), ("h7", chess.Piece(chess.PAWN, chess.BLACK))], "best_move": "d5e7"},
            {"pieces": [("c1", chess.Piece(chess.KING, chess.WHITE)), ("c5", chess.Piece(chess.KNIGHT, chess.WHITE)), ("h8", chess.Piece(chess.KING, chess.BLACK)), ("b7", chess.Piece(chess.QUEEN, chess.BLACK)), ("d7", chess.Piece(chess.ROOK, chess.BLACK)), ("h2", chess.Piece(chess.PAWN, chess.WHITE)), ("a7", chess.Piece(chess.PAWN, chess.BLACK))], "best_move": "c5d7"},
            {"pieces": [("g2", chess.Piece(chess.KING, chess.WHITE)), ("g5", chess.Piece(chess.KNIGHT, chess.WHITE)), ("f8", chess.Piece(chess.KING, chess.BLACK)), ("f7", chess.Piece(chess.QUEEN, chess.BLACK)), ("h7", chess.Piece(chess.ROOK, chess.BLACK)), ("a3", chess.Piece(chess.PAWN, chess.WHITE)), ("h6", chess.Piece(chess.PAWN, chess.BLACK))], "best_move": "g5h7"},
        ],
    },
    "ladder_mate": {
        1: [],
        2: [],
        3: [],
    },
    "kq_vs_k": {
        1: [
            {"pieces": [("c6", chess.Piece(chess.KING, chess.WHITE)), ("b6", chess.Piece(chess.QUEEN, chess.WHITE)), ("a8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "b6b7"},
            {"pieces": [("f6", chess.Piece(chess.KING, chess.WHITE)), ("g6", chess.Piece(chess.QUEEN, chess.WHITE)), ("h8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "g6g7"},
        ],
        2: [
            {"pieces": [("c5", chess.Piece(chess.KING, chess.WHITE)), ("b5", chess.Piece(chess.QUEEN, chess.WHITE)), ("a8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "b5b7"},
            {"pieces": [("f5", chess.Piece(chess.KING, chess.WHITE)), ("g5", chess.Piece(chess.QUEEN, chess.WHITE)), ("h8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "g5g7"},
        ],
        3: [
            {"pieces": [("d5", chess.Piece(chess.KING, chess.WHITE)), ("b5", chess.Piece(chess.QUEEN, chess.WHITE)), ("a8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "b5b7"},
            {"pieces": [("e5", chess.Piece(chess.KING, chess.WHITE)), ("g5", chess.Piece(chess.QUEEN, chess.WHITE)), ("h8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "g5g7"},
        ],
    },
    "kr_vs_k": {
        1: [
            {"pieces": [("c6", chess.Piece(chess.KING, chess.WHITE)), ("b6", chess.Piece(chess.ROOK, chess.WHITE)), ("a8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "b6b7"},
            {"pieces": [("f6", chess.Piece(chess.KING, chess.WHITE)), ("g6", chess.Piece(chess.ROOK, chess.WHITE)), ("h8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "g6g7"},
        ],
        2: [
            {"pieces": [("c5", chess.Piece(chess.KING, chess.WHITE)), ("b5", chess.Piece(chess.ROOK, chess.WHITE)), ("a8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "b5b7"},
            {"pieces": [("f5", chess.Piece(chess.KING, chess.WHITE)), ("g5", chess.Piece(chess.ROOK, chess.WHITE)), ("h8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "g5g7"},
        ],
        3: [
            {"pieces": [("d5", chess.Piece(chess.KING, chess.WHITE)), ("b5", chess.Piece(chess.ROOK, chess.WHITE)), ("a8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "b5b7"},
            {"pieces": [("e5", chess.Piece(chess.KING, chess.WHITE)), ("g5", chess.Piece(chess.ROOK, chess.WHITE)), ("h8", chess.Piece(chess.KING, chess.BLACK))], "best_move": "g5g7"},
        ],
    },
}


def _build_from_skeleton(theme: str, level: int, skeleton: dict, rng: random.Random):
    b = chess.Board(None)
    _place_many(b, skeleton["pieces"])
    b.turn = chess.WHITE
    return _row(b, theme, level, skeleton["best_move"], rng)


def _generate_theme(theme: str, difficulty: int, rng: random.Random):
    level_skeletons = SKELETONS[theme][difficulty]
    if not level_skeletons:
        raise ValueError("Theme temporarily disabled: templates not yet reliable.")
    indices = list(range(len(level_skeletons)))
    rng.shuffle(indices)
    consecutive_failures = 0
    for idx in indices:
        skeleton = level_skeletons[idx]
        for _ in range(25):
            try:
                return _build_from_skeleton(theme, difficulty, skeleton, rng)
            except Exception:
                consecutive_failures += 1
                if consecutive_failures >= 10:
                    break
                continue
    raise ValueError(f"Failed to build theme {theme} difficulty {difficulty}")


def _usable_themes_by_family():
    usable = {}
    for theme in ACTIVE_THEMES:
        if theme in DISABLED_THEMES:
            continue
        family = FAMILY[theme]
        usable.setdefault(family, []).append(theme)
    return usable


def _pick_theme(rng: random.Random, stage: str) -> str:
    if stage not in CURRICULUM_WEIGHTS:
        raise ValueError(f"Unknown curriculum stage: {stage}")
    family_weights = CURRICULUM_WEIGHTS[stage]
    usable_by_family = _usable_themes_by_family()
    families = [family for family in family_weights if usable_by_family.get(family)]
    if not families:
        raise ValueError(f"No usable theme families for curriculum stage {stage}")
    family = rng.choices(families, weights=[family_weights[f] for f in families], k=1)[0]
    subset = usable_by_family.get(family, [])
    if not subset:
        raise ValueError(f"No active themes for family {family}")
    weights = [INTRA_FAMILY_WEIGHTS[family][t] for t in subset]
    return rng.choices(subset, weights=weights, k=1)[0]


def _pick_difficulty(rng: random.Random) -> int:
    levels = [1, 2, 3]
    return rng.choices(levels, weights=[DIFFICULTY_WEIGHTS[l] for l in levels], k=1)[0]


def _print_generation_summary(summary: dict) -> None:
    print(f"requested samples: {summary['requested_samples']}")
    print(f"generated samples: {summary['generated_samples']}")
    print(f"rejected samples: {summary['rejected_samples']}")
    print("counts by theme:")
    for theme, count in sorted(summary['counts_by_theme'].items()):
        print(f"  {theme}: {count}")


def generate_samples(n: int, theme: str | None = None, difficulty: int | None = None, seed: int = 42, curriculum_stage: str = "mid"):
    rng = random.Random(seed)
    out = []
    counts = Counter()
    rejected = 0
    max_attempts = max(100, n * 20)
    attempts = 0

    if theme is not None and theme in DISABLED_THEMES:
        raise ValueError("Theme temporarily disabled: templates not yet reliable.")

    while len(out) < n and attempts < max_attempts:
        attempts += 1
        th = theme if theme else _pick_theme(rng, curriculum_stage)
        if th in DISABLED_THEMES:
            rejected += 1
            continue
        d = difficulty if difficulty is not None else _pick_difficulty(rng)
        try:
            row = _generate_theme(th, d, rng)
            out.append(row)
            counts[th] += 1
            THEME_FAILURES[th] = 0
        except Exception:
            rejected += 1
            THEME_FAILURES[th] += 1
            if THEME_FAILURES[th] >= 10:
                DISABLED_THEMES.add(th)
            continue

    summary = {
        "requested_samples": n,
        "generated_samples": len(out),
        "rejected_samples": rejected,
        "counts_by_theme": dict(counts),
    }
    LAST_GENERATION_SUMMARY.clear()
    LAST_GENERATION_SUMMARY.update(summary)
    _print_generation_summary(summary)

    if len(out) < n:
        raise RuntimeError(f"Could not generate enough valid samples: requested={n} generated={len(out)} rejected={rejected}")

    return out
