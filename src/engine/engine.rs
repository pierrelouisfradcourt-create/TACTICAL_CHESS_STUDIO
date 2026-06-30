use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, OnceLock};
use std::time::Instant;

use crate::chess::castling_spec::{CastlingSpec, CastlingSideSpec};
use crate::chess::fen::engine_to_fen;
use crate::chess::piece_kind::ChessPieceKind;
use crate::engine::action::action::{AbilityType, Action};
use crate::engine::action::command::Command;
use crate::engine::board::board::Board;
use crate::engine::entity::unit::{PlayerId, Position, Unit, UnitId};
use crate::engine::turn::turn_manager::TurnManager;

// Zobrist table for engine-side position hashing.
// Same seed and PRNG as search.rs so position_hash == position_key() for equal positions.
struct EngineZobrist {
    pieces: [[[u64; 64]; 2]; 6],
    side_to_move: u64,
    castling: [u64; 4],
    en_passant: [u64; 8],
}

static ENGINE_ZOBRIST: OnceLock<EngineZobrist> = OnceLock::new();

fn engine_zobrist() -> &'static EngineZobrist {
    ENGINE_ZOBRIST.get_or_init(|| {
        let mut s = 0x9e3779b97f4a7c15u64;
        let mut rng = || {
            s ^= s << 13;
            s ^= s >> 7;
            s ^= s << 17;
            s
        };
        let mut pieces = [[[0u64; 64]; 2]; 6];
        for p in &mut pieces {
            for pl in p.iter_mut() {
                for sq in pl.iter_mut() {
                    *sq = rng();
                }
            }
        }
        EngineZobrist {
            pieces,
            side_to_move: rng(),
            castling: [rng(), rng(), rng(), rng()],
            en_passant: [rng(), rng(), rng(), rng(), rng(), rng(), rng(), rng()],
        }
    })
}

fn piece_type_idx(kind: ChessPieceKind) -> usize {
    match kind {
        ChessPieceKind::Pawn => 0,
        ChessPieceKind::Knight => 1,
        ChessPieceKind::Bishop => 2,
        ChessPieceKind::Rook => 3,
        ChessPieceKind::Queen => 4,
        ChessPieceKind::King => 5,
    }
}

#[derive(Clone)]
pub struct Engine {
    pub board: Board,
    pub units: HashMap<UnitId, Unit>,
    pub turn_manager: TurnManager,
    pub next_unit_id: UnitId,
    pub action_log: Vec<Command>,
    /// IMP-230 — origin (from) square of each played move, index-aligned with
    /// `action_log`. Lets `undoes_own_last_move` detect the FIRST A→B→A reversal
    /// of a piece (opening shuffle), whose origin square is otherwise
    /// unrecoverable from move targets alone. Ability entries store the acting
    /// unit's square purely to keep the index alignment; that value is never read.
    pub move_origins: Vec<Position>,
    pub en_passant_target: Option<Position>,
    pub current_repetition_key: u64,
    pub repetition_counts: HashMap<u64, u32>,
    pub halfmove_clock: u32,
    pub white_can_castle_kingside: bool,
    pub white_can_castle_queenside: bool,
    pub black_can_castle_kingside: bool,
    pub black_can_castle_queenside: bool,
    pub castling_spec: CastlingSpec,
    pub position_hash: u64,
}

pub(crate) struct SearchMoveUndo {
    unit_before: Unit,
    captured_unit: Option<Unit>,
    rook_before: Option<Unit>,
    hash_after: u64,
    previous_repetition_key: u64,
    previous_position_hash: u64,
    previous_turn_manager: TurnManager,
    previous_en_passant_target: Option<Position>,
    previous_halfmove_clock: u32,
    previous_white_can_castle_kingside: bool,
    previous_white_can_castle_queenside: bool,
    previous_black_can_castle_kingside: bool,
    previous_black_can_castle_queenside: bool,
    profile: SearchMoveProfile,
}

pub(crate) struct SearchNullMoveUndo {
    previous_repetition_key: u64,
    previous_position_hash: u64,
    previous_turn_manager: TurnManager,
    previous_en_passant_target: Option<Position>,
    previous_halfmove_clock: u32,
    profile: SearchNullMoveProfile,
}

static SEARCH_RUNTIME_PROFILE_ENABLED: AtomicBool = AtomicBool::new(false);

#[derive(Clone, Copy, Debug, Default)]
pub(crate) struct SearchMoveProfile {
    pub snapshot_nanos: u64,
    pub apply_nanos: u64,
    pub repetition_nanos: u64,
    pub total_nanos: u64,
    pub captured_snapshot: bool,
    pub rook_snapshot: bool,
}

#[derive(Clone, Copy, Debug, Default)]
pub(crate) struct SearchUndoProfile {
    pub repetition_nanos: u64,
    pub restore_nanos: u64,
    pub total_nanos: u64,
}

#[derive(Clone, Copy, Debug, Default)]
pub(crate) struct SearchNullMoveProfile {
    pub total_nanos: u64,
}

impl SearchMoveUndo {
    pub(crate) fn profile(&self) -> SearchMoveProfile {
        self.profile
    }
}

impl SearchNullMoveUndo {
    pub(crate) fn profile(&self) -> SearchNullMoveProfile {
        self.profile
    }
}

pub(crate) fn set_search_runtime_profile_enabled(enabled: bool) {
    SEARCH_RUNTIME_PROFILE_ENABLED.store(enabled, Ordering::Relaxed);
}

fn search_runtime_profile_enabled() -> bool {
    SEARCH_RUNTIME_PROFILE_ENABLED.load(Ordering::Relaxed)
}

fn elapsed_nanos(start: Option<Instant>) -> u64 {
    start
        .map(|start| start.elapsed().as_nanos().min(u128::from(u64::MAX)) as u64)
        .unwrap_or(0)
}

fn action_sort_key(action: &Action, units: &HashMap<UnitId, Unit>) -> (u8, u8, u8, u8, u8) {
    match action {
        Action::Move {
            unit_id,
            target,
            promotion,
        } => {
            let (from_x, from_y) = units
                .get(unit_id)
                .map(|u| (u.position.x as u8, u.position.y as u8))
                .unwrap_or((u8::MAX, u8::MAX));
            let promo_ord: u8 = match promotion {
                None => 0,
                Some(ChessPieceKind::Bishop) => b'b',
                Some(ChessPieceKind::Knight) => b'n',
                Some(ChessPieceKind::Queen) => b'q',
                Some(ChessPieceKind::Rook) => b'r',
                Some(_) => b'z',
            };
            (from_x, from_y, target.x as u8, target.y as u8, promo_ord)
        }
        _ => (u8::MAX, u8::MAX, u8::MAX, u8::MAX, u8::MAX),
    }
}

impl Engine {
    pub fn new(board: Board) -> Self {
        let mut engine = Self {
            board,
            units: HashMap::new(),
            turn_manager: TurnManager::new(),
            next_unit_id: 1,
            action_log: Vec::new(),
            move_origins: Vec::new(),
            en_passant_target: None,
            current_repetition_key: 0,
            repetition_counts: HashMap::new(),
            halfmove_clock: 0,
            white_can_castle_kingside: true,
            white_can_castle_queenside: true,
            black_can_castle_kingside: true,
            black_can_castle_queenside: true,
            castling_spec: CastlingSpec::classical(),
            position_hash: 0,
        };
        engine.position_hash = engine.compute_position_hash();
        engine.current_repetition_key = engine.position_hash;
        engine.repetition_counts.insert(engine.position_hash, 1);
        engine
    }

    pub fn compute_position_hash(&self) -> u64 {
        let zt = engine_zobrist();
        let mut h = 0u64;
        for u in self.units.values() {
            let pi = piece_type_idx(u.kind);
            let oi = (u.owner - 1) as usize;
            let sq = (u.position.y * 8 + u.position.x) as usize;
            h ^= zt.pieces[pi][oi][sq];
        }
        if self.turn_manager.current_player == 2 {
            h ^= zt.side_to_move;
        }
        if self.white_can_castle_kingside  { h ^= zt.castling[0]; }
        if self.white_can_castle_queenside { h ^= zt.castling[1]; }
        if self.black_can_castle_kingside  { h ^= zt.castling[2]; }
        if self.black_can_castle_queenside { h ^= zt.castling[3]; }
        if let Some(ep) = self.en_passant_target {
            h ^= zt.en_passant[ep.x as usize];
        }
        h
    }

    pub fn to_fen(&self) -> String {
        engine_to_fen(self)
    }

