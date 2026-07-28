ARG LOBEHUB_IMAGE=lobehub/lobehub:2.2.11

FROM ${LOBEHUB_IMAGE}

USER root

COPY bootstrap.mjs /bootstrap.mjs

ENV JWKS_DATA_DIR=/data

ENTRYPOINT ["/bin/node"]
CMD ["/bootstrap.mjs"]
