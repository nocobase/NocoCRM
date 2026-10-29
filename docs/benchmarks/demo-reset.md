# Demo reset resource regression

**Acceptance status: not met.** The historical single pair below is retained as
evidence, not as a successful peak-memory optimization. The revised requirement
is a measured hotspot, a successful uninstrumented pilot, then at least three
independent AB/BA pairs with the same worker and unchanged dataset. Unreleased
framework overlays remain diagnostic and cannot qualify this application PR.

This gate boots the complete application through `createStandaloneServer` on an
isolated SQLite database and temporary storage. It invokes the registered Demo
Mode import, reset and clear services, including `generateDemo` → `populateDemo`,
the real Mail background deletion/synchronization, Agents conversations,
notifications and identity/session handling. The CRM fictional mail provider and
Demo Mode model simulation supply external services; no provider credentials are
needed. The worker rejects external `fetch`, and the launcher removes inherited
credentials and refuses local `.env` files. It does not test live mail delivery.

The dataset is the unchanged English CRM story: 18 leads, 11 companies,
22 contacts, 34 opportunities, 117 tasks, 6 approvals, 593 history rows,
222 WhatsApp messages, 4 conversations/10 messages and 5 mailboxes/162 messages.
The mail history range remains 181 days. An initial import and one complete reset
warm up the application; **five further resets** are measured in one fresh Node
process. A final clear verifies empty business tables and retained administrator
access. Each reset checks identical business counts, replacement of old record
and mailbox IDs, unique addresses, completed mail synchronization, stable user
IDs, and both administrator and salesperson sessions.

## Run

Requirements: Node **v24.22.1**, pnpm from `packageManager`, Python 3 with `fcntl`
(macOS/Linux), and `pnpm install --frozen-lockfile`. From a clean task worktree:

```sh
python3 tests/resource/demo-reset.py storage/demo-benchmark/changed
python3 tests/resource/demo-reset.py storage/demo-benchmark/base 9762377dca5d7ba363f15d9e60379c52a682e4e6
```

The optional revision compares this PR's audited `demo-lifecycle.ts` at the given
commit using **the same worker and installed lockfile**. It temporarily replaces
only that file while holding the lock, backs up the edited source in the output
directory and restores it in `finally` (including interruption/timeout). Do not
edit or run another application process in this worktree during comparison. The
new helper is not imported by the base. This is a source-module comparison, not
a claim that arbitrary revisions of the complete application can be compared:
all other production files and dependencies must match the named base. A lockfile
mismatch is rejected. No checkout or node_modules copy is created.

Both invocations hold `/tmp/demo-reset-resource-benchmark.lock`, shared with the
other solutions' benchmarks. This serializes participating heavy benchmarks; it
does not make the shared machine idle. Each output directory has raw `result.json`,
`environment.json` (source/worker/lock hashes and timestamp), `run.log`, and
`process.json` (final worker exit/timeout and OS high-water receipt). Use an empty
output directory: previous results cannot satisfy a new run's completion check.
The optional **Demo reset resource budget** workflow runs the changed version and
uploads these artifacts. It never updates or accepts a baseline automatically.

## Budgets and instrumentation

- Every measured reset: sampled heap < **300 MiB**, sampled RSS < **640 MiB**.
- Across boot, import, warm-up, reset and final clear: sampled heap < **384 MiB**,
  sampled RSS < **832 MiB**. Parent-collected, full-process OS RSS < **832 MiB**.
- Every measured reset, including waiting for its mail synchronization: < **180 s**.
- After each quiescent round: GC-retained heap < **192 MiB**, and growth from the
  warmed baseline < **16 MiB**.
- Mail must settle within **120 s**. Worker timeout is **1200 s**; a signal,
  nonzero exit, missing final report or failed integrity assertion fails the gate.

