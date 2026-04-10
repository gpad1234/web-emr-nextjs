# Deployment Guide

This guide covers everything needed to deploy, redeploy, and operate the MobileEMR web stack on the production Ubuntu droplet.

---

## 1. Server overview

| Property | Value |
|---|---|
| Provider | DigitalOcean |
| IP | `209.38.70.215` |
| OS | Ubuntu 24.04.3 LTS |
| Kernel | 6.8.0-106-generic |
| Disk | 24 GB (4.4 GB used) |
| RAM | ~960 MB |
| App user | `sam` |
| Node.js | v24.14.1 |
| npm | v11.11 |
| PM2 | v6.0.14 |
| Web server | nginx (active, enabled) |

### App layout on server

```
/home/sam/emr-app/
├── mobile-emr/          json-server backend source + db.json
│   └── server/
│       ├── db.json      seeded patient data (ephemeral — regenerated on re-deploy)
│       └── seed.ts      Faker.js seed script
└── web/                 Next.js built app (.next/)
```

### Ports

| Port | Process | Exposed via |
|---|---|---|
| 80 | nginx | public |
| 3000 | Next.js (`emr-web`) | nginx proxy → `/` |
| 3001 | json-server (`emr-api`) | nginx proxy → `/api/` |

---

## 2. SSH access

Two users have key-based SSH access:

```bash
ssh sam@209.38.70.215    # app user (no sudo)
ssh root@209.38.70.215   # full access (use only when sudo is required)
```

Ensure your public key is in `/home/sam/.ssh/authorized_keys` and `/root/.ssh/authorized_keys`. Never use password auth — confirm `PasswordAuthentication no` is set in `/etc/ssh/sshd_config`.

---

## 3. Re-deploying after a code change

This is the standard workflow for pushing updated code to production.

### 3.1 Push changes to GitHub first

```bash
# from your local machine
cd /path/to/web-emr-nextjs
git add .
git commit -m "your change description"
git push origin main
```

### 3.2 SSH in as sam and pull + rebuild

```bash
ssh sam@209.38.70.215
cd /home/sam/emr-app
git pull origin main
```

**If only the web front-end changed:**

```bash
cd /home/sam/emr-app/web
npm install --legacy-peer-deps
NEXT_PUBLIC_API_URL=http://209.38.70.215/api npm run build
pm2 restart emr-web
```

**If mobile-emr / json-server changed:**

```bash
cd /home/sam/emr-app/mobile-emr
npm install
npm run server:seed          # regenerates db.json — WIPES existing data
pm2 restart emr-api
```

**If both changed:** run both blocks above in order.

Verify after restart:

```bash
pm2 list
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000   # expect 200
curl -s http://localhost:3001/patients | head -c 80            # expect JSON
```

---

## 4. Full fresh deployment (new server or clean slate)

Use this when provisioning a new droplet or wiping and starting over.

### 4.1 Prerequisites on the server

Install Node.js 20 LTS or 24 (if not already present):

```bash
# as root
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs git nginx
```

Verify:

```bash
node --version   # v24.x.x
npm --version    # 10+
nginx -v
```

Create the app user if it doesn't exist:

```bash
adduser --disabled-password --gecos "" sam
mkdir -p /home/sam/.ssh
# paste your public key:
echo "ssh-ed25519 AAAA... your-key" >> /home/sam/.ssh/authorized_keys
chown -R sam:sam /home/sam/.ssh
chmod 700 /home/sam/.ssh && chmod 600 /home/sam/.ssh/authorized_keys
```

### 4.2 Install PM2

```bash
# as root
npm install -g pm2
```

### 4.3 Clone and build

```bash
# as root
rm -rf /home/sam/emr-app
git clone https://github.com/gpad1234/web-emr-nextjs.git /home/sam/emr-app

# mobile-emr / backend
cd /home/sam/emr-app/mobile-emr
npm install
npm run server:seed

# web / Next.js
cd /home/sam/emr-app/web
npm install --legacy-peer-deps
NEXT_PUBLIC_API_URL=http://<SERVER_IP>/api npm run build

# fix ownership
chown -R sam:sam /home/sam/emr-app
```

> Replace `<SERVER_IP>` with the actual droplet IP. This value is baked into the Next.js build and controls where the browser sends API requests.

### 4.4 Configure nginx

Write `/etc/nginx/sites-available/emr-app`:

```nginx
server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload:

```bash
ln -sf /etc/nginx/sites-available/emr-app /etc/nginx/sites-enabled/emr-app
nginx -t && systemctl reload nginx
```

> **Important:** The `/api/` → `localhost:3001/` proxy strips the `/api` prefix (trailing slash after `3001/`). This is intentional — json-server serves routes at `/patients`, not `/api/patients`.

### 4.5 Start processes with PM2

SSH in as `sam` (not root) for the PM2 steps — PM2 must be started by the same user it will run as:

```bash
ssh sam@<SERVER_IP>

