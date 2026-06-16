# NidhiFlow Development Setup

This directory contains the NidhiFlow npm-workspaces monorepo:

- React and TypeScript frontend built with Webpack 5
- Node.js, Express, and TypeScript backend
- PostgreSQL 17 development database in Docker
- Jest frontend tests and Vitest backend tests

The instructions below were verified on Linux Mint 22.3, based on Ubuntu
24.04. Other Debian or Ubuntu releases should be similar, but package names
may differ.

Guest preferences and transaction history are stored only in the browser's
IndexedDB database named `nidhiflow-guest`. They are not sent to the backend.
Clearing site data, using private browsing, uninstalling the browser, or losing
the device can permanently remove this local history.

## Local Services

| Service    | Address                                     | Purpose                                 |
| ---------- | ------------------------------------------- | --------------------------------------- |
| Frontend   | `http://127.0.0.1:5173`                     | React development application           |
| Backend    | `http://127.0.0.1:3000`                     | Express API                             |
| Liveness   | `http://127.0.0.1:3000/health/live`         | Confirms the backend process is running |
| Readiness  | `http://127.0.0.1:3000/health/ready`        | Confirms PostgreSQL is reachable        |
| OpenAPI    | `http://127.0.0.1:3000/api/v1/openapi.json` | Versioned API contract                  |
| PostgreSQL | `127.0.0.1:5432`                            | Local development database              |

## Required Software

Install or provide:

- Git
- Node.js 22 or newer
- npm 10 or newer
- Docker Engine
- Docker Compose v2
- PostgreSQL client tools
- OpenSSL for generating a local database password

PostgreSQL Server does not need to be installed directly on the host. Docker
Compose runs PostgreSQL 17 in an isolated container.

## 1. Install System Packages

On Linux Mint 22 or Ubuntu 24.04:

```bash
sudo apt-get update
sudo apt-get install -y \
  docker.io \
  docker-compose-v2 \
  git \
  build-essential \
  postgresql-client \
  openssl
```

Enable Docker immediately and configure it to start during system boot:

```bash
sudo systemctl enable --now docker
```

Allow the current user to run Docker without `sudo`:

```bash
sudo usermod -aG docker "$USER"
```

The `docker` group grants elevated control over the machine. Add only trusted
local users.

Log out of the desktop session and log back in so the new group membership is
active. Alternatively, open a temporary shell with:

```bash
newgrp docker
```

Verify the installation:

```bash
docker --version
docker compose version
psql --version
openssl version
docker info
```

`docker info` must finish successfully. If it reports permission denied, the
Docker group change has not yet reached the current shell.

## 2. Install Node.js and npm

The repository requires:

```text
Node.js >= 22
npm >= 10
```

Using `nvm` keeps the project Node.js version separate from the operating
system packages. Skip this installation if a compatible Node.js version is
already available.

Install `nvm` from its Git repository:

```bash
git clone https://github.com/nvm-sh/nvm.git "$HOME/.nvm"
cd "$HOME/.nvm"
git checkout "$(git describe --abbrev=0 --tags)"
```

Load `nvm` in the current shell:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
```

Add these lines to `~/.bashrc` so future Bash shells load it automatically:

```bash
printf '%s\n' \
  'export NVM_DIR="$HOME/.nvm"' \
  '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' \
  >> "$HOME/.bashrc"
