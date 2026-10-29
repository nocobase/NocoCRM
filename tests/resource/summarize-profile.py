#!/usr/bin/env python3
"""Summarize sampled cumulative allocations; these are NOT peak/live heap sizes."""
import collections
import json
from pathlib import Path
import sys

path = Path(sys.argv[1])
profile = json.loads(path.read_text())
frames = collections.Counter()
application = collections.Counter()
def walk(node, stack):
    frame = node['callFrame']
    location = f"{frame['functionName']} {frame['url']}:{frame['lineNumber'] + 1}"
    stack = stack + [location]
    frames[location] += node['selfSize']
    callers = [item for item in stack if '/server/' in item and '/node_modules/' not in item]
    if callers:
        application[callers[-1]] += node['selfSize']
    for child in node.get('children', []):
        walk(child, stack)
walk(profile['head'], [])
print(json.dumps({
    'kind': 'sampled cumulative allocation, not peak memory',
    'totalBytes': sum(frames.values()),
    'largestSelfAllocations': frames.most_common(20),
    'nearestApplicationCallers': application.most_common(20),
}, indent=2))
