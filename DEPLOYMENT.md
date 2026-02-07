# VPS Deployment Guide

Deploy the Job Scraper API to your Hostinger VPS alongside your existing MERN app and n8n.

## Prerequisites

- Node.js 18+ installed on VPS
- MongoDB running (local or existing from your MERN app)
- Nginx configured
- PM2 installed (`npm install -g pm2`)

---

## Quick Start

```bash
# 1. SSH into VPS
ssh root@your-vps-ip

# 2. Create directory
cd /var/www
mkdir job-scraper && cd job-scraper

# 3. Upload backend folder (via SFTP, rsync, or git clone)

# 4. Install & configure
cd backend
cp .env.example .env
nano .env  # Edit values

# 5. Install dependencies
npm install --production

# 6. Start with PM2
pm2 start server.js --name job-scraper-api
pm2 save && pm2 startup
```

---

## Step-by-Step Guide

### Step 1: Upload Files

**Option A - Using SCP:**
```bash
scp -r c:/Users/User\ A/chromeextension/backend/ root@YOUR_VPS_IP:/var/www/job-scraper/
```

**Option B - Using Git:**
```bash
ssh root@YOUR_VPS_IP
cd /var/www
git clone <your-repo> job-scraper
```

### Step 2: Configure Environment

```bash
cd /var/www/job-scraper/backend
cp .env.example .env
nano .env
```

**Required values:**
```env
# Server
PORT=3001
NODE_ENV=production

# MongoDB - use your existing MongoDB or create new database
MONGODB_URI=mongodb://localhost:27017/job_scraper

# API Security - generate a secure key
API_KEY=your-secure-api-key-here

# n8n Integration (optional)
N8N_WEBHOOK_URL=http://localhost:5678/webhook/jobs-received
```

**Generate secure API key:**
```bash
openssl rand -hex 32
```

### Step 3: Install Dependencies

```bash
npm install --production
```

### Step 4: Start with PM2

```bash
pm2 start server.js --name job-scraper-api
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

### Step 5: Configure Nginx

Create `/etc/nginx/sites-available/job-scraper`:

```nginx
server {
    listen 80;
    server_name jobs-api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Or add to existing domain as a path:**
```nginx
location /jobs-api/ {
    rewrite ^/jobs-api/(.*)$ /$1 break;
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Enable and reload:
```bash
ln -s /etc/nginx/sites-available/job-scraper /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Step 6: Add SSL (Recommended)

```bash
certbot --nginx -d jobs-api.yourdomain.com
```

---

## Configure Chrome Extensions

1. Click extension icon in Chrome
2. Set **API URL**: `https://jobs-api.yourdomain.com`
3. Set **API Key**: Same key from your `.env`
4. Click **Save Settings**

---

## n8n Integration

The API automatically sends webhook notifications when jobs are saved.

### Setup in n8n:

1. **Create new workflow**
2. **Add Webhook node:**
   - HTTP Method: POST
   - Path: `jobs-received`
   - Copy the webhook URL
3. **Update .env on VPS:**
   ```bash
   nano /var/www/job-scraper/backend/.env
   # Set: N8N_WEBHOOK_URL=https://n8n.yourdomain.com/webhook/jobs-received
   pm2 restart job-scraper-api
   ```

### Webhook Payload:

```json
{
  "newJobs": [{ "company": "...", "title": "...", ... }],
  "updatedJobs": [{ "company": "...", "title": "...", ... }],
  "source": "stackoverflow",
  "timestamp": "2024-02-06T02:45:00.000Z"
}
```

### Example n8n Workflow:

```
[Webhook] → [IF: newJobs.length > 0] → [Send Email/Slack/Telegram]
                                    ↓
                              [Google Sheets: Add Rows]
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/api/jobs` | API Key | Create single job |
| POST | `/api/jobs/batch` | API Key | Create multiple jobs |
| GET | `/api/jobs` | API Key | Get all jobs |
| GET | `/api/jobs/:id` | API Key | Get single job |

**Headers required:**
```
Content-Type: application/json
X-API-Key: your-api-key
```

---

## Testing

```bash
# Health check
curl https://jobs-api.yourdomain.com/health

# Create job (replace YOUR_API_KEY)
curl -X POST https://jobs-api.yourdomain.com/api/jobs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "company": "Test Company",
    "title": "Software Engineer",
    "location": "Remote",
    "source": "stackoverflow",
    "job_url": "https://example.com/job/1"
  }'
```

---

## Monitoring

```bash
pm2 logs job-scraper-api        # View logs
pm2 logs job-scraper-api -f     # Follow logs
pm2 monit                       # Monitor resources
pm2 status                      # Check status
```

---

## Troubleshooting

### API not responding
```bash
pm2 restart job-scraper-api
pm2 logs job-scraper-api --lines 50
```

### MongoDB connection issues
```bash
sudo systemctl status mongod
mongosh mongodb://localhost:27017/job_scraper
```

### Extensions can't connect
- Check API URL is correct (include https://)
- Verify API key matches `.env`
- Check CORS: `pm2 logs job-scraper-api | grep CORS`

### n8n not receiving webhooks
```bash
# Test n8n webhook directly
curl -X POST http://localhost:5678/webhook/jobs-received \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check if n8n is running
pm2 status  # or: docker ps
```

---

## Updating

```bash
cd /var/www/job-scraper/backend
git pull  # if using git
npm install --production
pm2 restart job-scraper-api
```