These v3 limits leave approximately 22–33% above the largest uninstrumented v2
heap/RSS observations, and are fixed rather than automatically derived on each
run. Retained-growth and time limits separately detect stalled or accumulating
resets. They are a regression guard, not evidence of optimization or a demonstrated
safe capacity for production. Historical v1/v2 runs used broader 768/1200 MiB
heap/RSS and 384/64 MiB retained/growth guards; those passing limits never
established a memory benefit.
No heap-size increase is supplied. Node runs with `--expose-gc` solely for retained
measurements after work settles. There is **no forced GC during reset**. Heap/RSS
are sampled every 10 ms and at generation progress boundaries; short synchronous
heap peaks may be missed. Node's `resourceUsage().maxRSS` records an OS high-water
observation before teardown. The v3 parent also uses `wait4` after the worker
exits to capture its complete lifetime, including static imports and teardown,
with platform-specific units normalized to MiB. These are different metrics,
not interchangeable.
Progress milestones expose generation intervals without altering the business
path. Import dependencies load before the JS sampler; OS RSS covers that too.

The regular logic tests are separate: they exercise real application mailbox
removal/reconnection and cleanup across 205 file/conversation rows, plus public
Mail-boundary failure injection. Fake-clock deadline tests prove diagnostics, not
resource usage. Those fixtures are **not** presented as full-application memory
benchmarks. The full story has fewer than 200 rows per tracked business table;
large tracking volumes are outside the measured capacity claim.

## Measurements

Measured on 2026-10-29, macOS 27.0 arm64, Apple M4 (10 logical CPUs),
16 GiB RAM, Node v24.22.1, pnpm 11.7.0, SQLite/better-sqlite3 13.0.3.
Application 1.0.0-beta.82; App Server 3.0.0-beta.4; Demo Mode 0.2.0-beta.5;
Mail 1.0.0-beta.17; DB 1.0.0-beta.23; Agents 1.0.0-beta.29.
The source base is fresh `origin/main` at
`9762377dca5d7ba363f15d9e60379c52a682e4e6`. The published framework packages and
lockfile are unchanged. This is a shared developer host: other sessions remained
active and a scoped type check overlapped part of the base measurement. The
shared lock excluded other participating resource benchmarks. RSS varies across
rounds and processes; one base/changed pair cannot establish statistical
significance. A preliminary base run was used to validate the harness and is not
part of the comparison below. Main/deployed version equivalence has not been established. The
production incident was ITAM generation on 2026-10-29; this CRM benchmark cannot
establish that incident's root cause or prove all production OOMs fixed.

## Framework boundary

Most of the observed reset time is Mail-owned deletion. Published Mail
1.0.0-beta.17 advances one bounded removal stage per relay tick (normally one
second). Five small fictional mailboxes consequently take about 35 seconds to
clear. Faster bounded draining, worker scheduling/retry/lease changes and generic
tracking/status services belong in the framework, where all applications benefit.
This evidence has been sent to the framework workstream. CRM does not add a
high-frequency `kick`, remove Mail-owned rows directly or duplicate a scheduler.
Any future gain from that work requires a released framework upgrade and another
measurement; it is not counted as a benefit of this independent application PR.
The application keeps its CRM table selection, address-reuse precondition and
bounded business cleanup. No new shared API is required for those batches.

## Historical comparison (v1, one pair)

Raw data: [base results](demo-reset-20261029/base-result.json),
[changed results](demo-reset-20261029/changed-result.json),
[base environment](demo-reset-20261029/base-environment.json),
[changed environment](demo-reset-20261029/changed-environment.json).
Both runs have identical worker and lockfile hashes. The changed production
module hash is `b106555a74cbb0a1c6b459d24708c841c19f1702fd4d289cc2bc210f4fc4b84a`; the committed helper accompanies it.

Each cell below is the median of five rounds (minimum–maximum):

| Metric                      | Base                      | Changed                   |
| --------------------------- | ------------------------- | ------------------------- |
| Reset duration (s)          | 37.949 (37.887–38.002)    | 37.962 (37.942–39.625)    |
| Per-round peak heap (MiB)   | 232.802 (229.500–240.240) | 223.608 (218.155–230.304) |
| Per-round peak RSS (MiB)    | 451.719 (450.375–653.734) | 430.938 (429.562–508.531) |
| Post-GC retained heap (MiB) | 147.829 (147.089–148.430) | 147.846 (147.226–148.459) |

