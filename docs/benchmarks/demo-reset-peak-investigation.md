# CRM reset peak attribution audit

Status: **peak-memory acceptance remains unmet**. This is an offline investigation
of existing v2 evidence and preparation for one explicitly coordinated diagnostic
reset. It is not another benchmark, an optimization, or an accepted baseline.
The duplicate-read application candidate remains withdrawn. The narrow DB clone
patch remains diagnostic and is absent from the installed dependencies.

## What the saved peaks establish

The plain published-dependency baseline used the complete unchanged English story,
one warm-up and five resets. Its reported per-round maxima can be assigned to the
following instrumented buckets:

| Round | Heap peak MiB | Heap bucket   | RSS peak MiB | RSS bucket      |
| ----- | ------------: | ------------- | -----------: | --------------- |
| 1     |       218.377 | generate      |      456.609 | clear           |
| 2     |       226.889 | reset (mixed) |      445.172 | reset (mixed)   |
| 3     |       226.251 | reset (mixed) |      436.219 | reset/clear tie |
| 4     |       229.030 | reset (mixed) |      437.109 | reset (mixed)   |
| 5     |       210.931 | generate      |      436.312 | clear           |

The largest heap observation was round 4 in the mixed `reset` bucket. The largest
RSS observation was round 1 in `clear`. **There is no basis to label every mixed
bucket observation as `settleMail`.** The wrapper restores `phase = 'reset'` after
each clear/generate callback, and that label covers both plugin work and the
explicit `settleMail()` call. The prior statement that three peaks definitely
occurred after generation in Mail convergence was too strong and is corrected.

This also does not identify cleanup as the source of the RSS peak. In round 1,
the mixed-bucket RSS maximum was already 456.578 MiB, only 0.031 MiB below the
clear maximum; generation's RSS maximum was lower at 436.281 MiB. Without a
timestamped series, committed-heap data or external/native allocation data,
resident pages carried from import/warm-up cannot be separated from new cleanup
allocations. Heap and RSS maxima are independent observations, not necessarily
the same instant or the same object population.

The rejected DB pilot's largest heap peak was in generate (round 2), while its
largest RSS peak was in clear (round 1). The rejected application pilot's heap
peaks were in generate in all five rounds, with its largest RSS in clear (round
1). These results do not establish a single stable allocation phase across
processes, and do not justify reviving either candidate.

The unchanged inputs, exact bucket owners (including ties), milestone drops and
input SHA256 hashes are in
[phase-attribution.json](demo-reset-20261029-v2/phase-attribution.json). Reproduce
this analysis without launching Node or acquiring the resource lock:

```sh
python3 tests/resource/analyze-peak-phases.py docs/benchmarks/demo-reset-20261029-v2
```

## What is missing about objects at the peak

The saved allocation profiles use `includeObjectsCollectedByMajorGC: true` and
`includeObjectsCollectedByMinorGC: true`. Their samples contain size, allocation
node ID and ordinal; they do not contain peak timestamps, object identities,
collection status or retaining edges. Thus 141.33 MiB of cumulative clone
allocation is not 141.33 MiB simultaneously alive. CPU stacks identify executing
work, not objects retained by it. No exact peak timestamp was saved to align with
the CPU profile, and the profiler was started before allocation-profiler setup,
so simply lining up CPU time zero with reset start is also incorrect.

Heap occupancy falls substantially during generation without any explicit GC in
the active window. For example, baseline round 2 fell by 45.011 MiB between the
82% and 86% story-mail checkpoints in 13.780 ms; round 1 fell by 47.125 MiB in
18.805 ms between its last two mailbox-connect checkpoints. The separate CPU
profile contains 235 samples labelled garbage collector. These facts support
investigating allocation/collection timing. They do not identify the objects
collected, prove a retained leak, or show which objects coexisted at a peak.

## Concrete application ownership hypotheses

These are source-backed possibilities to measure, not proven memory candidates:

| Boundary                | Objects the code materializes                                                                                        | Evidence needed before changing it                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Story generation        | `companies_`, `contacts`, `opportunities`, `leads`, project rows and the manifest; later steps consume their values  | Payload/container sizes at the same generation checkpoints; whether full rows are large enough to matter and which fields are still needed            |
| Mail store construction | Conversation descriptions, the complete `buildDemoMail` store and its serialized JSON; pending database insert       | Synchronous before/after occupancy and sizes, distinguishing allocated-but-uncollected store objects from strongly reachable data                     |
| Provider page reads     | A complete parsed five-mailbox store, one mailbox's array, filtered array and at most 50 returned messages           | Store/page payload ratio at the actual read, overlapping reads and peak-phase timing                                                                  |
| Clear                   | Five account projections; at most 200 chat IDs or file projections per batch; fixed business tables deleted set-wise | Whether any app-owned container is actually large at the RSS/heap peak rather than assuming an SQL/registry allocation stack is an app retention root |

Another concrete holder is the CRM's own notification callback queue.
`CrmService.recordNotifications` captures the full `record` in an `afterCommit`
closure. `mutate` keeps the callback array, including already-executed closures,
until the whole transaction's callback loop ends. `notifyRecord` uses only the
record ID and timestamp before `queueMessage` reads the current name from the DB.
This source establishes an extended holding path, **not its memory significance**.
The diagnostic will count distinct captured row identities per transaction and
their payload estimates, then mark callbacks-ready and transaction release.
The identity registry uses weak keys; stored summaries contain only numbers,
never actors or rows. Release marks the end of the identified strong holding
scope, not proof that GC has collected the closures.
The same weak identities are recorded while the existing payload walk visits
story arrays and transaction results. This marks observed exact-object overlap
without a second graph walk. **Captured by `afterCommit` does not mean kept alive
only by `afterCommit`.** Other roots and shared strings remain possible even when
no recorded identity overlap is found.

