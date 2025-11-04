# AI Trader - Automated Crypto Trading Platform

![AI Trader](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Firebase](https://img.shields.io/badge/Firebase-RTDB-orange.svg)
![React](https://img.shields.io/badge/React-18.3-blue.svg)

An AI-powered automated crypto trading platform with EMA-based strategies, multi-exchange support, and real-time monitoring.

## 🚀 Key Features

- **Multi-Language Support**: English and Turkish (i18n with fallback)
- **Authentication**: Firebase Auth (Email/Password + Google OAuth)
- **Real-time Database**: Firebase Realtime Database
- **EMA Trading Strategy**: 9/21 crossover with customizable TP/SL
- **Multi-Exchange**: Binance, Bybit, OKX, Coinbase, MEXC
- **Subscription Plans**: Free, Pro, and Unlimited tiers
- **Global Payments**: Paddle & LemonSqueezy integration ready
- **Real-time Dashboard**: Live position tracking and P&L monitoring
- **Error Boundary**: Graceful error handling
- **Production Ready**: Optimized for Render.com deployment

## 📦 Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Firebase (Auth + Realtime Database)
- TanStack Query
- i18next (internationalization)
- React Hook Form + Zod validation

## 📁 Project Structure

```
src/
├── components/       # UI components (StatsCard, PositionCard, etc.)
├── contexts/         # AuthContext
├── hooks/           # useSubscription custom hook
├── lib/             # apiConfig, firebase, i18n, payment
├── locales/         # en.json, tr.json
└── pages/           # Index, Auth, Dashboard, NotFound
```

## 💰 Subscription Plans

- **Free**: 1 exchange, signals only
- **Pro ($29/mo)**: 5 exchanges, automated trading, advanced analytics
- **Unlimited ($99/mo)**: Unlimited exchanges, custom strategies, API access

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete Render.com deployment guide.

Quick start:
```bash
npm run build  # Build for production
```

Configure environment variables in Render Dashboard (see `.env.production.example`)

## 🔒 Security Features

- Firebase security rules (auth-based access)
- Encrypted API key storage
- Rate limiting per tier
- Input validation with Zod
- Error boundary for crash prevention

## 📝 Environment Variables

Required variables (see `.env.example`):
- Firebase config (API key, auth domain, etc.)
- Trading API URL
- Payment provider credentials (Paddle or LemonSqueezy)

---

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/97ab2e6a-2f9e-4a02-b46d-8b5450708b0a

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/97ab2e6a-2f9e-4a02-b46d-8b5450708b0a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/97ab2e6a-2f9e-4a02-b46d-8b5450708b0a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
