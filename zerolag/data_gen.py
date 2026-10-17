"""Synthetic UPI transaction generator.

Real UPI data is (rightly) not public, so we simulate a month of UPI traffic for
a population of users and inject four real-world fraud patterns reported by
NPCI / RBI / I4C advisories:

  digital_arrest   - victim is kept on a call by a fake "police/CBI/customs"
                     officer and pushed to send large sums to a new payee (mule)
  account_takeover - SIM-swap / remote-access app: new device, new city,
                     rapid high-value transfers to new payees
  collect_scam     - "you won a prize, approve this request to receive money"
                     (UPI COLLECT request approved from an unknown payee)
  mule_cashout     - mule accounts receive from many victims then quickly
                     forward the money onward

Legit traffic deliberately contains confusing cases (big rent payments to new
payees, payments made while on a call, night owls) so the model has to learn
combinations of signals rather than one trivial rule.

Usage:  python -m zerolag.data_gen --out data/transactions.csv
"""
from __future__ import annotations

import argparse
import csv
import math
import random
from dataclasses import dataclass, field
from pathlib import Path

BANKS = ["okaxis", "oksbi", "okhdfcbank", "okicici", "ybl", "paytm", "ibl", "upi"]
CITIES = ["Bengaluru", "Chennai", "Mumbai", "Delhi", "Hyderabad", "Pune",
          "Kolkata", "Jaipur", "Lucknow", "Kochi", "Bhopal", "Patna"]
DAY = 86_400
START_TS = 1_788_201_000  # 2026-09-01 00:00:00 IST (hours below are IST)


@dataclass
class User:
    vpa: str
    age: int
    city: str
    device: str
    typical_amount: float     # median rupees per txn
    active_hour: float        # hour of day they usually transact
    daily_rate: float         # expected txns per day
    payees: list[str] = field(default_factory=list)
    created_day: int = -400   # account age reference (days before START)


def _vpa(rng: random.Random, prefix: str, i: int) -> str:
    return f"{prefix}{i:05d}@{rng.choice(BANKS)}"


def _amount(rng: random.Random, typical: float, spread: float = 0.8) -> float:
    return round(max(1.0, rng.lognormvariate(math.log(typical), spread)), 2)


def _hour(rng: random.Random, centre: float) -> float:
    return (rng.gauss(centre, 3.0)) % 24