```

Install and select Node.js 22:

```bash
nvm install 22
nvm alias default 22
nvm use 22
```

Verify the active versions:

```bash
node --version
npm --version
```

Do not continue with an older Node.js release. The project currently uses
modern ESM, TypeScript, Jest, Vitest, and Webpack behavior.

## 3. Enter the Codebase

From the repository root:

```bash
cd codebase
```

All remaining commands in this guide run from the `codebase/` directory.

## 4. Create the Local Environment File

Copy the committed example:

```bash
cp .env.example .env
```

Generate a random local-only PostgreSQL password and replace both placeholders:

```bash
DB_PASSWORD="$(openssl rand -hex 24)"
sed -i "s/replace-with-a-local-password/${DB_PASSWORD}/g" .env
unset DB_PASSWORD
chmod 600 .env
```

The same password must appear in:

- `POSTGRES_PASSWORD`, used when creating the PostgreSQL container
- `DATABASE_URL`, used by migrations and the backend

The `.env` file is ignored by Git. Never commit it, paste its credentials into
issues, or reuse its password in staging or production.

### Environment Variables

| Variable                       | Local purpose                                            |
| ------------------------------ | -------------------------------------------------------- |
| `APP_ENV`                      | Backend runtime environment                              |
| `PORT`                         | Backend HTTP port                                        |
| `LOG_LEVEL`                    | Backend structured logging level                         |
| `DATABASE_URL`                 | PostgreSQL connection used by the backend and migrations |
| `DATABASE_SSL`                 | Whether the backend requires PostgreSQL TLS              |
| `API_RATE_LIMIT_WINDOW_MS`     | Shared backend rate-limit window in milliseconds         |
| `API_RATE_LIMIT_MAX`           | Reserved foundation default for broader API limits       |
| `AUTH_RATE_LIMIT_MAX`          | Auth requests allowed per window                         |
| `FEEDBACK_RATE_LIMIT_MAX`      | Public feedback requests allowed per window              |
| `JWT_ACCESS_SECRET`            | Explicit JWT signing secret for staging or production    |
| `JWT_ACCESS_ISSUER`            | Expected JWT issuer                                      |
| `JWT_ACCESS_AUDIENCE`          | Expected JWT audience                                    |
| `JWT_ACCESS_TTL_SECONDS`       | Access-token lifetime in seconds                         |
| `REFRESH_SESSION_TTL_DAYS`     | Refresh-session lifetime in days                         |
| `EMAIL_VERIFICATION_TTL_HOURS` | Email verification token lifetime in hours               |
| `PASSWORD_RESET_TTL_HOURS`     | Password reset token lifetime in hours                   |
| `CORS_ORIGINS`                 | Browser origins permitted to call the backend            |
| `POSTGRES_USER`                | User created by the PostgreSQL container                 |
| `POSTGRES_PASSWORD`            | Password created by the PostgreSQL container             |
| `POSTGRES_DB`                  | Database created by the PostgreSQL container             |
| `NIDHIFLOW_API_BASE_URL`       | Backend URL compiled into the local frontend             |

The default local configuration binds PostgreSQL only to `127.0.0.1`.

In local development, the backend derives a JWT signing secret automatically if
`JWT_ACCESS_SECRET` is omitted. Set an explicit secret for staging and
production.

## Milestone 5 Auth Routes

Milestone 5 adds these backend endpoints under `http://127.0.0.1:3000/api/v1`:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/verify-email`
- `POST /auth/resend-verification`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /users/me`
- `PATCH /users/me`
- `GET /users/me/sessions`
- `DELETE /users/me/sessions/:sessionId`
- `GET /workspaces`
- `GET /workspaces/:workspaceId`

For local development and tests, non-production auth responses include a
`debugToken` field during registration, resend-verification, and
forgot-password flows. This allows the email-verification and password-reset
journeys to be exercised before an email delivery service exists. Production
must not rely on this behavior.

## 5. Install JavaScript Dependencies

Install exactly from the workspace lockfile:

```bash
npm ci
```

Use `npm install` only when intentionally adding, removing, or upgrading
dependencies and updating `package-lock.json`.

Optional dependency security check:

```bash
npm audit --audit-level=moderate
```

## 6. Start PostgreSQL

Start the PostgreSQL 17 container:

```bash
docker compose up -d postgres
```

The first run downloads the image and creates a persistent Docker volume.

Check the container:

```bash
docker compose ps
docker compose logs postgres
```

The expected status is `healthy`.

Verify PostgreSQL from the host:

```bash
set -a
. ./.env
set +a
pg_isready -d "$DATABASE_URL"
```

Expected output includes:

```text
localhost:5432 - accepting connections
```

## 7. Apply Database Migrations

Apply all pending migrations:

```bash
npm run db:migrate
```

The command must complete before the backend readiness check can represent a
fully initialized local database.

Verify the baseline migration directly:

```bash
set -a
. ./.env
set +a
psql "$DATABASE_URL" -Atc \
  "SELECT key || '=' || value FROM app_metadata ORDER BY key;"
