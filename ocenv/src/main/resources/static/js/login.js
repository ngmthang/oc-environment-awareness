/* js/login.js */
(function () {
    // ---------- QR CODE SETUP ----------
    const loginUrl = new URL("login.html", window.location.href).toString();

    const urlOut = document.getElementById("qr-url");
    if (urlOut) urlOut.textContent = loginUrl;

    const qrImg = document.getElementById("qr");
    if (qrImg) {
        qrImg.src =
            "https://quickchart.io/qr?size=220&text=" + encodeURIComponent(loginUrl);
    }

    // ---------- VISITOR FORM ----------
    const form = document.getElementById("visitor-form");
    if (!form) return;

    const nameInput = document.getElementById("name");
    const idInput = document.getElementById("occStudentId");
    const roleInput = document.getElementById("role");

    const err = document.getElementById("visitor-error");
    const idErr = document.getElementById("occ-id-error");
    const statusBadge = document.getElementById("status-badge");

    // Format: C + 8 digits (example: C03104480)
    const OCC_ID_REGEX = /^C\d{8}$/;

    function normalizeName(raw) {
        const v = (raw || "").trim();
        return v.length === 0 ? "Unknown" : v;
    }

    function normalizeOccId(raw) {
        const v = (raw || "").trim().toUpperCase();
        return v.length === 0 ? "" : v;
    }

    function computeRole(occIdNormalized) {
        return occIdNormalized.length === 0 ? "GUEST" : "OCC_STUDENT";
    }

    function setStatus(role) {
        if (!statusBadge) return;
        statusBadge.textContent = role === "OCC_STUDENT" ? "OCC Student" : "Guest";
    }

    function validateOccId(occIdNormalized) {
        // Blank is allowed (guest)
        if (occIdNormalized.length === 0) return true;
        return OCC_ID_REGEX.test(occIdNormalized);
    }

    function updateRoleUI() {
        const occId = normalizeOccId(idInput ? idInput.value : "");
        const role = computeRole(occId);
        if (roleInput) roleInput.value = role;
        setStatus(role);

        // Live validation only if user typed something
        if (idErr) {
            const ok = validateOccId(occId);
            idErr.hidden = ok;
        }
    }

    if (idInput) idInput.addEventListener("input", updateRoleUI);
    updateRoleUI();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (err) err.hidden = true;

        const name = normalizeName(nameInput ? nameInput.value : "");
        const occId = normalizeOccId(idInput ? idInput.value : "");

        // If user provides a student id, it must match the format.
        const ok = validateOccId(occId);
        if (!ok) {
            if (idErr) idErr.hidden = false;
            return;
        }
        if (idErr) idErr.hidden = true;

        const role = computeRole(occId);
        if (roleInput) roleInput.value = role;

        // Payload posted to Spring Boot (backend stores visit + user info)
        const payload = {
            name: name,
            occStudentId: occId.length === 0 ? null : occId,
            role: role
        };

        try {
            const res = await fetch("/visitor/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                if (err) err.hidden = false;
                return;
            }

            // Backend returns dashboard snapshot. Save it so main.html updates instantly.
            const dash = await res.json().catch(() => null);
            if (dash) sessionStorage.setItem("dash_snapshot", JSON.stringify(dash));

            window.location.assign("/main.html");
        } catch (_) {
            if (err) err.hidden = false;
        }
    });
})();