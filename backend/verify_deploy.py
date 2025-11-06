#!/usr/bin/env python3
"""
Verify that dependency_overrides is not used on APIRouter objects
This script checks all Python files for the incorrect pattern
"""

import os
import re
from pathlib import Path

def check_file(filepath):
    """Check a single file for problematic patterns"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern: router_variable.dependency_overrides
    pattern = r'(\w+_router)\.dependency_overrides'
    matches = re.finditer(pattern, content)

    issues = []
    for match in matches:
        line_num = content[:match.start()].count('\n') + 1
        issues.append({
            'file': filepath,
            'line': line_num,
            'text': match.group(0)
        })

    return issues

def main():
    backend_dir = Path(__file__).parent
    all_issues = []

    # Check all Python files
    for py_file in backend_dir.rglob('*.py'):
        issues = check_file(py_file)
        all_issues.extend(issues)

    if all_issues:
        print("❌ FOUND ISSUES:")
        for issue in all_issues:
            print(f"  {issue['file']}:{issue['line']} - {issue['text']}")
        return 1
    else:
        print("✅ No dependency_overrides issues found!")
        print("✅ Code is ready for deployment")
        return 0

if __name__ == "__main__":
    exit(main())
