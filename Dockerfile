FROM registry.gitlab.com/openbeta/openbeta-nodejs-docker:16.3

ENV APP_DIR=/apps/openbeta-graphql

WORKDIR ${APP_DIR}
EXPOSE 4000

RUN mkdir -p ${APP_DIR}

COPY package.json yarn.lock tsconfig.json refresh-db.sh ./
COPY src ./src

RUN yarn install --no-progress && \
    yarn build

CMD yarn serve
