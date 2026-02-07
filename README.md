# Job Scraper Chrome Extensions

A system of 4 Chrome extensions that scrape job listings from major job boards and send them to a backend API.

## 📁 Project Structure

```
chromeextension/
├── backend/                    # Express.js API server
│   ├── server.js              # Main server file
│   ├── models/Job.js          # MongoDB schema
│   ├── routes/jobs.js         # API routes
│   ├── middleware/
│   │   ├── auth.js            # API key authentication
│   │   └── validation.js      # Request validation
│   ├── package.json
│   └── .env.example
│
├── stackoverflow-extension/    # Stack Overflow Jobs scraper
├── ycombinator-extension/      # Y Combinator Jobs scraper
├── wellfound-extension/        # Wellfound (AngelList) scraper
├── monster-extension/          # Monster.com scraper
└── shared/                     # Shared utilities
    └── api-client.js
```

## 🚀 Quick Start

### 1. Backend API Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your settings
npm install
npm run dev
```

### 2. Load Chrome Extensions

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select one of the extension folders (e.g., `stackoverflow-extension`)
5. Repeat for each extension

### 3. Configure Extensions

1. Click the extension icon in Chrome toolbar
2. Enter your API URL (e.g., `https://your-vps.com`)
3. Enter your API key
4. Click "Save Settings"

## 🔧 Backend API

### Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/job_scraper
API_KEY=your-secure-api-key-here
N8N_WEBHOOK_URL=http://localhost:5678/webhook/job-received
PORT=3001
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (no auth) |
| POST | `/api/jobs` | Create single job |
| POST | `/api/jobs/batch` | Create multiple jobs |
| GET | `/api/jobs` | List jobs with filters |
| GET | `/api/jobs/stats` | Get statistics |
| DELETE | `/api/jobs/:id` | Delete a job |

### Job Schema

```json
{
  "company": "Company Name",
  "title": "Job Title",
  "location": "Remote / San Francisco, CA",
  "source": "stackoverflow|ycombinator|wellfound|monster",
  "skills": ["JavaScript", "React", "Node.js"],
  "job_url": "https://...",
  "salary": "$100K - $150K",
  "equity": "0.5% - 1.0%",
  "remote": true
}
```

## 🔌 Chrome Extensions

### Target Websites

| Extension | Websites |
|-----------|----------|
| Stack Overflow | stackoverflowjobs.com |
| Y Combinator | workatastartup.com, news.ycombinator.com/jobs |
| Wellfound | wellfound.com, angel.co |
| Monster | monster.com |

### Usage

1. Navigate to a job listing page
2. Click the extension icon
3. Click "Scrape This Page"
4. Review the scraped jobs
5. Click "Send to API"

## 📡 n8n Integration

The API automatically forwards new jobs to your n8n webhook. Set `N8N_WEBHOOK_URL` in `.env`.

Example n8n workflow:
1. Receive webhook trigger
2. Deduplicate by job_url
3. Send Slack/email notification
4. Add to Google Sheets

## 🔒 Security

- API key authentication via `X-API-Key` header
- Rate limiting: 100 requests/minute per IP
- CORS configured for Chrome extensions
- Helmet.js security headers

## 🚢 VPS Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment instructions.

Quick deploy:

```bash
# On your VPS
git clone <repo> /var/www/job-scraper
cd /var/www/job-scraper/backend
npm install --production
pm2 start server.js --name job-scraper-api
```

## 🔧 Maintenance

When scrapers break due to website changes:

1. Open DevTools on the target website
2. Inspect job card elements
3. Update CSS selectors in `content.js`
4. Increment version in `manifest.json`
5. Reload extension in Chrome

## 📝 License

MIT
