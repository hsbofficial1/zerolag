# Running ZeroLag on IBM LinuxONE

Use the LinuxONE guest you were given in the 16 Oct "Get Your LinuxONE System Ready" session.

## 1. Connect and check the architecture

```bash
ssh <user>@<your-linuxone-ip>        # use the key/credentials from the setup session
uname -m                             # must print: s390x
python3 --version                    # 3.9+ is fine
```

## 2. Get the code

```bash
git clone https://github.com/hsbofficial1/zerolag.git
cd zerolag
```

(No git or internet? `scp -r` the folder from your laptop instead.)

## 3. Install dependencies

**Option A: pip in a virtualenv (try this first)**

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

If pip tries to compile scikit-learn/scipy and fails, install the build tools and retry:

```bash
# Ubuntu / Debian
sudo apt-get update && sudo apt-get install -y build-essential gfortran libopenblas-dev python3-dev
# RHEL
sudo dnf install -y gcc gcc-c++ gcc-gfortran openblas-devel python3-devel
```

**Option B: distro packages (fastest, no compiling)**

```bash
# Ubuntu / Debian
sudo apt-get install -y python3-numpy python3-pandas python3-sklearn python3-joblib python3-flask
```

**Option C: container**

```bash
docker build -t zerolag .            # or: podman build -t zerolag .
docker run -d -p 8000:8000 zerolag
```

## 4. Train and run

```bash
python3 -m zerolag.data_gen
python3 -m zerolag.train            # prints metrics incl. latency measured ON LinuxONE
python3 -m zerolag.app              # serves on 0.0.0.0:8000
```

Keep it running after you log out: `nohup python3 -m zerolag.app > zerolag.log 2>&1 &`

## 5. Open the dashboard

If port 8000 is not reachable from outside, tunnel it:

```bash
ssh -L 8000:localhost:8000 <user>@<your-linuxone-ip>
```

Then open http://localhost:8000 on your laptop.

## 6. Proof for judges (screenshot / record these)

```bash
uname -a                                  # shows s390x
lscpu | head -20                          # shows IBM Z / LinuxONE CPU
cat artifacts/metrics.json                # latency measured on LinuxONE
lscpu | grep -i nnpa || grep -i nnpa /proc/cpuinfo   # Telum AI accelerator (z16 / LinuxONE 4 and newer)
```

Put the `metrics.json` from LinuxONE in the repo (commit it) and mention the LinuxONE latency in the pitch.

## Production path on IBM Z (roadmap, for the pitch)

1. **On-chip AI inference**: serve the tree model through **IBM Snap ML** or export it to ONNX and compile it with the **IBM Z Deep Learning Compiler**, so inference runs on the Telum Integrated Accelerator for AI (NNPA).
2. **In-transaction scoring on z/OS**: deploy the same model with **Machine Learning for z/OS** and call it from the CICS/IMS payment transaction.
3. **Keys in hardware**: move `ZEROLAG_TOKEN_KEY` into a **Crypto Express** HSM (CCA/EP11 HMAC) and enable **pervasive encryption** for the feature-store snapshot.
4. **Confidential computing**: run the container in an **IBM Secure Execution** guest / Hyper Protect Virtual Server so even platform admins can't read customer behaviour data.
5. **Quantum-safe**: use quantum-safe TLS and key wrapping (ML-KEM / ML-DSA) between the UPI switch and ZeroLag.
