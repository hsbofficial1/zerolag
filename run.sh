#!/usr/bin/env bash
# One-shot setup + run (Linux / LinuxONE / macOS). Windows: run the three python commands manually.
set -euo pipefail
cd "$(dirname "$0")"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python -m zerolag.data_gen
python -m zerolag.train
python -m zerolag.app
