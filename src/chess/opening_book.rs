use crate::chess::fen::engine_to_fen;
use crate::chess::uci::action_to_uci;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::PlayerId;

// (piece_placement + " " + side_to_move) → UCI move
// Ruy Lopez main line (1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.0-0 Be7 6.Re1 b5 7.Bb3 d6 8.c3)
// plus common alternatives at move 1
const BOOK: &[(&str, &str)] = &[
    // --- White ---
    // Move 1: e4
    ("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w", "e2e4"),
    // Move 2: Nf3 after 1...e5
    ("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w", "g1f3"),
    // Move 2: Nf3 after 1...c5 (Sicilian)
    ("rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w", "g1f3"),
    // Move 2: d4 after 1...e6 (French)
    ("rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w", "d2d4"),
    // Move 2: d4 after 1...c6 (Caro-Kann)
    ("rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w", "d2d4"),
    // Move 2: exd5 after 1...d5 (Scandinavian exchange)
    ("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w", "e4d5"),
    // Move 3: Bb5 (Ruy Lopez) after 2...Nc6
    ("r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w", "f1b5"),
    // Move 4: Ba4 after 3...a6
    ("r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w", "b5a4"),
    // Move 5: O-O after 4...Nf6
    ("r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w", "e1g1"),
    // Move 6: Re1 after 5...Be7
    ("r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 w", "f1e1"),
    // Move 7: Bb3 after 6...b5
    ("r1bqk2r/2ppbppp/p1n2n2/1p2p3/B3P3/5N2/PPPP1PPP/RNBQR1K1 w", "a4b3"),
    // Move 8: c3 after 7...d6
    ("r1bqk2r/2p1bppp/p1np1n2/1p2p3/4P3/1B3N2/PPPP1PPP/RNBQR1K1 w", "c2c3"),
    // Move 9: h3 after 8...O-O
    ("r1bq1rk1/2p1bppp/p1np1n2/1p2p3/4P3/1BP2N2/PP1P1PPP/RNBQR1K1 w", "h2h3"),
    // --- Black ---
    // Move 1: e5 after 1.e4
    ("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b", "e7e5"),
    // Move 1: d5 after 1.d4 (Queen's Gambit)
    ("rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b", "d7d5"),
    // Move 1: Nf6 after 1.d4 (Nimzo/KID) — shadowed by d7d5 above with current find() logic
    ("rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b", "g8f6"),
    // Move 2: g6 after 1.d4 Nf6 2.c4 (KID)
    ("rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b", "g7g6"),
    // Move 2: e6 after 1.d4 Nf6 2.c4 (Nimzo) — shadowed by g7g6 above with current find() logic
    ("rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b", "e7e6"),
    // Move 2: Nc6 after 2.Nf3
    ("rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b", "b8c6"),
    // Move 3: a6 after 3.Bb5
    ("r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b", "a7a6"),
    // Move 4: Nf6 after 4.Ba4
    ("r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R b", "g8f6"),
    // Move 5: Be7 after 5.O-O
    ("r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 b", "f8e7"),
    // Move 6: b5 after 6.Re1
    ("r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQR1K1 b", "b7b5"),
    // Move 7: d6 after 7.Bb3
    ("r1bqk2r/2ppbppp/p1n2n2/1p2p3/4P3/1B3N2/PPPP1PPP/RNBQR1K1 b", "d7d6"),
    // Move 8: O-O after 8.c3
    ("r1bqk2r/2p1bppp/p1np1n2/1p2p3/4P3/1BP2N2/PP1P1PPP/RNBQR1K1 b", "e8g8"),
    // Move 9: Na5 after 9.h3
    ("r1bq1rk1/2p1bppp/p1np1n2/1p2p3/4P3/1BP2N1P/PP1P1PP1/RNBQR1K1 b", "c6a5"),
];

fn position_key(engine: &Engine) -> String {
    let fen = engine_to_fen(engine);
    let mut it = fen.splitn(3, ' ');
    let board = it.next().unwrap_or("");
    let side = it.next().unwrap_or("");
    format!("{board} {side}")
}

pub fn probe_opening_book(engine: &Engine, player: PlayerId) -> Option<Action> {
    let key = position_key(engine);
    let uci = BOOK.iter().find(|(pos, _)| *pos == key)?.1;
    engine
        .legal_actions(player)
        .into_iter()
        .find(|action| action_to_uci(action, &engine.units).as_deref() == Some(uci))
}
