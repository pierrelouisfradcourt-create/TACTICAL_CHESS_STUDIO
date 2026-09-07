// Progression: gates, milestones, victory detection
import { CONSTANTS } from './state.mjs';

const MILESTONES = [
  { threshold_mR: CONSTANTS.THRESHOLD_S1_MR, gate_id: 'g2', title: 'Unlock G2' },
  { threshold_mR: CONSTANTS.THRESHOLD_S2_MR, gate_id: 'g3', title: 'Unlock G3' },
  { threshold_mR: CONSTANTS.THRESHOLD_S3_MR, gate_id: 'g4', title: 'Unlock G4' },
  { threshold_mR: CONSTANTS.THRESHOLD_S4_MR, gate_id: 'prod_upgrades_panel', title: 'Unlock Upgrades' },
  { threshold_mR: CONSTANTS.THRESHOLD_S5_MR, gate_id: 'victory', title: 'Victory!' },
];

class ProgressionState {
  constructor() {
    this.unlocked_gates = new Set(['core_clicker']); // core always unlocked
    this.last_milestone_reached = -1; // 0-indexed into MILESTONES
    this.victory_reached = false;
  }

  // R8: Update unlocks based on cumul_mR
  // Returns list of newly unlocked gates
  updateUnlocks(cumul_mR) {
    const newly_unlocked = [];

    for (let i = this.last_milestone_reached + 1; i < MILESTONES.length; i++) {
      if (cumul_mR >= MILESTONES[i].threshold_mR) {
        this.unlocked_gates.add(MILESTONES[i].gate_id);
        newly_unlocked.push(MILESTONES[i].gate_id);
        this.last_milestone_reached = i;

        if (i === MILESTONES.length - 1) {
          this.victory_reached = true;
        }
      } else {
        break; // thresholds are sequential
      }
    }

    return newly_unlocked;
  }

  // R9: Goal text (evolves at each milestone)
  getGoalText() {
    if (this.last_milestone_reached === -1) {
      return 'Accumulate 100 R to unlock G2.';
    }
    if (this.last_milestone_reached === 0) {
      return 'Accumulate 1,000 R to unlock G3.';
    }
    if (this.last_milestone_reached === 1) {
      return 'Accumulate 12,000 R to unlock G4.';
    }
    if (this.last_milestone_reached === 2) {
      return 'Accumulate 150,000 R to unlock upgrades.';
    }
    if (this.last_milestone_reached === 3) {
      return 'Accumulate 1,000,000 R to win!';
    }
    return 'Victory!';
  }

  // R10: Check victory (S5)
  checkVictory() {
    return this.victory_reached;
  }

  // R11: Defeat is unreachable (invariant)
  isDefeatReachable() {
    return false; // never true in this genre
  }

  // Check if a gate is unlocked
  isGateUnlocked(gate_id) {
    return this.unlocked_gates.has(gate_id);
  }

  // R12: Reset for new game
  reset() {
    this.unlocked_gates = new Set(['core_clicker']);
    this.last_milestone_reached = -1;
    this.victory_reached = false;
  }

  // Snapshot for trajectory tracking
  snapshot() {
    return {
      unlocked_gates: new Set(this.unlocked_gates),
      last_milestone_reached: this.last_milestone_reached,
      victory_reached: this.victory_reached,
    };
  }

  restore(snap) {
    this.unlocked_gates = new Set(snap.unlocked_gates);
    this.last_milestone_reached = snap.last_milestone_reached;
    this.victory_reached = snap.victory_reached;
  }
}

export { ProgressionState, MILESTONES };