If that queue holds significant unused fields at the observed peak, projecting
the notification capture to ID and the exact chosen timestamp is a specific
application candidate. It must preserve recipients, event ordering, deduplication
keys, rollback behavior and post-commit timing. It is **not implemented yet**;
the payload estimate may instead show it is too small to explain the peak.

Relevant sources are `server/providers/crm/demo.ts` (story arrays and mail store),
`demo-mail.ts` (`buildDemoMail`, `listMessages`), `index.ts` (provider's whole-store
read/parse), `service.ts` (notification captures/transaction callback lifetime),
and `demo-lifecycle.ts` (bounded cleanup).

A narrow projection of long-lived story rows is worth implementing only if the
first observation shows significant payload still needed in a small subset of
fields. A mailbox-specific representation/read could avoid materializing the
other mailboxes only if store/page measurements show a significant contribution;
it must preserve all 162 messages, history range, thread IDs, ordering, aliases
and resets, including existing import/remove behavior. A cache would introduce
retention and invalidation obligations and is not assumed to reduce a peak.
Batching five accounts or the already bounded cleanup is not a justified new
candidate. No such optimization is currently implemented or proven.

Phase labels identify intervals, not exclusive ownership of allocations. Mail
processing can overlap generation after accounts are connected, and the plugin's
progress callback yields the event loop. A peak labelled `generate` therefore
does not by itself prove that a `populateDemo` array owns the memory. CPU stacks,
paired timestamps and the application reference observations must be interpreted
together.

## Prepared minimum diagnostic window

The coordinator accepted this request at the end of the resource queue, but has
**not released the window**. No process has entered `flock` or started the app.
The prepared command must only run after an explicit release:

```sh
python3 tests/resource/demo-reset-peak.py storage/demo-benchmark/peak-once --approved-window
```

The dedicated worker uses the original published dependencies and original
business behavior, initial full import as precondition, then **one** reset plus
Mail convergence. There is no extra warm-up reset, no final clear, no `--expose-gc`,
no explicit GC, no heap snapshot, no altered heap limit and no smaller story.
The parent owns a temporary database/storage root, enforces a 180-second process
deadline and reaps its own worker before restoration. Expected lock duration is
60–90 seconds, with no automatic rerun or subsequent comparison queued.

Instrumentation is separate from acceptance workers and does not modify frozen
v2 or the v3 resource gate:

- Record a 10 ms timestamped heap/RSS/heap-total/external/array-buffer series,
  paired within each sample, and natural GC events.
- Distinguish plugin work before clear, between callbacks, after generate, and
  the separately tagged `settleMail`; keep clear and generate distinct.
- Take seven lightweight heap-space/memory markers at reset start, clear end,
  story 35/65 checkpoints, generate end, settle start/end. Save CPU timing anchors.
  Do not invoke any `HeapProfiler` API.
- Temporarily add observation-only source probes at actual application container
  boundaries. They return exactly the input, compute counts and a deduplicated
  UTF-16 payload estimate synchronously, and retain **no business references**
  after the callback. Original files are backed up, locally replaced atomically
  and restored with SHA256 verification in `finally`; no dependency is patched.
- Measure the CRM notification queue's distinct captured-row payload per
  transaction without retaining the rows. Per-record estimates may count shared
  strings more than once and must not be presented as exact retained heap.
- Check the exact story counts, replacement/uniqueness of mail accounts, completed
  synchronization, stable user IDs and existing administrator/salesperson sessions.

The originally proposed live-allocation observations were removed **before any
execution**. In the pinned Node v24.22.1 source, Inspector `startSampling` sets
`kSamplingForceGC`; `getSamplingProfile` and `stopSampling` reach
`GetAllocationProfile`, which collects garbage with that flag. Thus merely
avoiding `collectGarbage` or snapshots would not satisfy this diagnostic's
no-forced-GC constraint. The replacement uses CPU profiling and application
ownership probes only, without a native-addon workaround. Sources:
[Inspector agent at v24.22.1](https://raw.githubusercontent.com/nodejs/node/v24.22.1/deps/v8/src/inspector/v8-heap-profiler-agent-impl.cc),
[sampling profiler at v24.22.1](https://raw.githubusercontent.com/nodejs/node/v24.22.1/deps/v8/src/profiler/sampling-heap-profiler.cc).
The old v2 diagnostic stopped sampling after `activeReset = false`; the plain
v2 pilots did not enable Inspector and are unaffected by this discovery.

This revised instrument cannot provide a **generic retainer graph**, exact
reachability or a census of all live allocations at a peak. Payload estimates
are not retained sizes; they exclude engine headers, string encodings and native
allocations. CPU profiling and payload walks perturb allocation and timing, and
their durations are recorded. These diagnostic peaks cannot become performance
acceptance numbers. The initial-import-only precondition also differs from the
warmed v2 five-round benchmark; failure to reproduce its exact peak is a stated
limit, not a reason to run more rounds without direction.

The decision after this one window is bounded: if the app-owned containers are
small or do not overlap the observed peak, report that the evidence does not
support an application streaming/projection change. If one dominates, propose
that precise lifetime/representation change and its integrity checks before a
plain pilot. Generic registry/Mail execution improvements remain upstream.