```

Expected output:

```text
schema_baseline=1
```

Run the PostgreSQL integration test:

```bash
npm run test:integration
```

## 8. Start NidhiFlow

Start the frontend and backend in one terminal:

```bash
npm run dev
```

Expected startup messages include:

```text
Backend server started
Frontend available at http://127.0.0.1:5173
webpack compiled successfully
```

Keep this terminal open. Press `Ctrl+C` to stop both application processes.
PostgreSQL continues running in Docker.

### Start One Application Only

Frontend:

```bash
npm run dev --workspace @nidhiflow/frontend
```

Backend:

```bash
npm run dev --workspace @nidhiflow/backend
```

## 9. Verify the Running Stack

Open the frontend:

```text
http://127.0.0.1:5173
```

Check the backend process:

```bash
curl --fail http://127.0.0.1:3000/health/live
```

Expected response:

```json
{ "status": "ok" }
```

Check backend and PostgreSQL readiness:

```bash
curl --fail http://127.0.0.1:3000/health/ready
```

Expected response:

```json
{ "status": "ready" }
```

A `503` readiness response means the backend is running but cannot complete
its PostgreSQL readiness query.

## 10. Run Quality Checks

Run the complete non-integration verification suite:

```bash
npm run verify
```

This runs:

1. Prettier formatting checks
2. ESLint
3. TypeScript type checks
4. Frontend and backend unit tests
5. Frontend and backend production builds

Individual commands:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Run database integration tests separately while PostgreSQL is healthy:

```bash
npm run test:integration
```

Format changed files:

```bash
npm run format
```

## 11. Stop and Restart Services

Stop the frontend and backend with `Ctrl+C` in the terminal running
`npm run dev`.

Stop PostgreSQL while preserving its data:

```bash
docker compose stop postgres
```

Start the existing PostgreSQL container again:

```bash
docker compose start postgres
```

Stop and remove the container while preserving the named database volume:

```bash
docker compose down
```

Recreate and start it:

```bash
docker compose up -d postgres
```

## 12. Database Migration Commands

Apply pending migrations:

```bash
npm run db:migrate
```

Roll back the most recently applied migration:

```bash
npm run db:rollback
```

Create migrations under:

```text
apps/backend/migrations/
```

Never edit a migration that has already been applied in a shared environment.
Product finance tables should be introduced with their owning feature
milestones.

## 13. Reset the Local Database

This operation permanently deletes all NidhiFlow data in the local Docker
volume. Use it only when a clean development database is intentional.

Stop the application, then run:

```bash
docker compose down --volumes
docker compose up -d postgres
npm run db:migrate
```

Changing `POSTGRES_USER`, `POSTGRES_PASSWORD`, or `POSTGRES_DB` in `.env` does
not update an already initialized PostgreSQL volume. Reset the volume only if
discarding its local data is acceptable.

## 14. Troubleshooting

### Docker socket permission denied

Example:

```text
permission denied while trying to connect to the Docker daemon socket
```

Confirm group membership:

```bash
getent group docker
id
```

Log out and back in after running:

```bash
sudo usermod -aG docker "$USER"
```

### Docker daemon is not running

```bash
sudo systemctl enable --now docker
systemctl status docker
```

### PostgreSQL does not become healthy

Inspect status and logs:

```bash
docker compose ps
docker compose logs --tail=200 postgres
```

Confirm that port `5432` is not already occupied:

```bash
ss -ltnp | grep ':5432'
```

### Backend readiness returns `503`

Confirm PostgreSQL is healthy and migrations were applied:

```bash
docker compose ps
npm run db:migrate
npm run test:integration
```

Then inspect backend logs in the `npm run dev` terminal.

### Frontend or backend port is already in use

Check the relevant port:

```bash
ss -ltnp | grep -E ':(3000|5173)'
```

Stop the conflicting process. If changing ports intentionally, keep `PORT`,
`CORS_ORIGINS`, and `NIDHIFLOW_API_BASE_URL` consistent.

### Environment validation fails

Compare `.env` with `.env.example`. Required values must be present and URLs
must be valid. The backend intentionally exits at startup when configuration
is missing or malformed.

### Dependencies behave unexpectedly

Reinstall from the lockfile:

```bash
npm ci
```

Avoid deleting or manually editing `package-lock.json`.

## Repository Layout

```text
codebase/
├── apps/
│   ├── backend/
│   │   ├── migrations/
│   │   └── src/
│   └── frontend/
│       ├── public/
│       ├── scripts/
│       └── src/
├── scripts/
├── .env.example
├── compose.yaml
├── eslint.config.js
├── package.json
├── package-lock.json
└── prettier.config.js
```

Production credentials, connection strings, signing keys, and other secrets
must come from protected environment injection or a secrets manager. The local
`.env` workflow described here is only for development.
