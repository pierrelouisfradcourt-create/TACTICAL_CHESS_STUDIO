// inputs.mjs - Input building and validation
import { isInput } from './types.mjs';
import { assertKnownInput, INPUT_KINDS } from './registry.mjs';

export function buildInput(kind, payload) {
  assertKnownInput(kind); // Fail-hard on unknown kind

  const input = {
    kind,
    ...payload
  };

  return input;
}

// Validation: returns {ok: true/false, reason?}
export function validateInput(input) {
  if (!isInput(input)) {
    return { ok: false, reason: 'Input missing kind property' };
  }

  if (typeof input.kind !== 'string') {
    return { ok: false, reason: 'Input kind must be a string' };
  }

  if (!INPUT_KINDS.includes(input.kind)) {
    return { ok: false, reason: `Unknown input kind: ${input.kind}` };
  }

  return { ok: true };
}

// Alias for compatibility
export function validateInputSync(input) {
  return validateInput(input);
}
