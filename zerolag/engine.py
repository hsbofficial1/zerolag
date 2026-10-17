"""ZeroLag scoring engine: protect -> features -> score -> explain -> decide.

One call to `Engine.score(raw_txn)` is the whole in-transaction decision path.
"""
from __future__ import annotations

import time
from pathlib import Path

import joblib
import numpy as np

from .features import FEATURES, FeatureStore
from .privacy import protect

ARTIFACT = Path(__file__).resolve().parent.parent / "artifacts" / "model.joblib"

ALLOW, STEP_UP, HOLD = "ALLOW", "STEP_UP", "HOLD"


def _reason(feat: str, f: dict, t: dict) -> str | None:
    x = f[feat]
    return {
        "amount_vs_usual": f"Amount is {x:.0f}x this customer's usual payment" if x >= 3 else None,
        "is_new_payee": "First payment to this receiver (not yet trusted)" if x else None,
        "is_new_device": "Paid from a device never seen on this account" if x else None,
        "is_new_city": f"Paid from an unusual location ({t.get('city')})" if x else None,
        "on_call": "Customer is on a live phone call while paying (scammer coaching pattern)" if x else None,
        "is_collect": "This is a COLLECT request: approving it SENDS money" if x else None,
        "is_night": "Unusual hour (late night)" if x else None,
        "payee_age_log": (f"Receiving account opened only {int(np.expm1(x))} days ago"
                          if np.expm1(x) < 60 else None),
        "payer_txns_1h": f"{int(x) + 1} payments within an hour (burst)" if x >= 2 else None,
        "payer_spend_24h_vs_usual": f"Last-24h spend is {x:.0f}x usual" if x >= 5 else None,
        "payee_fanin_24h": (f"Receiver got money from {int(x)} different people today (mule pattern)"
                            if x >= 3 else None),
        "secs_since_last_log": "Rapid follow-up payment" if np.expm1(x) < 600 else None,
        "payer_history_len_log": "Very little history on this account" if np.expm1(x) < 5 else None,
        "amount_log": f"Large amount (Rs {float(t['amount']):,.0f})" if float(t["amount"]) >= 20_000 else None,
    }.get(feat)


def _nudge(f: dict, t: dict) -> dict:
    """Plain-language warning shown to the customer, English + Hindi."""
    amt = f"Rs {float(t['amount']):,.0f}"
    if f["is_collect"]:
        return {"en": f"You are about to PAY {amt}. You never need to approve a request to RECEIVE money.",
                "hi": f"आप {amt} भेजने वाले हैं। पैसे पाने के लिए कभी भी रिक्वेस्ट स्वीकार करने की ज़रूरत नहीं होती।"}
    if f["on_call"] and f["is_new_payee"]:
        return {"en": "No police, CBI, customs or bank officer will ever ask you to transfer money on a call. "
                      "Hang up and dial 1930 (Cyber Crime Helpline).",
                "hi": "कोई भी पुलिस, CBI, कस्टम या बैंक अधिकारी कॉल पर पैसे ट्रांसफर करने को नहीं कहता। "
                      "कॉल काटें और 1930 (साइबर क्राइम हेल्पलाइन) पर संपर्क करें।"}
    if f["is_new_device"]:
        return {"en": "A new device is making payments from your account. If this is not you, block UPI and call your bank now.",
                "hi": "आपके खाते से एक नए डिवाइस से भुगतान हो रहा है। अगर यह आप नहीं हैं, तो UPI ब्लॉक करें और तुरंत बैंक को कॉल करें।"}
    return {"en": "This receiver is linked to suspicious activity. Please verify who you are paying before continuing.",
            "hi": "यह प्राप्तकर्ता संदिग्ध गतिविधि से जुड़ा है। आगे बढ़ने से पहले जांच लें कि आप किसे भुगतान कर रहे हैं।"}


class Engine:
    def __init__(self, artifact_path: Path = ARTIFACT):
        a = joblib.load(artifact_path)
        self.model = a["model"]
        self.iso = a["iso"]
        self.iso_cut = a["iso_cut"]          # novelty score at the 99.9th pct of legit traffic
        self.baseline = np.array(a["baseline"], dtype=float)
        self.t_step, self.t_hold = a["t_step"], a["t_hold"]
        self.metrics = a.get("metrics", {})
        self.store = FeatureStore()

    def warm_up(self, raw_txns) -> int:
        """Load historical behaviour so customer profiles exist (a bank already has this)."""
        n = 0
        for t in raw_txns:
            self.store.update(protect(t))
            n += 1
        return n

    def score(self, raw: dict, explain: bool = True) -> dict:
        t0 = time.perf_counter()
        t = protect(raw)
        f = self.store.compute(t)
        x = np.array([[f[k] for k in FEATURES]], dtype=float)
        risk = float(self.model.predict_proba(x)[0, 1])
        novelty = float(-self.iso.score_samples(x)[0])

        if risk >= self.t_hold:
            decision = HOLD
        elif risk >= self.t_step or novelty >= self.iso_cut:
            decision = STEP_UP
        else:
            decision = ALLOW

        reasons: list[dict] = []
        if explain and decision != ALLOW:
            reasons = self._explain(x, risk, f, t)
        self.store.update(t)
        latency_ms = (time.perf_counter() - t0) * 1000
        return {
            "txn_id": t.get("txn_id"),
            "ts": int(t["ts"]),
            "amount": float(t["amount"]),
            "txn_type": t["txn_type"],
            "payer": t["payer_mask"],
            "payee": t["payee_mask"],
            "city": t["city"],
            "risk": round(risk, 4),
            "novelty": round(novelty, 4),
            "novel": novelty >= self.iso_cut,
            "decision": decision,
            "reasons": reasons,
            "nudge": _nudge(f, t) if decision != ALLOW else None,
            "latency_ms": round(latency_ms, 2),
            "label": raw.get("label"),
            "fraud_type": raw.get("fraud_type") or None,
        }

    def _explain(self, x: np.ndarray, risk: float, f: dict, t: dict, k: int = 3) -> list[dict]:
        """Occlusion attribution: how much does risk drop if a feature looked 'normal'?"""
        n = len(FEATURES)
        probe = np.repeat(x, n, axis=0)
        probe[np.arange(n), np.arange(n)] = self.baseline
        drops = risk - self.model.predict_proba(probe)[:, 1]
        out = []
        for i in np.argsort(-drops):
            if drops[i] <= 0.01 or len(out) >= k:
                break
            text = _reason(FEATURES[i], f, t)
            if text:
                out.append({"feature": FEATURES[i], "impact": round(float(drops[i]), 3), "text": text})
        if not out:
            out.append({"feature": "novelty", "impact": 0.0,
                        "text": "Unusual combination of behaviour never seen in normal traffic"})
        return out
