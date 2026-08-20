#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ChessVariant {
    Standard,
    Chess960 { id: u16 },
}

impl ChessVariant {
    pub const fn as_u16(self) -> Option<u16> {
        match self {
            Self::Standard => None,
            Self::Chess960 { id } => Some(id),
        }
    }
}
