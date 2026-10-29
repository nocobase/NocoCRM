#!/usr/bin/env python3
"""Read existing v2 reports only; never launch the application or acquire a lock."""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
args = parser.parse_args()
reports = []
for name in ['pilot-v2-base', 'pilot-v2-db-overlay', 'pilot-v2-app-candidate']:
    path = args.directory / name / 'result.json'
    data = json.loads(path.read_text())
    rounds = []
    for row in data['rounds']:
        def owners(metric):
            return [name for name, values in row['phases'].items()
                    if name != 'verification' and abs(values[metric] - row[metric]) < 1e-9]
        points = row['milestones']
        drops = []
        for before, after in zip(points, points[1:]):
            drop = before['heapMiB'] - after['heapMiB']
            if drop > 10:
                drops.append({
                    'fromFraction': before['fraction'], 'toFraction': after['fraction'],
                    'dropMiB': drop, 'intervalMs': after['elapsedMs'] - before['elapsedMs'],
                })
        rounds.append({
            'round': row['round'],
            'heapPeakMiB': row['peakHeapMiB'], 'heapBuckets': owners('peakHeapMiB'),
            'rssPeakMiB': row['peakRssMiB'], 'rssBuckets': owners('peakRssMiB'),
            'largestRecordedGenerationMilestone': max(points, key=lambda p: p['heapMiB']),
            'lastGenerationMilestone': points[-1],
            'generationHeapDropsOver10MiB': drops,
        })
    reports.append({
        'name': name, 'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'largestHeapRound': max(rounds, key=lambda r: r['heapPeakMiB'])['round'],
        'largestRssRound': max(rounds, key=lambda r: r['rssPeakMiB'])['round'],
        'rounds': rounds,
    })
print(json.dumps({
    'kind': 'Offline phase attribution from unchanged v2 reports; not a new measurement',
    'limitations': [
        'reset bucket mixes plugin work before/between/after callbacks and settleMail',
        'No timestamp, paired heap/RSS sample or heap-space breakdown was saved for a peak',
        'Heap and RSS maxima may occur at different times; a phase maximum is not that phase live-object size',
        'Allocation profiles retained already-collected samples and contain no retainer edges or object identities',
        'Milestone heap drops show changing occupancy, not the identities or reachability of collected objects',
    ],
    'reports': reports,
}, indent=2))