    pub fn add_unit(&mut self, mut unit: Unit) -> Result<(), &'static str> {
        let id = self.next_unit_id;
        unit.id = id;
        self.board.place_unit(id, unit.position)?;

        // Update position_hash for the newly placed piece.
        let zt = engine_zobrist();
        let pi = piece_type_idx(unit.kind);
        let oi = (unit.owner - 1) as usize;
        let sq = (unit.position.y * 8 + unit.position.x) as usize;
        self.position_hash ^= zt.pieces[pi][oi][sq];
        self.current_repetition_key = self.position_hash;

        self.next_unit_id += 1;
        self.units.insert(id, unit);
        Ok(())
    }

    pub fn reset_repetition_state(&mut self) {
        self.position_hash = self.compute_position_hash();
        self.current_repetition_key = self.position_hash;
        self.repetition_counts.clear();
        self.repetition_counts.insert(self.position_hash, 1);
    }

    // -----------------------------
    // GAME STATE
    // -----------------------------

    pub fn game_over(&self) -> bool {
        if self.king_id(1).is_none() || self.king_id(2).is_none() {
            return true;
        }

        self.termination_reason().is_some()
    }

    pub fn winner(&self) -> Option<PlayerId> {
        if self.king_id(1).is_none() {
            return Some(2);
        }

        if self.king_id(2).is_none() {
            return Some(1);
        }

        let player = self.turn_manager.current_player;

        if self.is_checkmate(player) {
            return Some(self.opponent(player));
        }

        if self.termination_reason().is_some() {
            return None;
        }

        None
    }

    pub fn is_checkmate(&self, player: PlayerId) -> bool {
        self.is_in_check(player) && self.legal_actions(player).is_empty()
    }

    pub fn is_stalemate(&self, player: PlayerId) -> bool {
        !self.is_in_check(player) && self.legal_actions(player).is_empty()
    }

    fn has_insufficient_material(&self) -> bool {
        let white_non_king: Vec<ChessPieceKind> = self
            .units
            .values()
            .filter(|u| u.owner == 1 && u.kind != ChessPieceKind::King)
            .map(|u| u.kind)
            .collect();
        let black_non_king: Vec<ChessPieceKind> = self
            .units
            .values()
            .filter(|u| u.owner == 2 && u.kind != ChessPieceKind::King)
            .map(|u| u.kind)
            .collect();

        if white_non_king.is_empty() && black_non_king.is_empty() {
            return true;
        }

        if white_non_king.len() == 1
            && black_non_king.is_empty()
            && matches!(
                white_non_king[0],
                ChessPieceKind::Bishop | ChessPieceKind::Knight
            )
        {
            return true;
        }

        if black_non_king.len() == 1
            && white_non_king.is_empty()
            && matches!(
                black_non_king[0],
                ChessPieceKind::Bishop | ChessPieceKind::Knight
            )
        {
            return true;
        }

        white_non_king.len() == 1
            && black_non_king.len() == 1
            && white_non_king[0] == ChessPieceKind::Bishop
            && black_non_king[0] == ChessPieceKind::Bishop
            && self
                .units
                .values()
                .filter(|u| u.kind == ChessPieceKind::Bishop)
                .map(|u| (u.position.x + u.position.y) % 2)
                .collect::<Vec<u32>>()
                .windows(2)
                .all(|w| w[0] == w[1])
    }

    pub fn termination_reason(&self) -> Option<&'static str> {
        if self.king_id(1).is_none() || self.king_id(2).is_none() {
            return Some("king_captured");
        }

        if self.halfmove_clock >= 100 {
            return Some("fifty_move_rule");
        }

        if self
            .repetition_counts
            .get(&self.current_repetition_key)
            .copied()
            .unwrap_or(0)
            >= 3
        {
            return Some("threefold_repetition");
        }

        if self.has_insufficient_material() {
            return Some("insufficient_material");
        }

        let player = self.turn_manager.current_player;
        if self.is_checkmate(player) {
            return Some("checkmate");
        }

        if self.is_stalemate(player) {
            return Some("stalemate");
        }

        if self.turn_manager.turn_index > 200 {
            return Some("lab_hard_turn_cap");
        }

        None
    }

    // -----------------------------
    // EXECUTION
    // -----------------------------

    pub fn execute(&mut self, command: Command) {
        let Command { player_id, action } = command;

        if player_id != self.turn_manager.current_player {
            return;
        }

        match action {
            Action::Move {
                unit_id,
                target,
                promotion,
            } => {
                if !self.validate_move(unit_id, target, promotion) {
                    return;
                }

                // IMP-230 — record the origin square before apply_move mutates it,
                // keeping move_origins index-aligned with action_log.
                let move_from = self
                    .units
                    .get(&unit_id)
                    .map(|u| u.position)
                    .unwrap_or(target);
                self.action_log.push(Command {
                    player_id,
                    action: Action::Move {
                        unit_id,
                        target,
                        promotion,
                    },
                });
                self.move_origins.push(move_from);

                if self.repetition_counts.is_empty() {
                    self.repetition_counts.insert(self.current_repetition_key, 1);
                }

                self.apply_move(unit_id, target, promotion);
                self.turn_manager.next_turn();
                self.current_repetition_key = self.position_hash;
                *self
                    .repetition_counts
                    .entry(self.current_repetition_key)
                    .or_insert(0) += 1;
            }

            Action::Ability {
                unit_id,
                ability,
                target,
            } => {
                if !self.validate_attack(unit_id, target, &ability) {
                    return;
                }

                self.action_log.push(Command {
                    player_id,
                    action: Action::Ability {
                        unit_id,
                        ability,
                        target,
                    },
                });
                // IMP-230 — abilities are not moves; push the acting unit's square
                // only to keep move_origins aligned with action_log. Never read.
                let ability_from = self
                    .units
                    .get(&unit_id)
                    .map(|u| u.position)
                    .unwrap_or(Position { x: 0, y: 0 });
                self.move_origins.push(ability_from);
                self.turn_manager.next_turn();
                self.current_repetition_key = self.position_hash;
                *self
                    .repetition_counts
                    .entry(self.current_repetition_key)
                    .or_insert(0) += 1;
            }

            Action::Pass => {
                return;
            }
        }
    }

    // -----------------------------
    // MOVE APPLICATION
    // -----------------------------

    fn apply_move(&mut self, unit_id: UnitId, target: Position, promotion: Option<ChessPieceKind>) {
        let Some(mut unit) = self.units.remove(&unit_id) else {
            return;
        };

        let from = unit.position;
        let is_castling = unit.kind == ChessPieceKind::King
            && self.castling_spec.for_king_move(unit.owner, from, target).is_some();

        // --- Zobrist: XOR out current ep, castling rights, and moving piece ---
        let zt = engine_zobrist();
        if let Some(ep) = self.en_passant_target {
            self.position_hash ^= zt.en_passant[ep.x as usize];
        }
        if self.white_can_castle_kingside  { self.position_hash ^= zt.castling[0]; }
        if self.white_can_castle_queenside { self.position_hash ^= zt.castling[1]; }
        if self.black_can_castle_kingside  { self.position_hash ^= zt.castling[2]; }
        if self.black_can_castle_queenside { self.position_hash ^= zt.castling[3]; }
        let from_sq = (from.y * 8 + from.x) as usize;
        self.position_hash ^= zt.pieces[piece_type_idx(unit.kind)][(unit.owner - 1) as usize][from_sq];

        if unit.kind == ChessPieceKind::King {
            if unit.owner == 1 {
                self.white_can_castle_kingside = false;
                self.white_can_castle_queenside = false;
            } else {
                self.black_can_castle_kingside = false;
                self.black_can_castle_queenside = false;
            }
        }

        if unit.kind == ChessPieceKind::Rook {
            self.revoke_castling_right_for_rook_at(unit.owner, from);
        }

        let was_pawn_move = unit.kind == ChessPieceKind::Pawn;
        let previous_en_passant_target = self.en_passant_target;
        let is_double_step = unit.kind == ChessPieceKind::Pawn
            && from.x == target.x
            && from.y.abs_diff(target.y) == 2;
        let is_capture = self.board.occupant(target).is_some();
        let is_en_passant_capture = unit.kind == ChessPieceKind::Pawn
            && previous_en_passant_target == Some(target)
            && self.board.occupant(target).is_none();

        self.en_passant_target = if is_double_step {
            Some(Position {
                x: from.x,
                y: (from.y + target.y) / 2,
            })
        } else {
            None
        };

        if let Some(target_id) = self.board.occupant(target) {
            let captured_info = self.units.get(&target_id).map(|u| (u.kind, u.owner));
            if let Some((cap_kind, cap_owner)) = captured_info {
                if cap_kind == ChessPieceKind::Rook {
                    self.revoke_castling_right_for_rook_at(cap_owner, target);
                }
                // Zobrist: XOR out captured piece
                let target_sq = (target.y * 8 + target.x) as usize;
                self.position_hash ^= zt.pieces[piece_type_idx(cap_kind)][(cap_owner - 1) as usize][target_sq];
            }
            self.units.remove(&target_id);
            self.board.remove_unit(target);
        }

        if is_en_passant_capture {
            let captured_pawn_pos = Position {
                x: target.x,
                y: if unit.owner == 1 {
                    target.y - 1
                } else {
                    target.y + 1
                },
            };

            if let Some(captured_pawn_id) = self.board.occupant(captured_pawn_pos) {
                // Zobrist: XOR out en passant captured pawn
                if let Some(cap_pawn) = self.units.get(&captured_pawn_id) {
                    let cap_sq = (captured_pawn_pos.y * 8 + captured_pawn_pos.x) as usize;
                    self.position_hash ^= zt.pieces[piece_type_idx(ChessPieceKind::Pawn)][(cap_pawn.owner - 1) as usize][cap_sq];
                }
                self.units.remove(&captured_pawn_id);
                self.board.remove_unit(captured_pawn_pos);
            }
        }

        self.board.move_unit(unit_id, from, target);

        if is_castling {
            if let Some(side_spec) =
                self.castling_spec.for_king_move(unit.owner, from, target)
            {
                if let Some(rook_id) = self.board.occupant(side_spec.rook_start) {
                    self.board
                        .move_unit(rook_id, side_spec.rook_start, side_spec.rook_final);

                    if let Some(rook) = self.units.get_mut(&rook_id) {
                        // Zobrist: XOR rook from old square to new square
                        let rook_from_sq = (side_spec.rook_start.y * 8 + side_spec.rook_start.x) as usize;
                        let rook_to_sq = (side_spec.rook_final.y * 8 + side_spec.rook_final.x) as usize;
                        let roi = (rook.owner - 1) as usize;
                        self.position_hash ^= zt.pieces[piece_type_idx(ChessPieceKind::Rook)][roi][rook_from_sq];
                        self.position_hash ^= zt.pieces[piece_type_idx(ChessPieceKind::Rook)][roi][rook_to_sq];
                        rook.position = side_spec.rook_final;
                        rook.has_moved = true;
                    }
                }
            }
        }

        unit.position = target;
        unit.has_moved = true;

        if let Some(piece_kind) = promotion {
            unit.kind = piece_kind;
            unit.template_name = Arc::from(format!("{piece_kind:?}").as_str());
        } else if unit.kind == ChessPieceKind::Pawn {
            if (unit.owner == 1 && target.y == 7) || (unit.owner == 2 && target.y == 0) {
                unit.kind = ChessPieceKind::Queen;
                unit.template_name = Arc::from("Queen");
            }
        }

        if was_pawn_move || is_capture || is_en_passant_capture {
            self.halfmove_clock = 0;
        } else {
            self.halfmove_clock += 1;
        }

        // --- Zobrist: XOR in moved piece at destination (after promotion), new ep, new castling, toggle side ---
        let target_sq = (target.y * 8 + target.x) as usize;
        self.position_hash ^= zt.pieces[piece_type_idx(unit.kind)][(unit.owner - 1) as usize][target_sq];
        if let Some(ep) = self.en_passant_target {
            self.position_hash ^= zt.en_passant[ep.x as usize];
        }
        if self.white_can_castle_kingside  { self.position_hash ^= zt.castling[0]; }
        if self.white_can_castle_queenside { self.position_hash ^= zt.castling[1]; }
        if self.black_can_castle_kingside  { self.position_hash ^= zt.castling[2]; }
        if self.black_can_castle_queenside { self.position_hash ^= zt.castling[3]; }
        self.position_hash ^= zt.side_to_move;

        self.units.insert(unit_id, unit);
    }

    fn validate_move(
        &self,
        unit_id: UnitId,
        target: Position,
        promotion: Option<ChessPieceKind>,
    ) -> bool {
        self.legal_actions_for_unit(unit_id)
            .into_iter()
            .any(|a| matches!(a, Action::Move { unit_id: uid, target: t, promotion: p } if uid == unit_id && t == target && p == promotion))
    }

    fn validate_attack(&self, _attacker: UnitId, _target: UnitId, _ability: &AbilityType) -> bool {
        false
    }

    // -----------------------------
    // KING
    // -----------------------------

    fn king_id(&self, player: PlayerId) -> Option<UnitId> {
        self.units
            .values()
            .find(|u| u.owner == player && u.kind == ChessPieceKind::King)
            .map(|u| u.id)
    }

    fn king_pos(&self, player: PlayerId) -> Option<Position> {
        self.units
            .values()
            .find(|u| u.owner == player && u.kind == ChessPieceKind::King)
            .map(|u| u.position)
    }

    // -----------------------------
    // CHECK
    // -----------------------------

    pub fn is_in_check(&self, player: PlayerId) -> bool {
        let Some(king_pos) = self.king_pos(player) else {
            return true;
        };

        let enemy = self.opponent(player);

        for unit in self.units.values() {
            if unit.owner != enemy {
                continue;
            }

            if self.attacks_square(unit.id, king_pos) {
                return true;
            }
        }

        false
    }

    fn attacks_square(&self, unit_id: UnitId, target: Position) -> bool {
        let Some(unit) = self.units.get(&unit_id) else {
            return false;
        };

        let from = unit.position;
        let dx = target.x as i32 - from.x as i32;
        let dy = target.y as i32 - from.y as i32;

        match unit.kind {
            ChessPieceKind::King => dx.abs() <= 1 && dy.abs() <= 1,

            ChessPieceKind::Queen => {
                (dx == 0 || dy == 0 || dx.abs() == dy.abs()) && self.path_clear(from, target)
            }

            ChessPieceKind::Rook => (dx == 0 || dy == 0) && self.path_clear(from, target),

            ChessPieceKind::Bishop => dx.abs() == dy.abs() && self.path_clear(from, target),

            ChessPieceKind::Knight => {
                (dx.abs() == 2 && dy.abs() == 1) || (dx.abs() == 1 && dy.abs() == 2)
            }

            ChessPieceKind::Pawn => {
                let dir = if unit.owner == 1 { 1 } else { -1 };
                dy == dir && dx.abs() == 1
            }
        }
    }

    fn path_clear(&self, from: Position, target: Position) -> bool {
        let dx = target.x as i32 - from.x as i32;
        let dy = target.y as i32 - from.y as i32;

        let step_x = dx.signum();
        let step_y = dy.signum();

        let mut x = from.x as i32 + step_x;
        let mut y = from.y as i32 + step_y;

        while x != target.x as i32 || y != target.y as i32 {
            let pos = Position {
                x: x as u32,
                y: y as u32,
            };

            if self.board.occupant(pos).is_some() {
                return false;
            }

            x += step_x;
            y += step_y;
        }

        true
    }

    // -----------------------------
    // MOVE GENERATION
    // -----------------------------

    pub fn legal_actions(&self, player: PlayerId) -> Vec<Action> {
        let mut actions = Vec::new();

        for unit in self.units.values() {
            if unit.owner == player {
                actions.extend(self.legal_actions_for_unit(unit.id));
            }
        }

        actions.sort_by_key(|action| action_sort_key(action, &self.units));
        actions
    }

    pub fn legal_actions_for_unit(&self, unit_id: UnitId) -> Vec<Action> {
        let Some(unit) = self.units.get(&unit_id) else {
            return vec![];
        };

        let player = unit.owner;
        let pseudo = self.pseudo_moves_for_unit(unit_id);

        let mut legal = Vec::new();

        for action in pseudo {
            if self.is_action_legal_for_unit(unit_id, &action, player) {
                legal.push(action);
            }
        }

        legal
    }

    fn is_action_legal_for_unit(&self, unit_id: UnitId, action: &Action, player: PlayerId) -> bool {
        let Action::Move {
            unit_id: uid,
            target,
            ..
        } = action
        else {
            return false;
        };

        if *uid != unit_id {
            return false;
        }

        let Some(unit) = self.units.get(&unit_id) else {
            return false;
        };

        let from = unit.position;
        let king_pos_after = if unit.kind == ChessPieceKind::King {
            *target
        } else {
            match self.king_pos(player) {
                Some(pos) => pos,
                None => return false,
            }
        };

        for enemy in self.units.values() {
            if enemy.owner == player
                || !self.unit_present_after_move(enemy.id, enemy.position, unit_id, from, *target)
            {
                continue;
            }

            if self.attacks_square_after_move(enemy.id, king_pos_after, unit_id, from, *target) {
                return false;
            }
        }

        true
    }

    pub(crate) fn simulate_action_for_search(
        &mut self,
        player: PlayerId,
        action: &Action,
    ) -> Option<SearchMoveUndo> {
        if self.turn_manager.current_player != player {
            return None;
        }

        let Action::Move {
            unit_id,
            target,
            promotion,
        } = action
        else {
            return None;
        };

        let profiling = search_runtime_profile_enabled();
        let total_start = profiling.then(Instant::now);
        let snapshot_start = profiling.then(Instant::now);
        let unit_before = self.units.get(unit_id)?.clone();
        let from = unit_before.position;
        let is_castling = unit_before.kind == ChessPieceKind::King
            && self.castling_spec.for_king_move(unit_before.owner, from, *target).is_some();

        let rook_before = if is_castling {
            self.castling_spec
                .for_king_move(unit_before.owner, from, *target)
                .and_then(|spec| {
                    self.board
                        .occupant(spec.rook_start)
                        .and_then(|rook_id| self.units.get(&rook_id))
                        .cloned()
                })
        } else {
            None
        };

        let captured_unit = if unit_before.kind == ChessPieceKind::Pawn
            && self.en_passant_target == Some(*target)
            && self.board.occupant(*target).is_none()
        {
            let captured_pos = Position {
                x: target.x,
                y: if unit_before.owner == 1 {
                    target.y - 1
                } else {
                    target.y + 1
                },
            };
            self.board
                .occupant(captured_pos)
                .and_then(|captured_id| self.units.get(&captured_id))
                .cloned()
        } else {
            self.board
                .occupant(*target)
                .and_then(|captured_id| self.units.get(&captured_id))
                .cloned()
        };
        let captured_snapshot = captured_unit.is_some();
        let rook_snapshot = rook_before.is_some();
        let snapshot_nanos = elapsed_nanos(snapshot_start);

        let undo = SearchMoveUndo {
            unit_before,
            captured_unit,
            rook_before,
            hash_after: 0,
            previous_repetition_key: self.current_repetition_key,
            previous_position_hash: self.position_hash,
            previous_turn_manager: self.turn_manager,
            previous_en_passant_target: self.en_passant_target,
            previous_halfmove_clock: self.halfmove_clock,
            previous_white_can_castle_kingside: self.white_can_castle_kingside,
            previous_white_can_castle_queenside: self.white_can_castle_queenside,
            previous_black_can_castle_kingside: self.black_can_castle_kingside,
            previous_black_can_castle_queenside: self.black_can_castle_queenside,
            profile: SearchMoveProfile::default(),
        };

        self.action_log.push(Command {
            player_id: player,
            action: Action::Move {
                unit_id: *unit_id,
                target: *target,
                promotion: *promotion,
            },
        });
        // IMP-230 — `from` is the unit's pre-move square (line above), kept
        // index-aligned with action_log so the root reversal check sees the origin.
        self.move_origins.push(from);

        let repetition_start = profiling.then(Instant::now);
        if self.repetition_counts.is_empty() {
            self.repetition_counts.insert(self.current_repetition_key, 1);
        }
        let mut repetition_nanos = elapsed_nanos(repetition_start);

        let apply_start = profiling.then(Instant::now);
        self.apply_move(*unit_id, *target, *promotion);
        self.turn_manager.next_turn();
        let apply_nanos = elapsed_nanos(apply_start);

        let repetition_start = profiling.then(Instant::now);
        self.current_repetition_key = self.position_hash;
        let hash_after = self.current_repetition_key;
        *self.repetition_counts.entry(hash_after).or_insert(0) += 1;
        repetition_nanos += elapsed_nanos(repetition_start);

        let mut undo = undo;
        undo.hash_after = hash_after;
        undo.profile = SearchMoveProfile {
            snapshot_nanos,
            apply_nanos,
            repetition_nanos,
            total_nanos: elapsed_nanos(total_start),
            captured_snapshot,
            rook_snapshot,
        };

        Some(undo)
    }

    pub(crate) fn undo_action_for_search(&mut self, undo: SearchMoveUndo) -> SearchUndoProfile {
        let profiling = search_runtime_profile_enabled();
        let total_start = profiling.then(Instant::now);
        let SearchMoveUndo {
            unit_before,
            captured_unit,
            rook_before,
            hash_after,
            previous_repetition_key,
            previous_position_hash,
            previous_turn_manager,
            previous_en_passant_target,
            previous_halfmove_clock,
            previous_white_can_castle_kingside,
            previous_white_can_castle_queenside,
            previous_black_can_castle_kingside,
            previous_black_can_castle_queenside,
            profile: _,
        } = undo;

        let repetition_start = profiling.then(Instant::now);
        if let Some(count) = self.repetition_counts.get_mut(&hash_after) {
            if *count > 1 {
                *count -= 1;
            } else {
                self.repetition_counts.remove(&hash_after);
            }
        }
        let repetition_nanos = elapsed_nanos(repetition_start);

        let restore_start = profiling.then(Instant::now);
        self.current_repetition_key = previous_repetition_key;
        self.position_hash = previous_position_hash;
        self.turn_manager = previous_turn_manager;
        self.en_passant_target = previous_en_passant_target;
        self.halfmove_clock = previous_halfmove_clock;
        self.white_can_castle_kingside = previous_white_can_castle_kingside;
        self.white_can_castle_queenside = previous_white_can_castle_queenside;
        self.black_can_castle_kingside = previous_black_can_castle_kingside;
        self.black_can_castle_queenside = previous_black_can_castle_queenside;

        if let Some(current_unit) = self.units.remove(&unit_before.id) {
            self.board.remove_unit(current_unit.position);
        }

        if let Some(rook_before) = rook_before {
            if let Some(current_rook) = self.units.remove(&rook_before.id) {
                self.board.remove_unit(current_rook.position);
            }
            let _ = self.board.place_unit(rook_before.id, rook_before.position);
            self.units.insert(rook_before.id, rook_before);
        }

        if let Some(captured_unit) = captured_unit {
            let _ = self
                .board
                .place_unit(captured_unit.id, captured_unit.position);
            self.units.insert(captured_unit.id, captured_unit);
        }

        let _ = self.board.place_unit(unit_before.id, unit_before.position);
        self.units.insert(unit_before.id, unit_before);

        let _ = self.action_log.pop();
        let _ = self.move_origins.pop(); // IMP-230 — stay aligned with action_log
        SearchUndoProfile {
            repetition_nanos,
            restore_nanos: elapsed_nanos(restore_start),
            total_nanos: elapsed_nanos(total_start),
        }
    }

    pub(crate) fn simulate_null_move_for_search(
        &mut self,
        player: PlayerId,
    ) -> Option<SearchNullMoveUndo> {
        if self.turn_manager.current_player != player {
            return None;
        }

        let profiling = search_runtime_profile_enabled();
        let total_start = profiling.then(Instant::now);
        let undo = SearchNullMoveUndo {
            previous_repetition_key: self.current_repetition_key,
            previous_position_hash: self.position_hash,
            previous_turn_manager: self.turn_manager,
            previous_en_passant_target: self.en_passant_target,
            previous_halfmove_clock: self.halfmove_clock,
            profile: SearchNullMoveProfile::default(),
        };

        // Update position_hash for null move: XOR out old ep, toggle side_to_move
        let zt = engine_zobrist();
        if let Some(ep) = self.en_passant_target {
            self.position_hash ^= zt.en_passant[ep.x as usize];
        }
        self.position_hash ^= zt.side_to_move;

        self.en_passant_target = None;
        self.halfmove_clock += 1;
        self.turn_manager.next_turn();
        self.current_repetition_key = self.position_hash;

        let mut undo = undo;
        undo.profile = SearchNullMoveProfile {
            total_nanos: elapsed_nanos(total_start),
        };

        Some(undo)
    }

    pub(crate) fn undo_null_move_for_search(
        &mut self,
        undo: SearchNullMoveUndo,
    ) -> SearchNullMoveProfile {
        let profiling = search_runtime_profile_enabled();
        let total_start = profiling.then(Instant::now);
        let SearchNullMoveUndo {
            previous_repetition_key,
            previous_position_hash,
            previous_turn_manager,
            previous_en_passant_target,
            previous_halfmove_clock,
            profile: _,
        } = undo;
        self.current_repetition_key = previous_repetition_key;
        self.position_hash = previous_position_hash;
        self.turn_manager = previous_turn_manager;
        self.en_passant_target = previous_en_passant_target;
        self.halfmove_clock = previous_halfmove_clock;
        SearchNullMoveProfile {
            total_nanos: elapsed_nanos(total_start),
        }
    }

    pub(crate) fn action_gives_check(&self, player: PlayerId, action: &Action) -> bool {
        let Action::Move {
            unit_id, target, ..
        } = action
        else {
            return false;
        };

        let Some(unit) = self.units.get(unit_id) else {
            return false;
        };

        if unit.owner != player {
            return false;
        }

        let from = unit.position;
        let enemy = self.opponent(player);
        let Some(enemy_king_pos) = self.king_pos(enemy) else {
            return false;
        };

        for ally in self.units.values() {
            if ally.owner != player
                || !self.unit_present_after_move(ally.id, ally.position, *unit_id, from, *target)
            {
                continue;
            }

            if self.attacks_square_after_move(ally.id, enemy_king_pos, *unit_id, from, *target) {
                return true;
            }
        }

        false
    }

    fn unit_present_after_move(
        &self,
        candidate_id: UnitId,
        candidate_pos: Position,
        moving_unit_id: UnitId,
        from: Position,
        target: Position,
    ) -> bool {
        self.occupant_after_move(candidate_pos, moving_unit_id, from, target) == Some(candidate_id)
    }

    fn occupant_after_move(
        &self,
        pos: Position,
        moving_unit_id: UnitId,
        from: Position,
        target: Position,
    ) -> Option<UnitId> {
        let moving_unit = self.units.get(&moving_unit_id)?;
        let is_en_passant_capture = moving_unit.kind == ChessPieceKind::Pawn
            && self.en_passant_target == Some(target)
            && self.board.occupant(target).is_none();

        if pos == from {
            return None;
        }

        if is_en_passant_capture {
            let captured_pos = Position {
                x: target.x,
                y: if moving_unit.owner == 1 {
                    target.y - 1
                } else {
                    target.y + 1
                },
            };

            if pos == captured_pos {
                return None;
            }
        }

        if moving_unit.kind == ChessPieceKind::King
            && from.y == target.y
            && from.x.abs_diff(target.x) == 2
        {
            let (rook_from, rook_to) = if target.x == 6 {
                (Position { x: 7, y: from.y }, Position { x: 5, y: from.y })
            } else {
                (Position { x: 0, y: from.y }, Position { x: 3, y: from.y })
            };

            if pos == rook_from {
                return None;
            }

            if pos == rook_to {
                return self.board.occupant(rook_from);
            }
        }

        if pos == target {
            return Some(moving_unit_id);
        }

        self.board.occupant(pos)
    }

    fn attacks_square_after_move(
        &self,
        attacker_id: UnitId,
        target: Position,
        moving_unit_id: UnitId,
        from: Position,
        move_target: Position,
    ) -> bool {
        let Some(unit) = self.units.get(&attacker_id) else {
            return false;
        };

        let attacker_pos = unit.position;
        let dx = target.x as i32 - attacker_pos.x as i32;
        let dy = target.y as i32 - attacker_pos.y as i32;

        match unit.kind {
            ChessPieceKind::King => dx.abs() <= 1 && dy.abs() <= 1,

            ChessPieceKind::Queen => {
                (dx == 0 || dy == 0 || dx.abs() == dy.abs())
                    && self.path_clear_after_move(
                        attacker_pos,
                        target,
                        moving_unit_id,
                        from,
                        move_target,
                    )
            }

            ChessPieceKind::Rook => {
                (dx == 0 || dy == 0)
                    && self.path_clear_after_move(
                        attacker_pos,
                        target,
                        moving_unit_id,
                        from,
                        move_target,
                    )
            }

            ChessPieceKind::Bishop => {
                dx.abs() == dy.abs()
                    && self.path_clear_after_move(
                        attacker_pos,
                        target,
                        moving_unit_id,
                        from,
                        move_target,
                    )
            }

            ChessPieceKind::Knight => {
                (dx.abs() == 2 && dy.abs() == 1) || (dx.abs() == 1 && dy.abs() == 2)
            }

            ChessPieceKind::Pawn => {
                let dir = if unit.owner == 1 { 1 } else { -1 };
                dy == dir && dx.abs() == 1
            }
        }
    }

    fn path_clear_after_move(
        &self,
        from: Position,
        target: Position,
        moving_unit_id: UnitId,
        move_from: Position,
        move_target: Position,
    ) -> bool {
        let dx = target.x as i32 - from.x as i32;
        let dy = target.y as i32 - from.y as i32;

        let step_x = dx.signum();
        let step_y = dy.signum();

        let mut x = from.x as i32 + step_x;
        let mut y = from.y as i32 + step_y;

        while x != target.x as i32 || y != target.y as i32 {
            let pos = Position {
                x: x as u32,
                y: y as u32,
            };

            if self
                .occupant_after_move(pos, moving_unit_id, move_from, move_target)
                .is_some()
            {
                return false;
            }

            x += step_x;
            y += step_y;
        }

        true
    }

    fn pseudo_moves_for_unit(&self, unit_id: UnitId) -> Vec<Action> {
        let Some(unit) = self.units.get(&unit_id) else {
            return vec![];
        };

        match unit.kind {
            ChessPieceKind::Pawn => self.pawn_moves(unit_id),
            ChessPieceKind::Knight => self.knight_moves(unit_id),
            ChessPieceKind::Bishop => {
                self.sliding_moves(unit_id, &[(1, 1), (1, -1), (-1, 1), (-1, -1)])
            }
            ChessPieceKind::Rook => {
                self.sliding_moves(unit_id, &[(1, 0), (-1, 0), (0, 1), (0, -1)])
            }
            ChessPieceKind::Queen => self.sliding_moves(
                unit_id,
                &[
                    (1, 1),
                    (1, -1),
                    (-1, 1),
                    (-1, -1),
                    (1, 0),
                    (-1, 0),
                    (0, 1),
                    (0, -1),
                ],
            ),
            ChessPieceKind::King => self.king_moves(unit_id),
        }
    }

    fn pawn_moves(&self, unit_id: UnitId) -> Vec<Action> {
        let mut moves = Vec::new();
        let Some(unit) = self.units.get(&unit_id) else {
            return moves;
        };

        let dir: i32 = if unit.owner == 1 { 1 } else { -1 };
        let from = unit.position;

        let one_y = from.y as i32 + dir;
        if one_y >= 0 {
            let one = Position {
                x: from.x,
                y: one_y as u32,
            };

            if self.board.in_bounds(one) && self.board.occupant(one).is_none() {
                if (unit.owner == 1 && one.y == 7) || (unit.owner == 2 && one.y == 0) {
                    for promotion in [
                        ChessPieceKind::Queen,
                        ChessPieceKind::Rook,
                        ChessPieceKind::Bishop,
                        ChessPieceKind::Knight,
                    ] {
                        moves.push(Action::Move {
                            unit_id,
                            target: one,
                            promotion: Some(promotion),
                        });
                    }
                } else {
                    moves.push(Action::Move {
                        unit_id,
                        target: one,
                        promotion: None,
                    });
                }

                let start_rank = if unit.owner == 1 { 1 } else { 6 };
                let two_y = from.y as i32 + dir * 2;
                if from.y == start_rank && two_y >= 0 {
                    let two = Position {
                        x: from.x,
                        y: two_y as u32,
                    };

                    if self.board.in_bounds(two) && self.board.occupant(two).is_none() {
                        moves.push(Action::Move {
                            unit_id,
                            target: two,
                            promotion: None,
                        });
                    }
                }
            }
        }

        for dx in [-1_i32, 1_i32] {
            let nx = from.x as i32 + dx;
            let ny = from.y as i32 + dir;

            if nx < 0 || ny < 0 {
                continue;
            }

            let pos = Position {
                x: nx as u32,
                y: ny as u32,
            };

            if !self.board.in_bounds(pos) {
                continue;
            }

            if let Some(target_id) = self.board.occupant(pos) {
                if let Some(target_unit) = self.units.get(&target_id) {
                    if target_unit.owner != unit.owner {
                        if (unit.owner == 1 && pos.y == 7) || (unit.owner == 2 && pos.y == 0) {
                            for promotion in [
                                ChessPieceKind::Queen,
                                ChessPieceKind::Rook,
                                ChessPieceKind::Bishop,
                                ChessPieceKind::Knight,
                            ] {
                                moves.push(Action::Move {
                                    unit_id,
                                    target: pos,
                                    promotion: Some(promotion),
                                });
                            }
                        } else {
                            moves.push(Action::Move {
                                unit_id,
                                target: pos,
                                promotion: None,
                            });
                        }
                    }
                }
            } else if self.en_passant_target == Some(pos) {
                moves.push(Action::Move {
                    unit_id,
                    target: pos,
                    promotion: None,
                });
            }
        }

        moves
    }

    fn knight_moves(&self, unit_id: UnitId) -> Vec<Action> {
        let mut moves = Vec::new();
        let Some(unit) = self.units.get(&unit_id) else {
            return moves;
        };

        let from = unit.position;

        let deltas = [
            (2_i32, 1_i32),
            (2, -1),
            (-2, 1),
            (-2, -1),
            (1, 2),
            (1, -2),
            (-1, 2),
            (-1, -2),
        ];

        for (dx, dy) in deltas {
            let nx = from.x as i32 + dx;
            let ny = from.y as i32 + dy;

            if nx < 0 || ny < 0 {
                continue;
            }

            let pos = Position {
                x: nx as u32,
                y: ny as u32,
            };

            if !self.board.in_bounds(pos) {
                continue;
            }

            match self.board.occupant(pos) {
                None => moves.push(Action::Move {
                    unit_id,
                    target: pos,
                    promotion: None,
                }),
                Some(target_id) => {
                    if let Some(target_unit) = self.units.get(&target_id) {
                        if target_unit.owner != unit.owner {
                            moves.push(Action::Move {
                                unit_id,
                                target: pos,
                                promotion: None,
                            });
                        }
                    }
                }
            }
        }

        moves
    }

    fn sliding_moves(&self, unit_id: UnitId, directions: &[(i32, i32)]) -> Vec<Action> {
        let mut moves = Vec::new();
        let Some(unit) = self.units.get(&unit_id) else {
            return moves;
        };

        let from = unit.position;

        for (dx, dy) in directions {
            let mut nx = from.x as i32 + dx;
            let mut ny = from.y as i32 + dy;

            while nx >= 0 && ny >= 0 {
                let pos = Position {
                    x: nx as u32,
                    y: ny as u32,
                };

                if !self.board.in_bounds(pos) {
                    break;
                }

                match self.board.occupant(pos) {
                    None => {
                        moves.push(Action::Move {
                            unit_id,
                            target: pos,
                            promotion: None,
                        });
                    }
                    Some(target_id) => {
                        if let Some(target_unit) = self.units.get(&target_id) {
                            if target_unit.owner != unit.owner {
                                moves.push(Action::Move {
                                    unit_id,
                                    target: pos,
                                    promotion: None,
                                });
                            }
                        }
                        break;
                    }
                }

                nx += dx;
                ny += dy;
            }
        }

        moves
    }

    fn castling_rook_present(&self, player: PlayerId, rook_pos: Position) -> bool {
        let Some(rook_id) = self.board.occupant(rook_pos) else {
            return false;
        };

        let Some(rook) = self.units.get(&rook_id) else {
            return false;
        };

        rook.kind == ChessPieceKind::Rook && rook.owner == player
    }

    fn revoke_castling_right_for_rook_at(&mut self, owner: PlayerId, pos: Position) {
        for side_spec in self.castling_spec.for_player(owner).into_iter().flatten() {
            if side_spec.rook_start == pos {
                match (owner, side_spec.is_kingside()) {
                    (1, true)  => self.white_can_castle_kingside  = false,
                    (1, false) => self.white_can_castle_queenside = false,
                    (_, true)  => self.black_can_castle_kingside  = false,
                    (_, false) => self.black_can_castle_queenside = false,
                }
            }
        }
    }

    /// Derive the castling spec from actual king/rook positions on the board.
    ///
    /// Kingside rook: nearest unmoved rook to the right of the king.
    /// Queenside rook: nearest unmoved rook to the left of the king.
    /// Destinations are always FIDE Chess960 squares: g-file (ks) and c-file (qs).
    pub fn derive_castling_spec_from_positions(&mut self) {
        let wks = Self::build_side_spec(&self.units, 1, 0, true);
        let wqs = Self::build_side_spec(&self.units, 1, 0, false);
        let bks = Self::build_side_spec(&self.units, 2, 7, true);
        let bqs = Self::build_side_spec(&self.units, 2, 7, false);
        self.castling_spec = CastlingSpec {
            white_kingside:  wks,
            white_queenside: wqs,
            black_kingside:  bks,
            black_queenside: bqs,
        };
    }

    fn build_side_spec(
        units: &HashMap<UnitId, Unit>,
        owner: u32,
        rank: u32,
        kingside: bool,
    ) -> Option<CastlingSideSpec> {
        let king_x = units
            .values()
            .find(|u| u.owner == owner && u.kind == ChessPieceKind::King && u.position.y == rank)
            .map(|u| u.position.x)?;
        let rook_x = units
            .values()
            .filter(|u| {
                u.owner == owner
                    && u.kind == ChessPieceKind::Rook
                    && u.position.y == rank
                    && !u.has_moved
                    && if kingside { u.position.x > king_x } else { u.position.x < king_x }
            })
            .map(|u| u.position.x)
            .reduce(|a, b| if kingside { a.min(b) } else { a.max(b) })?;
        let (king_final_x, rook_final_x) = if kingside { (6u32, 5u32) } else { (2u32, 3u32) };
        Some(CastlingSideSpec {
            king_start: Position { x: king_x, y: rank },
            rook_start: Position { x: rook_x, y: rank },
            king_final: Position { x: king_final_x, y: rank },
            rook_final: Position { x: rook_final_x, y: rank },
        })
    }

    fn king_moves(&self, unit_id: UnitId) -> Vec<Action> {
        let mut moves = Vec::new();
        let Some(unit) = self.units.get(&unit_id) else {
            return moves;
        };

        let from = unit.position;
        let back_rank = if unit.owner == 1 { 0 } else { 7 };

        for dx in -1_i32..=1 {
            for dy in -1_i32..=1 {
                if dx == 0 && dy == 0 {
                    continue;
                }

                let nx = from.x as i32 + dx;
                let ny = from.y as i32 + dy;

                if nx < 0 || ny < 0 {
                    continue;
                }

                let pos = Position {
                    x: nx as u32,
                    y: ny as u32,
                };

                if !self.board.in_bounds(pos) {
                    continue;
                }

                match self.board.occupant(pos) {
                    None => moves.push(Action::Move {
                        unit_id,
                        target: pos,
                        promotion: None,
                    }),
                    Some(target_id) => {
                        if let Some(target_unit) = self.units.get(&target_id) {
                            if target_unit.owner != unit.owner {
                                moves.push(Action::Move {
                                    unit_id,
                                    target: pos,
                                    promotion: None,
                                });
                            }
                        }
                    }
                }
            }
        }

        if !unit.has_moved && !self.is_in_check(unit.owner) && from.y == back_rank {
            let enemy = self.opponent(unit.owner);
            for castling_side in self.castling_spec
                .for_player(unit.owner)
                .into_iter()
                .flatten()
            {
                let can_castle = if unit.owner == 1 {
                    if castling_side.is_kingside() {
                        self.white_can_castle_kingside
                    } else {
                        self.white_can_castle_queenside
                    }
                } else if castling_side.is_kingside() {
                    self.black_can_castle_kingside
                } else {
                    self.black_can_castle_queenside
                };

                if !can_castle {
                    continue;
                }

                if unit.position != castling_side.king_start {
                    continue;
                }

                if !self.castling_rook_present(unit.owner, castling_side.rook_start) {
                    continue;
                }

                if castling_side.empty_squares().iter().any(|x| {
                    self.board
                        .occupant(Position {
                            x: *x,
                            y: back_rank,
                        })
                        .is_some()
                }) {
                    continue;
                }

                if castling_side.attacked_squares().iter().any(|x| {
                    self.units.values().any(|u| {
                        u.owner == enemy
                            && self.attacks_square(
                                u.id,
                                Position {
                                    x: *x,
                                    y: back_rank,
                                },
                            )
                    })
                }) {
                    continue;
                }

                moves.push(Action::Move {
                    unit_id,
                    target: castling_side.king_final,
                    promotion: None,
                });
            }
        }

        moves
    }

    pub(crate) fn pseudo_mobility(&self, player: PlayerId) -> usize {
        self.units
            .values()
            .filter(|u| u.owner == player)
            .map(|u| self.pseudo_moves_for_unit(u.id).len())
            .sum()
    }

    // -----------------------------
    // UTILS
    // -----------------------------

    pub fn opponent(&self, player: PlayerId) -> PlayerId {
        if player == 1 {
            2
        } else {
            1
        }
    }

    // -----------------------------
    // FUTURE AI SUPPORT
    // -----------------------------

    pub fn material_score(&self, player: PlayerId) -> i32 {
        let mut score = 0;

        for unit in self.units.values() {
            let value = match unit.kind {
                ChessPieceKind::Pawn => 1,
                ChessPieceKind::Knight => 3,
                ChessPieceKind::Bishop => 3,
                ChessPieceKind::Rook => 5,
                ChessPieceKind::Queen => 9,
                ChessPieceKind::King => 100,
            };

            if unit.owner == player {
                score += value;
            } else {
                score -= value;
            }
        }

        score
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chess::uci::action_key;
    use crate::chess::fen::engine_from_fen;
    use crate::engine::action::action::Action;
    use crate::engine::action::command::Command;
    use crate::engine::entity::unit::Position;
    use crate::prototype::minimal_ruleset::{load_engine_from_ruleset, minimal_runtime_ruleset};
    use std::collections::HashSet;

    fn position(square: &str) -> Position {
        let bytes = square.as_bytes();
        Position {
            x: (bytes[0] - b'a') as u32,
            y: (bytes[1] - b'1') as u32,
        }
    }

    fn unit_id_at(engine: &Engine, square: &str) -> u32 {
        engine
            .board
            .occupant(position(square))
            .unwrap_or_else(|| panic!("expected unit at {square}"))
    }

    fn has_legal_move(engine: &Engine, from: &str, to: &str) -> bool {
        let unit_id = unit_id_at(engine, from);
        let target = position(to);
        engine.legal_actions_for_unit(unit_id).iter().any(|action| {
            matches!(
                action,
                Action::Move {
                    unit_id: action_unit_id,
                    target: action_target,
                    promotion: None,
                } if *action_unit_id == unit_id && *action_target == target
            )
        })
    }

    fn legal_action_ucis(engine: &Engine, player: u32) -> Vec<String> {
        legal_action_keys(engine, player)
    }

    fn legal_action_keys(engine: &Engine, player: u32) -> Vec<String> {
        engine
            .legal_actions(player)
            .iter()
            .map(|action| action_key(action, &engine.units))
            .collect()
    }

    fn action_for_uci(engine: &Engine, player: u32, uci: &str) -> Action {
        engine
            .legal_actions(player)
            .into_iter()
            .find(|action| {
                action_key(action, &engine.units).as_str() == uci
            })
            .unwrap_or_else(|| panic!("expected legal move {uci}"))
    }

    #[test]
    fn legal_action_keys_are_stable_for_same_position() {
        let fen = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
        let expected = legal_action_keys(
            &engine_from_fen(fen).expect("valid FEN for deterministic action key ordering"),
            1,
        );

        for _ in 0..64 {
            let engine =
                engine_from_fen(fen).expect("valid FEN for deterministic action key ordering");
            let current = legal_action_keys(&engine, 1);
            assert_eq!(current, expected);
        }
    }

    fn play_move(engine: &mut Engine, player_id: u32, from: &str, to: &str) {
        let unit_id = unit_id_at(engine, from);
        let target = position(to);
        assert!(
            has_legal_move(engine, from, to),
            "expected legal move {from}{to}"
        );
        engine.execute(Command {
            player_id,
            action: Action::Move {
                unit_id,
                target,
                promotion: None,
            },
        });
    }

    #[test]
    fn legal_actions_uci_order_is_stable_across_engine_construction() {
        let fen = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
        let expected = legal_action_ucis(
            &engine_from_fen(fen).expect("valid FEN for deterministic action ordering"),
            1,
        );

        for _ in 0..64 {
            let engine =
                engine_from_fen(fen).expect("valid FEN for deterministic action ordering");
            let current = legal_action_ucis(&engine, 1);
            assert_eq!(current, expected);
        }
    }

    #[test]
    fn legal_action_keys_are_unique_per_action() {
        let engine = engine_from_fen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
            .expect("valid FEN for legal action uniqueness");
        let keys = legal_action_keys(&engine, 1);
        let unique: HashSet<_> = keys.iter().collect();

        assert_eq!(keys.len(), unique.len());
    }

    #[test]
    fn legal_action_keys_distinguish_promotion_moves() {
        let engine = engine_from_fen("1k6/P7/8/8/8/8/8/4K3 w - - 0 1")
            .expect("valid promotion test position");
        let keys = legal_action_keys(&engine, 1)
            .into_iter()
            .filter(|key| key.starts_with("a7a8"))
            .collect::<HashSet<_>>();

        assert_eq!(keys.len(), 4);
        assert!(keys.contains(&"a7a8q".to_string()));
        assert!(keys.contains(&"a7a8r".to_string()));
        assert!(keys.contains(&"a7a8b".to_string()));
        assert!(keys.contains(&"a7a8n".to_string()));
    }

    #[test]
    fn legal_action_keys_represent_capture_and_quiet_moves_distinctly() {
        let engine = engine_from_fen("7k/8/8/8/8/3p4/4P3/4K2K w - - 17 5")
            .expect("valid capture action identity test");
        let player = 1;
        let capture = action_for_uci(&engine, player, "e2d3");
        let quiet = action_for_uci(&engine, player, "e2e3");

        let capture_key = action_key(&capture, &engine.units);
        let quiet_key = action_key(&quiet, &engine.units);

        assert_eq!(capture_key, "e2d3");
        assert_eq!(quiet_key, "e2e3");
        assert_ne!(capture_key, quiet_key);
    }

    #[test]
    fn simulate_action_for_search_restores_state_for_normal_move() {
        let mut engine = engine_from_fen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
            .expect("valid FEN for normal move restore test");
        let player = 1;

        let action = action_for_uci(&engine, player, "e1e2");
        let before_fen = engine.to_fen();
        let before_turn_manager = engine.turn_manager;
        let before_repetition_key = engine.current_repetition_key.clone();
        let before_repetition_counts = engine.repetition_counts.clone();
        let before_en_passant_target = engine.en_passant_target;
        let before_halfmove_clock = engine.halfmove_clock;
        let before_white_kingside = engine.white_can_castle_kingside;
        let before_white_queenside = engine.white_can_castle_queenside;
        let before_black_kingside = engine.black_can_castle_kingside;
        let before_black_queenside = engine.black_can_castle_queenside;
        let before_action_log_len = engine.action_log.len();

        let undo = engine
            .simulate_action_for_search(player, &action)
            .expect("legal normal move should simulate");

        assert_ne!(engine.to_fen(), before_fen);
        assert_ne!(engine.turn_manager.current_player, before_turn_manager.current_player);
        assert_ne!(engine.halfmove_clock, before_halfmove_clock);
        assert_ne!(engine.white_can_castle_kingside, before_white_kingside);

        engine.undo_action_for_search(undo);

        assert_eq!(engine.to_fen(), before_fen);
        assert_eq!(engine.turn_manager.current_player, before_turn_manager.current_player);
        assert_eq!(engine.turn_manager.turn_index, before_turn_manager.turn_index);
        assert_eq!(engine.current_repetition_key, before_repetition_key);
        assert_eq!(engine.repetition_counts, before_repetition_counts);
        assert_eq!(engine.en_passant_target, before_en_passant_target);
        assert_eq!(engine.halfmove_clock, before_halfmove_clock);
        assert_eq!(
            engine.white_can_castle_kingside,
            before_white_kingside,
        );
        assert_eq!(
            engine.white_can_castle_queenside,
            before_white_queenside,
        );
        assert_eq!(
            engine.black_can_castle_kingside,
            before_black_kingside,
        );
        assert_eq!(
            engine.black_can_castle_queenside,
            before_black_queenside,
        );
        assert_eq!(engine.action_log.len(), before_action_log_len);
    }

    #[test]
    fn simulate_action_for_search_restores_state_for_capture_move() {
        let mut engine = engine_from_fen("7k/8/8/8/8/3p4/4P3/4K2K w - - 17 5")
            .expect("valid FEN for capture restore test");
        let player = 1;
        let captured_unit_id = unit_id_at(&engine, "d3");
        let moving_unit_id = unit_id_at(&engine, "e2");

        let action = action_for_uci(&engine, player, "e2d3");
        let before_fen = engine.to_fen();
        let before_turn_manager = engine.turn_manager;
        let before_repetition_key = engine.current_repetition_key.clone();
        let before_repetition_counts = engine.repetition_counts.clone();
        let before_en_passant_target = engine.en_passant_target;
        let before_halfmove_clock = engine.halfmove_clock;
        let before_action_log_len = engine.action_log.len();

        let undo = engine
            .simulate_action_for_search(player, &action)
            .expect("legal capture should simulate");

        assert_ne!(engine.to_fen(), before_fen);
        assert_eq!(engine.board.occupant(position("e2")), None);
        assert_eq!(engine.board.occupant(position("d3")), Some(moving_unit_id));
        assert!(!engine.units.contains_key(&captured_unit_id));

        engine.undo_action_for_search(undo);

        assert_eq!(engine.to_fen(), before_fen);
        assert_eq!(engine.turn_manager.current_player, before_turn_manager.current_player);
        assert_eq!(engine.turn_manager.turn_index, before_turn_manager.turn_index);
        assert_eq!(engine.current_repetition_key, before_repetition_key);
        assert_eq!(engine.repetition_counts, before_repetition_counts);
        assert_eq!(engine.en_passant_target, before_en_passant_target);
        assert_eq!(engine.halfmove_clock, before_halfmove_clock);
        assert_eq!(engine.board.occupant(position("d3")), Some(captured_unit_id));
        assert_eq!(engine.board.occupant(position("e2")), Some(moving_unit_id));
        assert!(engine.units.contains_key(&captured_unit_id));
        assert_eq!(engine.action_log.len(), before_action_log_len);
    }

    #[test]
    fn simulate_action_for_search_restores_state_for_castling_rights() {
        let mut engine = engine_from_fen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
            .expect("valid FEN for castling rights restore test");

        let player = 1;
        let action = action_for_uci(&engine, player, "e1g1");
        let before_fen = engine.to_fen();
        let before_turn_manager = engine.turn_manager;
        let before_repetition_key = engine.current_repetition_key.clone();
        let before_repetition_counts = engine.repetition_counts.clone();
        let before_repetition_white_kingside = engine.white_can_castle_kingside;
        let before_repetition_white_queenside = engine.white_can_castle_queenside;
        let before_repetition_black_kingside = engine.black_can_castle_kingside;
        let before_repetition_black_queenside = engine.black_can_castle_queenside;

        let undo = engine
            .simulate_action_for_search(player, &action)
            .expect("legal castling move should simulate");

        assert!(!engine.white_can_castle_kingside);

        engine.undo_action_for_search(undo);

        assert_eq!(engine.to_fen(), before_fen);
        assert_eq!(engine.turn_manager.current_player, before_turn_manager.current_player);
        assert_eq!(engine.current_repetition_key, before_repetition_key);
        assert_eq!(engine.repetition_counts, before_repetition_counts);
        assert_eq!(
            engine.white_can_castle_kingside,
            before_repetition_white_kingside,
        );
        assert_eq!(
            engine.white_can_castle_queenside,
            before_repetition_white_queenside,
        );
        assert_eq!(
            engine.black_can_castle_kingside,
            before_repetition_black_kingside,
        );
        assert_eq!(
            engine.black_can_castle_queenside,
            before_repetition_black_queenside,
        );
    }

    #[test]
    fn cached_repetition_key_matches_fen_shape() {
        let engine = load_engine_from_ruleset(&minimal_runtime_ruleset());
        assert_eq!(engine.current_repetition_key, engine.compute_position_hash());
    }

    #[test]
    fn castling_white_kingside_legal() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1").expect("valid FEN");
        assert!(has_legal_move(&engine, "e1", "g1"));
    }

    #[test]
    fn castling_white_queenside_legal() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1").expect("valid FEN");
        assert!(has_legal_move(&engine, "e1", "c1"));
    }

    #[test]
    fn castling_kingside_classical() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1").expect("valid FEN");
        assert!(has_legal_move(&engine, "e1", "g1"));
    }

    #[test]
    fn castling_queenside_classical() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1").expect("valid FEN");
        assert!(has_legal_move(&engine, "e1", "c1"));
    }

    #[test]
    fn castling_blocked() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/8/R2QKB1R w KQ - 0 1").expect("valid FEN");
        assert!(!has_legal_move(&engine, "e1", "g1"));
        assert!(!has_legal_move(&engine, "e1", "c1"));
    }

    #[test]
    fn castling_through_check() {
        let engine = engine_from_fen("4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1").expect("valid FEN");
        assert!(!has_legal_move(&engine, "e1", "g1"));
    }

    #[test]
    fn castling_black_kingside_legal() {
        let engine = engine_from_fen("r3k2r/8/8/8/8/8/8/4K3 b kq - 0 1").expect("valid FEN");
        assert!(has_legal_move(&engine, "e8", "g8"));
    }

    #[test]
    fn castling_black_queenside_legal() {
        let engine = engine_from_fen("r3k2r/8/8/8/8/8/8/4K3 b kq - 0 1").expect("valid FEN");
        assert!(has_legal_move(&engine, "e8", "c8"));
    }

    #[test]
    fn castling_illegal_if_king_moved() {
        let mut engine = engine_from_fen("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1").expect("valid FEN");
        play_move(&mut engine, 1, "e1", "e2");
        play_move(&mut engine, 2, "e8", "e7");
        play_move(&mut engine, 1, "e2", "e1");
        play_move(&mut engine, 2, "e7", "e8");

        assert!(!has_legal_move(&engine, "e1", "g1"));
        assert!(!has_legal_move(&engine, "e1", "c1"));
    }

    #[test]
    fn castling_illegal_if_rook_moved() {
        let mut engine = engine_from_fen("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1").expect("valid FEN");
        play_move(&mut engine, 1, "h1", "h2");
        play_move(&mut engine, 2, "e8", "e7");
        play_move(&mut engine, 1, "h2", "h1");
        play_move(&mut engine, 2, "e7", "e8");

        assert!(!has_legal_move(&engine, "e1", "g1"));
        assert!(has_legal_move(&engine, "e1", "c1"));
    }

    #[test]
    fn castling_illegal_through_check() {
        let engine = engine_from_fen("4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1").expect("valid FEN");
        assert!(!has_legal_move(&engine, "e1", "g1"));
    }

    #[test]
    fn castling_illegal_out_of_check() {
        let engine = engine_from_fen("k3r3/8/8/8/8/8/8/R3K2R w KQ - 0 1").expect("valid FEN");
        assert!(!has_legal_move(&engine, "e1", "g1"));
        assert!(!has_legal_move(&engine, "e1", "c1"));
    }

    #[test]
    fn castling_illegal_if_path_occupied() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/8/R2QKB1R w KQ - 0 1").expect("valid FEN");
        assert!(!has_legal_move(&engine, "e1", "g1"));
        assert!(!has_legal_move(&engine, "e1", "c1"));
    }

    #[test]
    fn castling_execution_updates_fen_rights_for_rook_move() {
        let mut engine =
            engine_from_fen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1").expect("valid FEN");
        play_move(&mut engine, 1, "h1", "h2");
        assert_eq!(engine.to_fen(), "r3k2r/8/8/8/8/8/7R/R3K3 b Qkq - 1 1");
    }

    #[test]
    fn castling_execution_updates_fen_rights_for_king_move() {
        let mut engine =
            engine_from_fen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1").expect("valid FEN");
        play_move(&mut engine, 1, "e1", "e2");
        assert_eq!(engine.to_fen(), "r3k2r/8/8/8/8/8/4K3/R6R b kq - 1 1");
    }

    #[test]
    fn execute_populates_repetition_counts_for_oscillating_moves() {
        // Minimal position: two kings and two knights.
        // Four half-moves return both knights home, so the starting position is visited twice.
        let fen = "4k2n/8/8/8/8/8/8/4K2N w - - 0 1";
        let mut engine = engine_from_fen(fen).expect("valid FEN for repetition history test");
        let initial_hash = engine.current_repetition_key;

        assert_eq!(
            engine.repetition_counts.get(&initial_hash).copied().unwrap_or(0),
            1,
            "engine_from_fen must seed the initial position with count=1"
        );

        for uci in &["h1g3", "h8g6", "g3h1", "g6h8"] {
            let player = engine.turn_manager.current_player;
            let action = action_for_uci(&engine, player, uci);
            engine.execute(Command { player_id: player, action });
        }

        assert_eq!(
            engine.current_repetition_key,
            initial_hash,
            "engine must return to the initial position after 4-ply knight oscillation"
        );
        assert_eq!(
            engine.repetition_counts.get(&initial_hash).copied().unwrap_or(0),
            2,
            "initial position must be counted twice after the knights oscillate back home"
        );
    }
}
