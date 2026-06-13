# CI/CD Pipeline

Target: GitHub Actions deploying Dr. Saleh Platform backend to an AWS EC2 Ubuntu server.

Workflow file:

- `.github/workflows/deploy.yml`

Trigger:

- Push to `main`.
- Manual `workflow_dispatch`.

## Required GitHub Secrets

Add these in GitHub repository settings: `Settings -> Secrets and variables -> Actions`.

Required for SSH deployment:

- `EC2_HOST`: EC2 public DNS name or IP address.
- `EC2_USERNAME`: SSH deploy user, for example `ubuntu` or `deploy`.
- `EC2_SSH_KEY`: private SSH key with access to the EC2 deploy user.
- `APP_DIR`: absolute path to the checked-out app on EC2, for example `/var/www/dr-saleh-api/current`.

Required for CI environment compatibility:

- `DATABASE_URL`: database URL used by Prisma in CI. Prefer a non-production placeholder or staging value. The current workflow uses it for Prisma client generation and tests, not for live migrations.
- `JWT_ACCESS_SECRET`: CI-safe access secret, at least 32 characters.
- `JWT_REFRESH_SECRET`: CI-safe refresh secret, at least 32 characters.

Optional:

- `HEALTHCHECK_URL`: public health URL, for example `https://api.example.com/api/health`. If omitted, the EC2 script checks `http://127.0.0.1:${PORT}/${API_PREFIX}/health` after sourcing the server env file.

Do not store the full production `.env` in the repository. The recommended production env file remains `/etc/dr-saleh-api/.env` on EC2 with `600` permissions.

## Optional GitHub Variables

Add these in GitHub repository settings under Variables if needed.

- `DEPLOY_RUNTIME`: `pm2` or `docker-compose`. Defaults to `pm2`.
- `COMPOSE_FILE`: compose file path for Docker Compose deployments. Defaults to `docker-compose.yml`.

The current deployment hardening runbook recommends PM2. The repository `docker-compose.yml` is local-development oriented, so only use `DEPLOY_RUNTIME=docker-compose` if a production compose file exists on the server.

## Workflow Stages

The `validate` job runs:

```bash
npm ci
npx prisma generate
npx eslint "{src,apps,libs,test}/**/*.ts"
npm test
npm run build
```

The `deploy` job connects to EC2 over SSH and runs:

```bash
cd "$APP_DIR"
git fetch --prune origin main
git checkout main
git reset --hard origin/main

set -a
. /etc/dr-saleh-api/.env
set +a

npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
npm prune --omit=dev

pm2 startOrReload ecosystem.config.cjs --env production
pm2 save
```

For Docker Compose runtime, the restart command becomes:

```bash
docker compose -f "$COMPOSE_FILE" up -d --build app
```

## EC2 Prerequisites

Install runtime tools:

```bash
node -v
npm -v
git --version
pm2 -v
```

For PM2:

```bash
sudo npm install -g pm2
sudo mkdir -p /var/log/dr-saleh-api
sudo chown -R "$USER":"$USER" /var/log/dr-saleh-api
```

Prepare app directory:

```bash
sudo mkdir -p /var/www/dr-saleh-api/current
sudo chown -R "$USER":"$USER" /var/www/dr-saleh-api
git clone <repo-url> /var/www/dr-saleh-api/current
```

Prepare env file:

```bash
sudo groupadd --system dr-saleh || true
sudo usermod -aG dr-saleh "$USER"
sudo mkdir -p /etc/dr-saleh-api
sudo cp docs/deployment/production.env.example /etc/dr-saleh-api/.env
sudo chown root:dr-saleh /etc/dr-saleh-api/.env
sudo chmod 640 /etc/dr-saleh-api/.env
sudo nano /etc/dr-saleh-api/.env
```

Log out and back in after adding the deploy user to the `dr-saleh` group.

## Health Check Behavior

After restart, the workflow checks:

```bash
GET /api/health
```

If `HEALTHCHECK_URL` is configured, it uses that full URL.

If no `HEALTHCHECK_URL` is configured, it checks the local EC2 app:

```bash
curl -fsS "http://127.0.0.1:${PORT:-3000}/${API_PREFIX:-api}/health"
```

The workflow retries 12 times with 5 seconds between attempts. If the health check fails, the deployment fails and prints:

- PM2 status and last 200 app log lines, or
- Docker Compose service status and last 200 app log lines.

## Rollback Recommendation

The workflow prints the previous Git revision before deploying.

PM2 rollback:

```bash
cd /var/www/dr-saleh-api/current
git reset --hard <previous_sha>
set -a
. /etc/dr-saleh-api/.env
set +a
npm ci
npx prisma generate
npm run build
npm prune --omit=dev
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save
curl -fsS https://api.example.com/api/health
```

Docker Compose rollback:

```bash
cd /var/www/dr-saleh-api/current
git reset --hard <previous_sha>
set -a
. /etc/dr-saleh-api/.env
set +a
npm ci
npx prisma generate
npm run build
docker compose -f <production-compose-file> up -d --build app
curl -fsS https://api.example.com/api/health
```

Database rollback note:

- Prisma migrations are forward-only in normal production operation.
- Before risky releases, take an RDS snapshot.
- If a release migration must be reversed, use a reviewed compensating migration or restore the RDS snapshot according to the incident plan.

## Safety Notes

- The workflow does not commit or print `.env`.
- The SSH private key is written to a temporary file and removed in an `always()` cleanup step.
- Do not enable shell tracing with `set -x` in deploy scripts.
- Do not echo secret env values in remote commands.
- Keep GitHub environment protection enabled for `production` if manual approval is desired.
