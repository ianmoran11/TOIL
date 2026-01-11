# TOIL - Local Time Tracker

A privacy-focused, local-first time tracking web application.

## Features

- **Local Storage**: All data stays in your browser (LocalStorage).
- **Time Tracking**: Start/Stop work and break timers.
- **Editing**: Adjust start/stop times or add manual entries.
- **Projects & Tags**: Organize work with custom projects and tags.
- **Visualization**: View daily/weekly/monthly reports with charts.
- **Import/Export**: detailed CSV export and import capability.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment to Vercel

1. Create a new project on Vercel.
2. Select this repository.
3. Vercel will automatically detect the "Vite" framework preset.
4. Click Deploy.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS (v4)
- Zustand (State Management)
- Recharts (Visualization)
- Lucide React (Icons)
- Date-fns