pm2 start npm --name "emr-web" --cwd /home/sam/emr-app/web -- start
pm2 start npm --name "emr-api" --cwd /home/sam/emr-app/mobile-emr -- run server:start
pm2 save
```

### 4.6 Enable PM2 on boot

```bash
# as root
env PATH="$PATH:/usr/bin" pm2 startup systemd -u sam --hp /home/sam
systemctl enable pm2-sam
```

The service file is written to `/etc/systemd/system/pm2-sam.service`. On every reboot, systemd starts PM2 as `sam`, which resurects the saved process list.

---

## 5. nginx operations

| Task | Command (as root) |
|---|---|
| Test config syntax | `nginx -t` |
| Reload config (no downtime) | `systemctl reload nginx` |
| Restart nginx | `systemctl restart nginx` |
| View nginx status | `systemctl status nginx` |
| View access logs | `tail -f /var/log/nginx/access.log` |
| View error logs | `tail -f /var/log/nginx/error.log` |

Config files:

| File | Purpose |
|---|---|
| `/etc/nginx/sites-available/emr-app` | EMR site config (edit this) |
| `/etc/nginx/sites-enabled/emr-app` | Symlink to the above (do not edit) |
| `/etc/nginx/nginx.conf` | Global nginx config |

---

## 6. PM2 operations

All PM2 commands run as `sam`:

```bash
ssh sam@209.38.70.215
```

| Task | Command |
|---|---|
| List all processes | `pm2 list` |
| Show detailed info | `pm2 show emr-web` |
| View live logs (all) | `pm2 logs` |
| View logs for one process | `pm2 logs emr-web` |
| View last N log lines | `pm2 logs emr-web --lines 50 --nostream` |
| Restart a process | `pm2 restart emr-web` |
| Restart all | `pm2 restart all` |
| Stop a process | `pm2 stop emr-web` |
| Delete a process | `pm2 delete emr-web` |
| Reload (zero-downtime restart) | `pm2 reload emr-web` |
| Save current process list | `pm2 save` |
| Monitor CPU/RAM | `pm2 monit` |

> Always run `pm2 save` after any change to the process list so the startup service knows what to resurrect on reboot.

---

## 7. Troubleshooting

### App returns 502 Bad Gateway

nginx is up but the Next.js process is not accepting connections.

```bash
ssh sam@209.38.70.215
pm2 list                  # check emr-web status
pm2 logs emr-web          # look for startup errors
pm2 restart emr-web
```

### API calls return 404 from the browser

Test whether json-server itself is healthy:

```bash
ssh sam@209.38.70.215
curl http://localhost:3001/patients | head -c 100
```

If that returns JSON, the issue is nginx routing. Re-check `/etc/nginx/sites-available/emr-app` and ensure the `/api/` location has a trailing slash on both the path and the `proxy_pass` value.

If it returns an error, check the PM2 process:

```bash
pm2 logs emr-api --lines 30 --nostream
pm2 restart emr-api
```

If you see `EADDRINUSE: address already in use :::3001`, another process is holding the port:

```bash
# as root
fuser -k 3001/tcp
# then as sam
pm2 restart emr-api
```

### Process is in errored / restart loop state

```bash
pm2 logs emr-web --lines 50 --nostream   # read the error
pm2 delete emr-web
pm2 start npm --name "emr-web" --cwd /home/sam/emr-app/web -- start
pm2 save
```

### After a server reboot, nothing is running

The PM2 startup service should handle this automatically. If it didn't:

```bash
# as root
systemctl status pm2-sam
systemctl start pm2-sam
```

If the service is missing, re-run step 4.6.

### Next.js build fails with peer dependency error

Tremor v3 declares a peer dependency on React 18, but the project uses React 19. This is a resolver conflict only — the code works fine at runtime.

```bash
# always use this flag when installing in the web/ directory:
npm install --legacy-peer-deps
```

### `db.json` is empty or missing after a restart

`db.json` is gitignored and must be regenerated. It is ephemeral — all data is synthetic:

```bash
ssh sam@209.38.70.215
cd /home/sam/emr-app/mobile-emr
npm run server:seed      # regenerates db.json with 40 Faker patients
pm2 restart emr-api
```

---

## 8. Environment variables

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Web build env | `http://localhost:3001` | Backend API base URL — baked into Next.js at build time |
| `EXPO_PUBLIC_API_URL` | Mobile runtime env | `http://localhost:3001` | Same, but for the Expo app |

`NEXT_PUBLIC_API_URL` must be set correctly at **build time** (not runtime) because Next.js inlines it during the `npm run build` step. If the IP changes, rebuild the web app.

---

## 9. Updating the server IP or moving to a domain

1. Update `NEXT_PUBLIC_API_URL` in the build step:
   ```bash
   NEXT_PUBLIC_API_URL=http://<NEW_IP_OR_DOMAIN>/api npm run build
   ```
2. Update `server_name` in `/etc/nginx/sites-available/emr-app` if using a domain instead of `_`.
3. If adding TLS, install `certbot` and run:
   ```bash
   apt install certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com
   ```
   Certbot will rewrite the nginx config and set up auto-renewal.
