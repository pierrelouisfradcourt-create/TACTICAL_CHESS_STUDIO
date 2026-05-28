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
    fen.push(' ');
    match engine.en_passant_target {
        Some(target) => fen.push_str(&format_square(target)),
        None => fen.push('-'),
    }
    fen.push(' ');
    fen.push_str(&engine.halfmove_clock.to_string());
    fen.push(' ');
    fen.push_str(&(engine.turn_manager.turn_index / 2 + 1).to_string());

    fen
}

fn format_square(position: Position) -> String {
    let file = (b'a' + position.x as u8) as char;
    let rank = (b'1' + position.y as u8) as char;
    format!("{file}{rank}")
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

/// Per-color rook x-files designated for castling, derived from the FEN castling field.
struct CastlingRookFiles {
    white: Vec<u32>,
    black: Vec<u32>,
}

fn push_unique_rook_file(files: &mut Vec<u32>, x: u32, context: &str) -> Result<(), String> {
    if files.contains(&x) {
        return Err(format!("duplicate castling rook file in: {context}"));
    }
    files.push(x);
    Ok(())
}

/// Parse the FEN castling field into per-color rook x-files.
///
/// Accepts standard format (K/Q/k/q) and Shredder-FEN format (A-H for white, a-h for black).
/// Standard tokens and Shredder tokens must not be mixed within the same color.
fn parse_castling_field(castling: &str) -> Result<CastlingRookFiles, String> {
    if castling == "-" {
        return Ok(CastlingRookFiles {
            white: vec![],
            black: vec![],
        });
    }

    if castling.is_empty() || castling.contains('-') {
        return Err(format!("invalid FEN castling rights: {castling}"));
    }

    let mut white = Vec::<u32>::new();
    let mut black = Vec::<u32>::new();
    let mut white_std = false;
    let mut white_shr = false;
    let mut black_std = false;
    let mut black_shr = false;

    for c in castling.chars() {
        match c {
            'K' => {
                white_std = true;
                push_unique_rook_file(&mut white, 7, castling)?;
            }
            'Q' => {
                white_std = true;
                push_unique_rook_file(&mut white, 0, castling)?;
            }
            'k' => {
                black_std = true;
                push_unique_rook_file(&mut black, 7, castling)?;
            }
            'q' => {
                black_std = true;
                push_unique_rook_file(&mut black, 0, castling)?;
            }
            'A'..='H' => {
                white_shr = true;
                push_unique_rook_file(&mut white, c as u32 - 'A' as u32, castling)?;
            }
            'a'..='h' => {
                black_shr = true;
                push_unique_rook_file(&mut black, c as u32 - 'a' as u32, castling)?;
            }
            _ => return Err(format!("unsupported FEN castling rights: {castling}")),
        }
    }

    if white_std && white_shr {
        return Err(format!(
            "mixed standard/Shredder castling rights for white: {castling}"
        ));
    }
    if black_std && black_shr {
        return Err(format!(
            "mixed standard/Shredder castling rights for black: {castling}"
        ));
    }

    Ok(CastlingRookFiles { white, black })
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

/// Resolve castling rights for one color: validate rooks are present and determine ks/qs.
///
/// King must be on `rank`. Rooks with x > king_x are kingside; those with x < king_x are queenside.
fn resolve_side_castling(
    engine: &Engine,
    owner: u32,
    rank: u32,
    rook_files: &[u32],
) -> Result<(bool, bool), String> {
    if rook_files.is_empty() {
        return Ok((false, false));
    }

    let color = if owner == 1 { "white" } else { "black" };

    let king_x = engine
        .units
        .values()
        .find(|u| u.owner == owner && u.kind == ChessPieceKind::King && u.position.y == rank)
        .map(|u| u.position.x)
        .ok_or_else(|| format!("{color} king not on back rank for castling"))?;

    let mut ks = false;
    let mut qs = false;

    for &rook_x in rook_files {
        let pos = Position { x: rook_x, y: rank };
        if !has_piece_at(engine, owner, ChessPieceKind::Rook, pos) {
            let file_char = (b'a' + rook_x as u8) as char;
            let rank_char = (b'1' + rank as u8) as char;
            return Err(format!(
                "{color} castling rook not found at {file_char}{rank_char}"
            ));
        }
        if rook_x > king_x {
            ks = true;
        } else {
            qs = true;
        }
    }

    Ok((ks, qs))
}

fn resolve_castling_rights(
    engine: &Engine,
    castling_rooks: &CastlingRookFiles,
) -> Result<(bool, bool, bool, bool), String> {
    let (w_ks, w_qs) = resolve_side_castling(engine, 1, 0, &castling_rooks.white)?;
    let (b_ks, b_qs) = resolve_side_castling(engine, 2, 7, &castling_rooks.black)?;
    Ok((w_ks, w_qs, b_ks, b_qs))
}

pub fn engine_from_fen(fen: &str) -> Result<Engine, String> {
    let fen = fen.trim();
    let mut parts = fen.split_whitespace();

    let board_part = parts.next().ok_or("missing FEN board")?;
    let side_to_move = parts.next().unwrap_or("w");
    let castling_str = parts.next().unwrap_or("-");
    let en_passant = parts.next().unwrap_or("-");
    let halfmove = parts.next().unwrap_or("0");
    let fullmove = parts.next().unwrap_or("1");

    let castling_rooks = parse_castling_field(castling_str)?;

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

                // King has not moved if it still has castling rights on its back rank.
                // Works for both classical (x=4) and Chess960 (any x).
                if kind == ChessPieceKind::King {
                    let back_rank = if owner == 1 { 0u32 } else { 7 };
                    if position.y == back_rank {
                        let rook_files = if owner == 1 {
                            &castling_rooks.white
                        } else {
                            &castling_rooks.black
                        };
                        if !rook_files.is_empty() {
                            has_moved = false;
                        }
                    }
                }

                // Rook has not moved if it is one of the designated castling rooks.
                // Identified by x-file, not by hardcoded a/h positions.
                if kind == ChessPieceKind::Rook {
                    let back_rank = if owner == 1 { 0u32 } else { 7 };
                    if position.y == back_rank {
                        let rook_files = if owner == 1 {
                            &castling_rooks.white
                        } else {
                            &castling_rooks.black
                        };
                        if rook_files.contains(&position.x) {
                            has_moved = false;
                        }
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

    // Validate castling rooks are present and determine ks/qs from actual king position.
    let (w_ks, w_qs, b_ks, b_qs) = resolve_castling_rights(&engine, &castling_rooks)?;
    engine.white_can_castle_kingside = w_ks;
    engine.white_can_castle_queenside = w_qs;
    engine.black_can_castle_kingside = b_ks;
    engine.black_can_castle_queenside = b_qs;

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
    fn fen_round_trip_preserves_full_state_fields() {
        let fen = "r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12";
        let engine = engine_from_fen(fen).expect("parse should succeed");
        assert_eq!(engine.to_fen(), fen);
    }

    #[test]
    fn fen_round_trip_preserves_castling_rights() {
        let fen = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
        let engine = engine_from_fen(fen).expect("parse should succeed");
        assert_eq!(engine.to_fen(), fen);
    }

    #[test]
    fn shredder_fen_classical_position_accepted() {
        // Shredder-FEN equivalent of KQkq for a classical layout.
        let fen = "r3k2r/8/8/8/8/8/8/R3K2R w HAha - 0 1";
        let engine = engine_from_fen(fen).expect("Shredder FEN should be accepted");
        assert!(engine.white_can_castle_kingside);
        assert!(engine.white_can_castle_queenside);
        assert!(engine.black_can_castle_kingside);
        assert!(engine.black_can_castle_queenside);
    }

    #[test]
    fn chess960_shredder_fen_non_classical_king_sets_castling_rights() {
        // King on d1/d8 (x=3), rooks on a1/h1 and a8/h8.
        // Shredder tokens: A(x=0) < king(x=3) → qs, H(x=7) > king(x=3) → ks.
        let fen = "r2k3r/8/8/8/8/8/8/R2K3R w AHah - 0 1";
        let engine = engine_from_fen(fen).expect("Chess960 Shredder FEN should parse");
        assert!(engine.white_can_castle_kingside);
        assert!(engine.white_can_castle_queenside);
        assert!(engine.black_can_castle_kingside);
        assert!(engine.black_can_castle_queenside);
    }

    #[test]
    fn chess960_shredder_fen_has_moved_false_for_castling_pieces() {
        // King on d1 (x=3), rooks on a1 (x=0) and h1 (x=7).
        let fen = "r2k3r/8/8/8/8/8/8/R2K3R w AHah - 0 1";
        let engine = engine_from_fen(fen).expect("parse should succeed");

        let white_king = engine
            .units
            .values()
            .find(|u| u.owner == 1 && u.kind == ChessPieceKind::King)
            .expect("white king");
        assert!(!white_king.has_moved, "white king should not have moved");

        for &rook_x in &[0u32, 7] {
            let rook = engine
                .units
                .values()
                .find(|u| u.owner == 1 && u.kind == ChessPieceKind::Rook && u.position.x == rook_x)
                .expect("white rook");
            assert!(!rook.has_moved, "white rook at x={rook_x} should not have moved");
        }
    }

    #[test]
    fn chess960_backrank_standard_tokens_wrong_rook_files_rejected() {
        // Chess960 backrank with K/Q tokens: those expect rooks at h1/a1,
        // but the actual pieces there are not rooks.
        let fen = "bbrkrqnn/pppppppp/8/8/8/8/PPPPPPPP/BBRKRQNN w KQkq - 0 1";
        let err = match engine_from_fen(fen) {
            Ok(_) => panic!("wrong rook files should be rejected"),
            Err(err) => err,
        };
        assert!(
            err.contains("castling rook not found"),
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
