#!/usr/bin/env bash
set -euo pipefail
sha=${1:?Commit SHA required}
[[ "$sha" =~ ^[a-f0-9]{40}$ ]]
base=/opt/ahmed-portfolio
release="$base/releases/$sha"
exec 9>"$base/deploy.lock"
flock 9
previous=$(readlink -f "$base/current" 2>/dev/null || true)
compose() { local directory="$1"; shift; IMAGE_TAG=$(basename "$directory") docker compose -f "$directory/deploy/compose.yml" "$@"; }
rollback() {
 status=$?
 if [[ $status -ne 0 && -n "$previous" ]]; then compose "$previous" up -d --wait --wait-timeout 90 || true; fi
 exit "$status"
}
trap rollback EXIT
docker load -i "$release/image.tar.gz" >/dev/null
compose "$release" up -d --wait --wait-timeout 120
curl --fail --silent --show-error --retry 5 --retry-delay 2 https://ahmed-esmail.tech/healthz >/dev/null
curl --fail --silent --show-error https://ahmed-esmail.tech/ >/dev/null
ln -sfn "$release" "$base/current"
rm -f "$release/image.tar.gz" "$base/incoming/$sha.tgz"
trap - EXIT
echo "Deployed $sha to https://ahmed-esmail.tech"
