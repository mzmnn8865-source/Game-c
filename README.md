# GameClub Astro frontend

Astro SSR website frontend. The FastAPI implementation and Flutter client are not included in this export.

## Local run

```sh
npm ci
npm run dev
```

Development uses the Vite proxy to `http://127.0.0.1:8000` by default. For a production Node server:

```sh
npm ci
npm run build
npm start
```

Configure server-side API access with `GAMECLUB_BACKEND_URL`. Browser API origin, path mapping, auth payloads, and token response mapping are in `public/backend-config.js`. Read [BACKEND-INTEGRATION.md](BACKEND-INTEGRATION.md) before connecting another API.
