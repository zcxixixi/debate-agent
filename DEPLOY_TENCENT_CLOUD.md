# Tencent Cloud Deployment

This repo is prepared for a single-server deployment on `Tencent Cloud Lighthouse (Hong Kong)` using Docker Compose.

## Architecture

- `web`: serves the exported Next.js frontend with Nginx
- `backend`: runs FastAPI with Uvicorn
- public routes:
  - `/` -> frontend
  - `/debate/*` -> backend API
  - `/ws/*` -> backend WebSocket

The frontend now supports same-origin API resolution, so `NEXT_PUBLIC_API_BASE_URL` should stay unset for this deployment.

## 1. Prepare the server

Install Docker and Compose:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

Open security group ports:

- `80/tcp`
- `443/tcp` if you later terminate HTTPS on the server or with a load balancer

## 2. Upload the project

```bash
git clone <your-repo-url>
cd debate-agent
cp .env.deploy.example .env.deploy
```

Edit `.env.deploy`:

- set `CORS_ORIGINS=https://your-domain.com`
- set the LLM API keys
- keep `APP_PORT=80` unless port 80 is already occupied

## 3. Start the stack

```bash
docker compose up -d --build
docker compose ps
```

Check health:

```bash
curl http://127.0.0.1/health
```

## 4. Point your domain

Create an `A` record:

- `your-domain.com -> your Tencent Cloud public IP`

The app is designed to work with one public origin:

- `https://your-domain.com/`
- `https://your-domain.com/debate/...`
- `wss://your-domain.com/ws/...`

## 5. Update the app

```bash
git pull
docker compose up -d --build
```

## 6. Useful operations

View logs:

```bash
docker compose logs -f web
docker compose logs -f backend
```

Restart:

```bash
docker compose restart
```

Stop:

```bash
docker compose down
```

## 7. HTTPS

This compose setup serves HTTP on port `80`.

For production, add HTTPS in one of these ways:

1. Put Tencent Cloud CDN / load balancer in front and terminate TLS there.
2. Put host-level Nginx or Caddy in front of this stack and proxy to `127.0.0.1:${APP_PORT}`.

If you want, the next step is to add a Caddy-based HTTPS deployment so the server can issue certificates automatically.
