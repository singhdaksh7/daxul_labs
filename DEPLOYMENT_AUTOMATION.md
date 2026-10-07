# Deployment Automation

Every push to `main` triggers `.github/workflows/deploy.yml`, which SSHes into the VPS and:

1. `cd $VPS_APP_PATH`
2. `git pull --ff-only origin main`
3. `docker compose build`
4. `docker compose up -d`
5. `docker compose exec -T app npx prisma migrate deploy`
6. `docker compose exec -T app wget -qO- http://127.0.0.1:3000/api/health` (runs inside the app container; retried for ~60s) — the workflow **fails** if this never succeeds
7. Prints `docker compose ps`

The workflow never writes or overwrites the VPS `.env`. All production secrets (database password,
`NEXTAUTH_SECRET`, Razorpay, R2) live only in that file on the server. Nothing secret is stored in the repo.

## Required GitHub Secrets

Repository → Settings → Secrets and variables → Actions → New repository secret.

| Secret        | Example                  | Description                                                  |
|---------------|--------------------------|--------------------------------------------------------------|
| `VPS_HOST`    | `203.0.113.10`           | VPS IP or hostname                                           |
| `VPS_USER`    | `deploy`                 | SSH user (must be in the `docker` group)                     |
| `VPS_PORT`    | `22`                     | SSH port                                                     |
| `VPS_SSH_KEY` | *(private key contents)* | Private key of a **dedicated deploy keypair**                |
| `VPS_APP_PATH`| `/opt/daxul_labs`        | Absolute path of the git checkout containing `docker-compose.yml` and `.env` |

## One-time VPS setup

### 1. Create a dedicated deploy key (on your own machine)

```bash
ssh-keygen -t ed25519 -f daxul_deploy -C "github-actions-deploy" -N ""
```

- `daxul_deploy.pub` → goes on the VPS.
- `daxul_deploy` (private) → paste the full contents into the `VPS_SSH_KEY` secret, then delete the local copy.

Never commit either file (`.gitignore` already blocks common key names).

### 2. Install the public key on the VPS

```bash
# from your machine (while you still have password/other key access)
ssh-copy-id -i daxul_deploy.pub -p <port> <user>@<host>
```

or manually on the VPS, logged in as the deploy user:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAA... github-actions-deploy" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Prepare the app directory

```bash
sudo usermod -aG docker <user>          # allow docker without sudo (re-login afterwards)
git clone https://github.com/singhdaksh7/daxul_labs.git /opt/daxul_labs
cd /opt/daxul_labs
cp .env.example .env && nano .env       # fill in real production values on the server only
chmod 600 .env
docker compose up -d --build            # first start
```

The VPS clone must be able to `git pull` non-interactively. For a private repo, add a read-only
[deploy key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
(separate from the one above) to the repo and clone via SSH.

### Notes

- The workflow trusts the VPS host key it sees on first connect (`ssh-keyscan`). For stricter
  verification, add the VPS host key to `known_hosts` in the workflow instead.
- The app publishes no host ports. It is exposed only through the existing Traefik instance (shared
  `kp-proxy` network, router `daxul`, service `daxul-app`), so the health check runs inside the container.

## Manual deploy

On the VPS:

```bash
cd /opt/daxul_labs
git pull --ff-only origin main
docker compose build
docker compose up -d
docker compose exec -T app npx prisma migrate deploy
docker compose exec -T app wget -qO- http://127.0.0.1:3000/api/health
docker compose ps
```

You can also re-run a failed deploy from GitHub: Actions → *Deploy to VPS* → *Re-run jobs*.

## Rollback

The workflow prints the previous and deployed commit hashes at the top of its log.

```bash
cd /opt/daxul_labs
git log --oneline -10                    # find the last good commit
git checkout <good-commit>               # detached HEAD is fine for an emergency rollback
docker compose build
docker compose up -d
docker compose exec -T app wget -qO- http://127.0.0.1:3000/api/health
```

Then fix forward properly: `git revert <bad-commit>` on `main` and push, which redeploys automatically.
Before the next automated deploy, run `git checkout main` on the VPS, otherwise `git pull` will fail on a
detached HEAD (which also prevents an accidental redeploy over your rollback).

**Database caveat:** `prisma migrate deploy` only moves forward; rolling back code does not undo migrations.
If a bad migration was applied, restore from a backup or write a new corrective migration. Back up before risky
migrations:

```bash
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup-$(date +%F).sql
```

## Inspecting logs

```bash
cd /opt/daxul_labs
docker compose ps                         # service status and health
docker compose logs -f --tail=200 app     # follow app logs
docker compose logs --tail=200 postgres   # database logs
docker compose logs --since=30m           # everything, last 30 minutes
docker inspect --format '{{json .State.Health}}' daxul_labs_app
docker logs --tail=100 traefik-traefik-1  # Traefik (shared; read-only)
```

Deploy-time output (build, migrations, health check) is in the GitHub Actions run log.
