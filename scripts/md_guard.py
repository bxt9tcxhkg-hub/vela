#!/usr/bin/env python3
"""
MD Guard — checks Markdown files for quality issues.
Excludes: node_modules/ dist/ .git/ .turbo/
"""
import sys, os, re

EXCLUDE_DIRS = {"node_modules", "dist", ".git", ".turbo"}
EXCLUDE_FILES = {"todo-port-auto-discovery.md"}  # intentional TODOs

PLACEHOLDER_PATTERN = re.compile(r"PLACEHOLDER|HIER KOMMT|hier kommt", re.IGNORECASE)

errors = []

def check_file(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        lines = f.readlines()
    # Check for empty code blocks (``` immediately followed by ```)
    for i in range(len(lines) - 1):
        if re.match(r"^\s*```\w*\s*$", lines[i]) and re.match(r"^\s*```\s*$", lines[i+1]):
            errors.append(f"{path}:{i+1}: Empty code block")
    # Check for placeholder text
    for i, line in enumerate(lines, 1):
        if PLACEHOLDER_PATTERN.search(line):
            errors.append(f"{path}:{i}: Placeholder found → {line.rstrip()}")

def walk(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if fn.endswith(".md") and fn not in EXCLUDE_FILES:
                check_file(os.path.join(dirpath, fn))

if __name__ == "__main__":
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    walk(root)
    if errors:
        print("MD Guard FAIL:")
        for e in errors:
            print(" ", e)
        sys.exit(1)
    else:
        print("MD Guard PASS")
        sys.exit(0)
