# Pravixa AI Backend

This repository now includes a Node.js backend server with:

- Express routes for all site pages
- `/api/contact` form submission endpoint
- `/api/application` career application endpoint with optional resume upload
- admin login and dashboard
- contact lead persistence in `data/contacts.json`
- career application persistence in `data/applications.json`
- `robots.txt` and `sitemap.xml` for production SEO crawling

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Visit:

- `http://localhost:3000/` for the site
- `http://localhost:3000/contact` for the contact form
- `http://localhost:3000/careers` for the career application form
- `http://localhost:3000/admin/login` for the admin panel

## Verify Everything

Run the smoke test after changes:

```bash
npm test
```

The smoke test checks public pages, form APIs, admin login, admin pages, and admin JSON APIs.

## Admin Credentials

Default admin credentials:

- Username: `admin`
- Password: `PravixaAI@2026`

Set custom credentials using environment variables:

```bash
ADMIN_USER=myuser ADMIN_PASS=mypassword npm start
```
