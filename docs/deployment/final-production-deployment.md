# Final Production Deployment Runbook

This runbook is for deploying the Dr. Saleh Platform backend to an AWS EC2 Ubuntu host behind Nginx and HTTPS.

Run production commands from the EC2 host as the application user unless a command explicitly uses `sudo`. Replace every `<...>` placeholder before use. Do not paste secrets into terminal output, screenshots, tickets, or CI logs.

## 1. Pre-Deployment Gates

Local or CI checks before touching production:

```bash
npm ci
npm run lint
npm test
npm run build
npx prisma generate
```

Confirm the working tree contains no accidental secrets:

```bash
git status --short
git ls-files | rg '(^\.env$|\.pem$|\.key$|id_rsa|private|secret|credentials|service-account|\.p12$|\.pfx$)'
git grep -nE '(BEGIN (RSA )?PRIVATE KEY|AKIA[0-9A-Z]{16}|JWT_(ACCESS|REFRESH)_SECRET=|DATABASE_URL=postgresql://[^<])' -- ':!docs/deployment/*.example' ':!.env.example'
```

Expected:

- No real `.env` file is tracked.
- No private keys or provider secrets are tracked.
- Example files contain placeholders only.

## 2. Production Environment Verification

Production env file location:

```bash
sudo install -d -m 750 /etc/dr-saleh-api
sudo test -f /etc/dr-saleh-api/.env
sudo chmod 600 /etc/dr-saleh-api/.env
sudo chown <app_user>:<app_user> /etc/dr-saleh-api/.env
```

Required production values:

- `NODE_ENV=production`
- `PORT=3000`
- `API_PREFIX=api`
- `SWAGGER_ENABLED=false`, unless docs are intentionally exposed in a controlled environment
- `DATABASE_URL` points to RDS with `sslmode=require&connect_timeout=30&pool_timeout=30`
- `DATABASE_SSL_MODE=require`
- `PRISMA_QUERY_TIMEOUT_MS=30000` or higher
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are unique, strong, and at least 32 characters
- `CORS_ALLOWED_ORIGINS` includes only the website and dashboard origins
- `CORS_ALLOWED_ORIGINS` does not contain `*`
- `CORS_CREDENTIALS=true` only if the frontend truly needs credentialed cross-origin requests
- `CLOUDFRONT_DOMAIN`, `CLOUDFRONT_KEY_PAIR_ID`, and `CLOUDFRONT_PRIVATE_KEY` are production values
- `FAWRY_BASE_URL`, `FAWRY_MERCHANT_CODE`, `FAWRY_SECURITY_KEY`, `FAWRY_RETURN_URL`, and `FAWRY_NOTIFICATION_URL` match staging or live intentionally
- `PAYPAL_BASE_URL`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID` match sandbox or live intentionally
- `BREVO_API_KEY` and sender email are production-ready
- `INITIAL_ADMIN_*` values are set only for first deployment and the password is rotated immediately after first login

Load env for one shell session without printing values:

```bash
set -a
. /etc/dr-saleh-api/.env
set +a
```

Check only safe derived values:

```bash
node -e "const required=['NODE_ENV','PORT','API_PREFIX','DATABASE_URL','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','CORS_ALLOWED_ORIGINS','CLOUDFRONT_DOMAIN','CLOUDFRONT_KEY_PAIR_ID']; const missing=required.filter((key)=>!process.env[key]); if (missing.length) { console.error('Missing env keys:', missing.join(', ')); process.exit(1); } console.log('env_shape_ok', { nodeEnv: process.env.NODE_ENV, port: process.env.PORT, apiPrefix: process.env.API_PREFIX, swaggerEnabled: process.env.SWAGGER_ENABLED, corsOriginsCount: process.env.CORS_ALLOWED_ORIGINS.split(',').filter(Boolean).length });"
```

## 3. Deploy Code On EC2

```bash
cd "${APP_DIR:-/var/www/dr-saleh-api}"
git fetch --all --prune
git checkout main
git pull --ff-only origin main
npm ci
npm run build
```

If the server installs only production dependencies after build:

```bash
npm prune --omit=dev
```

Do not prune before Prisma CLI, seed, and build steps.

## 4. Prisma Migration And Seed

Check migration status:

```bash
cd "${APP_DIR:-/var/www/dr-saleh-api}"
set -a
. /etc/dr-saleh-api/.env
set +a
npx prisma migrate status
```

Apply migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

Seed roles, locations, and first admin:

```bash
npm run prisma:seed
```

Seed behavior:

- Roles and countries/cities are upserted.
- First admin is created only when no admin exists.
- If an admin already exists, `INITIAL_ADMIN_*` is not used for creating another admin.

After first admin login:

- Rotate the initial admin password.
- Remove or blank `INITIAL_ADMIN_PASSWORD` from `/etc/dr-saleh-api/.env` if future seed runs no longer need it.

## 5. Start Or Restart Backend

PM2 deployment:

```bash
sudo install -d -m 755 /var/log/dr-saleh-api
sudo chown <app_user>:<app_user> /var/log/dr-saleh-api
cd "${APP_DIR:-/var/www/dr-saleh-api}"
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save
pm2 status
```

Docker Compose deployment, if the host uses Compose instead of PM2:

```bash
cd "${APP_DIR:-/var/www/dr-saleh-api}"
docker compose -f <production-compose-file> up -d --build app
docker compose -f <production-compose-file> ps
```

## 6. Nginx And SSL Verification

Nginx config:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx --no-pager
```

