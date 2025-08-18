FROM moicben/agi-engine:staged

# Become root to install system dependencies and Node.js
USER root

# Optional: remove problematic third-party apt sources that cause NO_PUBKEY errors
RUN rm -f /etc/apt/sources.list.d/google-chrome.list \
    /etc/apt/sources.list.d/signal-xenial.list \
    /etc/apt/trusted.gpg.d/google-chrome.gpg || true

# Base deps and toolchain
RUN apt-get update -o Acquire::Check-Valid-Until=false \
    && apt-get install -y --no-install-recommends \
       ca-certificates curl gnupg \
       build-essential make g++ python3 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (NodeSource) + npm
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && node --version && npm --version

# Install cursor-agent CLI
RUN curl -fsSL https://cursor.sh/install-agent | bash

# Prepare workspace
RUN mkdir -p /home/kasm-user/project && chown -R kasm-user:kasm-user /home/kasm-user
WORKDIR /home/kasm-user/project

# Switch to non-root for npm installs
USER kasm-user

# Install dependencies with caching
COPY --chown=kasm-user:kasm-user package.json package-lock.json* ./
RUN npm ci || npm install

# Copy the rest of the project
COPY --chown=kasm-user:kasm-user . .


