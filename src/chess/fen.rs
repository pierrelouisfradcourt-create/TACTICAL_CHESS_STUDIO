use crate::chess::piece_kind::ChessPieceKind;
use crate::engine::board::board::Board;
use crate::engine::engine::Engine;
use crate::engine::entity::stats::Stats;
use crate::engine::entity::unit::{Position, Unit};

pub fn engine_to_fen(engine: &Engine) -> String {
    let mut board = [['1'; 8]; 8];

    for unit in engine.units.values() {
        let symbol = match unit.kind {
            ChessPieceKind::Pawn => 'p',
            ChessPieceKind::Knight => 'n',
            ChessPieceKind::Bishop => 'b',
            ChessPieceKind::Rook => 'r',
            ChessPieceKind::Queen => 'q',
            ChessPieceKind::King => 'k',
        };

        let c = if unit.owner == 1 {
            symbol.to_ascii_uppercase()
        } else {
            symbol
        };

        board[unit.position.y as usize][unit.position.x as usize] = c;
    }

    let mut fen = String::with_capacity(32);

    for y in (0..8).rev() {
        let mut empty: u8 = 0;

        for x in 0..8 {
            let c = board[y][x];

            if c == '1' {
                empty += 1;
            } else {
                if empty > 0 {
                    fen.push((b'0' + empty) as char);
                    empty = 0;
                }
                fen.push(c);
            }
        }

        if empty > 0 {
            fen.push((b'0' + empty) as char);
        }

        if y > 0 {
            fen.push('/');
        }
    }

    let side_to_move = if engine.turn_manager.current_player == 1 {
        "w"
    } else {
        "b"
    };

    let mut castling = String::with_capacity(4);
    if engine.white_can_castle_kingside {
        castling.push('K');
    }
    if engine.white_can_castle_queenside {
        castling.push('Q');
    }
    if engine.black_can_castle_kingside {
        castling.push('k');
    }
    if engine.black_can_castle_queenside {
        castling.push('q');
    }
    if castling.is_empty() {
        castling.push('-');
    }

    fen.push(' ');
    fen.push_str(side_to_move);
    fen.push(' ');
    fen.push_str(&castling);
    fen.push_str(" - 0 1");

    fen
}

fn parse_square(square: &str) -> Result<Position, String> {
    let bytes = square.as_bytes();
    if bytes.len() != 2 {
        return Err(format!("invalid square: {square}"));
    }

    let file = bytes[0];
    let rank = bytes[1];

    if !(b'a'..=b'h').contains(&file) {
        return Err(format!("invalid square file: {square}"));
    }
    if !(b'1'..=b'8').contains(&rank) {
        return Err(format!("invalid square rank: {square}"));
    }

    Ok(Position {
        x: (file - b'a') as u32,
        y: (rank - b'1') as u32,
    })
}

fn template_name_for_kind(kind: ChessPieceKind) -> &'static str {
    match kind {
        ChessPieceKind::Pawn => "Pawn",
        ChessPieceKind::Knight => "Knight",
        ChessPieceKind::Bishop => "Bishop",
        ChessPieceKind::Rook => "Rook",
        ChessPieceKind::Queen => "Queen",
        ChessPieceKind::King => "King",
    }
}

fn kind_for_fen_char(c: char) -> Option<(u32, ChessPieceKind)> {
    let (owner, lower) = if c.is_ascii_uppercase() {
        (1, c.to_ascii_lowercase())
    } else {
        (2, c)
    };

    let kind = match lower {
        'p' => ChessPieceKind::Pawn,
        'n' => ChessPieceKind::Knight,
        'b' => ChessPieceKind::Bishop,
        'r' => ChessPieceKind::Rook,
        'q' => ChessPieceKind::Queen,
        'k' => ChessPieceKind::King,
        _ => return None,
    };

    Some((owner, kind))
}

fn validate_classical_castling_field(castling: &str) -> Result<(), String> {
    if castling == "-" {
        return Ok(());
    }

    if castling.is_empty() || castling.contains('-') {
        return Err(format!("invalid FEN castling rights: {castling}"));
    }

    let mut seen = [false; 4];
    for right in castling.chars() {
        let idx = match right {
            'K' => 0,
            'Q' => 1,
            'k' => 2,
            'q' => 3,
            _ => return Err(format!("unsupported FEN castling rights: {castling}")),
        };

        if seen[idx] {
            return Err(format!("duplicate FEN castling right: {right}"));
        }
        seen[idx] = true;
    }

    Ok(())
}

