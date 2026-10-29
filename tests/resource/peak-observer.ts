import { Session } from 'node:inspector/promises';
import { writeFileSync } from 'node:fs';
import { performance, PerformanceObserver } from 'node:perf_hooks';
import { getHeapSpaceStatistics } from 'node:v8';

type MemoryPoint = ReturnType<typeof memory>;
const memory = () => ({ t: performance.now(), ...process.memoryUsage() });
let recordValue:
  ((label: string, value: unknown, owner?: object) => void) | undefined;

// Temporary diagnostic source probes return the exact input object. No business
// object is stored outside this synchronous callback or held for a later sample.
export function probePeakValue<T>(label: string, value: T, owner?: object): T {
  recordValue?.(label, value, owner);
  return value;
}

function payloadShape(root: unknown, visit: (value: object) => void) {
  const seen = new WeakSet<object>();
  const strings = new Set<string>();
  const pending: unknown[] = [root];
  let objects = 0;
  let arrays = 0;
  let arraySlots = 0;
  let uniqueStringCodeUnits = 0;
  while (pending.length && objects < 20_000) {
    const value = pending.pop();
    if (typeof value === 'string') {
      if (!strings.has(value)) {
        strings.add(value);
        uniqueStringCodeUnits += value.length;
      }
    } else if (value && typeof value === 'object' && !seen.has(value)) {
      seen.add(value);
      visit(value);
      objects++;
      if (Array.isArray(value)) {
        arrays++;
        arraySlots += value.length;
      }
      for (const key of Object.keys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        // Do not run getters or inspect any service/engine internals.
        if (descriptor && 'value' in descriptor) pending.push(descriptor.value);
      }
    }
  }
  return {
    objects,
    arrays,
    arraySlots,
    uniqueStrings: strings.size,
    uniqueStringCodeUnits,
    truncated: pending.length > 0,
    // Payload estimate only: excludes headers, engine string representation,
    // native buffers and sharing between separate probe calls.
    utf16PayloadBytes: uniqueStringCodeUnits * 2,
  };
}

export async function startPeakObservation(directory: string) {
  const session = new Session();
  session.connect();
  await session.post('Profiler.enable');
  const cpuStartBefore = performance.now();
  await session.post('Profiler.start');
  const cpuStartAfter = performance.now();
  // Do not use HeapProfiler here. Node 24.22.1 Inspector sampling uses
  // kSamplingForceGC when a profile is read/stopped, even without global.gc.
  let phase = 'reset-pre-clear';
  const timeline: (MemoryPoint & { phase: string })[] = [];
  const probes: Record<string, unknown>[] = [];
  const captures: Record<string, unknown>[] = [];
  const milestones: Record<string, unknown>[] = [];
  const garbageCollections: Record<string, unknown>[] = [];
  const identities = new WeakMap<object, number>();
  let nextIdentity = 1;
  const identity = (value: object) => {
    let id = identities.get(value);
    if (!id) identities.set(value, (id = nextIdentity++));
    return id;
  };
  // Numeric IDs and shape summaries only. WeakMap keys never keep actors/rows alive.
  const capturedRows = new Map<
    number,
    Map<number, ReturnType<typeof payloadShape>>
  >();
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      garbageCollections.push({
        startTime: entry.startTime,
        duration: entry.duration,
        detail: 'detail' in entry ? entry.detail : undefined,
      });
  });
  observer.observe({ entryTypes: ['gc'] });
  const sample = () => timeline.push({ ...memory(), phase });
  const timer = setInterval(sample, 10);
  recordValue = (label, value, owner) => {
    const before = memory();
    const objectIds = new Set<number>();
    const shape = payloadShape(value, (object) =>
      objectIds.add(identity(object)),
    );
    const ownerId = owner ? identity(owner) : undefined;
    if (
      label === 'notification.capture' &&
      ownerId &&
      value &&
      typeof value === 'object'
    ) {
      let rows = capturedRows.get(ownerId);
      if (!rows) capturedRows.set(ownerId, (rows = new Map()));
      rows.set(identity(value), shape);
    }
    const rows = ownerId ? capturedRows.get(ownerId) : undefined;
    probes.push({
      label,
      phase,
      before,
      durationMs: performance.now() - before.t,
      shape,
      ownerId,
      objectIds: [...objectIds],
      capturedRecordCount: rows?.size,
      // Exact object identity overlap only. No overlap does not prove unique
      // ownership: strings and unobserved roots may still share the payload.
      capturedRecordIdsInThisRoot:
        rows && [...rows.keys()].filter((id) => objectIds.has(id)),
      // Per-record unique payloads; shared strings between rows can be overcounted.
      capturedUtf16PayloadBytes:
        rows &&
        [...rows.values()].reduce(
          (sum, item) => sum + item.utf16PayloadBytes,
          0,
        ),
    });
    if (label === 'transaction.release' && ownerId)
      capturedRows.delete(ownerId);
  };
  sample();
  return {
    phase(name: string) {
      phase = name;
      sample();
    },
    progress(fraction: number) {
      milestones.push({ fraction, phase, ...memory() });
    },
    checkpoint(label: string) {
      captures.push({
        label,
        phase,
        memory: memory(),
        heapSpaces: getHeapSpaceStatistics(),
      });
    },
    async stop() {
      recordValue = undefined;
      clearInterval(timer);
      observer.disconnect();
      try {
        const cpu = await session.post('Profiler.stop');
        writeFileSync(
          `${directory}/reset.cpuprofile`,
          JSON.stringify(cpu.profile),
        );
        writeFileSync(
          `${directory}/observation.json`,
          JSON.stringify(
            {
              diagnosticOnly: true,
              cpuStartBefore,
              cpuStartAfter,
              timeline,
              captures,
              milestones,
              probes,
              garbageCollections,
              limitations: [
                'No HeapProfiler API, forced GC or heap snapshot; CPU and memory/ownership observations only',
                'No generic retainer graph or exact live-object/retained sizes; unobserved roots and shared strings remain unknown',
                'CPU profiler and synchronous payload walks perturb timing and allocation; no acceptance peaks',
                'Payload shapes hold no business references after the synchronous callback returns',
                'Captured by afterCommit does not imply retained only by afterCommit; numeric object identities mark observed overlaps',
              ],
            },
            null,
            2,
          ) + '\n',
        );
      } finally {
        session.disconnect();
      }
    },
  };
}
