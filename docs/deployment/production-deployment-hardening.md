# Production Deployment Hardening Checklist

Target: Dr. Saleh Platform backend on AWS EC2 with RDS, Redis/ElastiCache, S3, CloudFront, Nginx, and either PM2 or Docker.

Use this as the final pre-deployment runbook. It intentionally avoids real secret values.

CI/CD automation is documented in [ci-cd-pipeline.md](./ci-cd-pipeline.md).

## Repository Readiness

- `Dockerfile` starts the compiled Nest entrypoint at `dist/src/main.js`.
- `Dockerfile` includes `prisma.config.ts`, which Prisma 7 needs for schema and datasource config.
- `ecosystem.config.cjs` is available for PM2 deployments.
- `.dockerignore` excludes local env files, uploads, build output, logs, and local test helpers from Docker builds.
- `docker-compose.yml` is local development only. Do not use it as the production EC2 compose file.
- The temporary CloudFront development endpoint is not present in source.

## 1. Environment

Production `.env` location recommendation:

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

Checklist:

- `NODE_ENV=production`.
- `PORT=3000` and app port is bound only to localhost through Nginx or Docker host mapping.
- `API_PREFIX=api`.
- `APP_PUBLIC_URL=https://api.<domain>`.
- `APP_PLATFORM_URL=https://<frontend-domain>`.
- `CORS_ALLOWED_ORIGINS` contains only real frontend/admin origins. No `*` in production.
- `CORS_CREDENTIALS=true` only if browser cookies/credentials are actually required.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are different, random, at least 64 characters, and not reused from staging.
- No `replace-with`, `localhost`, staging, sandbox, or test values remain in production `.env`.
- Brevo sender email is verified in Brevo.
- Fawry URLs, merchant code, and security key are production values.
- PayPal uses `https://api-m.paypal.com`, production client secret, and production webhook ID.
- CloudFront private key is stored as escaped newlines or a valid multiline value accepted by the service.

Suggested local validation before restart:

```bash
set -a
. /etc/dr-saleh-api/.env
set +a
npm run build
```

The app validates critical env values during bootstrap and fails fast if they are unsafe or missing.

## 2. Database: AWS RDS PostgreSQL

Checklist:

- RDS engine version is supported by Prisma/PostgreSQL.
- Storage encryption enabled.
- Automated backups enabled with an agreed retention period.
- Deletion protection enabled.
- Public access disabled after final connectivity testing.
- RDS security group allows inbound `5432` only from the EC2 security group.
- No direct internet ingress to RDS.
- `DATABASE_URL` includes:
  - `sslmode=require` or stronger.
  - `connect_timeout=30`.
  - `pool_timeout=30`.
  - `schema=public`.
- `PRISMA_QUERY_TIMEOUT_MS >= 30000`.

Migration strategy:

```bash
cd /var/www/dr-saleh-api/current
set -a
. /etc/dr-saleh-api/.env
set +a
npm ci
npm run prisma:generate
npm run build
npm run test
npm run prisma:migrate:deploy
```

Seed first admin after migrations:

```bash
set -a
. /etc/dr-saleh-api/.env
set +a
npm run prisma:seed
```

Seed notes:

- Run seed only after confirming `INITIAL_ADMIN_*` values are production-safe.
- Rotate the initial admin password after first login.
- Keep a database snapshot before the first production migration and before major releases.

RDS checks:

```bash
nc -vz <rds-endpoint>.rds.amazonaws.com 5432
npx prisma migrate status
```

## 3. Redis / ElastiCache

Checklist:

- Use ElastiCache Redis or a managed Redis equivalent for production.
- Redis security group allows inbound `6379` only from the EC2 security group.
- Enable in-transit encryption/TLS where available and set `REDIS_TLS=true`.
- Enable auth token/password where available and set `REDIS_PASSWORD`.
- Do not expose Redis to the public internet.
- Persistence is enabled only if notification queue durability requirements need it.
- Monitor queue failures in app logs.

Connectivity check:

```bash
redis-cli -h <elasticache-endpoint> -p 6379 --tls ping
```

If Redis TLS is not enabled, remove `--tls` for the check and keep the security group restricted.

## 4. S3 + CloudFront

Checklist:

- Private content bucket has S3 Block Public Access enabled.
- Private content bucket policy allows only the app IAM role/user and CloudFront access mechanism.
- Public assets are stored separately or under explicitly public-safe paths only.
- Direct protected S3 URLs are never returned to users.
- CloudFront distribution is configured for the private content origin.
- CloudFront key group/public key matches `CLOUDFRONT_KEY_PAIR_ID`.
- `CLOUDFRONT_DOMAIN` is the distribution domain or production CNAME.
- Signed URLs work for:
  - course videos,
  - course PDFs,
  - digital books,
  - audio books,
  - certificates.
- Protected local upload paths are not publicly served.
- The CloudFront development test endpoint is not deployed.

Smoke test:

```bash
curl -I "https://api.<domain>/api/health"
```

Then request a protected signed URL through an owned user account and verify:

- Host is CloudFront.
- URL contains signature query params.
- Expired URL stops working.
- Unowned content does not generate a URL.

## 5. Nginx

Install:

```bash
sudo apt update
sudo apt install -y nginx
```

Deploy config:

```bash
sudo cp docs/deployment/nginx.dr-saleh-api.conf /etc/nginx/sites-available/dr-saleh-api
sudo sed -i 's/api.example.com/api.<your-domain>/g' /etc/nginx/sites-available/dr-saleh-api
sudo ln -sf /etc/nginx/sites-available/dr-saleh-api /etc/nginx/sites-enabled/dr-saleh-api
sudo nginx -t
sudo systemctl reload nginx
```

