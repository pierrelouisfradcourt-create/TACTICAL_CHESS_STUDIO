use crate::chess::chess960::{generate_start_position, mirror_black_backrank_if_needed};
use crate::chess::piece_kind::ChessPieceKind;
use crate::engine::action::action::AbilityType;
use crate::engine::board::board::Board;
use crate::engine::engine::Engine;
use crate::engine::entity::stats::Stats;
use crate::engine::entity::unit::Position;
use crate::prototype::runtime_ruleset::{RuntimeRuleset, UnitSpawn, UnitTemplate};

fn tpl(name: &'static str, kind: ChessPieceKind) -> UnitTemplate {
    UnitTemplate {
        name,
        kind,
        hp: 1,
        stats: Stats {
            attack: 0,
            defense: 0,
            armor: 0,
            range: 1,
        },
        abilities: vec![AbilityType::BasicAttack],
        power_shot_cooldown: 0,
    }
}

fn template_name_from_backrank_piece(piece: u8) -> Option<&'static str> {
    match piece {
        b'K' => Some("King"),
        b'Q' => Some("Queen"),
        b'R' => Some("Rook"),
        b'B' => Some("Bishop"),
        b'N' => Some("Knight"),
        _ => None,
    }
}

fn push_back_rank_spawns(
    spawns: &mut Vec<UnitSpawn>,
    owner: u32,
    y: u32,
    back_rank: &[u8; 8],
) -> Option<()> {
    for (x, piece) in back_rank.iter().enumerate() {
        spawns.push(UnitSpawn {
            owner,
            template_name: template_name_from_backrank_piece(*piece)?,
            position: Position { x: x as u32, y },
        });
    }
    Some(())
}

pub fn minimal_runtime_ruleset() -> RuntimeRuleset {
    let mut spawns = Vec::new();
    let back = [
        ("Rook", ChessPieceKind::Rook),
        ("Knight", ChessPieceKind::Knight),
        ("Bishop", ChessPieceKind::Bishop),
        ("Queen", ChessPieceKind::Queen),
        ("King", ChessPieceKind::King),
        ("Bishop", ChessPieceKind::Bishop),
        ("Knight", ChessPieceKind::Knight),
        ("Rook", ChessPieceKind::Rook),
    ];

    for (x, (name, _)) in back.iter().enumerate() {
        spawns.push(UnitSpawn {
            owner: 1,
            template_name: name,
            position: Position { x: x as u32, y: 0 },
        });
        spawns.push(UnitSpawn {
            owner: 2,
            template_name: name,
            position: Position { x: x as u32, y: 7 },
        });
    }
    for x in 0..8 {
        spawns.push(UnitSpawn {
            owner: 1,
            template_name: "Pawn",
            position: Position { x, y: 1 },
        });
        spawns.push(UnitSpawn {
            owner: 2,
            template_name: "Pawn",
            position: Position { x, y: 6 },
        });
    }

    RuntimeRuleset {
        name: "ChessPure8x8".to_string(),
        board_width: 8,
        board_height: 8,
        terrain: vec![],
        unit_templates: vec![
            tpl("King", ChessPieceKind::King),
            tpl("Queen", ChessPieceKind::Queen),
            tpl("Rook", ChessPieceKind::Rook),
            tpl("Bishop", ChessPieceKind::Bishop),
            tpl("Knight", ChessPieceKind::Knight),
            tpl("Pawn", ChessPieceKind::Pawn),
        ],
        unit_spawns: spawns,
    }
}

pub fn minimal_runtime_ruleset_chess960(
    position_id: u16,
    mirror_black_back_rank: bool,
) -> Option<RuntimeRuleset> {
    let white_back_rank = generate_start_position(position_id)?;
    let black_back_rank = mirror_black_backrank_if_needed(&white_back_rank, mirror_black_back_rank);
    let mut spawns = Vec::new();

    push_back_rank_spawns(&mut spawns, 1, 0, &white_back_rank)?;
    push_back_rank_spawns(&mut spawns, 2, 7, &black_back_rank)?;

    for x in 0..8 {
        spawns.push(UnitSpawn {
            owner: 1,
            template_name: "Pawn",
            position: Position { x, y: 1 },
        });
        spawns.push(UnitSpawn {
            owner: 2,
            template_name: "Pawn",
            position: Position { x, y: 6 },
        });
    }

    Some(RuntimeRuleset {
        name: format!("ChessPure8x8Chess960-{position_id}"),
        board_width: 8,
        board_height: 8,
        terrain: vec![],
        unit_templates: vec![
            tpl("King", ChessPieceKind::King),
            tpl("Queen", ChessPieceKind::Queen),
            tpl("Rook", ChessPieceKind::Rook),
            tpl("Bishop", ChessPieceKind::Bishop),
            tpl("Knight", ChessPieceKind::Knight),
            tpl("Pawn", ChessPieceKind::Pawn),
        ],
        unit_spawns: spawns,
    })
}

