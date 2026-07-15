from __future__ import annotations

import json
from hashlib import sha256
from typing import Any


def compute_sha256(data: bytes) -> str:
    return sha256(data).hexdigest()


def generate_metadata(payload: dict[str, Any]) -> str:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True)


def parse_metadata(metadata_json: str) -> dict[str, Any]:
    return json.loads(metadata_json)
