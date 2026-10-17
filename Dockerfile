# Multi-arch: builds natively on IBM LinuxONE (linux/s390x) and on x86/ARM laptops.
FROM python:3.12-slim
WORKDIR /app
# build tools only needed if a wheel is not published for the platform (e.g. some s390x packages)
RUN apt-get update && apt-get install -y --no-install-recommends build-essential gfortran libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY kavach ./kavach
# generate data + train inside the image so the model is built for this architecture
RUN python -m kavach.data_gen && python -m kavach.train
ENV PORT=8000 OMP_NUM_THREADS=1
EXPOSE 8000
CMD ["python", "-m", "kavach.app"]
