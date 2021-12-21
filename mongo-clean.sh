#!/bin/bash
docker compose down
docker volume prune --force
docker compose up -d
