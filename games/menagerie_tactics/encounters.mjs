// encounters.mjs — templates de rencontres du slice (module JS pour portabilité
// Node + navigateur, plutôt qu'un import JSON à attributs). Chaque template :
// { tier, objective, enemies:[speciesId...] }. Consommé par level.generateEncounter.
export const ENCOUNTERS = {
  rout_t1: { tier: 1, objective: { kind: "rout" }, enemies: ["roncier", "givrette", "roncier"] },
  capture_t1: { tier: 1, objective: { kind: "capture" }, enemies: ["roncier", "givrette", "roncier"] },
  survive_t1: { tier: 1, objective: { kind: "survive", turns: 5 }, enemies: ["roncier", "givrette", "roncier"] },
  boss_t2: { tier: 2, objective: { kind: "rout" }, enemies: ["givrette", "roncier", "roncier"] },
};