class Generator:
    def __init__(self, n_users: int, n_merchants: int, n_mules: int, days: int, seed: int):
        self.rng = random.Random(seed)
        self.days = days
        rng = self.rng
        self.merchants = [_vpa(rng, "merchant", i) for i in range(n_merchants)]
        # ~15% of merchants are new shops (young accounts are not automatically bad)
        self.merchant_age = {m: rng.randint(0, 45) if rng.random() < 0.15 else rng.randint(200, 3000)
                             for m in self.merchants}
        self.users: list[User] = []
        for i in range(n_users):
            age = int(min(85, max(18, rng.gauss(40, 15))))
            u = User(
                vpa=_vpa(rng, "user", i),
                age=age,
                city=rng.choice(CITIES),
                device=f"dev-{rng.getrandbits(40):010x}",
                typical_amount=rng.choice([150, 300, 500, 900, 1500, 2500]),
                active_hour=rng.choice([9, 11, 13, 18, 20, 22]) + rng.random(),
                daily_rate=rng.uniform(0.3, 2.0),
                created_day=-(rng.randint(0, 60) if rng.random() < 0.12 else rng.randint(60, 3000)),
            )
            self.users.append(u)
        # personal payee pools: friends, family, regular shops
        for u in self.users:
            k = rng.randint(4, 12)
            friends = [rng.choice(self.users).vpa for _ in range(k // 2)]
            shops = rng.sample(self.merchants, k - k // 2)
            u.payees = [p for p in friends + shops if p != u.vpa]
        self.user_age_days = {u.vpa: -u.created_day for u in self.users}
        self.age_by_vpa = {u.vpa: u.age for u in self.users}
        # mule accounts: some freshly opened, many are old accounts rented/bought from real people
        self.mules = [_vpa(rng, "acct", 90000 + i) for i in range(n_mules)]
        self.mule_open_day = {m: rng.randint(-20, days - 5) if rng.random() < 0.55 else -rng.randint(100, 2500)
                              for m in self.mules}
        self.rows: list[dict] = []
        self._id = 0

    # ------------------------------------------------------------------ utils
    def _payee_age(self, payee: str, day: int) -> int:
        if payee in self.mule_open_day:
            return max(0, day - self.mule_open_day[payee])
        if payee in self.merchant_age:
            return self.merchant_age[payee] + day
        return self.user_age_days.get(payee, 365) + day

    def _emit(self, ts: float, payer: str, payee: str, amount: float, device: str,
              city: str, txn_type: str, on_call: bool, label: int, fraud_type: str):
        self._id += 1
        day = int((ts - START_TS) // DAY)
        self.rows.append({
            "txn_id": f"T{self._id:08d}",
            "ts": int(ts),
            "payer_vpa": payer,
            "payee_vpa": payee,
            "amount": amount,
            "device_id": device,
            "city": city,
            "txn_type": txn_type,
            "on_call": int(on_call),
            "payee_account_age_days": self._payee_age(payee, day),
            # payer age is kept only for the fairness audit; it is NOT a model feature
            "payer_age": self.age_by_vpa.get(payer, -1),
            "label": label,
            "fraud_type": fraud_type,
        })

    def _live_mules(self, day: int) -> list[str]:
        live = [m for m in self.mules if self.mule_open_day[m] <= day]
        return live or self.mules[:3]

    # ------------------------------------------------------------- legit flow
    def legit_day(self, day: int):
        rng = self.rng
        for u in self.users:
            n = _poisson(rng, u.daily_rate)
            for _ in range(n):
                ts = START_TS + day * DAY + _hour(rng, u.active_hour) * 3600
                r = rng.random()
                if r < 0.86:
                    payee = rng.choice(u.payees)
                    amount = _amount(rng, u.typical_amount)
                elif r < 0.96:  # new shop / new friend, normal size
                    payee = rng.choice(self.merchants + [rng.choice(self.users).vpa])
                    amount = _amount(rng, u.typical_amount)
                else:           # rent, deposit, gadget: big + new payee (hard negative)
                    payee = rng.choice(self.merchants)
                    amount = _amount(rng, u.typical_amount * rng.uniform(4, 40), 0.5)
                txn_type = "P2M" if payee.startswith("merchant") else "P2P"
                if rng.random() < 0.03:
                    txn_type = "COLLECT"  # legit collect requests from known shops
                    shops = [p for p in u.payees if p.startswith("merchant")]
                    payee = rng.choice(shops if shops and rng.random() < 0.7 else self.merchants)
                device, city = u.device, u.city
                if rng.random() < 0.01:   # travelling / new phone (hard negative)
                    city = rng.choice(CITIES)
                if rng.random() < 0.004:
                    device = f"dev-{rng.getrandbits(40):010x}"
                    u.device = device
                on_call = rng.random() < (0.2 if r >= 0.96 else 0.08)  # people call the landlord too
                self._emit(ts, u.vpa, payee, amount, device, city, txn_type, on_call, 0, "")
                if rng.random() < 0.02 and payee not in u.payees:
                    u.payees.append(payee)

    # ------------------------------------------------------------- fraud flows
    def digital_arrest(self, day: int):
        rng = self.rng
        # older users are targeted more often, but anyone can be a victim
        victim = rng.choices(self.users, weights=[1 + (u.age > 55) * 3 for u in self.users])[0]
        mule = rng.choice(self._live_mules(day))
        ts = START_TS + day * DAY + rng.uniform(9, 23) * 3600
        for _ in range(rng.randint(1, 4)):
            amount = _amount(rng, victim.typical_amount * rng.uniform(3, 40), 0.6)
            amount = min(amount, 100_000.0)  # UPI per-txn cap
            self._emit(ts, victim.vpa, mule, amount, victim.device, victim.city, "P2P",
                       rng.random() < 0.75, 1, "digital_arrest")
            ts += rng.uniform(120, 1500)
        self._cashout(mule, ts, day)

    def account_takeover(self, day: int):
        rng = self.rng
        victim = rng.choice(self.users)
        device = f"dev-{rng.getrandbits(40):010x}"
        # remote-access-app takeovers happen from the victim's own city
        city = rng.choice([c for c in CITIES if c != victim.city]) if rng.random() < 0.6 else victim.city
        ts = START_TS + day * DAY + rng.choice([rng.uniform(0, 5), rng.uniform(10, 23)]) * 3600
        for _ in range(rng.randint(2, 6)):
            mule = rng.choice(self._live_mules(day))
            amount = _amount(rng, victim.typical_amount * rng.uniform(2, 25), 0.6)
            self._emit(ts, victim.vpa, mule, min(amount, 100_000.0), device, city, "P2P",
                       rng.random() < 0.1, 1, "account_takeover")
            ts += rng.uniform(20, 300)

    def collect_scam(self, day: int):
        rng = self.rng
        victim = rng.choice(self.users)
        mule = rng.choice(self._live_mules(day))
        ts = START_TS + day * DAY + _hour(rng, victim.active_hour) * 3600
        amount = _amount(rng, rng.choice([1999, 4999, 9999, 24999]), 0.2)
        self._emit(ts, victim.vpa, mule, amount, victim.device, victim.city, "COLLECT",
                   rng.random() < 0.4, 1, "collect_scam")

    def _cashout(self, mule: str, ts: float, day: int):
        rng = self.rng
        if rng.random() < 0.6:
            nxt = rng.choice(self._live_mules(day))
            if nxt != mule:
                self._emit(ts + rng.uniform(300, 3600), mule, nxt,
                           _amount(rng, 40_000, 0.5), f"dev-mule-{mule[:9]}",
                           rng.choice(CITIES), "P2P", False, 1, "mule_cashout")

    # ------------------------------------------------------------------- run
    def run(self, fraud_per_day: float) -> list[dict]:
        rng = self.rng
        for day in range(self.days):
            self.legit_day(day)
            for _ in range(_poisson(rng, fraud_per_day)):
                rng.choices(
                    [self.digital_arrest, self.account_takeover, self.collect_scam],
                    weights=[0.45, 0.30, 0.25])[0](day)
        self.rows.sort(key=lambda r: r["ts"])
        return self.rows


def _poisson(rng: random.Random, lam: float) -> int:
    l, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= l:
            return k
        k += 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/transactions.csv")
    ap.add_argument("--users", type=int, default=4000)
    ap.add_argument("--merchants", type=int, default=600)
    ap.add_argument("--mules", type=int, default=80)
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--fraud-per-day", type=float, default=22.0)
    ap.add_argument("--seed", type=int, default=2026)
    a = ap.parse_args()

    rows = Generator(a.users, a.merchants, a.mules, a.days, a.seed).run(a.fraud_per_day)
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    n_fraud = sum(r["label"] for r in rows)
    print(f"wrote {len(rows):,} transactions ({n_fraud:,} fraud, "
          f"{100 * n_fraud / len(rows):.2f}%) -> {out}")


if __name__ == "__main__":
    main()
