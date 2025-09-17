FROM registry.gitlab.com/openbeta/openbeta-nodejs-docker:18

ENV APP_DIR=/apps/openbeta-graphql

WORKDIR ${APP_DIR}
EXPOSE 4000

RUN mkdir -p ${APP_DIR}

COPY . *.env ./


RUN yarn install --no-progress && \
    yarn build-release

CMD node --max-old-space-size=1024 --max-semi-space-size=128 --optimize-for-size --gc-interval=100 --expose-gc --experimental-json-modules build/main.js