fn has_piece_at(engine: &Engine, owner: u32, kind: ChessPieceKind, position: Position) -> bool {
    let Some(unit_id) = engine.board.occupant(position) else {
        return false;
    };

    engine
        .units
        .get(&unit_id)
        .is_some_and(|unit| unit.owner == owner && unit.kind == kind)
}

fn validate_classical_castling_anchors(engine: &Engine) -> Result<(), String> {
    let white_king = Position { x: 4, y: 0 };
    let black_king = Position { x: 4, y: 7 };

    let rights = [
        (
            engine.white_can_castle_kingside,
            1,
            white_king,
            Position { x: 7, y: 0 },
            "white kingside",
        ),
        (
            engine.white_can_castle_queenside,
            1,
            white_king,
            Position { x: 0, y: 0 },
            "white queenside",
        ),
        (
            engine.black_can_castle_kingside,
            2,
            black_king,
            Position { x: 7, y: 7 },
            "black kingside",
        ),
        (
            engine.black_can_castle_queenside,
            2,
            black_king,
            Position { x: 0, y: 7 },
            "black queenside",
        ),
    ];

    for (enabled, owner, king_pos, rook_pos, label) in rights {
        if !enabled {
            continue;
        }

        if !has_piece_at(engine, owner, ChessPieceKind::King, king_pos)
            || !has_piece_at(engine, owner, ChessPieceKind::Rook, rook_pos)
        {
            return Err(format!(
                "unsupported castling rights for non-classical anchors: {label}"
            ));
        }
    }

    Ok(())
}

