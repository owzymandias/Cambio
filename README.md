<p align="center">
  <b>Cambio - Multiplayer Card Game</b>
  <br />
  A strategic memory card game built with Nuxt 4, Vue 3, and TypeScript
</p>

## About Cambio

Cambio is a fast-paced card game where players try to achieve the lowest score by remembering card positions and strategically swapping cards. Players can use special card powers to peek at hidden cards, swap with opponents, and ultimately call "Cambio!" to end the round when they believe they have the lowest score.

## Features

- 🃏 **Core Gameplay** - Turn-based card game with 2-4 players
- 🤖 **AI Opponents** - Practice against smart AI bots
- ⚡ **Real-time Multiplayer** - Play with friends online
- 🎨 **Custom Themes** - Light, dark, and multiple color themes
- 👤 **User Preferences** - Persistent display names and theme selection
- 🎯 **Special Card Powers** - Strategic abilities for different card ranks
- 📱 **Responsive Design** - Play on desktop, tablet, or mobile
- 🚀 **Modern Tech Stack** - Built with Nuxt 4, Vue 3, TypeScript

## How to Play

1. Each player receives 4 cards in a 2x2 grid, face-down
2. View your two closest cards once at the start, then remember them
3. On your turn, draw from the deck or take from the discard pile
4. Swap drawn cards with your own to lower your score
5. Use special powers when discarding certain cards:
   - **7/8**: Peek at your own card
   - **9/10**: Peek at opponent's card
   - **J/Q**: Blind swap with opponent
   - **K**: Look at your own card
6. Call "Cambio!" when you think you have the lowest score
7. All other players get one final turn
8. Lowest total score wins! (Number cards = face value, J/Q = 10, K = 0, A = 1)

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd Cambio

# 2. Use Node.js v22 LTS
nvm use

# 3. Install dependencies
npm install

# 4. Setup environment variables
cp .env.example .env

# 5. Generate and apply database migrations
npm run db:generate
npm run db:migrate

# 6. Start development server
npm run dev
```

Visit `http://localhost:3000` to start playing!

## Deployment

#### Node.js Server
```bash
# Deploy to self-hosted server
npm run build
npm run serve
```

#### Cloudflare Worker
```bash
# Deploy to Cloudflare Worker
npm run build
cp wrangler.example.toml wrangler.toml
npm run deploy
```

## Tech Stack

- **Framework**: Nuxt 4 with Vue 3 and TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS via Nuxt UI
- **Real-time**: WebSocket support for multiplayer
- **Deployment**: Node.js server or Cloudflare Workers

## Credits

This project is built upon these amazing open source projects:
- [Nuxt](https://nuxt.com) - The Progressive Web Framework
- [Nuxt UI](https://ui.nuxt.com) - Fully styled and customizable components
- [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm) - TypeScript ORM
- [TailwindCSS](https://tailwindcss.com) - Utility-first CSS framework

