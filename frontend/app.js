const isLocalHost = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const API_BASE = isLocalHost ? "http://127.0.0.1:8000" : "/api";

async function request(path, options = {}) {
    const config = {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
        ...options,
    };

    const response = await fetch(`${API_BASE}${path}`, config);
    let data = {};

    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    if (!response.ok) {
        throw new Error(data.detail || data.error || "Something went wrong");
    }

    return data;
}

function showToast(message, type = "info") {
    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    window.setTimeout(() => {
        toast.remove();
    }, 3200);
}

function savePatientSession(user) {
    clearAdminSession();
    localStorage.setItem("patient_id", String(user.patient_id));
    localStorage.setItem("patient_name", user.name || "");
    localStorage.setItem("patient_email", user.email || "");
}

function clearPatientSession() {
    localStorage.removeItem("patient_id");
    localStorage.removeItem("patient_name");
    localStorage.removeItem("patient_email");
}

function requirePatientSession() {
    const patientId = localStorage.getItem("patient_id");
    if (!patientId) {
        window.location.href = "login.html";
        return null;
    }

    return {
        patient_id: Number(patientId),
        name: localStorage.getItem("patient_name") || "Patient",
        email: localStorage.getItem("patient_email") || "",
    };
}

function logoutPatient() {
    clearPatientSession();
    window.location.href = "login.html";
}

function saveAdminSession(username) {
    clearPatientSession();
    localStorage.setItem("admin_username", username || "admin");
}

function clearAdminSession() {
    localStorage.removeItem("admin_username");
}

function requireAdminSession() {
    const username = localStorage.getItem("admin_username");
    if (!username) {
        window.location.href = "login.html";
        return null;
    }

    return { username };
}

function logoutAdmin() {
    clearAdminSession();
    window.location.href = "login.html";
}

function formatDate(value) {
    return new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatTime(value) {
    if (typeof value === "number") {
        const totalSeconds = Math.max(0, Math.floor(value));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    }

    if (typeof value !== "string") {
        return "--:--";
    }

    const [hours, minutes] = value.split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);
    return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
    });
}

function appointmentStatus(appointmentDate, appointmentTime) {
    const dateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    return dateTime >= new Date() ? "upcoming" : "past";
}
