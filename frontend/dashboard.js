let doctors = [];
let filteredDoctors = [];
let selectedDoctor = null;
let patientSession = null;

const DOCTOR_IMAGE_FALLBACK =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
            <rect width="900" height="600" fill="#dff1ee"/>
            <circle cx="450" cy="220" r="110" fill="#8fcac1"/>
            <path d="M250 520c22-118 114-184 200-184s178 66 200 184" fill="#8fcac1"/>
            <text x="450" y="570" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#0f766e">Doctor Profile</text>
        </svg>
    `);

window.handleDoctorImageError = function handleDoctorImageError(image) {
    if (image.dataset.fallbackApplied === "true") {
        return;
    }

    image.dataset.fallbackApplied = "true";
    image.src = DOCTOR_IMAGE_FALLBACK;
};

function renderDoctorCards() {
    const list = document.getElementById("doctorList");

    if (!filteredDoctors.length) {
        list.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                No specialists match your search right now. Try another keyword.
            </div>
        `;
        return;
    }

    list.innerHTML = filteredDoctors.map((doctor) => {
        const isSelected = selectedDoctor && selectedDoctor.doctor_id === doctor.doctor_id;
        return `
            <article class="doctor-card reveal ${isSelected ? "selected" : ""}">
                <img class="doctor-image" src="${doctor.image}" alt="${doctor.name}" onerror="handleDoctorImageError(this)">
                <div class="doctor-content">
                    <span class="section-badge">${doctor.specialization}</span>
                    <h3>${doctor.name}</h3>
                    <p class="muted">Calm, evidence-based care with fast coordination and digital follow-up support.</p>
                    <div class="chip-row">
                        <span class="chip">${doctor.experience_years}+ yrs experience</span>
                        <span class="chip">Rs. ${doctor.consultation_fee} consult</span>
                        <span class="chip">${doctor.location}</span>
                    </div>
                    <button class="button button-primary" onclick="selectDoctor(${doctor.doctor_id})">
                        ${isSelected ? "Selected" : "Choose Doctor"}
                    </button>
                </div>
            </article>
        `;
    }).join("");
}

function renderSelectedDoctor() {
    const preview = document.getElementById("selectedDoctorPreview");
    if (!selectedDoctor) {
        preview.innerHTML = `
            <div>
                <strong>No doctor selected yet</strong>
                <p class="muted">Choose a specialist card to unlock the booking form.</p>
            </div>
        `;
        return;
    }

    preview.innerHTML = `
        <img src="${selectedDoctor.image}" alt="${selectedDoctor.name}" onerror="handleDoctorImageError(this)">
        <div>
            <strong>${selectedDoctor.name}</strong>
            <p class="muted">${selectedDoctor.specialization}</p>
            <span class="chip">Rs. ${selectedDoctor.consultation_fee}</span>
        </div>
    `;
}

function selectDoctor(doctorId) {
    selectedDoctor = doctors.find((doctor) => doctor.doctor_id === doctorId) || null;
    renderDoctorCards();
    renderSelectedDoctor();
    if (selectedDoctor) {
        showToast(`${selectedDoctor.name} selected for booking.`, "info");
    }
}

function filterDoctors() {
    const keyword = document.getElementById("doctorSearch").value.trim().toLowerCase();
    filteredDoctors = doctors.filter((doctor) => {
        return (
            doctor.name.toLowerCase().includes(keyword) ||
            doctor.specialization.toLowerCase().includes(keyword) ||
            doctor.location.toLowerCase().includes(keyword)
        );
    });
    renderDoctorCards();
}

async function loadSummary() {
    const [summary, appointments] = await Promise.all([
        request("/dashboard/summary"),
        request(`/patient/${patientSession.patient_id}/appointments`),
    ]);

    document.getElementById("heroPatientName").textContent = patientSession.name;
    document.getElementById("welcomeName").textContent = patientSession.name;
    document.getElementById("doctorMetric").textContent = summary.total_doctors;
    document.getElementById("specialtyMetric").textContent = summary.total_specialties;
    document.getElementById("appointmentMetric").textContent = appointments.filter(
        (item) => appointmentStatus(item.appointment_date, item.appointment_time) === "upcoming"
    ).length;

    renderAppointments(appointments);
}

function renderAppointments(appointments) {
    const container = document.getElementById("appointmentList");

    if (!appointments.length) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                Your upcoming visit cards will appear here after the first booking.
            </div>
        `;
        return;
    }

    container.innerHTML = appointments.map((appointment) => {
        const status = appointmentStatus(appointment.appointment_date, appointment.appointment_time);
        const location = appointment.location || "City Medical Center";
        return `
            <article class="appointment-card reveal">
                <img src="${appointment.image}" alt="${appointment.doctor_name}" onerror="handleDoctorImageError(this)">
                <div>
                    <span class="status-pill ${status}">${status === "upcoming" ? "Upcoming Visit" : "Completed Visit"}</span>
                    <h3>${appointment.doctor_name}</h3>
                    <p class="muted">${appointment.specialization}</p>
                    <p><strong>${formatDate(appointment.appointment_date)}</strong> at ${formatTime(appointment.appointment_time)}</p>
                    <p class="muted">${location}</p>
                </div>
            </article>
        `;
    }).join("");
}

async function loadDoctors() {
    doctors = await request("/doctors");
    filteredDoctors = doctors;
    document.getElementById("doctorCount").textContent = doctors.length;
    renderDoctorCards();
    renderSelectedDoctor();
}

async function bookAppointment(event) {
    event.preventDefault();

    if (!selectedDoctor) {
        showToast("Select a doctor before booking.", "error");
        return;
    }

    const date = document.getElementById("appointmentDate").value;
    const time = document.getElementById("appointmentTime").value;

    if (!date || !time) {
        showToast("Choose both a date and a time slot.", "error");
        return;
    }

    try {
        const result = await request("/book", {
            method: "POST",
            body: JSON.stringify({
                patient_id: patientSession.patient_id,
                doctor_id: selectedDoctor.doctor_id,
                date,
                time,
            }),
        });

        showToast(result.message, "success");
        document.getElementById("bookingForm").reset();
        renderSelectedDoctor();
        await loadSummary();
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function bootstrapDashboard() {
    patientSession = requirePatientSession();
    if (!patientSession) {
        return;
    }

    const today = new Date().toISOString().split("T")[0];
    document.getElementById("appointmentDate").min = today;

    try {
        await Promise.all([loadDoctors(), loadSummary()]);
    } catch (error) {
        showToast(error.message, "error");
    }
}

document.addEventListener("DOMContentLoaded", bootstrapDashboard);
