// Low_Power_Mode classification (Req 9.12, 13.9; Glossary: Low_Power_Mode).
//
// Low_Power_Mode is on when Save-Data is on, OR deviceMemory ≤ 4, OR
// hardwareConcurrency ≤ 4, OR the document is hidden. A signal the browser does
// not expose counts as "not low power" (Safari and Firefox lack Save-Data and
// deviceMemory, so only hardwareConcurrency and visibility apply there).
//
// Pure and framework-free (no GSAP): readSignals takes the navigator and
// document as arguments so both functions run in the Vitest node environment.

/** Capability signals read once when the Motion_System initializes. */
export interface CapabilitySignals {
  saveData?: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  hidden: boolean;
}

/** Threshold (inclusive) for deviceMemory (GiB) and hardwareConcurrency (cores). */
const LOW_POWER_LIMIT = 4;

/**
 * The navigator fields read here. `connection` and `deviceMemory` are not in the
 * standard DOM typings, so they are declared structurally; a real Navigator fits.
 */
export interface NavigatorSignals {
  readonly hardwareConcurrency?: number;
  readonly deviceMemory?: unknown;
  readonly connection?: unknown;
}

/** The document fields read here; a real Document fits. */
export interface DocumentSignals {
  readonly hidden?: boolean;
  readonly visibilityState?: string;
}

/** A usable numeric signal is a finite, positive number; anything else is unavailable. */
function positiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function readSaveData(connection: unknown): boolean | undefined {
  if (typeof connection !== 'object' || connection === null) return undefined;
  const saveData = (connection as { saveData?: unknown }).saveData;
  return typeof saveData === 'boolean' ? saveData : undefined;
}

/** Read the capability signals; unavailable or malformed signals become `undefined`. */
export function readSignals(nav: NavigatorSignals, doc: DocumentSignals): CapabilitySignals {
  const signals: CapabilitySignals = {
    hidden: doc.visibilityState === 'hidden' || doc.hidden === true,
  };
  const saveData = readSaveData(nav.connection);
  const deviceMemory = positiveNumber(nav.deviceMemory);
  const hardwareConcurrency = positiveNumber(nav.hardwareConcurrency);
  if (saveData !== undefined) signals.saveData = saveData;
  if (deviceMemory !== undefined) signals.deviceMemory = deviceMemory;
  if (hardwareConcurrency !== undefined) signals.hardwareConcurrency = hardwareConcurrency;
  return signals;
}

/** True when any available signal indicates Low_Power_Mode (Property 13). */
export function isLowPower(s: CapabilitySignals): boolean {
  return (
    s.saveData === true ||
    (s.deviceMemory !== undefined && s.deviceMemory <= LOW_POWER_LIMIT) ||
    (s.hardwareConcurrency !== undefined && s.hardwareConcurrency <= LOW_POWER_LIMIT) ||
    s.hidden
  );
}
