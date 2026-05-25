# Fashion ERP System - Deployment Guide

**Version:** 1.0  
**Last Updated:** May 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Local Development Setup](#local-development-setup)
3. [Demo Environment](#demo-environment)
4. [Production Deployment](#production-deployment)
5. [Environment Variables](#environment-variables)
6. [Database Migrations](#database-migrations)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+
- MySQL 8.0+
- Docker & Docker Compose (optional, for containerized deployment)

### Local Development (5 minutes)

```bash
# 1. Clone repository
git clone <repository-url>
cd fashion-erp-system

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.demo .env.local

# 4. Start development server
pnpm dev

# 5. Access application
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

---

## Local Development Setup

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Configure Database

**Option A: Using Docker Compose (Recommended)**

```bash
docker-compose up -d mysql redis
```

**Option B: Manual MySQL Setup**

```bash
# Create database
mysql -u root -p
CREATE DATABASE fashion_erp_demo;
CREATE USER 'erp_user'@'localhost' IDENTIFIED BY 'erp_password';
GRANT ALL PRIVILEGES ON fashion_erp_demo.* TO 'erp_user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 3: Run Database Migrations

```bash
# Generate migrations from schema
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate
```

### Step 4: Seed Demo Data

```bash
pnpm seed
```

This will populate the database with:
- 5 sample products with costs
- 5 sample orders with line items
- 3 Meta Ads campaigns
- 7 cashflow transactions
- Order profitability calculations

### Step 5: Start Development Server

```bash
pnpm dev
```

The application will start on:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000

---

## Demo Environment

### Docker Compose Setup (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.local | DemoPassword123! |
| User | user@demo.local | DemoPassword123! |

### Demo Data Included

- **Products:** 5 fashion items with cost breakdowns
- **Orders:** 5 completed/pending orders with profitability analysis
- **Campaigns:** 3 Meta Ads campaigns with performance metrics
- **Cashflow:** 7 transactions (sales, ad spend, payroll)

### Accessing Demo Dashboard

1. Open http://localhost:3000
2. Click "Login with Manus"
3. Use demo credentials above
4. Explore financial dashboard, orders, campaigns

---

## Production Deployment

### Prerequisites

- Google Cloud Run account (or alternative container registry)
- MySQL 8.0+ (Cloud SQL or managed service)
- AWS S3 bucket (or GCS for file storage)
- Meta Ads API credentials
- Shopify API credentials

### Step 1: Build Docker Image

```bash
# Build production image
docker build -t fashion-erp:latest .

# Tag for registry
docker tag fashion-erp:latest gcr.io/PROJECT_ID/fashion-erp:latest

# Push to registry
docker push gcr.io/PROJECT_ID/fashion-erp:latest
```

### Step 2: Deploy to Cloud Run

```bash
gcloud run deploy fashion-erp \
  --image gcr.io/PROJECT_ID/fashion-erp:latest \
  --platform managed \
  --region us-central1 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 180 \
  --set-env-vars DATABASE_URL=$DATABASE_URL,JWT_SECRET=$JWT_SECRET \
  --allow-unauthenticated
```

### Step 3: Configure Environment Variables

Set the following in Cloud Run environment:

```
DATABASE_URL=mysql://user:pass@cloud-sql-ip:3306/fashion_erp
JWT_SECRET=<generate-strong-secret>
VITE_APP_ID=<manus-app-id>
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im
OWNER_OPEN_ID=<owner-id>
BUILT_IN_FORGE_API_KEY=<api-key>
VITE_FRONTEND_FORGE_API_KEY=<frontend-key>
```

### Step 4: Run Database Migrations

```bash
# Connect to Cloud SQL
gcloud sql connect fashion-erp-db --user=root

# Run migrations
pnpm drizzle-kit migrate
```

### Step 5: Seed Production Data (Optional)

```bash
pnpm seed
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@localhost:3306/fashion_erp` |
| `JWT_SECRET` | Session signing secret | `<strong-random-string>` |
| `VITE_APP_ID` | Manus OAuth app ID | `app-123456` |
| `OAUTH_SERVER_URL` | OAuth provider URL | `https://api.manus.im` |
| `OWNER_OPEN_ID` | Owner's Manus ID | `owner-123456` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `ENABLE_DEMO_MODE` | Enable demo features | `false` |
| `REDIS_URL` | Redis connection string | (optional) |

### Shopify Integration

```
SHOPIFY_STORE_URL=https://store-name.myshopify.com
SHOPIFY_ACCESS_TOKEN=<access-token>
SHOPIFY_WEBHOOK_SECRET=<webhook-secret>
```

### Meta Ads Integration

```
META_BUSINESS_ACCOUNT_ID=<account-id>
META_ACCESS_TOKEN=<access-token>
META_API_VERSION=v18.0
```

---

## Database Migrations

### Creating a New Migration

```bash
# 1. Update schema in drizzle/schema.ts
# 2. Generate migration
pnpm drizzle-kit generate

# 3. Review generated SQL in drizzle/migrations/
# 4. Apply migration
pnpm drizzle-kit migrate
```

### Reverting Migrations

```bash
# Drizzle ORM doesn't support automatic rollbacks
# Manually execute reverse SQL:
mysql -u root -p fashion_erp_demo < drizzle/migrations/reverse_0001.sql
```

### Backup Before Migration

```bash
# Backup database
mysqldump -u root -p fashion_erp_demo > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore if needed
mysql -u root -p fashion_erp_demo < backup_20260524_120000.sql
```

---

## Monitoring & Logging

### Application Logs

```bash
# Development
pnpm dev  # Logs to stdout

# Production (Cloud Run)
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=fashion-erp"
```

### Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| Response Time | > 1000ms | Investigate slow queries |
| Error Rate | > 1% | Check logs for errors |
| Database Connections | > 80% | Scale database |
| Memory Usage | > 400Mi | Increase Cloud Run memory |

### Health Check Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-24T12:00:00Z",
  "database": "connected",
  "uptime": 3600
}
```

---

## Troubleshooting

### Database Connection Issues

**Error:** `connect ECONNREFUSED 127.0.0.1:3306`

**Solution:**
```bash
# Check MySQL is running
docker ps | grep mysql

# Verify connection string
echo $DATABASE_URL

# Test connection
mysql -u erp_user -p erp_password -h localhost fashion_erp_demo
```

### Port Already in Use

**Error:** `Error: listen EADDRINUSE :::3000`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 pnpm dev
```

### TypeScript Compilation Errors

**Error:** `error TS2307: Cannot find module`

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Run type check
pnpm check
```

### Seed Data Issues

**Error:** `Error: Duplicate entry for key 'sku'`

**Solution:**
```bash
# Clear existing data
mysql -u root -p fashion_erp_demo < drizzle/migrations/clear_tables.sql

# Re-run seed
pnpm seed
```

### Docker Build Failures

**Error:** `failed to solve with frontend dockerfile.v0`

**Solution:**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild
docker build -t fashion-erp:latest .
```

---

## Performance Optimization

### Database Query Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_orders_date ON orders(orderDate);
CREATE INDEX idx_orders_customer ON orders(customerId);
CREATE INDEX idx_campaigns_status ON metaCampaigns(status);
```

### Redis Caching

```typescript
// Enable Redis caching for frequently accessed data
const cacheKey = `products:${productId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

### Frontend Optimization

```bash
# Build production bundle
pnpm build

# Analyze bundle size
pnpm build --analyze
```

---

## Backup & Recovery

### Daily Backup Script

```bash
#!/bin/bash
BACKUP_DIR="/backups/fashion-erp"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mysqldump -u root -p$MYSQL_PASSWORD fashion_erp_demo > \
  $BACKUP_DIR/backup_$TIMESTAMP.sql

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete
```

### Restore from Backup

```bash
mysql -u root -p fashion_erp_demo < /backups/fashion-erp/backup_20260524_120000.sql
```

---

## Security Checklist

- [ ] Change default database credentials
- [ ] Enable HTTPS/TLS for all connections
- [ ] Set strong JWT_SECRET (minimum 32 characters)
- [ ] Enable database SSL connections
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Set up monitoring and alerts
- [ ] Regular security updates
- [ ] Implement rate limiting
- [ ] Enable CORS restrictions

---

## Support & Escalation

For issues or questions:

1. Check logs: `docker-compose logs app`
2. Review troubleshooting section above
3. Contact DevOps team
4. File GitHub issue with logs and reproduction steps

---

**Document Version:** 1.0  
**Last Updated:** May 2026  
**Next Review:** August 2026
