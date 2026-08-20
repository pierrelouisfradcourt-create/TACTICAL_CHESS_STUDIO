# INPUT

## Input Type

Single FEN passed to the `observe_fen` CLI command.

## FEN

```text
6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1
```

## Ruleset

Classical chess-style FEN parsed by the repository's existing `engine_from_fen` path.

## Depth / Budget

```text
--depth 1
```

The CLI applies this as `TCS_MINIMAX_DEPTH=1` during the search.

## Side To Move

```text
w
```

## Why This Input Was Chosen

This input is small, legal, and already appears in local search tests as a controlled root-position FEN. It keeps the trace bounded while still allowing legal moves, candidate scoring, root decision output, and runtime/search context to appear.

## Chess960 Boundary

The input is small, legal, and non-Chess960. Chess960 was not activated.
