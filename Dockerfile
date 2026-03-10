# =============================================================================
# Zylith ASP — Fly.io Dockerfile
# Multi-stage build: Rust compilation → Python 3.10 runtime with Node.js
# Build context: repo root (needed because worker imports from circuits/)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build the Rust binary
# ---------------------------------------------------------------------------
FROM rust:1.93-bookworm AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /build/asp

# Copy everything and build
COPY asp/Cargo.toml asp/Cargo.lock ./
COPY asp/src ./src

RUN cargo build --release

# ---------------------------------------------------------------------------
# Stage 2: Runtime (Python 3.10 base — required by garaga)
# ---------------------------------------------------------------------------
FROM python:3.10-slim-bookworm AS runtime

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    unzip \
    libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS (needed by worker for snarkjs/circomlibjs)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Bun (used for package management)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Install garaga CLI
RUN pip install --no-cache-dir garaga

WORKDIR /app

# Copy the Rust binary
COPY --from=builder /build/asp/target/release/zylith-asp /usr/local/bin/zylith-asp

# Copy the worker and its dependencies
COPY asp/worker ./asp/worker
RUN cd asp/worker && bun install --frozen-lockfile

# Copy circuits JS libraries (imported by worker)
COPY circuits/scripts/lib ./circuits/scripts/lib
COPY circuits/package.json ./circuits/package.json
RUN cd circuits && bun install --frozen-lockfile

# Copy circuit build artifacts if they exist
COPY circuits/buil[d] ./circuits/build

# Copy garaga verifiers if they exist
COPY garaga_verifier[s] ./garaga_verifiers

# Copy deployed addresses
COPY scripts/deployed_addresses.json ./scripts/deployed_addresses.json

# Create data directory for SQLite persistent volume
RUN mkdir -p /data

ENV DEPLOYED_ADDRESSES_PATH="/app/scripts/deployed_addresses.json"

EXPOSE 8080

CMD ["zylith-asp"]
