import yaml
from pathlib import Path
from typing import Any


def load_eval_dataset(path: str = "data/eval_set.yaml") -> list[dict[str, Any]]:
    with open(Path(path)) as f:
        return yaml.safe_load(f)