ARG LOBEHUB_IMAGE=lobehub/lobehub:2.2.11

FROM ${LOBEHUB_IMAGE} AS lobehub

FROM node:24-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1001 nodejs \
    && useradd --uid 1001 --gid 1001 --no-create-home nextjs \
    && ln -sf /usr/local/bin/node /bin/node

COPY --from=lobehub --chown=1001:1001 /app /app
COPY bootstrap.mjs /bootstrap.mjs

ENV PORT=3210
EXPOSE 3210

ENTRYPOINT ["node", "/bootstrap.mjs"]
