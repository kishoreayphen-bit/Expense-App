# Docker Setup — Enterprise Expense Management App

This project is configured to run the backend (Java Spring Boot) and database (PostgreSQL) using Docker.

## Prerequisites
- Docker Desktop 4.x+
- (Optional) Java 17 + Maven locally if you want to build outside Docker

## Structure
- `docker-compose.yml` — Orchestrates Postgres, pgAdmin, and backend services
- `backend/Dockerfile` — Multi-stage Dockerfile for the Spring Boot app
- `.env.example` — Example environment variables (copy to `.env`)

## Quick Start
1. Create your environment file
   ```bash
   copy .env.example .env
   ```
   Edit `.env` as needed (passwords, ports, JWT secret, etc.).

2. Ensure backend source exists
   The backend Dockerfile expects a Maven project in `backend/` with:
   - `backend/pom.xml`
   - `backend/src/...`
   If you don't have this yet, create the Spring Boot skeleton first.

3. Start services
   ```bash
   docker compose up -d --build
   ```

4. Check service health
   - Postgres: Bound to host port `5432` (configurable via `.env`)
   - pgAdmin: http://localhost:5050 (default creds in `.env`)
   - Backend: http://localhost:8080 (after your app is implemented)

5. Connect pgAdmin to Postgres
   - Host: `postgres`
   - Port: `5432`
   - Username: from `.env` (`POSTGRES_USER`)
   - Password: from `.env` (`POSTGRES_PASSWORD`)

## Backend Container Details
- Build stage: Uses `maven:3.9.6-eclipse-temurin-17`
- Run stage: Uses `eclipse-temurin:17-jre`
- The Dockerfile copies the built jar from `/workspace/target/*.jar` into `/app/app.jar`
- Healthcheck expects Spring Actuator at `/actuator/health` (adjust as you implement)

## Environment Variables (excerpt)
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`
- `PGADMIN_EMAIL`, `PGADMIN_PASSWORD`, `PGADMIN_PORT`
- `BACKEND_PORT`, `SPRING_PROFILES_ACTIVE`
- `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`
- `JWT_SECRET`, `JWT_ACCESS_TTL_MIN`, `JWT_REFRESH_TTL_DAYS`

See `.env.example` for a full list and defaults.

## FX Configuration (Epic 11)
To enable cross-currency features and provider-backed FX rates:

1. Configure base currency and provider in your `.env` (maps to Spring properties):
   ```env
   APP_BASECURRENCY=INR             # maps to app.baseCurrency
   FX_PROVIDER=openexchangerates    # maps to fx.provider
   OPENEXCHANGERATES_APPID=...      # maps to openexchangerates.appId
   ```

2. Populate rates
   - Upsert manually per day:
     ```http
     PUT /api/v1/fx/rates?date=2025-09-01&currency=USD&rateToBase=83.10
     ```
   - Or backfill via provider:
     ```http
     PUT /api/v1/fx/backfill?from=2025-09-01&to=2025-09-12&currencies=USD,EUR
     ```

3. Optional nightly backfill
   - Enable a daily job (02:15 server time):
     ```env
     FX_BACKFILL_ENABLED=true
     FX_BACKFILL_CURRENCIES=USD,EUR,GBP
     ```

## Base-Normalized Endpoints (Epic 11)
Append `base=true` to aggregate in base currency where supported:

- Budgets/Analytics
  - `GET /api/v1/budgets/anomalies?period=YYYY-MM[&groupId][&base=true]`
  - `GET /api/v1/budgets/predicted?period=YYYY-MM[&groupId][&base=true]`
  - `GET /api/v1/budgets/variance?period=YYYY-MM[&groupId][&categoryId][&base=true]`
  - `GET /api/v1/budgets/variance.csv?...&base=true` (adds `currency` column)

- Dashboard
  - `GET /api/v1/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&base=true`

- Splits Simulation
  - `POST /api/v1/split/simulate` with optional `currency` and `occurredOn` returns `baseTotal`, `baseCurrency`, and per-share `baseAmount`.

## Common Commands
- View logs (compose):
  ```bash
  docker compose logs -f backend
  ```
- Rebuild backend only:
  ```bash
  docker compose build backend && docker compose up -d backend
  ```
- Stop everything:
  ```bash
  docker compose down
  ```
- Remove volumes (destroys DB data):
  ```bash
  docker compose down -v
  ```

## Notes
- The backend service references the database by service name `postgres` on the internal Docker network.
- If you use Spring profiles, `SPRING_PROFILES_ACTIVE=docker` is set by default for the container.
- For production, use stronger credentials and rotate secrets; consider externalized secrets management.
