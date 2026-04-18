# MediCare Plus

MediCare Plus is a DBMS major project with a FastAPI backend and an HTML/CSS/JavaScript frontend for patient registration, login, appointment booking, and admin-side appointment management.

## Features

- Patient registration and login
- Doctor listing with profile images
- Appointment booking
- Admin dashboard for viewing bookings
- Admin booking cancellation with database deletion

## Project Structure

```text
backend/
  main.py
frontend/
  admin.html
  admin.js
  app.js
  auth.js
  dashboard.js
  index.html
  login.html
  register.html
  style.css
```

## Requirements

- Python 3.10+
- MySQL Server

## Install Dependencies

```bash
pip install -r requirements.txt
```

## Local Database Setup

Create a `.env` file in the project root using `.env.example` and set your local MySQL credentials:

```bash
MEDICAL_DB_HOST=localhost
MEDICAL_DB_PORT=3306
MEDICAL_DB_USER=root
MEDICAL_DB_PASSWORD=your_mysql_password
MEDICAL_DB_NAME=medical_system
MEDICAL_DB_SSL_DISABLED=true
```

## Run the Backend

```bash
uvicorn backend.main:app --reload
```

The API runs on:

```text
http://127.0.0.1:8000
```

## Open the Frontend

Open these files in your browser:

- `frontend/login.html`
- `frontend/register.html`
- `frontend/index.html`
- `frontend/admin.html`

## Vercel Deployment

Deploy this repo as two separate Vercel projects:

1. Backend project
   - Root Directory: `backend`
   - Entry file: `backend/app.py`
   - Install dependencies from `backend/requirements.txt`
   - Add environment variables:
     - `MEDICAL_DB_HOST`
     - `MEDICAL_DB_PORT`
     - `MEDICAL_DB_USER`
     - `MEDICAL_DB_PASSWORD`
     - `MEDICAL_DB_NAME`
     - `MEDICAL_DB_SSL_DISABLED`
     - `MEDICAL_DB_SSL_VERIFY_CERT`
     - `MEDICAL_DB_SSL_CA` (optional certificate file path)
     - `MEDICAL_DB_SSL_CA_CONTENT` (optional PEM certificate content for platforms like Vercel)

2. Frontend project
   - Root Directory: `frontend`
   - Static site deployment

Before deploying the frontend, update `frontend/vercel.json` and replace:

```text
https://YOUR-BACKEND-PROJECT.vercel.app
```

with your real backend Vercel URL.

The frontend uses:

- `http://127.0.0.1:8000` during local development
- `/api` in production through the Vercel rewrite

For Aiven MySQL, use the host, port, username, password, and database name from the Aiven service overview. A typical Vercel backend setup looks like this:

```text
MEDICAL_DB_HOST=your-aiven-host.aivencloud.com
MEDICAL_DB_PORT=your-aiven-port
MEDICAL_DB_USER=avnadmin
MEDICAL_DB_PASSWORD=your-aiven-password
MEDICAL_DB_NAME=medical_system
MEDICAL_DB_SSL_DISABLED=false
MEDICAL_DB_SSL_VERIFY_CERT=false
```

If Aiven requires a CA certificate, you can either provide a file path with `MEDICAL_DB_SSL_CA` or paste the PEM text into `MEDICAL_DB_SSL_CA_CONTENT`. The backend will write that certificate to a temporary file at runtime before opening the MySQL connection.

## Notes

- Make sure your MySQL database and required tables already exist.
- Keep real passwords only in `.env`, not in GitHub.
- If your frontend deploy gets a new backend URL, update `frontend/vercel.json` to point at the latest backend deployment and redeploy the frontend.
- Appointments are deleted from the database when an admin cancels a booking.
