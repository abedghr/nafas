#!/bin/sh
set -e
# Swarm-secret shim: for any VAR_FILE env pointing at a readable file, load its
# contents into VAR (so DATABASE_URL, JWT_*, SMTP_* can be docker secrets).
for pair in $(env | grep '_FILE=' || true); do
  var="${pair%%=*}"
  file="${pair#*=}"
  target="${var%_FILE}"
  if [ -n "$file" ] && [ -f "$file" ]; then
    val="$(cat "$file")"
    export "$target=$val"
  fi
done
exec node server_dist/index.js
