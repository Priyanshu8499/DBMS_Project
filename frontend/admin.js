let appointmentRows = [];
let adminSearchTimer = null;
let pendingDeleteAppointmentId = null;

function statusFromAppointment(row) {
    return appointmentStatus(row.appointment_date, row.appointment_time);
}

function updateAdminMetrics(summary, totalRows) {
    document.getElementById("totalPatients").textContent = summary.total_patients;
    document.getElementById("totalDoctors").textContent = summary.total_doctors;
    document.getElementById("totalAppointments").textContent = summary.total_appointments;
    document.getElementById("todayAppointments").textContent = summary.today_appointments;
    document.getElementById("adminAppointmentCount").textContent = totalRows;
}

function renderAdminTable() {
    const keyword = document.getElementById("adminSearch").value.trim().toLowerCase();
    const tbody = document.getElementById("adminTableBody");

    const filtered = appointmentRows.filter((row) => {
        return [
            row.patient_id,
            row.patient_name,
            row.patient_email,
        ].some((value) => String(value || "").toLowerCase().includes(keyword));
    });

    if (!filtered.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">No appointments match your search.</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map((row) => {
        const status = statusFromAppointment(row);
        return `
            <tr>
                <td>#${row.appointment_id}</td>
                <td>
                    <strong>${row.patient_name}</strong><br>
                    <span class="muted">${row.patient_email}</span>
                </td>
                <td>
                    <strong>${row.doctor_name}</strong><br>
                    <span class="muted">${row.specialization}</span>
                </td>
                <td>${formatDate(row.appointment_date)}</td>
                <td>${formatTime(row.appointment_time)}</td>
                <td><span class="status-pill ${status}">${status}</span></td>
                <td>${row.specialization}</td>
                <td>
                    <button class="button button-danger button-inline" onclick="cancelAppointment(${row.appointment_id})">
                        Cancel Booking
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function scheduleAdminSearch() {
    if (adminSearchTimer) {
        window.clearTimeout(adminSearchTimer);
    }

    adminSearchTimer = window.setTimeout(() => {
        renderAdminTable();
    }, 120);
}

async function cancelAppointment(appointmentId) {
    const target = appointmentRows.find((row) => row.appointment_id === appointmentId);
    if (!target) {
        showToast("Appointment not found.", "error");
        return;
    }

    pendingDeleteAppointmentId = appointmentId;
    document.getElementById("deletePatientName").textContent = target.patient_name;
    document.getElementById("deleteDoctorName").textContent = target.doctor_name;
    document.getElementById("deleteSchedule").textContent =
        `${formatDate(target.appointment_date)} at ${formatTime(target.appointment_time)}`;
    document.getElementById("deleteAppointmentId").textContent = `#${appointmentId}`;
    document.getElementById("deleteModal").hidden = false;
    document.body.style.overflow = "hidden";
}

function closeDeleteModal() {
    pendingDeleteAppointmentId = null;
    document.getElementById("deleteModal").hidden = true;
    document.body.style.overflow = "";
}

async function confirmDeleteAppointment() {
    if (pendingDeleteAppointmentId === null) {
        return;
    }

    const appointmentId = pendingDeleteAppointmentId;
    const confirmButton = document.getElementById("confirmDeleteButton");
    confirmButton.disabled = true;
    confirmButton.textContent = "Deleting...";

    try {
        const result = await request(`/admin/appointments/${appointmentId}`, {
            method: "DELETE",
        });
        const summary = await request("/admin/summary");

        appointmentRows = appointmentRows.filter((row) => row.appointment_id !== appointmentId);
        updateAdminMetrics(summary, appointmentRows.length);
        renderAdminTable();
        closeDeleteModal();
        showToast(result.message, "success");
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        confirmButton.disabled = false;
        confirmButton.textContent = "Yes, Delete";
    }
}

async function bootstrapAdmin() {
    const adminSession = requireAdminSession();
    if (!adminSession) {
        return;
    }

    try {
        const [summary, appointments] = await Promise.all([
            request("/admin/summary"),
            request("/admin/appointments"),
        ]);

        appointmentRows = appointments;

        updateAdminMetrics(summary, appointments.length);

        document.getElementById("adminSearch").addEventListener("input", scheduleAdminSearch);
        document.getElementById("deleteModal").addEventListener("click", (event) => {
            if (event.target.id === "deleteModal") {
                closeDeleteModal();
            }
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !document.getElementById("deleteModal").hidden) {
                closeDeleteModal();
            }
        });

        renderAdminTable();
    } catch (error) {
        showToast(error.message, "error");
    }
}

document.addEventListener("DOMContentLoaded", bootstrapAdmin);