Checklist:

- Only Nginx is publicly reachable on `80` and `443`.
- Node app listens on `127.0.0.1:3000` or Docker maps to localhost only.
- `client_max_body_size 60m` allows app-level 50 MB protected file limit plus request overhead.
- Proxy timeouts are at least 90 seconds for remote DB/payment calls.
- Security headers are enabled at Nginx and Helmet is enabled in Nest.

## 6. PM2 Deployment

Install Node.js 22 and PM2:

```bash
node -v
npm -v
sudo npm install -g pm2
sudo mkdir -p /var/www/dr-saleh-api/releases /var/log/dr-saleh-api
sudo chown -R $USER:$USER /var/www/dr-saleh-api
sudo chown -R $USER:$USER /var/log/dr-saleh-api
```

Deploy release:

```bash
cd /var/www/dr-saleh-api/releases
git clone <repo-url> <release-id>
cd <release-id>
npm ci
npm run prisma:generate
npm run build
npm run test
set -a
. /etc/dr-saleh-api/.env
set +a
npm run prisma:migrate:deploy
npm run prisma:seed
npm prune --omit=dev
ln -sfn /var/www/dr-saleh-api/releases/<release-id> /var/www/dr-saleh-api/current
cd /var/www/dr-saleh-api/current
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save
pm2 startup systemd
```

Operations:

```bash
pm2 status
pm2 logs dr-saleh-api --lines 200
pm2 monit
curl -fsS https://api.<domain>/api/health
```

Rollback:

```bash
ln -sfn /var/www/dr-saleh-api/releases/<previous-release-id> /var/www/dr-saleh-api/current
cd /var/www/dr-saleh-api/current
pm2 startOrReload ecosystem.config.cjs --env production
```

## 7. Docker Deployment

The current Docker image is a runtime image. It does not keep dev dependencies for `prisma` CLI or `ts-node` seed execution after pruning.

Recommended Docker flow:

```bash
docker build -t dr-saleh-api:<release-id> .
```

Run migrations and seed from the release workspace before starting the runtime container, or create a separate migration image/stage that keeps Prisma CLI and seed dependencies.

Runtime container example:

```bash
docker run -d \
  --name dr-saleh-api \
  --restart unless-stopped \
  --env-file /etc/dr-saleh-api/.env \
  -p 127.0.0.1:3000:3000 \
  dr-saleh-api:<release-id>
```

Checklist:

- Do not bake `.env` into the image.
- Do not publish port `3000` publicly.
- Use Nginx for TLS and reverse proxy.
- Mount no secret files except the controlled env file if needed.

## 8. SSL

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.<your-domain>
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

Checklist:

- Certificate covers the API subdomain.
- Auto-renew timer is active.
- HTTP redirects to HTTPS.
- Payment webhook URLs use HTTPS and the final production domain.

## 9. Monitoring

Minimum checks:

```bash
pm2 status
pm2 logs dr-saleh-api --lines 200
sudo journalctl -u nginx --since "1 hour ago"
sudo tail -n 200 /var/log/nginx/error.log
df -h
free -m
uptime
curl -fsS https://api.<domain>/api/health
```

Recommended AWS monitoring:

- CloudWatch Agent for system metrics and log shipping.
- RDS CPU, connections, storage, free memory, read/write latency alarms.
- ElastiCache CPU, memory, evictions, connections alarms.
- EC2 disk usage and memory alarms.
- Application error-rate alarm from structured logs.
- Uptime check against `/api/health`.

## 10. EC2 And Network Security

EC2 security group inbound:

- `22` only from a fixed admin IP or VPN.
- `80` from `0.0.0.0/0` and `::/0`.
- `443` from `0.0.0.0/0` and `::/0`.
- No public inbound `3000`, `5432`, or `6379`.

Server hardening:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

SSH hardening:

```bash
sudo sed -i 's/^#\\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl reload ssh
```

Checklist:

- SSH key-only auth.
- No root SSH login.
- OS packages patched.
- Separate low-privilege deploy user.
- IAM instance profile preferred over long-lived AWS access keys.
- If AWS access keys are used, they are least-privilege and rotated.

## Risky Areas To Resolve Before Go-Live

- `npm audit --omit=dev` currently reports 3 moderate findings through `@prisma/client -> prisma -> @prisma/dev -> @hono/node-server`. The automated fix suggests a major downgrade to Prisma 6.19.3, so do not apply it blindly; track the Prisma 7 patch path or test a deliberate Prisma version change.
- Production Swagger is disabled by default with `SWAGGER_ENABLED=false`; enable only for controlled staging/internal access.
- Full live API pass still needs a disposable staging run with real provider sandbox callbacks.
- Fawry and PayPal webhook success tests require provider-valid signatures.
- Upload validation should eventually add magic-byte checks, not only MIME/extension checks.
- `docker-compose.yml` is not a production stack.
- Runtime Docker image is not a migration/seed image.
- Initial admin seed should run once, then initial password must be rotated.

## Safe Fixes Applied

- Fixed Docker runtime entrypoint from `dist/main.js` to `dist/src/main.js`.
- Copied `prisma.config.ts` into Docker build and runtime stages.
- Added `ecosystem.config.cjs` for PM2.
- Hardened `.dockerignore` to exclude env variants, uploads, logs, docs, build output, and local test helper files.
- Removed tracked `test-brevo.js` local email test helper.
- Converted `docker-compose.yml` to local development settings instead of production-looking dummy credentials.
- Added sanitized production env template.
- Added Nginx reverse-proxy sample.
