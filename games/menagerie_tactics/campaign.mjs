// campaign.mjs — carte de campagne (1 région, ~6 nœuds) + progression de run. Couche
// AU-DESSUS du moteur : réutilise generateEncounter (level.mjs) et les objectifs
// (objectives.mjs). Le roster/collection vit dans meta.mjs/save.mjs (pas dupliqué).
import { ENCOUNTERS } from "./encounters.mjs";
import { generateEncounter } from "./level.mjs";

const MAP = {
  startId: "n1",
  bossId: "n6",
  nodes: [
    { id: "n1", kind: "battle", encounterId: "capture_t1", next: ["n2"] },
    { id: "n2", kind: "battle", encounterId: "rout_t1", next: ["n3"] },
    { id: "n3", kind: "rest", next: ["n4"] },
    { id: "n4", kind: "battle", encounterId: "survive_t1", next: ["n5"] },
    { id: "n5", kind: "battle", encounterId: "rout_t1", next: ["n6"] },
    { id: "n6", kind: "boss", encounterId: "boss_t2", next: [] },
  ],
};

export function campaignMap() {
  return MAP;
}

export function nodeById(id) {
  for (const n of MAP.nodes) {
    if (n.id === id) {
      return n;
    }
  }
  return null;
}

export function isBoss(id) {
  return id === MAP.bossId;
}

export function createRun(seed) {
  return { seed, position: MAP.startId, complete: false, step: 0 };
}

// Avance au nœud suivant. Franchir le nœud boss marque la région complète.
export function advanceRun(run) {
  const node = nodeById(run.position);
  const nextId = node.next.length > 0 ? node.next[0] : run.position;
  return { seed: run.seed, position: nextId, complete: isBoss(run.position), step: run.step + 1 };
}

// Charge la rencontre d'un nœud (setup + objective). Le seed varie par étape pour que
// deux nœuds du même template ne soient pas identiques.
export function startEncounter(encounterId, seed) {
  return generateEncounter(ENCOUNTERS[encounterId], seed);
}