Across the **whole process**, sampled heap maxima were **290.183 →
290.109 MiB**, sampled RSS maxima **658.812 →
558.766 MiB**, and OS RSS high-water marks **659.328 →
587.297 MiB**. All fixed budgets and integrity assertions passed.

There is **no demonstrated material reset speedup or whole-process heap
reduction** on this story. Retained heap is effectively unchanged. Lower sampled
per-round heap/RSS in this pair is not evidence of a production capacity increase.
The meaningful changes are cleanup retry behavior, explicit failure diagnostics
and bounding application arrays/SQL bindings for larger visitor datasets.
The 205-row file/chat fixture verifies batch boundaries and storage-failure
retry, but is not a before/after resource stress benchmark.

Generation milestones measure the real `populateDemo` path. Full `generateDemo`
median duration was 1.165 →
1.672 s;
Mail/business clear was 35.192 →
34.941 s.
The early business-story interval and the AI/WhatsApp interval dominate the
short generation phase. These v1 measurements did not isolate an allocation
hotspot; the follow-up profile below investigates it.
Mail synchronization after generation is included in total reset duration.

Validation also passed 13 targeted logic tests (mailbox cleanup, lifecycle,
existing demo-mode behavior and guidance links), scoped TypeScript and ESLint,
and formatting of changed sources/documents. PostgreSQL/MySQL, Linux CI runtime,
production deployment and large-volume tracking capacity have not been measured
here. The optional workflow is supplied but was not dispatched in this task.

## Follow-up diagnosis (v2, not acceptance evidence)

The v2 worker sets an `activeReset` boundary around `demo.reset()` and the
necessary Mail convergence. Integrity queries, session checks and explicit GC
run after that boundary. The historical v1 round peaks also included verification;
do not mix these scopes. Sampling all-process heap/RSS continues outside the reset
window. In v2, Node's OS high-water observation is taken before application
teardown, so it is not a parent-collected final process-lifetime observation.
The exact v2 harness is preserved at commit
`61416b43f2fe0bb8e8664243295d45ff52957d6d`; use that harness revision when
reproducing the v2 numbers below, not a mixture of v2 and v3 workers.

`--profile` enables `CRM_RESET_PROFILE=1` for the first measured reset only. It
records a CPU profile, sampled cumulative allocations (including objects already
collected), and Intl constructor call stacks. Inspector and Intl wrappers are
absent in plain pilot/acceptance runs. Profiled memory and elapsed time must not
be compared as acceptance measurements. Summarize an allocation profile with:

```sh
python3 tests/resource/demo-reset.py storage/demo-benchmark/profile --profile
python3 tests/resource/summarize-profile.py storage/demo-benchmark/profile/result.json.heapprofile
```

The initial profile recorded 1,017.41 MiB of **cumulative sampled allocation**,
including 141.33 MiB in `structuredClone`. Most of the latter was reached through
DB collection resolution. Query-local collection lookup memoization already
exists in installed DB beta.23: this investigation does not introduce it or
attribute its existing benefit to this PR. The nearest application caller with
the most sampled allocation was `CrmService.get` (22.18 MiB; asynchronous stack
boundaries mean this is an attribution lower bound, not its total cost).

There were 45 Intl constructions: 37 `NumberFormat` calls, mainly `money()`, and
8 `DateTimeFormat` calls. CRM's business dates already share a calendar day and
offset, and its weekday formatter is reused within generation. The framework's
`clock.daysAgo` formatter fix is not applicable to this CRM generation path.
The small `money()` candidate is not presented as the main memory hotspot.

### Exact upstream DB diagnostic overlay

The optional `--db-overlay` tests only the upstream candidate below in installed
`@nocobase/db` **1.0.0-beta.23**. This is not a dependency upgrade, an application
implementation, or a claim of a benefit included in this PR:

```js
// Original get(name) body:
return (await this.getResolution(name))?.collection;
// Diagnostic replacement:
const result = await this.getResolutionInternal(name);
return result ? structuredClone(result.collection) : undefined;
```

