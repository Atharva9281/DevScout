# 🎯 DevScout - AI-Powered Job Application Copilot

> **Automate your job search with AI.** DevScout analyzes job postings, matches them to your resume, and generates tailored application materials in seconds.

[![Powered by Claude](https://img.shields.io/badge/Powered%20by-Claude%20Sonnet%204-8A2BE2)]()
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)]()
[![Deno](https://img.shields.io/badge/Deno-2.0-blue)]()

---

## 🌟 What is Devscout?

DevScout is an end-to-end job application assistant that:

- **🔍 Searches** thousands of job postings from top platforms (Greenhouse, Lever, Ashby, etc.)
- **📊 Analyzes** each role against your resume using AI
- **✍️ Generates** tailored resume bullets and cover letters automatically
- **📈 Tracks** application status and history in a beautiful dashboard

**No more copy-pasting. No more generic applications. Just smart, personalized job hunting.**

---

## 🎬 Demo

![DevScout Dashboard](https://via.placeholder.com/800x400?text=Dashboard+Screenshot)
*Search jobs, view fit scores, and analyze matches*

![AI Analysis](https://via.placeholder.com/800x400?text=Analysis+Workspace)
*Real-time AI analysis with tailored content generation*

---

## ✨ Key Features

### 🤖 **AI-Powered Analysis**
- **4-Step Analysis Pipeline**:
  1. Extract job requirements from description
  2. Compare resume to requirements & identify gaps
  3. Generate 3-5 tailored resume bullets + cover letter
  4. Assemble final output
- **Output**: Tailored resume points, cover letter (250-400 words), missing skills
- Powered by **Claude Sonnet 4** (Anthropic's latest model)
- Real-time progress tracking with SSE streaming

### 🔎 **Smart Job Search**
- Search across **Greenhouse, Lever, Ashby, Wellfound, Y Combinator, Workday**
- Automatic filtering of search pages and duplicates
- Live job description fetching and caching
- Stores up to 200 recent jobs locally

### 📊 **Application Tracking**
- Mark jobs as "Applied" or "Not Applied"
- Persistent storage in PostgreSQL (Neon)
- Sort by date added, status, company
- Quick search and filters

### 💾 **Improvements**
- Copy bullets points to Enhance Resume
- Now never miss a Cover Letter 

---

## 🏗️ Architecture

### **Tech Stack**

#### **Backend (Deno + Zypher)**
- **Deno** - Modern, secure TypeScript runtime
  - Why? Native TypeScript support, built-in security, better performance
- **Zypher** - LLM orchestration framework
  - Why? Handles Claude API streaming, tool management, and multi-step workflows
- **Firecrawl API** - Web search and scraping
  - Why? Reliable job board searching with structured data extraction

#### **Frontend (Next.js 16)**
- **Next.js 16** with App Router
  - Why? Server-side rendering, API routes, excellent DX
- **React 19** - Latest features (Server Components, Actions)
- **TailwindCSS 4** - Utility-first styling
  - Why? Rapid UI development, consistent design system
- **Radix UI** - Accessible component primitives
  - Why? Battle-tested, accessible, customizable
- **Framer Motion** - Smooth animations
  - Why? Professional feel, better UX

#### **Database & Storage**
- **PostgreSQL (Neon)** - Serverless Postgres
  - Why? Fully managed, auto-scaling, perfect for Next.js
- **Local JSON Cache** - Fast offline access
  - Why? Instant page loads, works without internet

### **Data Flow**

```
┌─────────────┐
│   User      │
│  uploads    │
│  resume     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Frontend (Next.js)                     │
│  - Job search UI                        │
│  - Application dashboard                │
│  - Analysis workspace                   │
└──────┬──────────────────────────┬───────┘
       │                          │
       │ HTTP/SSE                 │ Postgres
       │                          │
       ▼                          ▼
┌─────────────────┐      ┌──────────────┐
│  Backend API    │      │  Neon DB     │
│  (Deno :8000)   │◄────►│  - Jobs      │
│                 │      │  - Analyses  │
│  ┌───────────┐  │      │  - Status    │
│  │  Zypher   │  │      └──────────────┘
│  │Orchestrate│  │
│  └─────┬─────┘  │
│        │        │
│        ▼        │
│  ┌──────────┐  │
│  │  Claude  │  │
│  │ Sonnet 4 │  │
│  └──────────┘  │
│        │        │
│        ▼        │
│  ┌──────────┐  │
│  │Firecrawl │  │
│  │  Search  │  │
│  └──────────┘  │
└─────────────────┘
```

### **Analysis Pipeline**

```
Job Posting + Resume
        ↓
┌─────────────────────────────────────┐
│ Step 1: Extract Requirements        │
│ AI analyzes job description         │
└──────────┬──────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ Step 2: Resume Alignment            │
│ Compares resume to job requirements │
│ Identifies missing skills           │
└──────────┬──────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ Step 3: Generate Content            │
│ Creates:                            │
│ • 3-5 tailored resume bullets       │
│ • 250-400 word cover letter         │
└──────────┬──────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ Step 4: Synthesis                   │
│ Final output assembly               │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ Output:                             │
│ ✓ Tailored Resume Points            │
│ ✓ Cover Letter                      │
│ ✓ Missing Skills                    │
└─────────────────────────────────────┘
```

---

## 🚀 Quick Start

### **Prerequisites**
- [Deno](https://deno.land/) 2.0+
- [Node.js](https://nodejs.org/) 18+
- [Anthropic API Key](https://console.anthropic.com/)
- [Firecrawl API Key](https://firecrawl.dev/)
- [Neon Database](https://neon.tech/) (free tier)

### **1. Clone & Install**

```bash
# Clone the repository
git clone https://github.com/yourusername/corespeed.git
cd corespeed

# Install frontend dependencies
cd frontend
npm install

# Backend uses Deno (no install needed)
```

### **2. Configure Environment**

**Backend** (`backend/.env`):
```env
ANTHROPIC_API_KEY=sk-ant-...
FIRECRAWL_API_KEY=fc-...
LOG_LEVEL=info
```

**Frontend** (`frontend/.env`):
```env
NEON_DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

### **3. Run the Application**

**Terminal 1 - Backend:**
```bash
cd backend
deno task start serve
# Runs on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### **4. Upload Resume & Start Searching!**

1. Open http://localhost:3000
2. Click "Upload Resume" (use `.txt` format for best results)
3. Search for jobs: "Software Engineer Python"
4. Click "Analyze" on any job
5. Get tailored bullets & cover letter in ~15 seconds

---

## 📖 Usage Guide

### **Search Jobs**
```bash
# Search from CLI
cd backend
deno task start search "machine learning engineer"
# Results saved to data/jobs/search_*.json
```

### **Analyze a Job**
```bash
# CLI analysis
deno task start analyze data/jobs/job.json data/jobs/resume.json
# Output: data/reports/*.md and *.json
```

### **Frontend Dashboard**

1. **Dashboard Tab**
   - View all searched jobs
   - Filter by "Applied" / "Not Applied"
   - Click any job to analyze

2. **Workspace Tab**
   - Real-time AI analysis progress
   - **Tailored Resume Points** - 3-5 bullets customized for the role
   - **Cover Letter** - 250-400 word personalized letter
   - **Missing Skills** - What to learn/highlight for this role
   - Copy/download outputs

---

## 🔧 Configuration

### **Model Selection**
Edit `backend/src/core/orchestrator.ts`:
```typescript
const MODEL_NAME = "claude-sonnet-4-0"; // Latest Sonnet 4
```

Available models:
- `claude-sonnet-4-0` (recommended)
- `claude-3-5-sonnet-20241022` (Sonnet 3.5)
- `claude-3-opus-20240229` (Opus 3)

### **Search Domains**
Edit Firecrawl query in `backend/src/core/orchestrator.ts`:
```typescript
query: `(${query}) (site:greenhouse.io OR site:lever.co OR ...)`
```

---

## 🐛 Troubleshooting

### **"PDF text extraction failed"**
**Solution**: Convert PDF resumes to `.txt` format
```bash
# macOS
textutil -convert txt resume.pdf -output resume.txt

# Linux
pdftotext resume.pdf resume.txt
```

### **"Model not found" error**
**Solution**: Update model name to `claude-sonnet-4-0` in orchestrator.ts

### **Frontend build errors**
**Solution**: Clear cache and rebuild
```bash
rm -rf .next node_modules
npm install
npm run build
```

### **Database connection errors**
**Solution**: Verify `NEON_DATABASE_URL` is correct and database exists

---

## 📁 Project Structure

```
CoreSpeed/
├── backend/                    # Deno backend
│   ├── src/
│   │   ├── api/               # HTTP API routes
│   │   ├── core/              # Zypher orchestrator
│   │   ├── generators/        # Report builders
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Helpers
│   ├── data/                  # Job/analysis storage
│   └── deno.json              # Deno config
│
├── frontend/                   # Next.js frontend
│   ├── app/                   # App Router pages
│   │   ├── api/              # API routes
│   │   └── page.tsx          # Main dashboard
│   ├── components/            # React components
│   ├── lib/                   # Utilities
│   └── package.json
│
└── README.md
```

---

## 🤝 Contributing

We welcome contributions! Areas for improvement:

- [ ] Add PDF parsing library (pdf-parse)
- [ ] Implement job alerts/notifications
- [ ] Add more job board integrations
- [ ] Export to ATS formats (Workday, etc.)
- [ ] Chrome extension for one-click analysis

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file

---

## 🙏 Acknowledgments

- **Anthropic** - Claude AI
- **Firecrawl** - Job search API
- **Neon** - Serverless Postgres
- **Zypher** - LLM orchestration