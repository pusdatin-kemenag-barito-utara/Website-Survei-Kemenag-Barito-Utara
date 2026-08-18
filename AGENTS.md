# SI-ARUS Kemenag Barito Utara Architecture

## Frontend
- **Framework**: Astro 7 (Node.js standalone adapter for SSR)
- **UI & Islands**: React 19 (`@astrojs/react`) with Astro client directives (`client:only="react"`)
- **Styling**: Tailwind CSS v4 + Plus Jakarta Sans
- **Transitions**: Astro `<ClientRouter />` for smooth SPA navigation

## Backend
- **Framework**: Golang Fiber REST API v2
- **Database**: PostgreSQL on Supabase (`schema: kemenag_survey`)
- **Live Reload**: Air (`.air.toml`)
