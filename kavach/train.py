"""Train, calibrate thresholds, evaluate (incl. fairness + latency) and save.

Time-based split, never random: the model is always tested on the future.
  days  0-17  train
  days 18-22  calibrate decision thresholds
  days 23-29  held-out test (also used for the live demo replay)

Usage:  python -m kavach.train
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, IsolationForest
from sklearn.metrics import average_precision_score, precision_recall_curve, roc_auc_score

from .data_gen import START_TS
from .features import FEATURES, FeatureStore
from .privacy import protect

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "transactions.csv"
OUT = ROOT / "artifacts"
TRAIN_END, CALIB_END = 18, 23


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    store = FeatureStore()
    rows = [store.process(protect(t)) for t in df.to_dict("records")]
    return pd.DataFrame(rows, columns=FEATURES)


def pick_thresholds(y, p) -> tuple[float, float]:
    prec, rec, thr = precision_recall_curve(y, p)
    prec, rec = prec[:-1], rec[:-1]
    # HOLD: highest-recall threshold that is still >= 90% precise (few wrongly blocked)
    ok = np.where(prec >= 0.90)[0]
    t_hold = float(thr[ok[0]]) if len(ok) else 0.9
    # STEP-UP: catch ~97% of fraud with a light-touch confirmation screen
    ok = np.where(rec >= 0.97)[0]
    t_step = float(thr[ok[-1]]) if len(ok) else 0.2
    t_hold = max(t_hold, 0.5)
    return float(np.clip(t_step, 0.05, t_hold * 0.9)), t_hold


def decide(p, nov, t_step, t_hold, iso_cut):
    return np.where(p >= t_hold, "HOLD", np.where((p >= t_step) | (nov >= iso_cut), "STEP_UP", "ALLOW"))


def main():
    df = pd.read_csv(DATA, keep_default_na=False)
    t0 = time.time()
    X = build_features(df).to_numpy()  # numpy, so serving (1-row arrays) matches training
    print(f"features for {len(df):,} txns in {time.time() - t0:.1f}s")
    y = df["label"].to_numpy()
    day = ((df["ts"] - START_TS) // 86_400).to_numpy()
    tr, ca, te = day < TRAIN_END, (day >= TRAIN_END) & (day < CALIB_END), day >= CALIB_END

    model = HistGradientBoostingClassifier(max_iter=300, learning_rate=0.06, max_leaf_nodes=31,
                                           l2_regularization=1.0, random_state=7)
    model.fit(X[tr], y[tr])
    iso = IsolationForest(n_estimators=60, max_samples=256, random_state=7).fit(X[tr & (y == 0)])

    p_ca = model.predict_proba(X[ca])[:, 1]
    t_step, t_hold = pick_thresholds(y[ca], p_ca)
    nov_ca = -iso.score_samples(X[ca])
    iso_cut = float(np.quantile(nov_ca[y[ca] == 0], 0.999))

    # ------------------------------------------------------------ evaluation
    p = model.predict_proba(X[te])[:, 1]
    nov = -iso.score_samples(X[te])
    d = decide(p, nov, t_step, t_hold, iso_cut)
    yt, dt = y[te], df[te]
    fraud, legit = yt == 1, yt == 0
    flagged = d != "ALLOW"
    amt = dt["amount"].to_numpy()

    by_type = {ft: round(float(flagged[(dt["fraud_type"] == ft).to_numpy()].mean()), 3)
               for ft in sorted(set(dt["fraud_type"]) - {""})}
    ages = dt["payer_age"].to_numpy()
    groups = {"18-35": (ages >= 18) & (ages <= 35), "36-55": (ages > 35) & (ages <= 55), "56+": ages > 55}
    fairness = {g: {"legit_friction_rate": round(float(flagged[m & legit].mean()), 4),
                    "fraud_recall": round(float(flagged[m & fraud].mean()), 3) if (m & fraud).any() else None}
                for g, m in groups.items()}

    metrics = {
        "test_txns": int(te.sum()), "test_fraud": int(fraud.sum()),
        "roc_auc": round(float(roc_auc_score(yt, p)), 4),
        "pr_auc": round(float(average_precision_score(yt, p)), 4),
        "hold_precision": round(float(fraud[d == "HOLD"].mean()), 3) if (d == "HOLD").any() else None,
        "hold_recall": round(float((d[fraud] == "HOLD").mean()), 3),
        "flag_recall": round(float(flagged[fraud].mean()), 3),
        "legit_friction_rate": round(float(flagged[legit].mean()), 4),
        "legit_blocked_rate": round(float((d[legit] == "HOLD").mean()), 4),
        "fraud_amount_total": round(float(amt[fraud].sum())),
        "fraud_amount_intercepted": round(float(amt[fraud & flagged].sum())),
        "recall_by_fraud_type": by_type,
        "fairness_by_age_group": fairness,
        "thresholds": {"step_up": round(t_step, 4), "hold": round(t_hold, 4), "novelty": round(iso_cut, 4)},
    }

    baseline = np.median(X[tr & (y == 0)], axis=0)
    OUT.mkdir(exist_ok=True)
    art = OUT / "model.joblib"
    joblib.dump({"model": model, "iso": iso, "iso_cut": iso_cut, "baseline": baseline,
                 "t_step": t_step, "t_hold": t_hold, "features": FEATURES, "metrics": metrics}, art)

    # latency: full single-transaction path (privacy + features + model + explain)
    from .engine import Engine
    eng = Engine(art)
    eng.warm_up(df[~te].to_dict("records"))
    lat = [eng.score(r)["latency_ms"] for r in df[te].head(1500).to_dict("records")]
    metrics["latency_ms"] = {"p50": round(float(np.percentile(lat, 50)), 2),
                             "p99": round(float(np.percentile(lat, 99)), 2)}
    joblib.dump({**joblib.load(art), "metrics": metrics}, art)
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
