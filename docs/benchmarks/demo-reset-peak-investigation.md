# CRM reset peak attribution audit

Status: **peak-memory acceptance remains unmet**. This records an offline
investigation of existing v2 evidence and one completed, explicitly coordinated
diagnostic reset. It is not an optimization comparison or an accepted baseline.
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

The following command was frozen at application commit
`7a6be136871f1746632e79acfb84ec646af2b16f`. After the coordinator explicitly released
the window, it ran once on 2026-10-29. The completion evidence is below; no repeat
or additional resource task is authorized by this record.

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

## Completed single-reset observation

The shared lock was held from **10:05:22.711659 to 10:06:07.733393 UTC**.
The worker exited normally in 44.947 seconds, below its 180-second deadline.
It used Node v24.22.1, the unchanged published dependency lockfile, the same
shared Apple M4 / macOS 27 arm64 / 16 GiB host, temporary SQLite/storage, full
English import, and exactly one reset plus Mail convergence. No additional
warm-up reset, final clear, HeapProfiler call, snapshot or explicit GC ran.
All exact story counts, five unique replacement mail accounts, completed cleanup,
stable user identities and existing administrator/salesperson sessions passed.
All four instrumented source files were restored byte for byte; the original DB
registry SHA remained unchanged. The observed temporary root was removed before
the parent exited and released the lock. No resource process was restarted.

Raw observations and the CPU profile are losslessly gzip-compressed in
[the artifact directory](demo-reset-20261029-peak-once/manifest.json), alongside
the environment/source/script hashes, exact probe patches, run log, integrity,
exit, restoration and temporary-cleanup receipts. Uncompressed SHA256 hashes are
also recorded. Reproduce the analysis **without running the application**:

```sh
python3 tests/resource/analyze-peak-observation.py docs/benchmarks/demo-reset-20261029-peak-once
```

### Phase attribution and sampling scope

The reset window lasted about 37.782 seconds. These are maxima of **all saved
observations**, combining the 10 ms timer/phase samples with synchronous probe
boundaries, milestones and heap-space checkpoints. They are sampled lower bounds,
not continuous peaks or before/after acceptance numbers.

| Phase       | Observed heap max MiB | Observed RSS max MiB |
| ----------- | --------------------: | -------------------: |
| Clear       |               226.086 |              566.109 |
| Generate    |           **252.873** |              569.828 |
| Settle Mail |               238.719 |          **570.688** |

The highest heap observation was at reset +35.365950 s, during the first large
story transaction, before its notification callbacks ran. RSS reached its maximum
at +36.820064 s in `settleMail`, about 0.678 s after generation ended. These are
different instants. The 10 ms timer/phase series alone would instead report its
highest heap as 238.719 MiB in `settleMail`: it missed the higher, synchronous
generation observation. This is a concrete sampling limitation, not a reason to
rewrite or mix scopes with the frozen v2 results.

The entire process's `wait4` RSS high-water was 648.984 MiB, including imports,
initialization, precondition import, profiler setup and teardown. `wait4` supplies
no peak timestamp, so that number cannot be assigned to a reset phase. RSS was
already 565.406 MiB at reset start. External memory was 88.242 MiB and array
buffers 64.781 MiB there; the corresponding values at the heap maximum were
88.108 and 64.646 MiB. Those sizable categories predate this reset; no native
allocation owner was identified. Array buffers are a subset of external memory
and must not be added to it.

### Observed coexistence and the application candidates

At the highest heap boundary, 99 distinct notification row captures had been
observed, including the current row about to enter the callback queue. Their
summed per-row UTF-16 payload estimate was **178,604 bytes (0.170 MiB)**.
The transaction eventually held 131 distinct captured rows, with a maximum
summed estimate of **224,156 bytes (0.214 MiB)**. These estimates exclude object
headers and may overcount strings shared between rows; they are not retained sizes.

A natural minor GC began 1.560 ms after the highest heap observation. At the next
capture boundary, 2.608 ms after that observation, heap had fallen from 252.873
to 194.777 MiB, a 58.095 MiB drop, while the same queue was still accumulating rows
(100 observed captures). Its callback loop did not finish until +35.470760 s.
The queue's strong holding path therefore persisted across this large occupancy
drop. This supports investigating short-lived allocation/GC timing; it does not
establish notification rows as the dominant peak payload or identify everything
that was collected.

The observed story arrays at transaction end contained no captured row root or
descendant identities. That narrow result does not establish exclusive retention:
strings, unobserved roots and engine-internal references remain outside the probe.
The later project transaction returned a 15,394-byte payload estimate and had no
observed `recordNotifications` captures. Source reachability alone had not shown
that it would populate this particular callback queue.

Other measured application payloads were similarly bounded:

| Observed value                   | Maximum UTF-16 payload estimate | Timing / scope                                      |
| -------------------------------- | ------------------------------: | --------------------------------------------------- |
| Full story content               |                   639,436 bytes | Before the first story transaction                  |
| Story arrays and manifest        |                    92,208 bytes | Maximum across three generation checkpoints         |
| Constructed Mail store           |                   121,462 bytes | At +35.939897 s, after the highest heap observation |
| Serialized Mail store            |                   312,308 bytes | At +35.940736 s                                     |
| Provider's parsed complete store |                   121,462 bytes | Six reads across generation and Mail convergence    |
| Returned provider page           |                    43,628 bytes | Maximum across six page observations                |

The new store and serialized JSON were constructed more than half a second after
the generation heap maximum, so they cannot explain that earlier peak. At the
RSS plateau, the last provider whole-store/page observations were about 10 ms
before the maximum timer sample. The code materializes the complete parsed store
before selecting a mailbox; the measurements do not establish that all six parsed
stores were simultaneously reachable. Numeric IDs do not report collection or
prove when an unreturned mailbox became unreachable. There is currently no
evidence that splitting this small store would materially lower the full-reset peak.

### CPU context, limits and next decision

CPU start was bracketed with a 205.655 ms uncertainty interval. The offline analyzer
only attributes a sample to a phase when its entire possible timestamp interval
falls inside that phase. Among 768 such generation samples, 123 had
`structuredClone` as the self frame, 119 included registry `getResolution`, and
364 included the SQLite query wrapper. These overlapping stack counts describe
execution, not allocation bytes or live ownership. They are consistent with the
older DB allocation profiles, but do not overturn the unsuccessful exact narrow-
clone pilot or prove any new upstream peak benefit. No new DB cache or overlay was
introduced. The diagnostic itself performed 192 payload walks (10.167 ms total;
none truncated), collected 21 natural GC events, and retained numeric metadata.
Its allocation/timing perturbation remains a limitation.

**No application streaming/projection candidate is justified as a peak fix by this
window.** Notification capture narrowing may be a separate small correctness-
preserving improvement, but these observations do not justify presenting it as
the required memory optimization. Whole-store splitting is likewise unsupported
as a material peak fix. The remaining attribution gap is which short-lived allocations account for the
occupancy around repeated queries, plus native/resident-page ownership; this
instrument deliberately cannot provide an exact retainer graph. These results are
shared with the framework investigation, without claiming its gains in this PR.
No additional diagnostic, plain pilot or three-pair benchmark is queued. The CRM
PR remains Draft and **peak-memory acceptance remains unmet**.
