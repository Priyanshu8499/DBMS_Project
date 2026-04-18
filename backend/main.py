from contextlib import contextmanager
from datetime import date, datetime, timedelta
import hashlib
import os
from typing import Any

import mysql.connector
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator

app = FastAPI(title="MediCare Plus API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DOCTOR_PHOTOS = {
    "cardio": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=900&q=80",
    "neuro": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80",
    "pedia": "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=900&q=80",
    "derma": "https://images.unsplash.com/photo-1612277795421-9bc7706a4a41?auto=format&fit=crop&w=900&q=80",
    "ortho": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=80",
    "general": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=900&q=80",
}

DOCTOR_NAME_PHOTOS = {
    "dr. karan mehta": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=900&q=80",
}


def get_db():
    return mysql.connector.connect(
        host=os.getenv("MEDICAL_DB_HOST", "localhost"),
        user=os.getenv("MEDICAL_DB_USER", "root"),
        password=os.getenv("MEDICAL_DB_PASSWORD"),
        database=os.getenv("MEDICAL_DB_NAME", "medical_system"),
    )


@contextmanager
def db_cursor(dictionary: bool = False):
    db = get_db()
    cursor = db.cursor(dictionary=dictionary)
    try:
        yield db, cursor
    finally:
        cursor.close()
        db.close()


def hash_password(password: str) -> str:
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return f"sha256${digest}"


def verify_password(raw_password: str, stored_password: str) -> bool:
    if not stored_password:
        return False

    if stored_password.startswith("sha256$"):
        return stored_password == hash_password(raw_password)

    return stored_password == raw_password


def doctor_photo_for(name: str | None, specialization: str | None, current_image: str | None) -> str:
    if current_image:
        return current_image

    normalized_name = (name or "").strip().lower()
    if normalized_name in DOCTOR_NAME_PHOTOS:
        return DOCTOR_NAME_PHOTOS[normalized_name]

    value = (specialization or "").lower()
    for keyword, image_url in DOCTOR_PHOTOS.items():
        if keyword in value:
            return image_url
    return DOCTOR_PHOTOS["general"]


def serialize_doctor(row: dict[str, Any]) -> dict[str, Any]:
    specialization = row.get("specialization", "General Medicine")
    experience = row.get("experience_years")
    if experience in (None, ""):
        experience = 8

    return {
        "doctor_id": row["doctor_id"],
        "name": row.get("name", "Doctor"),
        "specialization": specialization,
        "experience_years": experience,
        "location": row.get("location") or "City Medical Center",
        "consultation_fee": row.get("consultation_fee") or 800,
        "image": doctor_photo_for(row.get("name"), specialization, row.get("image")),
    }


def serialize_time_value(value: Any) -> str:
    if isinstance(value, timedelta):
        total_seconds = int(value.total_seconds())
    elif isinstance(value, (int, float)):
        total_seconds = int(value)
    elif isinstance(value, str):
        return value
    else:
        return "00:00:00"

    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


class ApiMessage(BaseModel):
    message: str


class AdminLogin(BaseModel):
    username: str
    password: str


class Appointment(BaseModel):
    patient_id: int
    doctor_id: int
    date: str
    time: str

    @validator("date")
    def validate_date(cls, value: str) -> str:
        selected_date = datetime.strptime(value, "%Y-%m-%d").date()
        if selected_date < date.today():
            raise ValueError("Appointment date cannot be in the past")
        return value

    @validator("time")
    def validate_time(cls, value: str) -> str:
        datetime.strptime(value, "%H:%M")
        return value


