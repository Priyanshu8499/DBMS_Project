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
MEDICAL_DB_USER=root
MEDICAL_DB_PASSWORD=your_mysql_password
MEDICAL_DB_NAME=medical_system
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

## Notes

- Make sure your MySQL database and required tables already exist.
- Keep real passwords only in `.env`, not in GitHub.
- Appointments are deleted from the database when an admin cancels a booking.