pub fn engine_from_fen(fen: &str) -> Result<Engine, String> {
    let fen = fen.trim();
    let mut parts = fen.split_whitespace();

    let board_part = parts.next().ok_or("missing FEN board")?;
    let side_to_move = parts.next().unwrap_or("w");
    let castling = parts.next().unwrap_or("-");
    let en_passant = parts.next().unwrap_or("-");
    let halfmove = parts.next().unwrap_or("0");
    let fullmove = parts.next().unwrap_or("1");

    validate_classical_castling_field(castling)?;

    let current_player = match side_to_move {
        "w" => 1,
        "b" => 2,
        _ => return Err(format!("invalid side to move: {side_to_move}")),
    };

    let halfmove_clock: u32 = halfmove
        .parse()
        .map_err(|_| format!("invalid halfmove clock: {halfmove}"))?;
    let fullmove_number: u32 = fullmove
        .parse()
        .map_err(|_| format!("invalid fullmove number: {fullmove}"))?;

    let mut engine = Engine::new(Board::new(8, 8));

    engine.turn_manager.current_player = current_player;
    engine.turn_manager.turn_index = (fullmove_number.saturating_sub(1)).saturating_mul(2)
        + if current_player == 2 { 1 } else { 0 };

    engine.white_can_castle_kingside = castling.contains('K');
    engine.white_can_castle_queenside = castling.contains('Q');
    engine.black_can_castle_kingside = castling.contains('k');
    engine.black_can_castle_queenside = castling.contains('q');

    engine.en_passant_target = if en_passant != "-" {
        Some(parse_square(en_passant)?)
    } else {
        None
    };

    engine.halfmove_clock = halfmove_clock;

    let mut y: i32 = 7;
    let mut x: i32 = 0;

    for c in board_part.chars() {
        match c {
            '/' => {
                if x != 8 {
                    return Err(format!("invalid FEN rank width at y={y}: x={x}"));
                }
                y -= 1;
                x = 0;
            }
            '1'..='8' => {
                x += c.to_digit(10).unwrap_or(0) as i32;
            }
            piece => {
                let Some((owner, kind)) = kind_for_fen_char(piece) else {
                    return Err(format!("invalid FEN piece char: {piece}"));
                };

                if x < 0 || x > 7 || y < 0 || y > 7 {
                    return Err(format!("invalid FEN square during parse: x={x}, y={y}"));
                }

                let position = Position {
                    x: x as u32,
                    y: y as u32,
                };

                let mut has_moved = true;

                if kind == ChessPieceKind::Pawn {
                    has_moved = match owner {
                        1 => position.y != 1,
                        2 => position.y != 6,
                        _ => true,
                    };
                }

                if kind == ChessPieceKind::King && position.x == 4 {
                    if owner == 1 && position.y == 0 {
                        has_moved = !(engine.white_can_castle_kingside
                            || engine.white_can_castle_queenside);
                    } else if owner == 2 && position.y == 7 {
                        has_moved = !(engine.black_can_castle_kingside
                            || engine.black_can_castle_queenside);
                    }
                }

                if kind == ChessPieceKind::Rook {
                    if owner == 1 && position.y == 0 && (position.x == 0 || position.x == 7) {
                        let relevant_right = if position.x == 0 {
                            engine.white_can_castle_queenside
                        } else {
                            engine.white_can_castle_kingside
                        };
                        has_moved = !relevant_right;
                    } else if owner == 2 && position.y == 7 && (position.x == 0 || position.x == 7)
                    {
                        let relevant_right = if position.x == 0 {
                            engine.black_can_castle_queenside
                        } else {
                            engine.black_can_castle_kingside
                        };
                        has_moved = !relevant_right;
                    }
                }

                engine
                    .add_unit(Unit {
                        id: 0,
                        owner,
                        template_name: template_name_for_kind(kind).to_string(),
                        kind,
                        position,
                        stats: Stats {
                            attack: 0,
                            defense: 0,
                            armor: 0,
                            range: 1,
                        },
                        hp: 1,
                        power_shot_cd: 0,
                        has_moved,
                    })
                    .map_err(|e| format!("invalid FEN unit placement: {e}"))?;

                x += 1;
            }
        }
    }

    if y != 0 || x != 8 {
        return Err(format!("invalid FEN final cursor: x={x}, y={y}"));
    }

    validate_classical_castling_anchors(&engine)?;

    engine.reset_repetition_state();
    Ok(engine)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::prototype::minimal_ruleset::{load_engine_from_ruleset, minimal_runtime_ruleset};

    #[test]
    fn fen_builder_preserves_current_repetition_key_shape() {
        let engine = load_engine_from_ruleset(&minimal_runtime_ruleset());
        assert_eq!(
            engine_to_fen(&engine),
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        );
    }

    #[test]
    fn fen_round_trip_preserves_board_and_side() {
        let fen = "3r2k1/5pp1/p2Pq2p/PpN5/6n1/1PQ3PP/3R2K1/8 b - - 15 39";
        let engine = engine_from_fen(fen).expect("parse should succeed");
        assert_eq!(
            engine.to_fen(),
            "3r2k1/5pp1/p2Pq2p/PpN5/6n1/1PQ3PP/3R2K1/8 b - - 0 1"
        );
    }

    #[test]
    fn fen_round_trip_preserves_castling_rights() {
        let fen = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
        let engine = engine_from_fen(fen).expect("parse should succeed");
        assert_eq!(engine.to_fen(), fen);
    }

    #[test]
    fn unsupported_rook_file_castling_metadata_fails_closed() {
        let fen = "r3k2r/8/8/8/8/8/8/R3K2R w HAha - 0 1";
        let err = match engine_from_fen(fen) {
            Ok(_) => panic!("rook-file castling metadata is unsupported"),
            Err(err) => err,
        };
        assert!(
            err.contains("unsupported FEN castling rights"),
            "unexpected error: {err}"
        );
    }

    #[test]
    fn chess960_backrank_with_classical_castling_rights_fails_closed() {
        let fen = "bbrkrqnn/pppppppp/8/8/8/8/PPPPPPPP/BBRKRQNN w KQkq - 0 1";
        let err = match engine_from_fen(fen) {
            Ok(_) => panic!("Chess960 castling metadata requires an explicit future contract"),
            Err(err) => err,
        };
        assert!(
            err.contains("unsupported castling rights for non-classical anchors"),
            "unexpected error: {err}"
        );
    }

    #[test]
    fn malformed_castling_rights_are_rejected_before_rights_inference() {
        for castling in ["K-", "KK", ""] {
            let fen = format!("r3k2r/8/8/8/8/8/8/R3K2R w {castling} - 0 1");
            assert!(
                engine_from_fen(&fen).is_err(),
                "castling metadata should be rejected: {castling:?}"
            );
        }
    }
}