class PatientRegister(BaseModel):
    name: str
    email: str
    phone: str
    password: str

    @validator("name")
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Name must be at least 2 characters long")
        return cleaned

    @validator("phone")
    def validate_phone(cls, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit())
        if len(digits) != 10:
            raise ValueError("Phone number must contain 10 digits")
        return digits

    @validator("email")
    def validate_email(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if "@" not in cleaned or "." not in cleaned.split("@")[-1]:
            raise ValueError("Please enter a valid email address")
        return cleaned

    @validator("password")
    def validate_password(cls, value: str) -> str:
        if len(value) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return value


class PatientLogin(BaseModel):
    email: str
    password: str

    @validator("email")
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


@app.get("/", response_model=ApiMessage)
def home():
    return {"message": "MediCare Plus API is running"}


@app.post("/admin/login", response_model=ApiMessage)
def admin_login(data: AdminLogin):
    with db_cursor(dictionary=True) as (_, cursor):
        cursor.execute("SELECT * FROM Admin WHERE username = %s", (data.username,))
        user = cursor.fetchone()

    if not user or not verify_password(data.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {"message": "Login successful"}


@app.post("/patient/register", response_model=ApiMessage)
def register(data: PatientRegister):
    with db_cursor(dictionary=True) as (db, cursor):
        cursor.execute("SELECT patient_id FROM Patients WHERE email = %s", (data.email,))
        existing_user = cursor.fetchone()
        if existing_user:
            raise HTTPException(status_code=409, detail="An account with this email already exists")

        cursor.execute(
            """
            INSERT INTO Patients(name, email, phone, password)
            VALUES (%s, %s, %s, %s)
            """,
            (data.name, data.email, data.phone, hash_password(data.password)),
        )
        db.commit()

    return {"message": "Registration completed successfully"}


@app.post("/patient/login")
def patient_login(data: PatientLogin):
    with db_cursor(dictionary=True) as (db, cursor):
        cursor.execute("SELECT * FROM Patients WHERE email = %s", (data.email,))
        user = cursor.fetchone()

        if not user or not verify_password(data.password, user.get("password", "")):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not str(user.get("password", "")).startswith("sha256$"):
            cursor.execute(
                "UPDATE Patients SET password = %s WHERE patient_id = %s",
                (hash_password(data.password), user["patient_id"]),
            )
            db.commit()

    return {
        "message": "Login successful",
        "patient_id": user["patient_id"],
        "name": user["name"],
        "email": user["email"],
    }


@app.get("/doctors")
def get_doctors():
    with db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            "SELECT * FROM Doctors ORDER BY name"
        )
        doctors = cursor.fetchall()

    return [serialize_doctor(doctor) for doctor in doctors]


@app.get("/dashboard/summary")
def dashboard_summary():
    with db_cursor(dictionary=True) as (_, cursor):
        cursor.execute("SELECT COUNT(*) AS total_doctors FROM Doctors")
        total_doctors = cursor.fetchone()["total_doctors"]

        cursor.execute("SELECT COUNT(DISTINCT specialization) AS total_specialties FROM Doctors")
        total_specialties = cursor.fetchone()["total_specialties"]

        cursor.execute(
            """
            SELECT COUNT(*) AS upcoming_appointments
            FROM Appointments
            WHERE appointment_date >= CURDATE()
            """
        )
        upcoming = cursor.fetchone()["upcoming_appointments"]

    return {
        "total_doctors": total_doctors,
        "total_specialties": total_specialties,
        "upcoming_appointments": upcoming,
    }


@app.get("/patient/{patient_id}/appointments")
def patient_appointments(patient_id: int):
    with db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT
                a.appointment_id,
                a.appointment_date,
                a.appointment_time,
                d.name AS doctor_name,
                d.specialization,
                COALESCE(d.image, '') AS image
            FROM Appointments a
            JOIN Doctors d ON d.doctor_id = a.doctor_id
            WHERE a.patient_id = %s
            ORDER BY a.appointment_date, a.appointment_time
            """,
            (patient_id,),
        )
        rows = cursor.fetchall()

    for row in rows:
        row["image"] = doctor_photo_for(row.get("doctor_name"), row.get("specialization"), row.get("image"))
        row["appointment_time"] = serialize_time_value(row.get("appointment_time"))

    return rows


@app.post("/book", response_model=ApiMessage)
def book(data: Appointment):
    appointment_datetime = datetime.strptime(f"{data.date} {data.time}", "%Y-%m-%d %H:%M")
    if appointment_datetime < datetime.now():
        raise HTTPException(status_code=400, detail="Please choose a future appointment time")

    with db_cursor(dictionary=True) as (db, cursor):
        cursor.execute("SELECT patient_id FROM Patients WHERE patient_id = %s", (data.patient_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Patient account not found")

        cursor.execute("SELECT doctor_id FROM Doctors WHERE doctor_id = %s", (data.doctor_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Doctor not found")

        cursor.execute(
            """
            SELECT appointment_id
            FROM Appointments
            WHERE doctor_id = %s
              AND appointment_date = %s
              AND appointment_time = %s
            """,
            (data.doctor_id, data.date, data.time),
        )
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="This time slot is already booked")

        cursor.execute(
            """
            INSERT INTO Appointments
                (patient_id, doctor_id, appointment_date, appointment_time)
            VALUES (%s, %s, %s, %s)
            """,
            (data.patient_id, data.doctor_id, data.date, data.time),
        )
        db.commit()

    return {"message": "Appointment booked successfully"}


@app.get("/admin/summary")
def admin_summary():
    with db_cursor(dictionary=True) as (_, cursor):
        cursor.execute("SELECT COUNT(*) AS total_patients FROM Patients")
        total_patients = cursor.fetchone()["total_patients"]

        cursor.execute("SELECT COUNT(*) AS total_doctors FROM Doctors")
        total_doctors = cursor.fetchone()["total_doctors"]

        cursor.execute("SELECT COUNT(*) AS total_appointments FROM Appointments")
        total_appointments = cursor.fetchone()["total_appointments"]

        cursor.execute(
            """
            SELECT COUNT(*) AS today_appointments
            FROM Appointments
            WHERE appointment_date = CURDATE()
            """
        )
        today_appointments = cursor.fetchone()["today_appointments"]

    return {
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "total_appointments": total_appointments,
        "today_appointments": today_appointments,
    }


@app.get("/admin/appointments")
def all_appointments():
    with db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT
                a.appointment_id,
                a.appointment_date,
                a.appointment_time,
                p.patient_id,
                p.name AS patient_name,
                p.email AS patient_email,
                d.doctor_id,
                d.name AS doctor_name,
                d.specialization
            FROM Appointments a
            JOIN Patients p ON p.patient_id = a.patient_id
            JOIN Doctors d ON d.doctor_id = a.doctor_id
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
            """
        )
        rows = cursor.fetchall()

    for row in rows:
        row["appointment_time"] = serialize_time_value(row.get("appointment_time"))

    return rows


@app.delete("/admin/appointments/{appointment_id}", response_model=ApiMessage)
def cancel_appointment(appointment_id: int):
    with db_cursor(dictionary=True) as (db, cursor):
        cursor.execute(
            "SELECT appointment_id FROM Appointments WHERE appointment_id = %s",
            (appointment_id,),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Appointment not found")

        cursor.execute(
            "DELETE FROM Appointments WHERE appointment_id = %s",
            (appointment_id,),
        )
        db.commit()

    return {"message": "Appointment cancelled successfully"}
