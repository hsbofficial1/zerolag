"""Kavach - real-time, privacy-preserving UPI scam shield."""
import os

# Per-transaction inference scores ONE row at a time; OpenMP thread start-up costs
# far more than the work itself, so pin to one thread per request (scale out instead).
os.environ.setdefault("OMP_NUM_THREADS", "1")
