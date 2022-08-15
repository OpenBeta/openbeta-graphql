FROM node:16.16-buster-slim

ENV APP_DIR=/apps/openbeta-graphql

WORKDIR ${APP_DIR}
EXPOSE 4000

RUN mkdir -p ${APP_DIR}

COPY . ./

RUN yarn install --no-progress && \
    yarn build

CMD node --experimental-json-modules build/main.js
