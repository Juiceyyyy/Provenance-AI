FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml ./
COPY grounded_worker ./grounded_worker
RUN python -m pip install --upgrade pip && pip install . --extra-index-url https://download.pytorch.org/whl/cpu
RUN useradd --create-home --uid 10001 worker && chown -R worker:worker /app
USER worker
CMD ["grounded-worker"]
