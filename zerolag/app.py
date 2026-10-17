"""ZeroLag API + live demo.

  GET  /                  analyst dashboard
  POST /api/score         score one transaction (the in-transaction call)
  GET  /api/feed?since=N  recent decisions from the live stream replay
  GET  /api/stats         running KPIs + offline evaluation metrics
  POST /api/stream        {"running": true|false, "tps": 25}

Usage:  python -m zerolag.app   (then open http://localhost:8000)
"""
from __future__ import annotations

import os
import platform
import threading
import time
from collections import deque
from pathlib import Path

import pandas as pd
from flask import Flask, jsonify, request, send_from_directory

from .data_gen import START_TS
from .engine import Engine
from .train import CALIB_END, DATA

STATIC = Path(__file__).resolve().parent / "static"
app = Flask(__name__, static_folder=None)
lock = threading.Lock()

engine = Engine()
_df = pd.read_csv(DATA, keep_default_na=False)
_day = (_df["ts"] - START_TS) // 86_400
engine.warm_up(_df[_day < CALIB_END].to_dict("records"))
REPLAY = _df[_day >= CALIB_END].to_dict("records")   # unseen future traffic

HOST = {"arch": platform.machine(), "os": platform.system(), "python": platform.python_version(),
        "node": platform.node()}

feed: deque = deque(maxlen=400)
alerts: deque = deque(maxlen=300)   # flagged decisions, so a freshly opened console has history
stats = {"seq": 0, "scored": 0, "allow": 0, "step_up": 0, "hold": 0,
         "fraud_seen": 0, "fraud_caught": 0, "amount_protected": 0.0, "legit_flagged": 0,
         "lat_sum": 0.0, "lat_max": 0.0}
stream = {"running": True, "tps": float(os.environ.get("ZEROLAG_TPS", 25)), "pos": 0}


def _record(res: dict, source: str) -> dict:
    with lock:
        stats["seq"] += 1
        res = {**res, "seq": stats["seq"], "source": source}
        stats["scored"] += 1
        stats[res["decision"].lower()] += 1
        stats["lat_sum"] += res["latency_ms"]
        stats["lat_max"] = max(stats["lat_max"], res["latency_ms"])
        flagged = res["decision"] != "ALLOW"
        if res.get("label") == 1:
            stats["fraud_seen"] += 1
            if flagged:
                stats["fraud_caught"] += 1
                stats["amount_protected"] += res["amount"]
        elif res.get("label") == 0 and flagged:
            stats["legit_flagged"] += 1
        feed.append(res)
        if flagged:
            alerts.append(res)
    return res


def _streamer():
    while True:
        if not stream["running"]:
            time.sleep(0.2)
            continue
        raw = REPLAY[stream["pos"] % len(REPLAY)]
        stream["pos"] += 1
        with lock:
            res = engine.score(raw)
        _record(res, "stream")
        time.sleep(1.0 / max(stream["tps"], 0.5))


@app.get("/")
def index():
    return send_from_directory(STATIC, "index.html")


@app.post("/api/score")
def score():
    body = request.get_json(force=True)
    required = ["payer_vpa", "payee_vpa", "amount", "device_id", "city", "txn_type"]
    missing = [k for k in required if k not in body]
    if missing:
        return jsonify({"error": f"missing fields: {missing}"}), 400
    txn = {"txn_id": body.get("txn_id", f"API{int(time.time() * 1000)}"),
           "ts": int(body.get("ts", REPLAY[stream["pos"] % len(REPLAY)]["ts"])),
           "on_call": int(body.get("on_call", 0)),
           "payee_account_age_days": int(body.get("payee_account_age_days", 365)),
           **{k: body[k] for k in required}}
    with lock:
        res = engine.score(txn)
    return jsonify(_record(res, "api"))


@app.get("/api/feed")
def get_feed():
    since = int(request.args.get("since", 0))
    with lock:
        items = [r for r in feed if r["seq"] > since][-150:]
        if since == 0:  # first load: include earlier alerts too
            seen = {r["seq"] for r in items}
            items = sorted([a for a in alerts if a["seq"] not in seen] + items, key=lambda r: r["seq"])
    return jsonify(items)


@app.get("/api/stats")
def get_stats():
    with lock:
        s = dict(stats)
    s["avg_latency_ms"] = round(s["lat_sum"] / s["scored"], 2) if s["scored"] else 0
    s["stream"] = {k: stream[k] for k in ("running", "tps")}
    s["offline"] = engine.metrics
    s["host"] = HOST
    return jsonify(s)


@app.post("/api/stream")
def set_stream():
    body = request.get_json(force=True)
    if "running" in body:
        stream["running"] = bool(body["running"])
    if "tps" in body:
        stream["tps"] = float(body["tps"])
    return jsonify(stream)


@app.get("/api/customers")
def customers():
    """A few real (synthetic) customers with history, for the 'try a scam' panel."""
    sample = _df[(_day < CALIB_END) & (_df["label"] == 0) & _df["payer_vpa"].str.startswith("user")]
    picks = sample.groupby("payer_vpa").agg(device_id=("device_id", "last"), city=("city", "last"),
                                            age=("payer_age", "first"), median_amount=("amount", "median"),
                                            regular_payee=("payee_vpa", lambda s: s.mode().iat[0]),
                                            payments=("amount", "size"))
    picks = pd.concat([picks.sort_values("age", ascending=False).head(3), picks.sort_values("age").head(2)])
    return jsonify(picks.reset_index().to_dict("records"))


def main():
    threading.Thread(target=_streamer, daemon=True).start()
    app.run(host=os.environ.get("HOST", "0.0.0.0"), port=int(os.environ.get("PORT", 8000)), threaded=True)


if __name__ == "__main__":
    main()
