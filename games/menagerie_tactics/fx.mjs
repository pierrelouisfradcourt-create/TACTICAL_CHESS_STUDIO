// fx.mjs — effets visuels PURS dérivés de la DIFFÉRENCE entre deux view() : chiffres
// de dégâts flottants + mini-journal. Aucun DOM, aucun rAF, aucun this.log dans le
// moteur. Advisory-only : jamais ajouté à view() ni à un champ déterministe.
export const FLOAT_TTL = 900; // ms de vie d'un chiffre flottant
export const JOURNAL_MAX = 8;

export function makeFxState() {
  return { floats: [], journal: [], nextId: 1 };
}

function pushJournal(fx, text) {
  fx.journal.push(text);
  while (fx.journal.length > JOURNAL_MAX) {
    fx.journal.shift();
  }
}

function label(b) {
  return b.speciesId || ("bête " + b.id);
}

// Compare prevView -> nextView et enregistre les effets. Mute fx, retourne les events.
export function recordDiff(fx, prevView, nextView, now) {
  const events = [];
  const prevById = new Map();
  for (const b of prevView.beasts) {
    prevById.set(b.id, b);
  }
  for (const b of nextView.beasts) {
    const p = prevById.get(b.id);
    if (!p) {
      continue;
    }
    if (b.hp < p.hp) {
      const dmg = p.hp - b.hp;
      fx.floats.push({ id: fx.nextId, text: "-" + dmg, x: b.x, y: b.y, bornAt: now });
      fx.nextId += 1;
      pushJournal(fx, label(b) + " subit " + dmg);
      events.push({ kind: "damage", id: b.id, dmg });
    }
    if (p.active === true && b.active === false) {
      pushJournal(fx, label(b) + " K.O.");
      events.push({ kind: "ko", id: b.id });
    }
  }
  if (nextView.captures > prevView.captures) {
    pushJournal(fx, "Capture !");
    events.push({ kind: "capture" });
  }
  return events;
}

// Retire les chiffres flottants expirés (âge > TTL ; âge == TTL conservé).
export function stepFx(fx, now) {
  fx.floats = fx.floats.filter((f) => now - f.bornAt <= FLOAT_TTL);
  return fx.floats;
}
