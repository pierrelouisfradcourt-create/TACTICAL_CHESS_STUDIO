use crate::chess::piece_kind::ChessPieceKind;
use crate::engine::action::action::Action;
use crate::engine::entity::unit::{Position, Unit};
use std::collections::HashMap;

fn pos_to_square(pos: Position) -> String {
    let file = (b'a' + pos.x as u8) as char;
    let rank = (pos.y + 1).to_string();
    format!("{}{}", file, rank)
}

pub fn move_to_uci(from: Position, to: Position) -> String {
    format!("{}{}", pos_to_square(from), pos_to_square(to))
}

pub fn action_to_uci(
    action: &Action,
    units: &HashMap<u32, Unit>,
) -> Option<String> {
    match action {
        Action::Move {
            unit_id,
            target,
            promotion,
            ..
        } => {
            let unit = units.get(unit_id)?;
            let mut uci = move_to_uci(unit.position, *target);

            if let Some(promo) = promotion {
                let suffix = match promo {
                    ChessPieceKind::Queen => 'q',
                    ChessPieceKind::Rook => 'r',
                    ChessPieceKind::Bishop => 'b',
                    ChessPieceKind::Knight => 'n',
                    _ => return None,
                };
                uci.push(suffix);
            }

            Some(uci)
        }
        _ => None,
    }
}

pub fn action_key(action: &Action, units: &HashMap<u32, Unit>) -> String {
    action_to_uci(action, units).unwrap_or_else(|| format!("~{action:?}"))
}
