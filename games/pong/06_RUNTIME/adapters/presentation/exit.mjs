// PONG — adaptateur SORTIE (ADAPTATEUR, jamais importe par la logique).
// game.exit : quitter proprement. Cote node/godot -> code de sortie 0 ; cote
// navigateur -> window.close() (best-effort). Aucune ressource laissee active :
// la logique pure ne detient ni timer, ni socket, ni fichier ouvert, il n'y a
// donc rien a fermer d'autre que le processus/onglet.
export function requestExit(host = detectHost()) {
  if (host === 'browser') {
    if (typeof window !== 'undefined' && typeof window.close === 'function') {
      window.close();
    }
    return 0;
  }
  // node / godot-embed : sortie propre, code 0.
  if (typeof process !== 'undefined' && typeof process.exit === 'function') {
    process.exit(0);
  }
  return 0;
}

function detectHost() {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return 'browser';
  return 'node';
}

// CLI : `node exit.mjs` -> quitte avec le code 0 (preuve bot_action mecaniquement
// verifiable : le processus se termine, code de sortie 0).
if (process.argv[1]?.endsWith('exit.mjs')) {
  process.stdout.write('exit: sortie propre, code 0\n');
  requestExit('node');
}
