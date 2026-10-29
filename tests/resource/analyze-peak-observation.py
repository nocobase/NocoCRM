#!/usr/bin/env python3
"""Analyze saved diagnostic observations only; never start Node or acquire a lock."""
import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
args = parser.parse_args()


def read(name):
    path = args.directory / name
    return path.read_bytes() if path.exists() else gzip.decompress(path.with_suffix(path.suffix + '.gz').read_bytes())


raw = read('observation.json')
data = json.loads(raw)
cpu_raw = read('reset.cpuprofile')
cpu = json.loads(cpu_raw)
t0 = data['captures'][0]['memory']['t']
points = ([{**x, 'origin': 'timer/phase'} for x in data['timeline']]
          + [{**x['before'], 'phase': x['phase'], 'origin': 'probe:' + x['label']} for x in data['probes']]
          + [{**x['memory'], 'phase': x['phase'], 'origin': 'checkpoint:' + x['label']} for x in data['captures']]
          + [{**x, 'origin': 'milestone'} for x in data['milestones']])


def point(x):
    return {'elapsedMs': x['t'] - t0, 'phase': x['phase'], 'origin': x.get('origin'),
            **{key + 'MiB': x[key] / 2**20 for key in ['heapUsed', 'rss', 'heapTotal', 'external', 'arrayBuffers']}}


phases = defaultdict(list)
for x in points:
    phases[x['phase']].append(x)
heap_peak = max(points, key=lambda x: x['heapUsed'])
rss_peak = max(points, key=lambda x: x['rss'])
labels = defaultdict(list)
for x in data['probes']:
    labels[x['label']].append(x)
captures = labels['notification.capture']
peak_capture = max(captures, key=lambda x: x['before']['heapUsed'])
following = captures[captures.index(peak_capture) + 1]
story = labels['story.transactionRoots'][0]
owner_rows = [x for x in captures if x.get('ownerId') == story['ownerId']]
row_ids = set().union(*(set(x['objectIds']) for x in owner_rows))

# CPU start is bracketed, not exactly synchronized with performance.now(). Only
# count samples whose entire possible timestamp interval falls within a phase.
nodes = {x['id']: x for x in cpu['nodes']}
parents = {child: x['id'] for x in nodes.values() for child in x.get('children', [])}


def frame(node):
    f = nodes[node]['callFrame']
    url = f['url'].split('/node_modules/')[-1]
    if '/server/' in url or '/tests/' in url:
        url = url.split('/fix-demo-reset-resource-nococrm-20261029/')[-1]
    return (f['functionName'], url, f['lineNumber'] + 1)


cpu_phases = {}
for phase in ['generate', 'settleMail']:
    begin, end = min(x['t'] for x in phases[phase]), max(x['t'] for x in phases[phase])
    elapsed = 0
    count = 0
    leaf, inclusive = Counter(), Counter()
    for node, delta in zip(cpu['samples'], cpu['timeDeltas']):
        elapsed += delta / 1000
        if data['cpuStartBefore'] + elapsed < begin or data['cpuStartAfter'] + elapsed > end:
            continue
        count += 1
        leaf[frame(node)] += 1
        while node:
            inclusive[frame(node)] += 1
            node = parents.get(node)
    cpu_phases[phase] = {
        'samplesConservativelyInsidePhase': count,
        'topSelf': [{'frame': key, 'samples': value} for key, value in leaf.most_common(12)],
        'topInclusive': [{'frame': key, 'samples': value} for key, value in inclusive.most_common(25)],
    }

report = {
    'diagnosticOnly': True,
    'sourceSha256': {'observation.json': hashlib.sha256(raw).hexdigest(), 'reset.cpuprofile': hashlib.sha256(cpu_raw).hexdigest()},
    'scope': 'All saved timer/phase, synchronous probe-before, milestone and checkpoint observations; sampled lower bounds, not exact continuous peaks',
    'allObservationHeapPeak': point(heap_peak), 'allObservationRssPeak': point(rss_peak),
    'timerAndPhaseOnlyHeapPeak': point(max(data['timeline'], key=lambda x: x['heapUsed'])),
    'byPhase': {name: {'observationCount': len(values), 'firstElapsedMs': min(x['t'] for x in values) - t0,
                      'lastElapsedMs': max(x['t'] for x in values) - t0,
                      'heapPeak': point(max(values, key=lambda x: x['heapUsed'])),
                      'rssPeak': point(max(values, key=lambda x: x['rss']))} for name, values in phases.items()},
    'probeShapes': {label: {'calls': len(values), 'maxUtf16PayloadBytes': max(x['shape']['utf16PayloadBytes'] for x in values),
                          'maxObjects': max(x['shape']['objects'] for x in values),
                          'maxArraySlots': max(x['shape']['arraySlots'] for x in values)} for label, values in labels.items()},
    'notificationHolding': {
        'maxDistinctCapturedRowsPerTransaction': max(x.get('capturedRecordCount') or 0 for x in captures),
        'maxSummedUtf16PayloadBytes': max(x.get('capturedUtf16PayloadBytes') or 0 for x in captures),
        'atHeapPeak': {'observedRowsIncludingCurrentCapture': peak_capture['capturedRecordCount'],
                       'summedUtf16PayloadBytes': peak_capture['capturedUtf16PayloadBytes']},
        'nextCapture': point({**following['before'], 'phase': following['phase'], 'origin': following['label']}),
        'heapDropBeforeNextCaptureMiB': (peak_capture['before']['heapUsed'] - following['before']['heapUsed']) / 2**20,
        'nextCaptureRowCount': following['capturedRecordCount'],
        'gcEventsBetweenTheseCaptures': [x for x in data['garbageCollections'] if peak_capture['before']['t'] < x['startTime'] < following['before']['t']],
        'queueReleaseElapsedMs': next(x['before']['t'] - t0 for x in labels['transaction.release'] if x.get('ownerId') == story['ownerId']),
        'capturedRootOverlapWithObservedStory': story['capturedRecordIdsInThisRoot'],
        'capturedDescendantOverlapWithObservedStory': len(row_ids & set(story['objectIds'])),
    },
    'observer': {'payloadWalks': len(data['probes']), 'summedWalkMs': sum(x['durationMs'] for x in data['probes']),
                 'truncatedWalks': sum(x['shape']['truncated'] for x in data['probes']),
                 'naturalGcEvents': len(data['garbageCollections']),
                 'cpuStartUncertaintyMs': data['cpuStartAfter'] - data['cpuStartBefore']},
    'cpu': cpu_phases,
    'limitations': data['limitations'] + [
        'Synchronous probes observe transient peaks that a 10ms timer can miss; scopes must not be mixed with v2 acceptance reports',
        'CPU sampling shows execution, not allocation size or exact owners of live memory',
        'An absent observed identity overlap does not prove exclusive retention',
    ],
}
print(json.dumps(report, indent=2))
