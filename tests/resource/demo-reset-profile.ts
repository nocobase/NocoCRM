import { Session } from 'node:inspector/promises';
import { writeFileSync } from 'node:fs';

/** Diagnostic only: profiler/proxy overhead is excluded from acceptance runs. */
export async function profileReset(output: string, phase: () => string) {
  const session = new Session();
  session.connect();
  const calls = new Map<string, number>();
  const originals = new Map<string, unknown>();
  for (const key of ['DateTimeFormat', 'NumberFormat', 'Collator'] as const) {
    const original = Intl[key];
    originals.set(key, original);
    const record = () => {
      const stack = `${phase()}: ${key}\n${new Error().stack?.split('\n').slice(3, 9).join('\n')}`;
      calls.set(stack, (calls.get(stack) ?? 0) + 1);
    };
    Object.defineProperty(Intl, key, {
      configurable: true,
      writable: true,
      value: new Proxy(original, {
        construct(target, args, newTarget) {
          record();
          return Reflect.construct(target, args, newTarget);
        },
        apply(target, self, args) {
          record();
          return Reflect.apply(target, self, args);
        },
      }),
    });
  }
  await session.post('Profiler.enable');
  await session.post('Profiler.start');
  await session.post('HeapProfiler.startSampling', {
    samplingInterval: 32768,
    // Node's protocol accepts these options; the published @types declaration
    // predates them. Include garbage collected during reset to find churn.
    ...{
      includeObjectsCollectedByMajorGC: true,
      includeObjectsCollectedByMinorGC: true,
    },
  });
  return async () => {
    const cpu = await session.post('Profiler.stop');
    const allocations = await session.post('HeapProfiler.stopSampling');
    for (const [key, value] of originals)
      Object.defineProperty(Intl, key, {
        value,
        configurable: true,
        writable: true,
      });
    session.disconnect();
    writeFileSync(`${output}.cpuprofile`, JSON.stringify(cpu.profile));
    writeFileSync(`${output}.heapprofile`, JSON.stringify(allocations.profile));
    writeFileSync(
      `${output}.intl.json`,
      JSON.stringify(
        [...calls].sort((a, b) => b[1] - a[1]),
        null,
        2,
      ),
    );
  };
}
