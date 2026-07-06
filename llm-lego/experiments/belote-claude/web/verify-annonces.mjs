// Vérification du barème des annonces (suites/carrés) sur des mains fabriquées.
// Usage : node web/verify-annonces.mjs
import { card } from "../src/cards.mjs";
import { detectAnnonces, resolveAnnonces, compareAnnonce, annonceLabel } from "../src/annonces.mjs";

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name); } }
const C = (r, s) => card(r, s);
const has = (list, pred) => list.some(pred);
const total = (list) => list.reduce((n, a) => n + a.points, 0);

console.log("=== Détection ===");
// Tierce (V-10-9 coeur)
let a = detectAnnonces([C("V", "coeur"), C("10", "coeur"), C("9", "coeur"), C("A", "pique")], "trefle");
check("tierce V-10-9 = 20, top V", has(a, (x) => x.type === "tierce" && x.points === 20 && x.top.rank === "V"));

// Cinquante (V-10-9-8 coeur)
a = detectAnnonces([C("V", "coeur"), C("10", "coeur"), C("9", "coeur"), C("8", "coeur")], "trefle");
check("cinquante V-10-9-8 = 50", has(a, (x) => x.type === "cinquante" && x.points === 50));
check("cinquante n'ajoute PAS aussi une tierce", a.filter((x) => x.kind === "suite").length === 1);

// Cent (A-R-D-V-10 pique)
a = detectAnnonces([C("A", "pique"), C("R", "pique"), C("D", "pique"), C("V", "pique"), C("10", "pique")], "coeur");
check("cent A-R-D-V-10 = 100", has(a, (x) => x.type === "cent" && x.points === 100));

// Trou dans la suite : R-D + 10 (pas de V) → pas de tierce
a = detectAnnonces([C("R", "pique"), C("D", "pique"), C("10", "pique")], "coeur");
check("R-D-10 (trou) → aucune suite", a.filter((x) => x.kind === "suite").length === 0);

// Carré de valets = 200
a = detectAnnonces([C("V", "pique"), C("V", "coeur"), C("V", "carreau"), C("V", "trefle")], "coeur");
check("carré de valets = 200", has(a, (x) => x.kind === "carre" && x.points === 200));

// Carré de 8 = nul
a = detectAnnonces([C("8", "pique"), C("8", "coeur"), C("8", "carreau"), C("8", "trefle")], "coeur");
check("carré de 8 = aucune annonce", a.length === 0);

console.log("=== Comparaison ===");
const carre9 = detectAnnonces([C("9", "pique"), C("9", "coeur"), C("9", "carreau"), C("9", "trefle")], "coeur")[0];
const cent = detectAnnonces([C("A", "pique"), C("R", "pique"), C("D", "pique"), C("V", "pique"), C("10", "pique")], "coeur")[0];
const carreAs = detectAnnonces([C("A", "pique"), C("A", "coeur"), C("A", "carreau"), C("A", "trefle")], "coeur")[0];
check("carré de 9 (150) > cent (100)", compareAnnonce(carre9, cent) > 0);
check("carré d'As (100) > cent (100) à points égaux", compareAnnonce(carreAs, cent) > 0);

const tierceRoiP = detectAnnonces([C("R", "pique"), C("D", "pique"), C("V", "pique")], "coeur")[0];
const tierceRoiCa = detectAnnonces([C("R", "carreau"), C("D", "carreau"), C("V", "carreau")], "coeur")[0];
check("deux tierces au Roi (couleurs différentes, hors atout) = égalité parfaite", compareAnnonce(tierceRoiP, tierceRoiCa) === 0);
const tierceRoiCoeur = detectAnnonces([C("R", "coeur"), C("D", "coeur"), C("V", "coeur")], "coeur")[0];
check("tierce au Roi À ATOUT > même tierce hors atout", compareAnnonce(tierceRoiCoeur, tierceRoiP) > 0);

console.log("=== Résolution (équipe gagnante marque tout) ===");
// p0 (éq A) : carré de valets (200) + tierce 9-8-7 coeur (20). p2 (éq A) : rien.
// p1 (éq B) : cent pique (100). NB : la tierce évite le 10 pour ne pas fusionner avec le
// valet du carré (une carte peut compter dans une suite ET un carré → sinon cinquante).
const hands = [
  [C("V", "pique"), C("V", "coeur"), C("V", "carreau"), C("V", "trefle"), C("7", "coeur"), C("8", "coeur"), C("9", "coeur"), C("A", "trefle")],
  [C("A", "pique"), C("R", "pique"), C("D", "pique"), C("10", "pique"), C("9", "pique"), C("8", "trefle"), C("7", "carreau"), C("8", "coeur")],
  [C("A", "trefle"), C("10", "trefle"), C("8", "pique"), C("7", "coeur"), C("9", "carreau"), C("D", "carreau"), C("8", "carreau"), C("R", "carreau")],
  [C("A", "carreau"), C("10", "coeur"), C("9", "trefle"), C("7", "pique"), C("8", "pique"), C("9", "coeur"), C("D", "trefle"), C("V", "coeur")],
];
const r = resolveAnnonces(hands, "trefle", 0);
check("équipe A (carré de valets) gagne l'annonce", r.winnerTeam === 0);
check("équipe A marque 200 + 20 = 220", r.bonus[0] === 220 && r.bonus[1] === 0);
check("meilleure annonce = carré de valets", annonceLabel(r.best) === "Carré de Valets");

// Annulation : tierce au Roi identique (hors atout) sur équipes adverses ; atout = coeur
// pour qu'aucune des deux tierces (pique / carreau) ne soit à l'atout.
const tie = [
  [C("R", "pique"), C("D", "pique"), C("V", "pique"), C("7", "coeur"), C("8", "trefle"), C("10", "carreau"), C("A", "trefle"), C("9", "coeur")],
  [C("R", "carreau"), C("D", "carreau"), C("V", "carreau"), C("7", "trefle"), C("9", "pique"), C("10", "coeur"), C("A", "pique"), C("8", "coeur")],
  [C("A", "coeur"), C("R", "coeur"), C("7", "carreau"), C("8", "pique"), C("9", "trefle"), C("10", "trefle"), C("D", "trefle"), C("7", "pique")],
  [C("10", "pique"), C("8", "coeur"), C("9", "carreau"), C("A", "trefle"), C("7", "trefle"), C("D", "pique"), C("R", "trefle"), C("8", "pique")],
];
const r2 = resolveAnnonces(tie, "coeur", 0);
check("égalité parfaite adverse → annulée (0/0)", r2.annule === true && r2.bonus[0] === 0 && r2.bonus[1] === 0);

console.log(`\n${fail === 0 ? "RESULT: PASS" : "RESULT: FAIL"} — ${pass} ok, ${fail} ko`);
process.exit(fail === 0 ? 0 : 1);
