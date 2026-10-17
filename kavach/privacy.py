"""Privacy layer: nothing downstream of ingestion ever sees a raw UPI ID or device ID.

* Identifiers (VPA, device) are replaced by keyed HMAC-SHA256 tokens. The same
  identifier always maps to the same token, so behaviour can be profiled, but
  the token cannot be reversed without the key. On IBM Z the key would live in
  the Crypto Express HSM (CCA / EP11) instead of an env var.
* A display mask ("us***48@okaxis") is kept so analysts can talk to a customer
  without seeing the full ID.
* Demographics (age) are never passed to the model; they are only used in the
  offline fairness audit.
"""
from __future__ import annotations

import hashlib
import hmac
import os

_KEY = os.environ.get("KAVACH_TOKEN_KEY", "dev-only-key-change-me").encode()


def tokenize(identifier: str, kind: str = "vpa") -> str:
    digest = hmac.new(_KEY, f"{kind}:{identifier}".encode(), hashlib.sha256).hexdigest()
    return f"{kind[:3]}_{digest[:20]}"


def mask_vpa(vpa: str) -> str:
    handle, _, bank = vpa.partition("@")
    if len(handle) <= 4:
        return f"{handle[:1]}***@{bank}"
    return f"{handle[:2]}***{handle[-2:]}@{bank}"


def protect(txn: dict) -> dict:
    """Return a copy of a raw transaction with all identifiers tokenized."""
    safe = {k: v for k, v in txn.items() if k not in ("payer_vpa", "payee_vpa", "device_id", "payer_age")}
    safe["payer"] = tokenize(txn["payer_vpa"])
    safe["payee"] = tokenize(txn["payee_vpa"])
    safe["device"] = tokenize(txn["device_id"], "device")
    safe["payer_mask"] = mask_vpa(txn["payer_vpa"])
    safe["payee_mask"] = mask_vpa(txn["payee_vpa"])
    return safe
