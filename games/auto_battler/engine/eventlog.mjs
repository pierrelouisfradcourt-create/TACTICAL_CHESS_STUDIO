// eventlog.mjs - Append-only event log
import { isEvent } from './types.mjs';
import { assertKnownEvent } from './registry.mjs';

export function createEventLog() {
  return [];
}

export function appendEvent(log, event) {
  // Validate event kind (fail-hard)
  assertKnownEvent(event.kind);

  // Return a new log (immutable)
  return [...log, { ...event }];
}