pub fn load_engine_from_ruleset(ruleset: &RuntimeRuleset) -> Engine {
    let board = Board::new(ruleset.board_width, ruleset.board_height);
    let mut engine = Engine::new(board);
    for spawn in &ruleset.unit_spawns {
        engine
            .add_unit(ruleset.instantiate_unit(spawn))
            .expect("invalid unit placement in runtime ruleset");
    }
    engine
}

pub fn load_minimal_prototype() -> Engine {
    let ruleset = minimal_runtime_ruleset();
    load_engine_from_ruleset(&ruleset)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chess::chess960::validate_backrank;
    use crate::chess::uci::action_key;

    fn piece_byte_from_template_name(name: &str) -> Option<u8> {
        match name {
            "King" => Some(b'K'),
            "Queen" => Some(b'Q'),
            "Rook" => Some(b'R'),
            "Bishop" => Some(b'B'),
            "Knight" => Some(b'N'),
            _ => None,
        }
    }

    fn back_rank_for_owner(ruleset: &RuntimeRuleset, owner: u32) -> [u8; 8] {
        let target_y = if owner == 1 { 0 } else { 7 };
        let mut rank = [b' '; 8];

        for spawn in &ruleset.unit_spawns {
            if spawn.owner == owner && spawn.position.y == target_y {
                rank[spawn.position.x as usize] =
                    piece_byte_from_template_name(spawn.template_name)
                        .expect("back rank should only contain non-pawn templates");
            }
        }

        rank
    }

    #[test]
    fn minimal_runtime_ruleset_keeps_standard_default_setup() {
        let ruleset = minimal_runtime_ruleset();
        assert_eq!(ruleset.name, "ChessPure8x8");
        assert_eq!(back_rank_for_owner(&ruleset, 1), *b"RNBQKBNR");
        assert_eq!(back_rank_for_owner(&ruleset, 2), *b"RNBQKBNR");
    }

    #[test]
    fn chess960_factory_is_passive_opt_in_and_keeps_setup_shape() {
        let standard = minimal_runtime_ruleset();
        let chess960 = minimal_runtime_ruleset_chess960(42, false).expect("valid Chess960 id");

        assert_eq!(standard.name, "ChessPure8x8");
        assert_eq!(standard.unit_spawns.len(), 32);
        assert_eq!(chess960.board_width, 8);
        assert_eq!(chess960.board_height, 8);
        assert_eq!(chess960.unit_spawns.len(), 32);
        assert_eq!(
            chess960
                .unit_spawns
                .iter()
                .filter(|spawn| spawn.template_name == "Pawn")
                .count(),
            16
        );
    }

    #[test]
    fn chess960_factory_does_not_replace_standard_default_setup() {
        let standard = minimal_runtime_ruleset();
        let chess960 = minimal_runtime_ruleset_chess960(0, false).expect("valid Chess960 id");
        let default_engine = load_minimal_prototype();

        assert_eq!(standard.name, "ChessPure8x8");
        assert_ne!(chess960.name, standard.name);
        assert_eq!(back_rank_for_owner(&standard, 1), *b"RNBQKBNR");
        assert_ne!(back_rank_for_owner(&chess960, 1), *b"RNBQKBNR");
        assert_eq!(
            default_engine.to_fen(),
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        );
    }

    #[test]
    fn chess960_factory_backrank_respects_invariants() {
        for id in [0u16, 42u16, 959u16] {
            let ruleset =
                minimal_runtime_ruleset_chess960(id, false).expect("representative ids are valid");
            let white_back_rank = back_rank_for_owner(&ruleset, 1);
            assert!(
                validate_backrank(&white_back_rank),
                "invalid back rank generated for id={id}"
            );
        }
    }

    #[test]
    fn chess960_factory_can_mirror_black_back_rank() {
        let ruleset = minimal_runtime_ruleset_chess960(7, true).expect("valid Chess960 id");
        let white_back_rank = back_rank_for_owner(&ruleset, 1);
        let black_back_rank = back_rank_for_owner(&ruleset, 2);
        let mut expected_black_back_rank = white_back_rank;
        expected_black_back_rank.reverse();

        assert_eq!(black_back_rank, expected_black_back_rank);
    }

    #[test]
    fn chess960_factory_loaded_engine_does_not_expose_classical_castling_moves() {
        let ruleset = minimal_runtime_ruleset_chess960(0, false).expect("valid Chess960 id");
        let engine = load_engine_from_ruleset(&ruleset);
        let action_keys = engine
            .legal_actions(1)
            .iter()
            .map(|action| action_key(action, &engine.units))
            .collect::<Vec<_>>();

        assert!(!action_keys.iter().any(|key| key == "e1g1"));
        assert!(!action_keys.iter().any(|key| key == "e1c1"));
    }

    #[test]
    fn chess960_factory_rejects_out_of_range_ids() {
        assert!(minimal_runtime_ruleset_chess960(960, false).is_none());
    }
}
