import os
import sys
import pytest

# Make the automation package importable when tests run from repo root
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# The automation scripts use bare sibling imports (run as `cd automation &&
# python launch_checker.py`), so add that directory to sys.path too.
AUTOMATION = os.path.join(ROOT, "automation")
if AUTOMATION not in sys.path:
    sys.path.insert(0, AUTOMATION)

FIXTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")


@pytest.fixture
def fixture_html():
    def _load(name):
        with open(os.path.join(FIXTURES, name), encoding="utf-8") as f:
            return f.read()
    return _load
