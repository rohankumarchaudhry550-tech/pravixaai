# Pravixa AI Backend

This repository now includes a Node.js backend server with:

- Express routes for all site pages
- `/api/contact` form submission endpoint
- admin login and dashboard
- contact lead persistence in `data/contacts.json`

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
- `http://localhost:3000/admin/login` for the admin panel

## Admin Credentials

Default admin credentials:

- Username: `admin`
- Password: `PravixaAI@2026`

Set custom credentials using environment variables:

```bash
ADMIN_USER=myuser ADMIN_PASS=mypassword npm start
```