It introduces no query cache. Public `getResolution`, `getPhysical` freshness,
defensive copying and generation invalidation remain upstream responsibilities.
The launcher refuses a resolved registry path outside this worktree and verifies
the version and exact old method. It saves original bytes, method bodies and
SHA256 values, then replaces the local file using a new inode and atomic rename
to break any pnpm hard link. A `finally` block atomically restores the bytes and
checks the original hash, including on a worker failure. External shared symlink
targets are rejected; the launcher never edits them. The installed registry's
original hash was
`36023c87a5b58ae46ac9b23b4c2d17eaf80dd4afdc4573d5f8d38ad1584a5551`,
the patched file hash was
`57a70f1c3a468436343a2625f891d5f470bab7751b36b15067a34596001e0a88`.
No `node_modules` file is committed.

```sh
python3 tests/resource/demo-reset.py storage/demo-benchmark/profile-db --profile --db-overlay
python3 tests/resource/demo-reset.py storage/demo-benchmark/plain-published
python3 tests/resource/demo-reset.py storage/demo-benchmark/plain-db --db-overlay
python3 -m unittest discover -s tests/resource -p 'test_*.py'
```

The profiled overlay reduced sampled cumulative clone allocation to 125.87 MiB
and total sampled allocation to 985.00 MiB. These are allocation-volume findings,
not peak heap or RSS improvements. Both profiles kept the complete five-reset
protocol. The exact worker SHA was
`cada46647ed50ae3ccec6c4d96af485bd25e6c9a7ba756fd95d59d73e85148bf`.
The same worker is used for the uninstrumented v2 pilots. Profile summaries,
Intl stacks, environment, per-round results and local raw-artifact hash manifests
are in [the v2 evidence directory](demo-reset-20261029-v2/).
Raw CPU/heap profiles remain in `storage/demo-benchmark/profile-v2/` and
`storage/demo-benchmark/profile-db-overlay-v2/`; rerunning the commands above
regenerates them. Absolute paths in profiles identify this local worktree.
Artifact hash manifests refer to the original local files; documentation copies
of profile summaries and Intl stacks may have formatting-only differences.

The plain exact-DB pilot held the resource lock from **08:47:30 UTC** until
approximately **08:52:04 UTC** on 2026-10-29. It exited successfully and restored
the original registry hash, independently rechecked after the launcher exited.
No further CRM resource process was queued; the coordinated window was released.

| Pilot metric (MiB unless stated)                     | Published DB | Exact DB overlay |
| ---------------------------------------------------- | -----------: | ---------------: |
| Maximum reset-window sampled heap across five rounds |      229.030 |          246.771 |
| Median per-round sampled heap peak                   |      226.251 |          229.769 |
| Maximum reset-window sampled RSS across five rounds  |      456.609 |          480.750 |
| Median per-round sampled RSS peak                    |      437.109 |          405.484 |
| All-phase sampled heap maximum                       |      290.189 |          288.044 |
| Node-observed OS RSS high-water before teardown      |      664.344 |          657.891 |
| Median reset duration (seconds)                      |       37.915 |           37.921 |
| Median retained heap after quiescent GC              |      147.885 |          148.437 |

Raw [overlay results](demo-reset-20261029-v2/pilot-v2-db-overlay/result.json),
[environment](demo-reset-20261029-v2/pilot-v2-db-overlay/environment.json) and
[restoration receipt](demo-reset-20261029-v2/pilot-v2-db-overlay/db-restoration.json)
are retained. This is one uninstrumented process per side, using the same
application, worker, lockfile, Node and story, including one warm-up and five
measured rounds. The allocation-volume reduction did **not** establish a peak
improvement: the maximum reset heap and RSS both rose. Lower median RSS or the
small change in startup-dominated OS high-water cannot replace that evidence.
One pair also cannot establish a repeatable regression. No formal three-pair
comparison was justified. The overlay is not included in this application PR,
and this pilot does not establish a future CRM peak benefit from upgrading DB.

### Application candidate

