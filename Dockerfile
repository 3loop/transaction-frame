# syntax = docker/dockerfile:1

# Adjust BUN_VERSION as desired
ARG BUN_VERSION=1.1.24
FROM oven/bun:${BUN_VERSION}-slim as base

RUN apt-get update  -qq && \
    apt-get install -y curl pkg-config ca-certificates fuse3 build-essential python-is-python3


# Install node for running migrations with drizzle kit
ENV NODE_VERSION=20.15.0

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"

LABEL fly_launch_runtime="Bun"

# Bun app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --ci

# Final stage for app image
FROM base

# Copy application code
COPY --link . .

COPY --from=install /temp/dev/node_modules node_modules

# Configure litefs
COPY --from=flyio/litefs:0.5.9 /usr/local/bin/litefs /usr/local/bin/litefs
RUN mkdir -p /litefs /var/lib/litefs
ADD litefs.yml /etc/litefs.yml

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
ENV PORT="3001"
ENV DB_PATH=/litefs/db.sqlite

ENTRYPOINT [ "litefs", "mount" ]