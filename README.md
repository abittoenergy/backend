# Abittoenergy Backend

IoT backend service that communicates with energy monitoring devices via MQTT protocol. Deployed on Heroku.

## Tech Stack

- **Runtime**: Node.js 20+ / TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Heroku Postgres)
- **Cache/Queue**: Redis (Heroku Redis)
- **IoT Protocol**: MQTT (Eclipse Mosquitto / CloudMQTT)

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp example.env .env

# Start with Docker (includes PostgreSQL, Redis, MQTT broker)
docker compose -f docker-compose.dev.yml up --build

# Or run locally (requires external services)
npm run dev
```

### Environment Variables

See [example.env](./example.env) for all required variables.

Key configurations:
- `DB_*` - PostgreSQL connection
- `REDIS_URL` - Redis connection  
- `MQTT_*` - MQTT broker settings

## Heroku Deployment

```bash
# Login and create app
heroku login
heroku create abittoenergy-api

# Add add-ons
heroku addons:create heroku-postgresql:essential-0
heroku addons:create heroku-redis:mini

# Set MQTT broker (use CloudMQTT or similar)
heroku config:set MQTT_BROKER_URL=mqtt://your-broker-url

# Deploy
git push heroku main
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| * | `/api/*` | API routes |

## MQTT Topics

| Topic | Direction | Description |
|-------|-----------|-------------|
| `device/{id}/data` | Subscribe | Receive device telemetry |
| `device/{id}/command` | Publish | Send commands to device |

## Scripts

```bash
npm run dev        # Development with hot reload
npm run build      # TypeScript compilation
npm run start      # Production server
npm run db:migrate # Run migrations
```

## Heroku Deployment Guide

### Prerequisites
- Heroku CLI installed
- A GitHub repository for your project
- An MQTT broker (e.g., HiveMQ Cloud or EMQX Cloud)

### Deployment Steps
# 1. Login to Heroku
heroku login
# 2. Create the app
heroku create abittoenergy-backend
# 3. Add Managed Database (Postgres)
heroku addons:create heroku-postgresql:essential-0
# 4. Add Cache/Queue (Redis)
heroku addons:create heroku-redis:mini
# 5. Set Environment Variables
# Replace with your actual MQTT broker details
heroku config:set MQTT_BROKER_URL=mqtts://your-broker-address:8883
heroku config:set MQTT_USERNAME=your-username
heroku config:set MQTT_PASSWORD=your-password
heroku config:set JWT_SECRET=$(openssl rand -base64 32)

### Buildpack Note
Heroku will automatically detect 
pnpm-lock.yaml
 and use pnpm for the build process.

### Deploying
git add .
git commit -m "chore: prepare for heroku deployment"
git push heroku main

### Heroku Environments (Staging & Production)
To manage multiple environments properly, use Heroku Pipelines. This allows you to promote code from Staging to Production without rebuilding.

1. Create a Pipeline
heroku pipelines:create abittoenergy-pipeline
2. Add Staging App
# Create the staging app
heroku create abittoenergy-staging --remote staging
# Add to pipeline
heroku pipelines:add abittoenergy-pipeline -a abittoenergy-staging --stage staging
3. Add Production App
# Create the production app
heroku create abittoenergy-production --remote production
# Add to pipeline
heroku pipelines:add abittoenergy-pipeline -a abittoenergy-production --stage production
4. Configure MQTT per Environment
Each environment should have its own MQTT broker or credentials:

# Staging Credentials
heroku config:set MQTT_BROKER_URL=mqtts://staging-broker:8883 -a abittoenergy-staging
# Production Credentials
heroku config:set MQTT_BROKER_URL=mqtts://prod-broker:8883 -a abittoenergy-production
5. Deployment Workflow (The Pro Way)
Push to Staging: Deploy your develop branch to staging for testing.
git push staging develop:main
Promote to Production: Once verified in staging, promote the exact same build to production via the Heroku Dashboard or CLI:
heroku pipelines:promote -r staging

### GitHub Actions CI/CD
Automated workflows are now active in the .github/workflows directory.

1. CI Workflow (
ci.yml
)
Runs on every push or PR to main and develop.
Uses pnpm for fast dependency installation.
Runs Linting and Build verification.
2. Deployment Workflow (
deploy.yml
)
Staging: Automatically deploys to Heroku when code is pushed to the develop branch.
Production: Automatically deploys to Heroku when code is pushed to the main branch.
3. Required GitHub Secrets
To make the deployment work, add these in your GitHub Repo settings:

HEROKU_API_KEY: Your account's API key.
HEROKU_EMAIL: Your Heroku account email.
HEROKU_STAGING_APP_NAME: Name of your staging app (e.g., abittoenergy-staging).
HEROKU_PRODUCTION_APP_NAME: Name of your production app (e.g., abittoenergy-production).

## License

MIT