function updateAuthLabels() {
    const roleSelect = document.getElementById("role");
    const identityLabel = document.getElementById("identityLabel");
    const identityInput = document.getElementById("identityInput");
    const hint = document.getElementById("authHint");

    if (!roleSelect || !identityLabel || !identityInput) {
        return;
    }

    const isAdmin = roleSelect.value === "admin";
    identityLabel.textContent = isAdmin ? "Admin username" : "Patient email";
    identityInput.placeholder = isAdmin ? "Enter your admin username" : "Enter your email address";
    hint.textContent = isAdmin
        ? "Admins can review appointment traffic and monitor daily activity."
        : "Patients can browse specialists, reserve slots, and manage visits.";
}

async function login(event) {
    event.preventDefault();

    const role = document.getElementById("role").value;
    const identity = document.getElementById("identityInput").value.trim();
    const password = document.getElementById("passwordInput").value.trim();

    if (!identity || !password) {
        showToast("Please complete all login fields.", "error");
        return;
    }

    try {
        if (role === "admin") {
            await request("/admin/login", {
                method: "POST",
                body: JSON.stringify({
                    username: identity,
                    password,
                }),
            });

            saveAdminSession(identity);
            showToast("Admin access granted.", "success");
            window.setTimeout(() => {
                window.location.href = "admin.html";
            }, 500);
            return;
        }

        const data = await request("/patient/login", {
            method: "POST",
            body: JSON.stringify({
                email: identity,
                password,
            }),
        });

        savePatientSession(data);
        showToast(`Welcome back, ${data.name}.`, "success");
        window.setTimeout(() => {
            window.location.href = "index.html";
        }, 500);
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function registerPatient(event) {
    event.preventDefault();

    const payload = {
        name: document.getElementById("registerName").value.trim(),
        email: document.getElementById("registerEmail").value.trim(),
        phone: document.getElementById("registerPhone").value.trim(),
        password: document.getElementById("registerPassword").value.trim(),
    };

    if (!payload.name || !payload.email || !payload.phone || !payload.password) {
        showToast("Please fill in every registration field.", "error");
        return;
    }

    try {
        await request("/patient/register", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        showToast("Account created successfully. Please sign in.", "success");
        window.setTimeout(() => {
            window.location.href = "login.html";
        }, 700);
    } catch (error) {
        showToast(error.message, "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    updateAuthLabels();
});
