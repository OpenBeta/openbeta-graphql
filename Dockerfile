FROM registry.gitlab.com/openbeta/openbeta-nodejs-docker:16

ENV APP_DIR=/apps/openbeta-graphql

WORKDIR ${APP_DIR}
EXPOSE 4000

RUN mkdir -p ${APP_DIR}

COPY . *.env ./


RUN yarn install --no-progress && \
    yarn build-release

CMD node --experimental-json-modules build/main.js
