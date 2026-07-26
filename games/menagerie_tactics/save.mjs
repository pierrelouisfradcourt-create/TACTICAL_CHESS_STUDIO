// save.mjs — SEUL point de contact avec localStorage. Tout le reste de la méta est
// pur. Storage INJECTABLE (les tests passent un faux storage, zéro dépendance).
export const SAVE_KEY = "menagerie.tactics.save";
export const SCHEMA_VERSION = 1;

export function defaultSave() {
  return { schema_version: SCHEMA_VERSION, roster: [], reserve: [], regionsDone: 0, nextUid: 1 };
}

export function isValidSave(obj) {
  return Boolean(obj)
    && typeof obj === "object"
    && obj.schema_version === SCHEMA_VERSION
    && Array.isArray(obj.roster)
    && Array.isArray(obj.reserve)
    && typeof obj.regionsDone === "number"
    && typeof obj.nextUid === "number";
}

// Charge la sauvegarde ; tout échec (absente, JSON corrompu, mauvaise version) =>
// sauvegarde neuve (jamais d'exception propagée, jamais de save invalide).
export function loadSave(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) {
      return defaultSave();
    }
    const data = JSON.parse(raw);
    return isValidSave(data) ? data : defaultSave();
  } catch {
    return defaultSave();
  }
}

// Persiste ; retourne false si quota/échec (jamais d'exception propagée).
export function persistSave(save, storage = globalThis.localStorage) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
