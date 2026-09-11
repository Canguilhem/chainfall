# Deploy on EC2 (t2.micro)

One t2.micro can run the whole app: static client, `/api/*`, and `/ws`. The
Node server (`npm start`) already serves `./dist` and the match socket — no
Vercel split, no Redis, no second host.

Typical cost: **$0** if the instance is Free Tier; otherwise ~$8–10/mo for a
stopped-when-unused micro. Versus works because the process stays up.

## 1. Security group

Inbound:

| Port | Purpose        |
|------|----------------|
| 22   | SSH (your IP)  |
| 80   | HTTP → certbot |
| 443  | HTTPS + WSS    |

Do **not** expose `:8787` publicly — nginx terminates TLS and proxies locally.

## 2. Instance setup (Amazon Linux 2023 or Ubuntu)

```bash
# Node 22 (Ubuntu example)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx certbot python3-certbot-nginx

# App user
sudo useradd -m -s /bin/bash chainfall
sudo mkdir -p /opt/chainfall
sudo chown chainfall:chainfall /opt/chainfall
```

## 3. Deploy the app

As `chainfall`:

```bash
cd /opt/chainfall
git clone https://github.com/YOUR_ORG/chainfall.git .
corepack enable
pnpm install --frozen-lockfile
pnpm run build
```

Copy the systemd unit and enable it:

```bash
sudo cp deploy/chainfall.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now chainfall
curl -s http://127.0.0.1:8787/api/health
# → {"ok":true,...}
```

## 4. nginx + TLS

Replace `chainfall.example.com` with your domain (or use the EC2 public DNS for
testing — certbot needs a real domain for a proper cert).

```bash
sudo cp deploy/nginx-chainfall.conf /etc/nginx/sites-available/chainfall
sudo ln -sf /etc/nginx/sites-available/chainfall /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d chainfall.example.com
```

WebSocket upgrade is already in the nginx snippet. Client connects to
`wss://your-domain/ws` with no env vars.

## 5. Updates

```bash
cd /opt/chainfall
git pull
pnpm install --frozen-lockfile
pnpm run build
sudo systemctl restart chainfall
```

Or run `deploy/update.sh` from the repo on the server.

## 6. Point DNS

A record → Elastic IP (recommended so the IP survives stop/start). Drop Vercel
or redirect `chainfall.vercel.app` to this host once happy.

## Notes

- **RAM:** t2.micro has 1 GB. This app is light; if you add Postgres/Redis
  later, bump to t3.small.
- **Swap:** optional safety on micro instances:
  `sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`
- **Logs:** `journalctl -u chainfall -f`
- **Solo still works offline** in the browser; Versus needs this server reachable.
