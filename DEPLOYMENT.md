# DAXUL LABS — Production VPS Deployment Runbook

This runbook documents the exact, hardened 21-step procedure for deploying DAXUL LABS to an Ubuntu Linux VPS.

---

## 🚀 Deployment Strategy Architecture

- **Host Infrastructure**: Host Ubuntu Linux VPS running **Host Nginx** + **Host Certbot (Let's Encrypt)**.
- **Container Infrastructure**: Dockerized **Next.js Standalone Application** + **PostgreSQL 16**.
- **Network Isolation**: PostgreSQL port `5432` is bound ONLY to the internal Docker network (`postgres:5432`) and is NOT exposed on `0.0.0.0` or host ports.

---

## 📋 Step-by-Step Production Runbook

### Step 1: Provision Ubuntu VPS
Provision a fresh Ubuntu 22.04 LTS or 24.04 LTS VPS instance (Minimum: 2 GB RAM, 1 CPU Core, 25 GB NVMe).

### Step 2: Create Non-Root Sudo User
Log in as root and create a dedicated deployer user:
```bash
adduser daxuldeploy
usermod -aG sudo daxuldeploy
su - daxuldeploy
```

### Step 3: Configure SSH Keys
Copy your SSH public key to the server for passwordless authentication:
```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Step 4: Disable Password SSH
Harden SSH configuration to require key authentication only:
```bash
sudo nano /etc/ssh/sshd_config
```
Set:
```ini
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
```
Reload SSH service:
```bash
sudo systemctl restart ssh
```

### Step 5: Configure Firewall (UFW)
Allow only essential ports:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### Step 6: Install Docker & Docker Compose
Install official Docker Engine and Docker Compose plugin:
```bash
sudo apt update && sudo apt install -y curl git nginx certbot python3-certbot-nginx
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
docker compose version
```

### Step 7: Clone Repository
Clone the repository into `/var/www/daxul-labs`:
```bash
sudo mkdir -p /var/www/daxul-labs
sudo chown -R $USER:$USER /var/www/daxul-labs
cd /var/www/daxul-labs
git clone https://github.com/your-org/daxul-labs.git .
```

### Step 8: Create Production `.env`
Create the production environment file:
```bash
cp .env.example .env
nano .env
```
Fill in production credentials:
```env
POSTGRES_USER=daxul_prod_user
POSTGRES_PASSWORD=Your_Super_Strong_Generated_DB_Password_2026!
POSTGRES_DB=daxul_labs_production
DATABASE_URL=postgresql://daxul_prod_user:Your_Super_Strong_Generated_DB_Password_2026!@postgres:5432/daxul_labs_production?schema=public

NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generate_with_openssl_rand_hex_32

INITIAL_ADMIN_EMAIL=admin@yourdomain.com
INITIAL_ADMIN_PASSWORD=ComplexSuperAdminPassword2026!

RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

STORAGE_PROVIDER=local
STORAGE_PATH=/app/uploads
STORAGE_PUBLIC_URL_PREFIX=/api/uploads/file

NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_your_key_id
```

### Step 9: Build Containers
Build Docker container images using production multi-stage build:
```bash
docker compose build --no-cache
```

### Step 10: Start PostgreSQL
Launch the isolated database container and wait for healthy state:
```bash
docker compose up -d postgres
docker compose ps
```

### Step 11: Run Prisma Production Migrations
Apply versioned production database schema migrations:
```bash
# DO NOT use prisma db push for production!
docker compose run --rm app npx prisma migrate deploy
```

### Step 12: Bootstrap First Super Admin
Run the seed command to create the initial Super Admin user and store defaults:
```bash
docker compose run --rm app npx prisma db seed
```
> ⚠️ **SECURITY ACTION**: Once initial super admin is created, edit `.env` and remove `INITIAL_ADMIN_PASSWORD` to prevent credential leakage.

### Step 13: Start Application
Bring up the Next.js production application container:
```bash
docker compose up -d app
docker compose ps
```

### Step 14: Configure Host Nginx
Copy Nginx production configuration to host:
```bash
sudo cp nginx/nginx.conf /etc/nginx/sites-available/daxullabs
sudo ln -s /etc/nginx/sites-available/daxullabs /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Step 15: Configure DNS
In your DNS provider dashboard (Cloudflare / Namecheap / Route 53), add:
- `A` Record: `@` -> `YOUR_VPS_PUBLIC_IP`
- `A` Record: `www` -> `YOUR_VPS_PUBLIC_IP`

### Step 16: Issue Let's Encrypt Certificate
Obtain free SSL certificate via Certbot:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com --redirect
```

### Step 17: Configure Razorpay Webhook URL
1. Navigate to **Razorpay Dashboard** -> **Settings** -> **Webhooks**.
2. Add Webhook URL: `https://yourdomain.com/api/razorpay/webhook`.
3. Secret: Enter the exact value from `RAZORPAY_WEBHOOK_SECRET`.
4. Subscribe to events: `payment.captured`, `order.paid`, `payment.failed`.

### Step 18: Run Production Smoke Tests
Perform full smoke testing matrix (see Section 23 checklist).

### Step 19: Configure Database Backup Cron
Make backup script executable and configure nightly cron job:
```bash
chmod +x /var/www/daxul-labs/scripts/backup-db.sh
sudo crontab -e
```
Add line:
```cron
0 2 * * * /var/www/daxul-labs/scripts/backup-db.sh >> /var/log/daxul_db_backup.log 2>&1
```

### Step 20: Configure Upload Backup Cron
Make upload backup script executable and add cron job:
```bash
chmod +x /var/www/daxul-labs/scripts/backup-uploads.sh
sudo crontab -e
```
Add line:
```cron
30 2 * * * /var/www/daxul-labs/scripts/backup-uploads.sh >> /var/log/daxul_uploads_backup.log 2>&1
```

### Step 21: Verify Restoration Process
To verify disaster recovery, test restoring database and uploads:

#### Database Restore Procedure:
```bash
# 1. Decompress backup SQL
gunzip -c /var/backups/daxul/postgres/daxul_db_YYYY-MM-DD_HHMMSS.sql.gz > /tmp/restore.sql

# 2. Restore into PostgreSQL container
docker exec -i daxul_labs_postgres psql -U daxul_prod_user -d daxul_labs_production < /tmp/restore.sql
rm /tmp/restore.sql
```

#### Uploads Restore Procedure:
```bash
# Extract archive back to uploads volume
docker run --rm -v daxul_labs_uploads_data:/app/uploads -v /var/backups/daxul/uploads:/backup alpine tar -xzf /backup/daxul_uploads_YYYY-MM-DD_HHMMSS.tar.gz -C /app/uploads
```

---

## 🧪 Production Smoke Test Checklist (Step 18)

- [ ] **Home Page**: `https://yourdomain.com` loads with dark luxury theme.
- [ ] **Shop Catalog**: `/shop` lists products and filters correctly.
- [ ] **Product Details**: Product pages display options and custom upload inputs.
- [ ] **Cart**: Cart drawer adds items, calculates customization fees, updates subtotal.
- [ ] **Custom Artwork Upload**: Upload photo up to 25MB. Verify magic bytes validation.
- [ ] **Checkout Calculation**: Verify prices and shipping fees are computed server-side.
- [ ] **COD Restrictions**: COD succeeds for standard products; custom products block COD.
- [ ] **Razorpay Test Payment**: Initiate payment, verify HMAC signature validation and payment completion.
- [ ] **Payment Failure**: Cancel payment modal, verify order remains in `pending` payment state and stock is NOT reduced.
- [ ] **Admin Dashboard**: Accessing `/admin` without logging in redirects to `/admin/login`.
- [ ] **Admin Authentication**: Super admin logs in with strong credentials.
- [ ] **Order Management**: Admin updates manufacturing status (e.g. `3D Printing`).
- [ ] **Status Persistence**: Status remains updated after container restart (`docker compose restart`).
- [ ] **Public Tracking**: `/track` with Order ID + matching Email/Phone shows live status; lookup with only Order ID fails.
- [ ] **Artwork Privacy**: Customer cannot access another customer's uploaded artwork.

## Scheduled stock-reservation release (CRON_SECRET)

Unpaid prepaid orders reserve stock for `SiteSettings.reservationMinutes` (default 60). Expired reservations are released by `POST /api/internal/release-reservations` (bearer token = `CRON_SECRET`). The endpoint returns 503 if `CRON_SECRET` is unset, 401 on a wrong token. Details: `docs/RESERVATIONS.md`.

1. Add `CRON_SECRET=<output of: openssl rand -hex 32>` to `/opt/daxul_labs/.env` (type/paste it directly on the VPS; never commit it, never put it in a crontab line).
2. `docker compose up -d app` so the container receives it.
3. Install the cron job as the deploy user (`crontab -e`), every 5 minutes:

   ```
   */5 * * * * /opt/daxul_labs/scripts/release-reservations-cron.sh >> "$HOME/daxul-release.log" 2>&1
   ```

   The script calls the endpoint from inside `daxul_labs_app` (the app has no published host port), reads the secret from the container environment, and logs only a timestamp, the outcome and the released/failed counts.
4. Check: `tail ~/daxul-release.log` should show `ok {"ok":true,"released":0,"failed":0}` lines.
