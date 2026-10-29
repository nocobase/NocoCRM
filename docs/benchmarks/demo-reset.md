# Demo reset resource regression

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
`environment.json` (source/worker/lock hashes and timestamp) and `run.log`.
The optional **Demo reset resource budget** workflow runs the changed version and
uploads these artifacts. It never updates or accepts a baseline automatically.

## Budgets and instrumentation

- Whole application: sampled heap < **768 MiB**, sampled and OS high-water RSS
  < **1200 MiB**, including boot, import, warm-up, reset and final clear.
- Every measured reset, including waiting for its mail synchronization: < **180 s**.
- After each quiescent round: GC-retained heap < **384 MiB**, and growth from the
  warmed baseline < **64 MiB**.
- Mail must settle within **120 s**. Worker timeout is **1200 s**; a signal,
  nonzero exit, missing final report or failed integrity assertion fails the gate.

The budgets leave headroom above local observations for runtime/host variance,
while bounding the full application below the reported ~1.5 GiB incident heap.
They are a regression guard, not a demonstrated safe capacity for production.
No heap-size increase is supplied. Node runs with `--expose-gc` solely for retained
measurements after work settles. There is **no forced GC during reset**. Heap/RSS
are sampled every 10 ms and at generation progress boundaries; short synchronous
heap peaks may be missed. `resourceUsage().maxRSS` additionally captures the OS
process RSS high-water mark. These are different metrics, not interchangeable.
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

## Recorded comparison

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
short generation phase; no measured hotspot justified rewriting `populateDemo`.
Mail synchronization after generation is included in total reset duration.

Validation also passed 13 targeted logic tests (mailbox cleanup, lifecycle,
existing demo-mode behavior and guidance links), scoped TypeScript and ESLint,
and formatting of changed sources/documents. PostgreSQL/MySQL, Linux CI runtime,
production deployment and large-volume tracking capacity have not been measured
here. The optional workflow is supplied but was not dispatched in this task.
