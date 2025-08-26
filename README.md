# 🚀 Brave - AI-Powered Talent Job Matching

A modern, intelligent platform that uses AI to match job seekers with their ideal opportunities. Built with Next.js, Supabase, and advanced matching algorithms.

## ✨ Features

- **🤖 AI-Powered Matching**: Intelligent algorithms that analyze skills and requirements
- **👥 Dual User Types**: Support for both job seekers and employers
- **📄 Resume Management**: Upload and parse resumes with skill extraction
- **💼 Job Posting**: Create detailed job listings with requirements
- **📊 Smart Scoring**: Get detailed match scores with explanations
- **🔒 Secure Authentication**: Role-based access control with Supabase Auth
- **📱 Modern UI**: Beautiful, responsive interface built with shadcn/ui

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI Integration**: OpenAI embeddings and LLMs (Phase 3)
- **Deployment**: Vercel

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key (for Phase 3)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd job-talent-match
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your project URL and anon key
3. Copy `env.example` to `.env.local` and fill in your credentials:

```bash
cp env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set Up Database

1. Go to your Supabase project SQL Editor
2. Copy and paste the contents of `database-schema.sql`
3. Run the SQL to create all tables and policies

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with AuthProvider
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── components/             # Reusable components
│   ├── ui/                # shadcn/ui components
│   └── auth/              # Authentication components
├── contexts/               # React contexts
│   └── AuthContext.tsx    # Authentication state management
└── lib/                    # Utility functions
    ├── supabase.ts        # Supabase client configuration
    └── utils.ts           # General utilities
```

## 🔐 Authentication Flow

1. **Sign Up**: Users choose between job seeker or employer roles
2. **Profile Creation**: User profile is created in the `users` table
3. **Role-Based Access**: Different features based on user role
4. **Secure Storage**: All data protected with Row Level Security (RLS)

## 🗄️ Database Schema

### Core Tables

- **`users`**: User profiles with roles (job_seeker/employer)
- **`resumes`**: Resume files and parsed content with skills
- **`jobs`**: Job postings with requirements
- **`matches`**: AI-generated matches with scores and explanations

### Security Features

- Row Level Security (RLS) enabled on all tables
- User can only access their own data
- Employers can only see matches for their jobs
- Job seekers can only see matches for their resumes

## 🚧 Development Phases

### ✅ Phase 1: Setup & Auth (Current)
- [x] Next.js + TypeScript setup
- [x] Tailwind CSS + shadcn/ui
- [x] Supabase integration
- [x] Authentication system
- [x] Landing page
- [x] Database schema

### 🔄 Phase 2: Core Features (Next)
- [ ] Resume upload and parsing
- [ ] Job posting system
- [ ] Basic user dashboards

### 🔮 Phase 3: AI Matching Engine
- [ ] Skills extraction from resumes
- [ ] OpenAI embeddings integration
- [ ] Matching algorithms
- [ ] Score generation and explanations

### 🎯 Phase 4: Polish & Deploy
- [ ] Advanced dashboards
- [ ] Testing and optimization
- [ ] Production deployment

## 🧪 Testing

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Build for production
npm run build
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

Make sure to set these in your deployment platform:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_APP_URL`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- Check the [Issues](../../issues) page for known problems
- Create a new issue for bugs or feature requests
- Join our community discussions

---

**Built with ❤️ by the Brave team**
