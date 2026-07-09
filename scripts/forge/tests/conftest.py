import sys
from pathlib import Path

# scripts/forge/tests/conftest.py -> parents[2] == scripts/  (so `forge` is importable)
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