SSL:

```bash
sudo certbot certificates
echo | openssl s_client -servername api.<domain> -connect api.<domain>:443 2>/dev/null | openssl x509 -noout -issuer -subject -dates
sudo systemctl list-timers | rg 'certbot|snap.certbot'
```

Expected:

- Port 80 redirects to 443.
- Certificate is valid for `api.<domain>`.
- Auto-renewal timer exists.
- Nginx `client_max_body_size` matches upload requirements.

## 7. Health, Swagger, Logs

Local app health:

```bash
curl -fsS "http://127.0.0.1:${PORT:-3000}/${API_PREFIX:-api}/health"
```

Public health:

```bash
curl -fsS "https://api.<domain>/api/health"
```

Swagger access policy:

```bash
curl -I "https://api.<domain>/api/docs"
curl -I "https://api.<domain>/api/docs-json"
```

Expected:

- If `SWAGGER_ENABLED=false`, docs return `404`.
- If `SWAGGER_ENABLED=true`, docs return `200` only in the intended controlled environment.

Clean logs:

```bash
pm2 logs dr-saleh-api --lines 200 --nostream
sudo tail -n 200 /var/log/nginx/error.log
sudo journalctl -u nginx --since "30 min ago" --no-pager
```

Expected:

- No repeated database timeout errors.
- No boot failures.
- No unhandled promise rejections.
- No secrets in logs.
- No webhook verification failures during smoke tests.

## 8. Protected Content Verification

Use a paid test user with real purchased content. Do not use raw S3 object URLs in the frontend.

Course video signed URL:

```bash
curl -fsS \
  -H "Authorization: Bearer <user_access_token>" \
  "https://api.<domain>/api/my-courses/<courseId>/lessons/<lessonId>/video-url"
```

Course PDF signed URL:

```bash
curl -fsS \
  -H "Authorization: Bearer <user_access_token>" \
  "https://api.<domain>/api/my-courses/<courseId>/lessons/<lessonId>/pdf-url"
```

Digital book signed URL:

```bash
curl -fsS \
  -H "Authorization: Bearer <user_access_token>" \
  "https://api.<domain>/api/my-books/<bookFormatId>/digital-url"
```

Audio book signed URL:

```bash
curl -fsS \
  -H "Authorization: Bearer <user_access_token>" \
  "https://api.<domain>/api/my-books/<bookFormatId>/audio-url"
```

Certificate signed URL, when certificates are enabled later:

```bash
curl -fsS \
  -H "Authorization: Bearer <user_access_token>" \
  "https://api.<domain>/api/my-certificates/<courseId>/signed-url"
```

Expected:

- API response includes a CloudFront URL and expiration.
- URL hostname is CloudFront distribution or CNAME, not S3.
- Unauthorized users receive `401`.
- Users without ownership receive `403` or `404`.
- Direct access to private S3 objects fails.
- Direct access to `/uploads/books/digital/...` and `/uploads/books/audio/...` returns `404`.

## 9. Payment Provider Verification

Fawry:

- Staging base URL should be used only in staging.
- Live base URL should be used only in production live mode.
- `FAWRY_RETURN_URL` points to the frontend payment return page.
- `FAWRY_NOTIFICATION_URL=https://api.<domain>/api/payments/fawry/webhook`.
- Test payment creation returns a reference without marking the order paid.
- Access is granted only after a verified Fawry notification or verified status flow.

PayPal:

- Sandbox base URL should be used only in staging.
- Live base URL should be `https://api-m.paypal.com` in production live mode.
- PayPal app return/cancel URLs point to frontend routes.
- `PAYPAL_WEBHOOK_ID` belongs to the matching sandbox/live app.
- Test payment creation returns `approvalUrl`.
- Frontend never marks an order paid.
- Access is granted only after verified PayPal capture/status or verified webhook.

