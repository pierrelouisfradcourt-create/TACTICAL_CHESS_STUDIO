// Keyboard input handling. Converts key presses to input object passed to step().

export function createInputHandler() {
  const keys = {};

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      keys[e.key] = true;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      keys[e.key] = false;
    });
  }

  return () => {
    return {
      left: keys['ArrowLeft'] || keys['a'] || false,
      right: keys['ArrowRight'] || keys['d'] || false,
      up: keys['ArrowUp'] || keys['w'] || false,
      down: keys['ArrowDown'] || keys['s'] || false,
      fire: keys[' '] || false,
    };
  };
}

export function getNullInput() {
  return { left: false, right: false, up: false, down: false, fire: false };
}
