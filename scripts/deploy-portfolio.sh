#!/usr/bin/env bash
# Run on the existing Ubuntu host, as root, with a git-archive of the verified commit.
# Builds in a new directory, checks a loopback candidate, then changes only the website unit.
set -Eeuo pipefail

[[ $(id -u) == 0 ]] || { echo "Run as root on the website host."; exit 1; }
[[ $# == 2 && "$2" =~ ^[a-f0-9]{40}$ ]] || { echo "Usage: deploy-portfolio.sh source.tar.gz commit_sha"; exit 1; }
archive=$(realpath "$1")
commit=$2
tag=$(date -u +%Y%m%dT%H%M%SZ)
current=/srv/obsidian-journal
release="/srv/obsidian-journal-releases/${tag}-${commit:0:12}"
backup="/var/backups/homepage/$tag"
override=/etc/systemd/system/obsidian-dev.service.d/zzz-portfolio-release.conf
candidate="homepage-candidate-$tag"
changed=0
had_override=0

[[ -f "$current/.env" && -d "$current/data" && -f "$archive" ]]
install -d -m 700 "$backup"
cp -a /etc/systemd/system/obsidian-dev.service "$backup/"
cp -a /etc/systemd/system/obsidian-dev.service.d "$backup/units"
cp -a "$current/.env" "$backup/runtime.env"
if [[ -f "$override" ]]; then cp -a "$override" "$backup/previous-override.conf"; had_override=1; fi

rollback() {
  result=$?
  trap - ERR
  systemctl stop "$candidate" >/dev/null 2>&1 || true
  if [[ $changed == 1 ]]; then
    if [[ $had_override == 1 ]]; then cp -a "$backup/previous-override.conf" "$override";
    else mv "$override" "$backup/failed-override.conf"; fi
    systemctl daemon-reload
    systemctl restart obsidian-dev
  fi
  echo "Deployment failed; prior website configuration retained/restored. Logs: $backup"
  exit "$result"
}
trap rollback ERR

echo "1/5 Backing up the current database and website source."
python3 - "$current" "$backup" <<'PY'
import pathlib, sqlite3, sys
root, backup = map(pathlib.Path, sys.argv[1:])
values = {}
for line in (root / '.env').read_text().splitlines():
    key, sep, value = line.partition('=')
    if sep: values[key.strip()] = value.strip().strip('\"\'')
path = pathlib.Path(values.get('DATABASE_URL', 'file:./data/dev.db').removeprefix('file:'))
if not path.is_absolute(): path = root / path
source = sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True)
destination = sqlite3.connect(str(backup / 'website.sqlite3'))
source.backup(destination)
assert destination.execute('PRAGMA quick_check').fetchone()[0] == 'ok'
source.close(); destination.close()
print('Database snapshot verified.')
PY
tar --exclude=./node_modules --exclude=./.next --exclude=./data --exclude=./public/uploads --exclude=./.env --exclude=./logs --exclude=./coverage --exclude=./.rollback -czf "$backup/source.tar.gz" -C "$current" .

echo "2/5 Preparing an isolated release and installing dependencies."
install -d -o homepage -g homepage "$release" /var/cache/homepage/npm
tar -xzf "$archive" --no-same-owner -C "$release"
chown -R homepage:homepage "$release"
# Keep npm ci strict: a stale cross-platform optional dependency lock must be
# repaired and verified before packaging, never regenerated on the live host.
runuser -u homepage -- env HOME=/var/lib/homepage npm_config_cache=/var/cache/homepage/npm bash -c '
  cd "$1"
  node --version
  npm --version
  npm ci --ignore-scripts --include=dev --include=optional --no-audit --no-fund
' bash "$release" >"$backup/install.log" 2>&1

echo "3/5 Running candidate checks and build with bounded resources."
systemd-run --quiet --wait --pipe --collect --unit="homepage-build-$tag" \
  -p User=homepage -p Group=homepage -p "WorkingDirectory=$release" \
  -p CPUQuota=100% -p MemoryMax=3G -p Nice=10 \
  /usr/bin/env HOME=/var/lib/homepage NEXT_TELEMETRY_DISABLED=1 \
  NEXT_PUBLIC_SITE_URL=https://www.shangkun.uk \
  "DATABASE_URL=file:$release/data/build.db" \
  NODE_OPTIONS=--max-old-space-size=1536 \
  /bin/bash --noprofile --norc -c 'npm run verify:fast && npm run db:init && SKIP_DB_INIT=1 npm run build' >"$backup/build.log" 2>&1

# Runtime data and uploads keep their existing stable locations; no live DB is used by tests/build.
if [[ -d "$release/data" ]]; then mv "$release/data" "$release/.build-data"; fi
ln -s "$current/data" "$release/data"
ln -s "$current/public/uploads" "$release/public/uploads"
install -o homepage -g homepage -m 600 "$current/.env" "$release/.env"
install -d -o homepage -g homepage "$release/.next/cache"
printf '{"commit":"%s","created_at":"%s"}\n' "$commit" "$tag" >"$release/RELEASE.json"

echo "4/5 Checking the release on a loopback-only candidate port."
systemd-run --quiet --collect --unit="$candidate" -p User=homepage -p Group=homepage \
  -p "WorkingDirectory=$release" -p MemoryMax=1G -p CPUQuota=50% \
  /usr/bin/env NODE_ENV=production SKIP_DB_INIT=1 NEXT_PUBLIC_SITE_URL=https://www.shangkun.uk \
  /usr/bin/node "$release/node_modules/next/dist/bin/next" start -p 3098 -H 127.0.0.1
ready=0
for attempt in {1..25}; do
  if curl -fsS --max-time 3 http://127.0.0.1:3098/ -o "$backup/candidate-home.html"; then ready=1; break; fi
  sleep 1
done
[[ $ready == 1 ]]
grep -q '认真做技术' "$backup/candidate-home.html"
for path in /resume /work/document-quality /posts /novels /videos /resources /admin/login; do
  curl -fsS --max-time 20 "http://127.0.0.1:3098$path" -o /dev/null
done
curl -fsS --max-time 20 http://127.0.0.1:3098/models/avatar-v3.glb -o "$backup/avatar-v3.glb"
python3 - "$backup/avatar-v3.glb" <<'PY'
import pathlib, struct, sys
data = pathlib.Path(sys.argv[1]).read_bytes()
assert len(data) >= 28, 'Avatar model is empty or truncated'
magic, version, size = struct.unpack('<4sII', data[:12])
assert magic == b'glTF' and version == 2 and size == len(data), 'Invalid v3 avatar GLB'
PY
[[ $(curl -s --max-time 10 -o /dev/null -w '%{http_code}' http://127.0.0.1:3098/work/not-a-real-project) == 404 ]]
login_redirect=$(curl -sS --max-time 10 -o /dev/null -w '%{redirect_url}' http://127.0.0.1:3098/admin)
[[ "$login_redirect" == https://www.shangkun.uk/admin/login ]]
systemctl stop "$candidate"

echo "5/5 Switching the website service to the verified release."
cat >"$override" <<EOF
[Service]
WorkingDirectory=$release
Environment=NEXT_PUBLIC_SITE_URL=https://www.shangkun.uk
Environment=SKIP_DB_INIT=1
ExecStart=
ExecStart=/usr/bin/node $release/node_modules/next/dist/bin/next start -p 3003 -H 127.0.0.1
ReadWritePaths=$release/.next/cache
EOF
changed=1
systemctl daemon-reload
systemctl restart obsidian-dev
ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 3 http://127.0.0.1:3003/ -o "$backup/live-home.html"; then ready=1; break; fi
  sleep 1
done
[[ $ready == 1 ]]
grep -q '认真做技术' "$backup/live-home.html"
systemctl is-active --quiet obsidian-dev
trap - ERR
echo "Deployed commit $commit"
echo "Release: $release"
echo "Rollback configuration and private backup: $backup"
echo "Public URL: https://www.shangkun.uk/"
