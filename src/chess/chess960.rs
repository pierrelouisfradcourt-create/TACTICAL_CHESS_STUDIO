use std::collections::HashSet;

const DARK_FILES: [usize; 4] = [0, 2, 4, 6];
const LIGHT_FILES: [usize; 4] = [1, 3, 5, 7];

pub fn generate_start_position(id: u16) -> Option<[u8; 8]> {
    if id >= 960 {
        return None;
    }

    let bishops_key = usize::from(id / 60);
    let mut remainder = usize::from(id % 60);

    let mut rank = [b' '; 8];

    let dark_bishop = DARK_FILES[bishops_key / 4];
    let light_bishop = LIGHT_FILES[bishops_key % 4];

    rank[dark_bishop] = b'B';
    rank[light_bishop] = b'B';

    let mut free: Vec<usize> = (0..8)
        .filter(|file| *file != dark_bishop && *file != light_bishop)
        .collect();
    free.sort_unstable();

    let mut king_rook_options: Vec<[usize; 3]> = Vec::with_capacity(20);

    for king_idx in 1..free.len() - 1 {
        for rook_left_idx in 0..king_idx {
            for rook_right_idx in (king_idx + 1)..free.len() {
                king_rook_options.push([free[rook_left_idx], free[king_idx], free[rook_right_idx]]);
            }
        }
    }

    let king_rook_choice = remainder / 3;
    remainder %= 3;

    let [queen_left_rook, king_file, queen_right_rook] = king_rook_options[king_rook_choice];
    rank[queen_left_rook] = b'R';
    rank[king_file] = b'K';
    rank[queen_right_rook] = b'R';

    let mut remaining_for_queen_and_knights: Vec<usize> = free
        .into_iter()
        .filter(|file| *file != queen_left_rook && *file != king_file && *file != queen_right_rook)
        .collect();

    remaining_for_queen_and_knights.sort_unstable();
    rank[remaining_for_queen_and_knights[remainder]] = b'Q';
    for file in remaining_for_queen_and_knights {
        if rank[file] == b' ' {
            rank[file] = b'N';
        }
    }

    Some(rank)
}

pub fn mirror_black_backrank_if_needed(white_back_rank: &[u8; 8], mirror: bool) -> [u8; 8] {
    let mut black_back_rank = *white_back_rank;
    if mirror {
        black_back_rank.reverse();
    }
    black_back_rank
}

pub fn bishops_on_opposite_colors(back_rank: &[u8; 8]) -> bool {
    let bishop_files: Vec<usize> = back_rank
        .iter()
        .enumerate()
        .filter_map(|(file, piece)| (*piece == b'B').then_some(file))
        .collect();

    if bishop_files.len() != 2 {
        return false;
    }

    bishop_files[0] % 2 != bishop_files[1] % 2
}

pub fn king_between_rooks(back_rank: &[u8; 8]) -> bool {
    let king = back_rank.iter().position(|piece| *piece == b'K');
    let rooks: Vec<usize> = back_rank
        .iter()
        .enumerate()
        .filter_map(|(file, piece)| (*piece == b'R').then_some(file))
        .collect();

    if king.is_none() || rooks.len() != 2 {
        return false;
    }

    let king = king.unwrap_or_default();
    (rooks[0] < king && king < rooks[1]) || (rooks[1] < king && king < rooks[0])
}

pub fn validate_backrank(back_rank: &[u8; 8]) -> bool {
    if back_rank.iter().filter(|piece| **piece == b'K').count() != 1 {
        return false;
    }

    if back_rank.iter().filter(|piece| **piece == b'Q').count() != 1 {
        return false;
    }

    if back_rank.iter().filter(|piece| **piece == b'R').count() != 2 {
        return false;
    }

    if back_rank.iter().filter(|piece| **piece == b'N').count() != 2 {
        return false;
    }

    if back_rank.iter().filter(|piece| **piece == b'B').count() != 2 {
        return false;
    }

    if back_rank
        .iter()
        .filter(|piece| {
            **piece != b' '
                && **piece != b'K'
                && **piece != b'Q'
                && **piece != b'R'
                && **piece != b'N'
                && **piece != b'B'
        })
        .count()
        != 0
    {
        return false;
    }

    bishops_on_opposite_colors(back_rank) && king_between_rooks(back_rank)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chess960_generator_produces_960_unique_valid_backranks() {
        let mut seen = HashSet::with_capacity(960);

        for id in 0..960 {
            let rank = generate_start_position(id).expect("valid position id");
            assert!(validate_backrank(&rank), "invalid arrangement for id={id}");
            assert!(
                seen.insert(rank.to_vec()),
                "duplicate arrangement for id={id}"
            );
        }

        assert_eq!(seen.len(), 960);
    }

    #[test]
    fn chess960_bishops_are_on_opposite_colors() {
        for id in 0..960 {
            let rank = generate_start_position(id).expect("valid position id");
            assert!(
                bishops_on_opposite_colors(&rank),
                "bishops not opposite colors for id={id}"
            );
        }
    }

    #[test]
    fn chess960_king_is_between_rooks() {
        for id in 0..960 {
            let rank = generate_start_position(id).expect("valid position id");
            assert!(
                king_between_rooks(&rank),
                "king not between rooks for id={id}"
            );
        }
    }

    #[test]
    fn black_back_rank_mirroring_keeps_piece_multiset() {
        let white = generate_start_position(0).expect("valid position id");
        let black = mirror_black_backrank_if_needed(&white, true);
        let mut white_counts = [0u8; 256];
        let mut black_counts = [0u8; 256];

        for piece in white {
            white_counts[piece as usize] += 1;
        }
        for piece in black {
            black_counts[piece as usize] += 1;
        }

        for byte in 0..=255 {
            assert_eq!(
                white_counts[byte], black_counts[byte],
                "piece multiset mismatch for byte={byte}"
            );
        }
    }

    #[test]
    fn chess960_rejects_out_of_range_ids() {
        for id in [960u16, 961u16, u16::MAX] {
            assert!(
                generate_start_position(id).is_none(),
                "id={id} should be rejected"
            );
        }
    }

    #[test]
    fn chess960_representative_ids_are_stable() {
        let cases = [
            (0u16, *b"BBRKRQNN"),
            (1u16, *b"BBRKRNQN"),
            (2u16, *b"BBRKRNNQ"),
        ];

        for (id, expected) in cases {
            let rank = generate_start_position(id).expect("valid position id");
            assert_eq!(rank, expected, "unexpected arrangement for id={id}");
        }
    }

    #[test]
    fn black_back_rank_mirroring_matches_reverse_mapping() {
        let white = generate_start_position(0).expect("valid position id");
        let mirrored = mirror_black_backrank_if_needed(&white, true);
        let not_mirrored = mirror_black_backrank_if_needed(&white, false);

        let mut expected = white;
        expected.reverse();

        assert_eq!(not_mirrored, white);
        assert_eq!(mirrored, expected);
    }
}
