// Valeurs de travail v0 — HumanGate 2026-07-19 (games/auto_battler/bibles/HUMANGATE_2026-07-19_VALUES_V0.md).
// PROVISOIRE : calibrable par Balance Bible dès les premières simulations (P7). Aucun claim de justesse.
// Non importé par engine-core (P11, content-agnostic) — réservé aux incréments Preparation/Combat futurs.

export const BOARD_WIDTH = 8;
export const BOARD_HEIGHT = 8;
export const BOARD_ORIENTATION = "mirror"; // chaque Player occupe une moitié symétrique de la grille

export const MANA_FALLOFF_AFTER_CAST = "zero"; // le Mana retombe entièrement à zéro après un Cast (QB-11)

export const TICK_LIMIT = 50; // v0 provisoire — calcul sourcé TFT (40s max / ~0.8s par Tick), cf. gate verbatim
