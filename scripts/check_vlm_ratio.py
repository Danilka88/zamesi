#!/usr/bin/env python3
"""Check VLM ratio from pipeline JSON logs.

Usage:
    python scripts/check_vlm_ratio.py < pipeline.log
    python scripts/check_vlm_ratio.py pipeline.log
    python scripts/check_vlm_ratio.py < 0.06

Returns exit code 0 if ratio < 0.06, 1 otherwise.
"""
import json
import sys


def check(lines, threshold=0.06):
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("event") == "[M-SEMANTIC][SCENE][ALL_DONE]":
            ratio = entry.get("vlm_percent", 100) / 100.0
            if ratio < threshold:
                print(f"OK: VLM ratio {ratio:.4f} < {threshold}")
                return 0
            else:
                print(f"FAIL: VLM ratio {ratio:.4f} >= {threshold}")
                return 1
    print("FAIL: no [M-SEMANTIC][SCENE][ALL_DONE] event found in logs")
    return 1


if __name__ == "__main__":
    threshold = 0.06
    args = sys.argv[1:]

    for i, arg in enumerate(args):
        if arg == "<":
            if i + 1 < len(args):
                try:
                    threshold = float(args[i + 1])
                    args = args[:i] + args[i + 2:]
                except (ValueError, IndexError):
                    pass
                break
        try:
            threshold = float(arg)
            args.remove(arg)
            break
        except ValueError:
            continue

    if args:
        with open(args[0]) as f:
            sys.exit(check(f, threshold))
    else:
        sys.exit(check(sys.stdin, threshold))