`populateDemo` calls `service.save`, which already reads and returns the authorized
decoded row, then patches historical timestamps and reads the row again. The
pilot candidate reuses that returned row only with an unconditional read scope,
applies only the timestamp fields already visible on the row, and retains the
read for restricted scopes. Closing a task still executes the real second save
and all history/notification effects. The candidate does not reduce records,
history or external-service work. It is an experiment, not a measured peak-memory
improvement or an accepted production change.

The [candidate patch](demo-reset-20261029-v2/app-candidate.patch) is against
`9b2479886a750eabcb11219539dcf42714280769`. Reproduce it without editing the active
application ahead of acquiring the resource lock:

```sh
git show 9b2479886a750eabcb11219539dcf42714280769:server/providers/crm/demo.ts > storage/demo-candidate.ts
patch storage/demo-candidate.ts < docs/benchmarks/demo-reset-20261029-v2/app-candidate.patch
python3 tests/resource/demo-reset.py storage/demo-benchmark/plain-app --app-candidate storage/demo-candidate.ts
```

`--app-candidate` applies and restores only this local application file under the
same resource lock, saving both versions and their hashes. It must not be combined
with an upstream overlay when attributing an application's independent benefit.

The application candidate was **rejected** after the uninstrumented full-reset
pilot. Both processes completed the initial import, warm-up, five measured resets
and final clear with identical story counts and account/session checks. The
baseline here is the current application PR at `9b24798` with published packages,
not `origin/main`; this experiment isolates the additional generator candidate.

| Pilot metric (MiB unless stated)                     | Published application | Generator candidate |
| ---------------------------------------------------- | --------------------: | ------------------: |
| Maximum reset-window sampled heap across five rounds |               229.030 |             235.994 |
| Median per-round sampled heap peak                   |               226.251 |             234.035 |
| Maximum reset-window sampled RSS across five rounds  |               456.609 |             460.906 |
| Median per-round sampled RSS peak                    |               437.109 |             433.906 |
| All-phase sampled heap maximum                       |               290.189 |             293.519 |
| Node-observed OS RSS high-water before teardown      |               664.344 |             607.906 |
| Median reset duration (seconds)                      |                37.915 |              37.912 |
| Median retained heap after quiescent GC              |               147.885 |             147.988 |

The lower OS high-water in one candidate process does not establish an
optimization: reset-window heap and RSS maxima both increased, while time and
retained heap were essentially unchanged. No formal three-pair experiment was
started for this candidate. Its source was restored byte for byte, hash
`b711998715d4bc4ba1321c9e3fc8d8952445b34d9e7fec62c8a3aa33bb3848b2`.
Raw [baseline](demo-reset-20261029-v2/pilot-v2-base/result.json) and
[candidate](demo-reset-20261029-v2/pilot-v2-app-candidate/result.json) reports
retain all five rounds and phase/milestone samples. In three baseline rounds the
heap maximum occurred after generation, during Mail convergence; a generator-only
allocation improvement would not automatically reduce that full-reset peak.

## V3 verification limits and remaining acceptance work

V3 adds the parent `wait4` receipt, the tighter budgets above, and exact initial
counts for every story table and all 162 mail messages. Counts are no longer
accepted merely because later resets reproduce an accidentally smaller first
import. A failed, signalled, timed-out or report-less process fails the launcher;
interruption reaps its own child before restoring an overlay. Six lightweight
tests cover final OS high-water after memory release, nonzero/signal exits,
timeout, hard-link isolation and exceptional restoration, and external symlink
refusal. Scoped TypeScript and ESLint also pass.

The recorded uninstrumented v2 reports were replayed against the new numeric
guards and exact counts. That is validation of the thresholds, **not another
resource measurement**. No new full v3 application process was launched after
the coordinated CRM window ended; the final parent-collected application RSS
measurement is therefore still unverified. The next authorized resource window
must use one identical final harness for both sides.

Neither investigated candidate passed the peak-memory pilot requirement. The
production generator and published framework dependencies remain unchanged.
Correctness and bounded cleanup improvements remain in this PR, but peak-memory
acceptance is **not met**. There are no three independent AB/BA pairs and no
claim that an unpublished framework patch fixes the CRM peak. A new measured
hotspot and a successful plain pilot must precede any formal repeated comparison.
