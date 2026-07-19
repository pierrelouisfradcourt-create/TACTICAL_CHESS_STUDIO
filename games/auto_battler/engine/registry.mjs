// registry.mjs - Frozen event and input kind registries
import { isEvent, isInput } from './types.mjs';

// 19 event kinds (frozen)
const _EVENT_KINDS = [
  'Spawn',
  'Move',
  'Attack',
  'Cast',
  'Damage',
  'Death',
  'Victory',
  'Heal',
  'Shield',
  'Buff',
  'Debuff',
  'MergeTriggered',
  'MergeResolved',
  'PairingResolved',
  'GoldChanged',
  'ShopRolled',
  'UnitBought',
  'UnitSold',
  'PlayerLevelUp'
];

// 7 input kinds (frozen)
const _INPUT_KINDS = [
  'Buy',
  'Sell',
  'Reroll',
  'Lock',
  'LevelUp',
  'Place',
  'ConfirmPreparation'
];

export const EVENT_KINDS = Object.freeze([..._EVENT_KINDS]);
export const INPUT_KINDS = Object.freeze([..._INPUT_KINDS]);

export function isKnownEvent(kind) {
  return EVENT_KINDS.includes(kind);
}

export function assertKnownEvent(kind) {
  if (!isKnownEvent(kind)) {
    throw new Error(`Unknown event kind: ${kind}`);
  }
}

export function isKnownInput(kind) {
  return INPUT_KINDS.includes(kind);
}

export function assertKnownInput(kind) {
  if (!isKnownInput(kind)) {
    throw new Error(`Unknown input kind: ${kind}`);
  }
}
