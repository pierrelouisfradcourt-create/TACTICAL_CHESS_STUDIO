use crate::engine::entity::unit::{PlayerId, Position};

#[derive(Clone, Copy, Debug)]
pub struct CastlingSideSpec {
    pub king_start: Position,
    pub rook_start: Position,
    pub king_final: Position,
    pub rook_final: Position,
}

impl CastlingSideSpec {
    pub const fn is_kingside(self) -> bool {
        self.king_final.x > self.king_start.x
    }

    pub const fn empty_squares(self) -> &'static [u32] {
        if self.is_kingside() {
            &[5, 6]
        } else {
            &[1, 2, 3]
        }
    }

    pub const fn attacked_squares(self) -> &'static [u32] {
        if self.is_kingside() {
            &[5, 6]
        } else {
            &[3, 2]
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct CastlingSpec {
    pub white_kingside: Option<CastlingSideSpec>,
    pub white_queenside: Option<CastlingSideSpec>,
    pub black_kingside: Option<CastlingSideSpec>,
    pub black_queenside: Option<CastlingSideSpec>,
}

impl CastlingSpec {
    pub fn classical() -> Self {
        Self {
            white_kingside: Some(CastlingSideSpec {
                king_start: Position { x: 4, y: 0 },
                rook_start: Position { x: 7, y: 0 },
                king_final: Position { x: 6, y: 0 },
                rook_final: Position { x: 5, y: 0 },
            }),
            white_queenside: Some(CastlingSideSpec {
                king_start: Position { x: 4, y: 0 },
                rook_start: Position { x: 0, y: 0 },
                king_final: Position { x: 2, y: 0 },
                rook_final: Position { x: 3, y: 0 },
            }),
            black_kingside: Some(CastlingSideSpec {
                king_start: Position { x: 4, y: 7 },
                rook_start: Position { x: 7, y: 7 },
                king_final: Position { x: 6, y: 7 },
                rook_final: Position { x: 5, y: 7 },
            }),
            black_queenside: Some(CastlingSideSpec {
                king_start: Position { x: 4, y: 7 },
                rook_start: Position { x: 0, y: 7 },
                king_final: Position { x: 2, y: 7 },
                rook_final: Position { x: 3, y: 7 },
            }),
        }
    }

    pub const fn for_player(self, player: PlayerId) -> [Option<CastlingSideSpec>; 2] {
        if player == 1 {
            [self.white_kingside, self.white_queenside]
        } else {
            [self.black_kingside, self.black_queenside]
        }
    }

    pub fn for_king_move(
        self,
        player: PlayerId,
        from: Position,
        target: Position,
    ) -> Option<CastlingSideSpec> {
        self.for_player(player)
            .into_iter()
            .flatten()
            .find(|spec| spec.king_start == from && spec.king_final == target)
    }
}