## 10. AWS RDS Lockdown

Run only after EC2 to RDS connectivity is verified.

Disable public access:

```bash
aws rds modify-db-instance \
  --db-instance-identifier <rds-instance-id> \
  --no-publicly-accessible \
  --apply-immediately
```

Restrict RDS security group to the EC2 security group:

```bash
aws ec2 revoke-security-group-ingress \
  --group-id <rds-security-group-id> \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id <rds-security-group-id> \
  --protocol tcp \
  --port 5432 \
  --source-group <ec2-security-group-id>
```

Then verify from EC2:

```bash
cd "${APP_DIR:-/var/www/dr-saleh-api}"
set -a
. /etc/dr-saleh-api/.env
set +a
npx prisma migrate status
curl -fsS "http://127.0.0.1:${PORT:-3000}/${API_PREFIX:-api}/health"
```

## 11. Firewall And EC2 Network

```bash
sudo ufw status verbose
sudo ss -tulpn
```

Expected inbound exposure:

- `22/tcp` from trusted admin IPs only.
- `80/tcp` public for HTTP redirect and Certbot.
- `443/tcp` public for HTTPS.
- App port `3000` is bound locally behind Nginx and not public.

## 12. Final Verification Checklist

- [ ] Production env file exists only on EC2 and has `600` permissions.
- [ ] `NODE_ENV=production`.
- [ ] `SWAGGER_ENABLED=false` unless intentionally enabled.
- [ ] CORS contains only production website/dashboard origins.
- [ ] JWT secrets are strong and not shared with staging.
- [ ] RDS URL includes SSL and Prisma timeout params.
- [ ] `npm run build` passes on the deployed release.
- [ ] `npx prisma migrate deploy` succeeds.
- [ ] `npx prisma generate` succeeds.
- [ ] Seed succeeds and first admin can log in.
- [ ] Initial admin password is rotated.
- [ ] Backend is running under PM2 or Docker Compose.
- [ ] Nginx config test passes.
- [ ] HTTPS certificate is valid and auto-renewal is configured.
- [ ] Public health check returns healthy.
- [ ] Swagger policy behaves as intended.
- [ ] Debug endpoints return `404`.
- [ ] CloudFront protected URLs work for owners only.
- [ ] Raw protected S3/static paths are not exposed.
- [ ] Fawry staging/live config is intentional.
- [ ] PayPal sandbox/live config is intentional.
- [ ] Payment webhooks verify signatures and do not trust frontend status.
- [ ] RDS public access is disabled.
- [ ] RDS security group allows PostgreSQL only from EC2 security group.
- [ ] Logs are clean after smoke tests.
- [ ] No secrets are committed.

## 13. Rollback Plan

Code-only rollback:

```bash
cd "${APP_DIR:-/var/www/dr-saleh-api}"
git fetch --all --prune
git checkout <previous_good_commit_sha>
npm ci
npm run build
set -a
. /etc/dr-saleh-api/.env
set +a
npx prisma generate
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save
curl -fsS "https://api.<domain>/api/health"
```

Docker rollback:

```bash
cd "${APP_DIR:-/var/www/dr-saleh-api}"
git checkout <previous_good_commit_sha>
docker compose -f <production-compose-file> up -d --build app
curl -fsS "https://api.<domain>/api/health"
```

Database rollback policy:

- Do not manually edit production migration history.
- Prefer forward-fix migrations.
- If a migration causes irreversible production data damage, stop writes, snapshot current RDS state, and restore the last known-good RDS snapshot to a replacement instance.
- Point the app to the restored database only after validating schema and critical flows.

## 14. Post-Deployment Monitoring

First 30 minutes:

- Watch `pm2 logs dr-saleh-api --lines 200`.
- Watch Nginx access/error logs.
- Run health check every few minutes.
- Test login, catalog read, cart, order creation, and one protected signed URL.
- Confirm notification email logs show sent or safely failed statuses.
- Confirm payment webhook endpoints are reachable by providers.

First 24 hours:

- Monitor EC2 CPU, memory, disk, and network.
- Monitor PM2 restarts.
- Monitor RDS CPU, free storage, active connections, slow queries, and backups.
- Monitor Redis connectivity and queue failures.
- Monitor CloudFront 403/5xx rates.
- Monitor S3 4xx/5xx rates.
- Monitor payment failures and webhook verification failures.
- Monitor API 5xx rate and database timeout logs.

Ongoing:

- Keep RDS backups enabled.
- Rotate initial admin credentials.
- Rotate secrets on a schedule.
- Review audit logs for unexpected admin/security actions.
- Keep `npm audit --omit=dev` and dependency upgrade review in the release process.
