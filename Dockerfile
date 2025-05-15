FROM node:22-alpine

ENV APP_DIR=/apps/openbeta-graphql

WORKDIR ${APP_DIR}
EXPOSE 4000

RUN mkdir -p ${APP_DIR}

COPY . *.env ./


RUN yarn install --no-progress && \
    yarn build-release

CMD ["node", "build/main.js"]
