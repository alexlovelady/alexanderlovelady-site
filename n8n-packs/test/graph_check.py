"""Structural check of every generated workflow: unique node names, every connection points at a real node, exactly one trigger,
and every node is reachable from it. Usage: python3 test/graph_check.py"""
import glob
import json
import os
import sys

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
bad = total = 0
for f in sorted(glob.glob(os.path.join(root, "*/workflows/*.json")) + glob.glob(os.path.join(root, "packs/*/workflows/*.json"))):
    d = json.load(open(f)); total += 1
    names = {n["name"] for n in d["nodes"]}
    if len(names) != len(d["nodes"]):
        print("DUPLICATE NODE NAMES", f); bad += 1
    edges = {}
    for a, c in d["connections"].items():
        if a not in names:
            print("BAD SOURCE", f, a); bad += 1
        for o in c["main"]:
            for x in o:
                if x["node"] not in names:
                    print("BAD TARGET", f, a, "->", x["node"]); bad += 1
                edges.setdefault(a, set()).add(x["node"])
    trig = [n["name"] for n in d["nodes"] if n["type"].endswith("Trigger") or n["type"].endswith(".webhook")]
    if len(trig) != 1:
        print("TRIGGERS", f, trig); bad += 1; continue
    seen, st = {trig[0]}, [trig[0]]
    while st:
        for t in edges.get(st.pop(), ()):
            if t not in seen:
                seen.add(t); st.append(t)
    if names - seen:
        print("UNREACHABLE", f, sorted(names - seen)); bad += 1
print(f"{total} workflows checked; {bad} problem(s)")
sys.exit(1 if bad else 0)
