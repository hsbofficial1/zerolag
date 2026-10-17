"""Streaming feature store.

Features are computed one transaction at a time from in-memory behavioural
state, *before* the transaction is added to that state. Training replays the
historical stream through exactly the same code that serves live traffic, so
there is no train/serve skew.
"""
from __future__ import annotations

import math
from collections import defaultdict, deque
from dataclasses import dataclass, field

HOUR, DAY = 3600, 86_400

FEATURES = [
    "amount_log",
    "amount_vs_usual",        # how many times bigger than this payer's usual
    "is_new_payee",
    "is_new_device",
    "is_new_city",
    "on_call",
    "is_collect",
    "is_night",
    "payee_age_log",
    "payer_txns_1h",
    "payer_spend_24h_vs_usual",
    "payee_fanin_24h",        # distinct payers sending to this payee in 24h
    "secs_since_last_log",
    "payer_history_len_log",
]


@dataclass
class PayerState:
    n: int = 0
    log_amt_ewma: float = 0.0
    last_ts: float | None = None
    # first-seen timestamps; something only becomes "trusted" after 24h,
    # so a scammer cannot make a payee/device look familiar by repeating it
    payees: dict = field(default_factory=dict)
    devices: dict = field(default_factory=dict)
    cities: dict = field(default_factory=dict)
    recent: deque = field(default_factory=deque)   # (ts, amount) last 24h


@dataclass
class PayeeState:
    recent: deque = field(default_factory=deque)   # (ts, payer) last 24h


class FeatureStore:
    def __init__(self):
        self.payers: dict[str, PayerState] = defaultdict(PayerState)
        self.payees: dict[str, PayeeState] = defaultdict(PayeeState)

    def compute(self, t: dict) -> dict:
        """t is a *privacy-protected* txn (see privacy.protect)."""
        ts, amt = float(t["ts"]), float(t["amount"])
        p = self.payers[t["payer"]]
        q = self.payees[t["payee"]]
        _evict(p.recent, ts - DAY)
        _evict(q.recent, ts - DAY)

        usual = math.exp(p.log_amt_ewma) if p.n else amt
        spend_24h = sum(a for _, a in p.recent)
        hour = (ts % DAY) / HOUR + 5.5  # IST
        hour %= 24
        return {
            "amount_log": math.log1p(amt),
            "amount_vs_usual": amt / max(usual, 1.0),
            "is_new_payee": int(p.n > 0 and not _trusted(p.payees, t["payee"], ts)),
            "is_new_device": int(p.n > 0 and not _trusted(p.devices, t["device"], ts)),
            "is_new_city": int(p.n > 0 and not _trusted(p.cities, t["city"], ts)),
            "on_call": int(t["on_call"]),
            "is_collect": int(t["txn_type"] == "COLLECT"),
            "is_night": int(hour < 5),
            "payee_age_log": math.log1p(float(t["payee_account_age_days"])),
            "payer_txns_1h": sum(1 for s, _ in p.recent if s >= ts - HOUR),
            "payer_spend_24h_vs_usual": (spend_24h + amt) / max(usual, 1.0),
            "payee_fanin_24h": len({x for _, x in q.recent} | {t["payer"]}),
            "secs_since_last_log": math.log1p(ts - p.last_ts) if p.last_ts else math.log1p(30 * DAY),
            "payer_history_len_log": math.log1p(p.n),
        }

    def update(self, t: dict) -> None:
        ts, amt = float(t["ts"]), float(t["amount"])
        p = self.payers[t["payer"]]
        la = math.log1p(amt)
        p.log_amt_ewma = la if p.n == 0 else 0.9 * p.log_amt_ewma + 0.1 * la
        p.n += 1
        p.last_ts = ts
        p.payees.setdefault(t["payee"], ts)
        p.devices.setdefault(t["device"], ts)
        p.cities.setdefault(t["city"], ts)
        p.recent.append((ts, amt))
        self.payees[t["payee"]].recent.append((ts, t["payer"]))

    def process(self, t: dict) -> dict:
        f = self.compute(t)
        self.update(t)
        return f


def _evict(dq: deque, cutoff: float) -> None:
    while dq and dq[0][0] < cutoff:
        dq.popleft()


def _trusted(first_seen: dict, key: str, ts: float) -> bool:
    return key in first_seen and ts - first_seen[key] >= DAY
