(() => {
    "use strict";

    const STORAGE_VERSION = "v9_updatable";

    const KEYS = {
        accounts: `internAccounts_${STORAGE_VERSION}`,
        session: `internLoggedIn_${STORAGE_VERSION}`,
        current: `internCurrentAccountId_${STORAGE_VERSION}`,
        remembered: `internRememberedLogin_${STORAGE_VERSION}`,
        theme: `internTheme_${STORAGE_VERSION}`,
        assignments: `internAssignments_${STORAGE_VERSION}`,
        attendance: `internAttendanceRecords_${STORAGE_VERSION}`,
        notifications: `internNotifications_${STORAGE_VERSION}`,
        tasks: `internTasks_${STORAGE_VERSION}`,
        submissions: `internTaskSubmissions_${STORAGE_VERSION}`,
        evaluations: `internEvaluations_${STORAGE_VERSION}`
    };

    const LEGACY_KEYS = [
        "internAccounts", "internAccount", "internLoggedIn", "internCurrentAccountId",
        "internAssignments", "internAttendanceRecords", "internNotifications",
        "internTasks", "internTaskSubmissions", "internEvaluations",
        "internAccounts_v2_clean", "internLoggedIn_v2_clean", "internCurrentAccountId_v2_clean",
        "internAssignments_v2_clean", "internAttendanceRecords_v2_clean", "internNotifications_v2_clean",
        "internTasks_v2_clean", "internTaskSubmissions_v2_clean", "internEvaluations_v2_clean",
        "internAccounts_v3_clean", "internLoggedIn_v3_clean", "internCurrentAccountId_v3_clean",
        "internAssignments_v3_clean", "internAttendanceRecords_v3_clean", "internNotifications_v3_clean",
        "internTasks_v3_clean", "internTaskSubmissions_v3_clean", "internEvaluations_v3_clean"
    ];
    LEGACY_KEYS.forEach((k) => {
        try { localStorage.removeItem(k); } catch (_) {}
    });

    const DEFAULT_REQUIRED_HOURS = 320;
    const DEFAULT_ACCOUNTS = [];

    const roleNames = {
        student: "Student Intern",
        supervisor: "Supervisor",
        coordinator: "Internship Coordinator"
    };

    const menus = {
        student: [
            { id: "dashboard", label: "Dashboard", icon: "🏠" },
            { id: "assignment", label: "My Assignment", icon: "🏢" },
            { id: "tasks", label: "My Tasks", icon: "📝" },
            { id: "progress", label: "My Progress", icon: "📈" },
            { id: "evaluation", label: "Evaluations", icon: "⭐" }
        ],
        supervisor: [
            { id: "dashboard", label: "Dashboard", icon: "🏠" },
            { id: "interns", label: "Assigned Interns", icon: "🎓" },
            { id: "tasks", label: "Task Management", icon: "📝" },
            { id: "attendance", label: "Attendance Verification", icon: "⏱️" },
            { id: "evaluation", label: "Evaluation & Feedback", icon: "⭐" }
        ],
        coordinator: [
            { id: "dashboard", label: "Dashboard", icon: "🏠" },
            { id: "students", label: "Students Record", icon: "🎓" },
            { id: "supervisors", label: "Supervisor Management", icon: "👔" },
            { id: "attendance", label: "Attendance Monitoring", icon: "⏱️" },
            { id: "progress", label: "Progress Monitoring", icon: "📈" },
            { id: "evaluations", label: "Evaluation Records", icon: "⭐" },
            { id: "reports", label: "Report Generation", icon: "📄" }
        ]
    };

    const pageMeta = {
        dashboard: { title: "Dashboard", subtitle: "System overview and summary." },
        assignment: { title: "My Assignment", subtitle: "View your assigned company, supervisor, and schedule." },
        students: { title: "Students Record & Company Assignment", subtitle: "Coordinator assignment of student interns to companies and supervisors." },
        supervisors: { title: "Supervisor Management", subtitle: "Coordinator review and approval of supervisor accounts." },
        interns: { title: "Assigned Interns", subtitle: "View student interns assigned to you." },
        tasks: { title: "Tasks", subtitle: "Supervisor task assignment, updates, and intern submissions." },
        attendance: { title: "Attendance", subtitle: "Track and verify internship attendance and hours." },
        progress: { title: "Progress Monitoring", subtitle: "Monitor internship hours, attendance logs, and completion." },
        evaluation: { title: "Evaluation & Feedback", subtitle: "Supervisor intern evaluations, feedback, and updates." },
        evaluations: { title: "Evaluation Records & Feedback", subtitle: "Monitor supervisor evaluations, ratings, and feedback." },
        reports: { title: "Report Generation", subtitle: "Generate, print, and export internship reports." },
        notifications: { title: "Notifications", subtitle: "Recent updates and activity alerts." },
        profile: { title: "My Profile", subtitle: "Update your account details and view your Student QR ID." }
    };

    let currentPage = "dashboard";
    let isBrandMenuExpanded = false;
    let editingTaskId = null;
    let editingEvalId = null;

    let studentFilterSearch = "";
    let studentFilterCompany = "all";
    let attendanceFilterSearch = "";
    let attendanceFilterStatus = "all";
    let progressFilterSearch = "";
    let progressFilterStatus = "all";
    let evalFilterSearch = "";
    let evalFilterRating = "all";
    let reportType = "assignments";
    let reportSearch = "";

    const $ = (id) => document.getElementById(id);

    const loginPage = $("login-page");
    const registerPage = $("register-page");
    const forgotPage = $("forgot-page");
    const systemPage = $("system-page");

    const loginForm = $("login-form");
    const registerForm = $("register-form");
    const forgotForm = $("forgot-form");
    const toggleLoginPasswordBtn = $("toggle-login-password");
    const rememberMeCheckbox = $("remember-me");

    const loginMessage = $("login-message");
    const registerMessage = $("register-message");
    const forgotMessage = $("forgot-message");

    const sidebar = $("sidebar");
    const sidebarArrowToggle = $("sidebar-arrow-toggle");
    const sidebarBrandText = $("sidebar-brand-text");
    const sidebarExpandedPanel = $("sidebar-expanded-panel");
    const sidebarNav = $("sidebar-nav");
    const sidebarRoleSubtitle = $("sidebar-role-subtitle");
    const contentArea = $("content");
    const pageTitle = $("page-title");
    const pageSubtitle = $("page-subtitle");

    const headerAvatar = $("header-avatar");
    const headerName = $("header-name");
    const headerId = $("header-id");
    const headerNotifBadge = $("header-notif-badge");

    const topbarUserWrap = $("topbar-user-wrap");
    const topbarUserToggle = $("topbar-user-toggle");
    const topbarQuickMenu = $("topbar-quick-menu");
    const topbarNotifBadge = $("topbar-notif-badge");
    const topbarThemeToggle = $("topbar-theme-toggle");
    const topbarThemeIcon = $("topbar-theme-icon");
    const topbarThemeLabel = $("topbar-theme-label");

    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (_) {
            return fallback;
        }
    }

    function writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (_) {}
    }

    function escapeHTML(str) {
        return String(str ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getInitials(name) {
        const parts = String(name || "IT").trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return String(name || "IT").slice(0, 2).toUpperCase();
    }

    function formatDateTime(iso) {
        if (!iso) return "-";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function formatDateOnly(dateStr) {
        if (!dateStr) return "-";
        const d = new Date(dateStr + "T00:00:00");
        if (Number.isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }

    function formatHours(val) {
        const num = Number(val) || 0;
        return num.toFixed(2);
    }

    function getAccounts() {
        const list = readJSON(KEYS.accounts, null);
        if (!Array.isArray(list)) {
            writeJSON(KEYS.accounts, DEFAULT_ACCOUNTS);
            return [...DEFAULT_ACCOUNTS];
        }
        return list;
    }

    function saveAccounts(list) {
        writeJSON(KEYS.accounts, list);
    }

    function getAssignments() {
        const list = readJSON(KEYS.assignments, []);
        return Array.isArray(list) ? list : [];
    }

    function saveAssignments(list) {
        writeJSON(KEYS.assignments, list);
    }

    function getAttendance() {
        const list = readJSON(KEYS.attendance, []);
        return Array.isArray(list) ? list : [];
    }

    function saveAttendance(list) {
        writeJSON(KEYS.attendance, list);
    }

    function getNotifications() {
        const list = readJSON(KEYS.notifications, []);
        return Array.isArray(list) ? list : [];
    }

    function saveNotifications(list) {
        writeJSON(KEYS.notifications, list);
    }

    function getTasks() {
        const list = readJSON(KEYS.tasks, []);
        return Array.isArray(list) ? list : [];
    }

    function saveTasks(list) {
        writeJSON(KEYS.tasks, list);
    }

    function getSubmissions() {
        const list = readJSON(KEYS.submissions, []);
        return Array.isArray(list) ? list : [];
    }

    function saveSubmissions(list) {
        writeJSON(KEYS.submissions, list);
    }

    function getEvaluations() {
        const list = readJSON(KEYS.evaluations, []);
        return Array.isArray(list) ? list : [];
    }

    function saveEvaluations(list) {
        writeJSON(KEYS.evaluations, list);
    }

    function getCurrentAccount() {
        const currentId = localStorage.getItem(KEYS.current);
        if (!currentId) return null;
        return getAccounts().find((acc) => acc.id === currentId) || null;
    }

    function syncTopbarAccount(account) {
        sidebarRoleSubtitle.textContent = roleNames[account.role] || "Student Intern";
        headerName.textContent = account.name;
        headerId.textContent = `${roleNames[account.role]} · ${account.idNumber || account.email}`;
        headerAvatar.textContent = getInitials(account.name);
        updateUnreadBadge(account.id);
    }

    function pushNotification(targetUserId, title, message) {
        const list = getNotifications();
        list.unshift({
            id: "notif_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            userId: targetUserId,
            title,
            message,
            createdAt: new Date().toISOString(),
            read: false
        });
        saveNotifications(list);
        const currentAcc = getCurrentAccount();
        if (currentAcc && currentAcc.id === targetUserId) {
            updateUnreadBadge(currentAcc.id);
        }
    }

    function getActiveAssignmentForStudent(studentId) {
        return getAssignments().find((a) => a.studentId === studentId && a.status === "Active") || null;
    }

    function getAssignedStudentsForSupervisor(supervisorId) {
        const studentIds = getAssignments()
            .filter((a) => a.supervisorId === supervisorId && a.status === "Active")
            .map((a) => a.studentId);
        return getAccounts().filter((a) => a.role === "student" && studentIds.includes(a.id));
    }

    function getStudentRenderedHours(studentId) {
        return getAttendance()
            .filter((r) => r.studentId === studentId && r.status === "Verified")
            .reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
    }

    function syncBrandSidebarState() {
        if (sidebarBrandText) {
            sidebarBrandText.classList.toggle("hidden", !isBrandMenuExpanded);
        }
        if (sidebarExpandedPanel) {
            sidebarExpandedPanel.classList.toggle("hidden", !isBrandMenuExpanded);
        }
        if (sidebar) {
            sidebar.classList.toggle("collapsed-brand", !isBrandMenuExpanded);
        }
        if (sidebarArrowToggle) {
            sidebarArrowToggle.setAttribute("aria-expanded", isBrandMenuExpanded ? "true" : "false");
        }
    }

    // THEME
    function applyTheme(theme) {
        const mode = theme === "dark" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", mode);
        try {
            localStorage.setItem(KEYS.theme, mode);
        } catch (_) {}
        if (topbarThemeIcon && topbarThemeLabel) {
            if (mode === "dark") {
                topbarThemeIcon.textContent = "☀️";
                topbarThemeLabel.textContent = "Light Mode";
            } else {
                topbarThemeIcon.textContent = "🌙";
                topbarThemeLabel.textContent = "Dark Mode";
            }
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
        applyTheme(current === "dark" ? "light" : "dark");
    }

    // TOPBAR QUICK MENU & NOTIFICATION BADGE
    function setQuickMenuOpen(open) {
        if (!topbarQuickMenu || !topbarUserToggle) return;
        topbarQuickMenu.classList.toggle("hidden", !open);
        topbarUserToggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function updateUnreadBadge(userId) {
        const unread = getNotifications().filter((n) => n.userId === userId && !n.read).length;
        if (headerNotifBadge) {
            headerNotifBadge.textContent = String(unread);
            headerNotifBadge.classList.toggle("hidden", unread === 0);
        }
        if (topbarNotifBadge) {
            topbarNotifBadge.textContent = String(unread);
            topbarNotifBadge.classList.toggle("hidden", unread === 0);
        }
    }

    // PAGE SWITCHING
    function showAuthPage(pageName) {
        setQuickMenuOpen(false);
        loginPage.classList.toggle("hidden", pageName !== "login");
        registerPage.classList.toggle("hidden", pageName !== "register");
        forgotPage.classList.toggle("hidden", pageName !== "forgot");
        systemPage.classList.add("hidden");
        loginMessage.textContent = "";
        registerMessage.textContent = "";
        forgotMessage.textContent = "";
    }

    function showSystemPage(account) {
        setQuickMenuOpen(false);
        loginPage.classList.add("hidden");
        registerPage.classList.add("hidden");
        forgotPage.classList.add("hidden");
        systemPage.classList.remove("hidden");

        syncTopbarAccount(account);
        syncBrandSidebarState();
        renderSidebar(account.role);

        const allowedPages = (menus[account.role] || []).map((m) => m.id);
        if (!allowedPages.includes(currentPage) && !["notifications", "profile"].includes(currentPage)) {
            currentPage = "dashboard";
        }
        renderPage(currentPage, account);
    }

    function renderSidebar(role) {
        const items = menus[role] || [];
        sidebarNav.innerHTML = items
            .map(
                (item) => `
                <button type="button" class="menu-btn ${item.id === currentPage ? "active" : ""}" data-page="${item.id}">
                    <span class="menu-icon">${item.icon}</span>
                    <span>${escapeHTML(item.label)}</span>
                </button>
            `
            )
            .join("");

        sidebarNav.querySelectorAll(".menu-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const acc = getCurrentAccount();
                if (!acc) return;
                currentPage = btn.getAttribute("data-page");
                editingTaskId = null;
                editingEvalId = null;
                renderSidebar(acc.role);
                renderPage(currentPage, acc);
            });
        });
    }

    if (sidebarArrowToggle) {
        sidebarArrowToggle.addEventListener("click", () => {
            isBrandMenuExpanded = !isBrandMenuExpanded;
            syncBrandSidebarState();
        });
    }

    // REGISTER ROLE FIELDS
    function updateRegisterRoleFields() {
        const role = $("register-role").value;
        const coordBox = $("coordinator-register-fields");
        const studentBox = $("student-register-fields");
        const supBox = $("supervisor-register-fields");

        const coordIdInput = $("register-coord-id");
        const studentIdInput = $("register-id");
        const supIdInput = $("register-sup-id");
        const supCompanyInput = $("register-company");

        coordBox.classList.toggle("hidden", role !== "coordinator");
        studentBox.classList.toggle("hidden", role !== "student");
        supBox.classList.toggle("hidden", role !== "supervisor");

        coordIdInput.required = role === "coordinator";
        studentIdInput.required = role === "student";
        supIdInput.required = role === "supervisor";
        supCompanyInput.required = role === "supervisor";
    }

    if (toggleLoginPasswordBtn) {
        toggleLoginPasswordBtn.addEventListener("click", () => {
            const passInput = $("login-password");
            if (!passInput) return;
            const isHidden = passInput.type === "password";
            passInput.type = isHidden ? "text" : "password";
            toggleLoginPasswordBtn.textContent = isHidden ? "Hide" : "Show";
        });
    }

    // AUTH EVENTS
    $("show-register").addEventListener("click", () => {
        updateRegisterRoleFields();
        showAuthPage("register");
    });

    $("show-login").addEventListener("click", () => showAuthPage("login"));
    $("show-forgot").addEventListener("click", () => showAuthPage("forgot"));
    $("forgot-back").addEventListener("click", () => showAuthPage("login"));
    $("register-role").addEventListener("change", updateRegisterRoleFields);

    registerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        registerMessage.className = "form-message";

        const role = $("register-role").value;
        const name = $("register-name").value.trim();
        const email = $("register-email").value.trim().toLowerCase();
        const password = $("register-password").value;
        const confirm = $("register-confirm").value;

        let idNumber = "";
        let program = "";
        let yearLevel = "";
        let company = "";
        let position = "";
        let contact = "";
        let address = "";

        if (role === "coordinator") {
            idNumber = $("register-coord-id").value.trim();
            contact = $("register-coord-contact").value.trim();
        } else if (role === "student") {
            idNumber = $("register-id").value.trim();
            program = $("register-program").value.trim();
            yearLevel = $("register-year").value;
            contact = $("register-contact").value.trim();
            address = $("register-address").value.trim();
        } else if (role === "supervisor") {
            idNumber = $("register-sup-id").value.trim();
            company = $("register-company").value.trim();
            position = $("register-position").value.trim();
            contact = $("register-sup-contact").value.trim();
            address = $("register-sup-address").value.trim();
        }

        if (!name || !email || !idNumber) {
            registerMessage.classList.add("error");
            registerMessage.textContent = "Please fill in all required fields.";
            return;
        }
        if (password.length < 6) {
            registerMessage.classList.add("error");
            registerMessage.textContent = "Password must be at least 6 characters.";
            return;
        }
        if (password !== confirm) {
            registerMessage.classList.add("error");
            registerMessage.textContent = "Passwords do not match.";
            return;
        }

        const accounts = getAccounts();
        const exists = accounts.some(
            (a) => a.email.toLowerCase() === email || a.idNumber.toLowerCase() === idNumber.toLowerCase()
        );
        if (exists) {
            registerMessage.classList.add("error");
            registerMessage.textContent = "An account with that ID number or email already exists.";
            return;
        }

        const isApproved = role === "supervisor" ? false : true;

        const newAccount = {
            id: "acc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
            role,
            name,
            email,
            idNumber,
            program,
            yearLevel,
            company,
            position,
            contact,
            address,
            password,
            approved: isApproved,
            requiredHours: DEFAULT_REQUIRED_HOURS
        };

        accounts.push(newAccount);
        saveAccounts(accounts);

        if (role === "supervisor") {
            accounts
                .filter((a) => a.role === "coordinator")
                .forEach((coord) => {
                    pushNotification(
                        coord.id,
                        "New Supervisor Registration",
                        `${name} (${company || "Company"}) registered as Supervisor and is pending your approval.`
                    );
                });
        }

        registerForm.reset();
        updateRegisterRoleFields();
        registerMessage.classList.add("success");

        if (role === "supervisor") {
            registerMessage.textContent = "Supervisor account created! You cannot sign in yet until approved by the Internship Coordinator.";
        } else {
            registerMessage.textContent = "Account created successfully! You can now sign in.";
            setTimeout(() => showAuthPage("login"), 900);
        }
    });

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        loginMessage.className = "form-message";

        const rawIdentifier = $("login-id").value.trim();
        const identifier = rawIdentifier.toLowerCase();
        const password = $("login-password").value;

        const account = getAccounts().find(
            (a) =>
                (a.idNumber.toLowerCase() === identifier ||
                    a.email.toLowerCase() === identifier ||
                    a.name.toLowerCase() === identifier) &&
                a.password === password
        );

        if (!account) {
            loginMessage.classList.add("error");
            loginMessage.textContent = "Invalid ID number/email or password.";
            return;
        }

        if (account.role === "supervisor" && !account.approved) {
            loginMessage.classList.add("error");
            loginMessage.textContent = "Your supervisor account is still pending approval from the Internship Coordinator.";
            return;
        }

        try {
            if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                localStorage.setItem(KEYS.remembered, rawIdentifier);
            } else {
                localStorage.removeItem(KEYS.remembered);
            }
        } catch (_) {}

        localStorage.setItem(KEYS.session, "true");
        localStorage.setItem(KEYS.current, account.id);
        isBrandMenuExpanded = false;
        editingTaskId = null;
        editingEvalId = null;
        currentPage = "dashboard";
        showSystemPage(account);
    });

    forgotForm.addEventListener("submit", (e) => {
        e.preventDefault();
        forgotMessage.className = "form-message";

        const identifier = $("forgot-id").value.trim().toLowerCase();
        const newPass = $("forgot-password").value;
        const confirmPass = $("forgot-confirm").value;

        if (newPass.length < 6) {
            forgotMessage.classList.add("error");
            forgotMessage.textContent = "New password must be at least 6 characters.";
            return;
        }
        if (newPass !== confirmPass) {
            forgotMessage.classList.add("error");
            forgotMessage.textContent = "Passwords do not match.";
            return;
        }

        const accounts = getAccounts();
        const idx = accounts.findIndex(
            (a) => a.idNumber.toLowerCase() === identifier || a.email.toLowerCase() === identifier
        );
        if (idx === -1) {
            forgotMessage.classList.add("error");
            forgotMessage.textContent = "No account found with that ID number or email.";
            return;
        }

        accounts[idx].password = newPass;
        saveAccounts(accounts);
        forgotForm.reset();
        forgotMessage.classList.add("success");
        forgotMessage.textContent = "Password reset successfully! You can now sign in.";
        setTimeout(() => showAuthPage("login"), 900);
    });

    // TOPBAR DROPDOWN EVENTS
    topbarUserToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = !topbarQuickMenu.classList.contains("hidden");
        setQuickMenuOpen(!isOpen);
    });

    document.addEventListener("click", (e) => {
        if (topbarUserWrap && !topbarUserWrap.contains(e.target)) {
            setQuickMenuOpen(false);
        }
    });

    topbarQuickMenu.querySelectorAll("[data-quick-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const acc = getCurrentAccount();
            if (!acc) return;
            currentPage = btn.getAttribute("data-quick-page");
            editingTaskId = null;
            editingEvalId = null;
            setQuickMenuOpen(false);
            renderSidebar(acc.role);
            renderPage(currentPage, acc);
        });
    });

    topbarThemeToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleTheme();
    });

    $("logout-btn").addEventListener("click", () => {
        localStorage.removeItem(KEYS.session);
        localStorage.removeItem(KEYS.current);
        isBrandMenuExpanded = false;
        editingTaskId = null;
        editingEvalId = null;
        currentPage = "dashboard";
        showAuthPage("login");
    });

    // PAGE RENDERERS
    function renderPage(page, account) {
        const meta = pageMeta[page] || pageMeta.dashboard;
        pageTitle.textContent = meta.title;
        pageSubtitle.textContent = meta.subtitle;

        if (page === "dashboard") {
            renderDashboard(account);
        } else if (page === "assignment") {
            renderStudentAssignmentPage(account);
        } else if (page === "students") {
            renderStudentsPage(account);
        } else if (page === "supervisors") {
            renderSupervisorsPage(account);
        } else if (page === "interns") {
            renderInternsPage(account);
        } else if (page === "tasks") {
            renderTasksPage(account);
        } else if (page === "attendance") {
            renderAttendancePage(account);
        } else if (page === "progress") {
            renderProgressPage(account);
        } else if (page === "evaluation" || page === "evaluations") {
            renderEvaluationPage(account);
        } else if (page === "reports") {
            renderReportsPage(account);
        } else if (page === "notifications") {
            renderNotificationsPage(account);
        } else if (page === "profile") {
            renderProfilePage(account);
        } else {
            renderDashboard(account);
        }
    }

    function renderDashboard(account) {
        const accounts = getAccounts();
        const students = accounts.filter((a) => a.role === "student");
        const supervisors = accounts.filter((a) => a.role === "supervisor");
        const assignments = getAssignments();
        const attendance = getAttendance();
        const tasks = getTasks();
        const evaluations = getEvaluations();

        const assignedStudents = account.role === "supervisor" ? getAssignedStudentsForSupervisor(account.id) : [];
        const myAssignment = account.role === "student" ? getActiveAssignmentForStudent(account.id) : null;
        const renderedHours = account.role === "student" ? getStudentRenderedHours(account.id) : 0;

        let cardsHTML = "";
        if (account.role === "student") {
            cardsHTML = `
                <div class="stat-card">
                    <div class="stat-top"><span class="stat-label">Rendered Hours</span><span class="stat-icon">⏱️</span></div>
                    <div class="stat-value">${formatHours(renderedHours)}</div>
                    <div class="stat-note">of ${account.requiredHours || DEFAULT_REQUIRED_HOURS} required hours</div>
                </div>
                <div class="stat-card">
                    <div class="stat-top"><span class="stat-label">Assigned Company</span><span class="stat-icon">🏢</span></div>
                    <div class="stat-value">${escapeHTML(myAssignment ? myAssignment.company : "Unassigned")}</div>
                    <div class="stat-note">${escapeHTML(myAssignment ? myAssignment.supervisorName : "Assigned by Coordinator")}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-top"><span class="stat-label">My Tasks</span><span class="stat-icon">📝</span></div>
                    <div class="stat-value">${tasks.filter((t) => t.studentId === account.id).length}</div>
                    <div class="stat-note">Tasks assigned by Supervisor</div>
                </div>
                <div class="stat-card">
                    <div class="stat-top"><span class="stat-label">Evaluations</span><span class="stat-icon">⭐</span></div>
                    <div class="stat-value">${evaluations.filter((ev) => ev.studentId === account.id).length}</div>
                    <div class="stat-note">Feedback from Supervisor</div>
                </div>
            `;
        } else if (account.role === "supervisor") {
            cardsHTML = `
                <div class="stat-card">
                    <div class="stat-top"><span class="stat-label">Assigned Interns</span><span class="stat-icon">🎓</span></div>
                    <div class="stat-value">${assignedStudents.length}</div>
                    <div class="stat-note">Assigned by Coordinator</div>
                </div>
                <div class="stat-card">
                    <div class="stat-top"><span class="stat-label">Assigned Tasks</span><span class="stat-icon">📝</span></div>
                    <div class="stat-value">${tasks.filter((t) => t.supervisorId === account.id).length}</div>
                    <div class="stat-note">Tasks you created & manage</div>
                </div>
                <div class="stat-card">
                    <div class="stat-top"><span class="stat-label">Evaluations Submitted</span><span class="stat-icon">⭐</span></div>
                    <div class="stat-value">${evaluations.filter((ev) => ev.supervisorId === account.id).length}</div>
                    <div class="stat-note">Intern evaluations & feedback</div>
                </div>
                <div class="stat-card">
                    <div class="stat-top"><span class="stat-label">Attendance Logs</span><span class="stat-icon">⏱️</span></div>
                    <div class="stat-value">${attendance.length}</div>
                    <div class="stat-note">Recorded attendance entries</div>
                </div>
            `;
        } else {
            cardsHTML = `
                <div class="stat-card">
                    <div class="stat-top"><span class="stat-label">Student Interns</span><span class="stat-icon">🎓</span></div>
                    <div class="stat-value">${students.length}</div>
                    <div class="stat-note">${assignments.filter((a) => a.status === "Active").length} active assignments</div>
                </div>
                <div class="stat-card">
                    <div class="stat-top"><span class="stat-label">Supervisors</span><span class="stat-icon">👔</span></div>
                    <div class="stat-value">${supervisors.length}</div>
                    <div class="stat-note">${supervisors.filter((s) => s.approved).length} approved</div>
                </div>
                <div class="stat-card">
                    <div class="stat-top"><span class="stat-label">Active Assignments</span><span class="stat-icon">🏢</span></div>
                    <div class="stat-value">${assignments.filter((a) => a.status === "Active").length}</div>
                    <div class="stat-note">Managed by Coordinator</div>
                </div>
                <div class="stat-card">
                    <div class="stat-top"><span class="stat-label">Evaluations</span><span class="stat-icon">⭐</span></div>
                    <div class="stat-value">${evaluations.length}</div>
                    <div class="stat-note">Submitted by Supervisors</div>
                </div>
            `;
        }

        contentArea.innerHTML = `
            <div class="welcome-banner">
                <h2>Welcome, ${escapeHTML(account.name)}!</h2>
                <p>Click the small arrow beside the logo on the left sidebar to open <strong>InternTrack</strong> (${escapeHTML(roleNames[account.role] || account.role)}) and the <strong>MAIN MENU</strong>.</p>
            </div>
            <div class="card-grid">${cardsHTML}</div>
        `;
    }

    function renderStudentAssignmentPage(account) {
        const assignment = getActiveAssignmentForStudent(account.id);
        contentArea.innerHTML = `
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>My Internship Assignment</h3>
                        <p>Assigned by your Internship Coordinator.</p>
                    </div>
                </div>
                ${
                    assignment
                        ? `
                    <div class="info-grid">
                        <div class="info-card"><span>Company</span><strong>${escapeHTML(assignment.company)}</strong></div>
                        <div class="info-card"><span>Supervisor</span><strong>${escapeHTML(assignment.supervisorName)}</strong></div>
                        <div class="info-card"><span>Department / Role</span><strong>${escapeHTML(assignment.department || "General Intern")}</strong></div>
                        <div class="info-card"><span>Status</span><strong>${escapeHTML(assignment.status)}</strong></div>
                    </div>
                `
                        : `<div class="empty-state"><h3>No active assignment yet</h3><p>Your Internship Coordinator will assign your company and supervisor.</p></div>`
                }
            </div>
        `;
    }

    // COORDINATOR ASSIGNING INTERNS TO COMPANIES & SUPERVISORS
    function renderStudentsPage(account) {
        const accounts = getAccounts();
        const students = accounts.filter((a) => a.role === "student");
        const supervisors = accounts.filter((a) => a.role === "supervisor" && a.approved);
        const assignments = getAssignments();

        const filteredStudents = students.filter((st) => {
            const assign = assignments.find((a) => a.studentId === st.id && a.status === "Active");
            const matchesSearch =
                !studentFilterSearch ||
                st.name.toLowerCase().includes(studentFilterSearch.toLowerCase()) ||
                st.idNumber.toLowerCase().includes(studentFilterSearch.toLowerCase()) ||
                (st.program || "").toLowerCase().includes(studentFilterSearch.toLowerCase());
            const matchesCompany =
                studentFilterCompany === "all" ||
                (studentFilterCompany === "unassigned" && !assign) ||
                (assign && assign.company === studentFilterCompany);
            return matchesSearch && matchesCompany;
        });

        const companyOptions = Array.from(
            new Set(assignments.filter((a) => a.status === "Active" && a.company).map((a) => a.company))
        );

        const coordinatorFormHTML = account.role === "coordinator"
            ? `
                <div class="panel">
                    <div class="panel-header">
                        <div>
                            <h3>Assign Student Intern (Coordinator)</h3>
                            <p>Assign or update a student intern's host company and approved supervisor.</p>
                        </div>
                    </div>
                    <form id="assign-student-form">
                        <div class="form-grid">
                            <div>
                                <label for="assign-student-id">Student Intern</label>
                                <select id="assign-student-id" required>
                                    <option value="">Select Student Intern</option>
                                    ${students
                                        .map(
                                            (st) => `<option value="${escapeHTML(st.id)}">${escapeHTML(st.name)} (${escapeHTML(st.idNumber)})</option>`
                                        )
                                        .join("")}
                                </select>
                            </div>
                            <div>
                                <label for="assign-supervisor-id">Approved Supervisor</label>
                                <select id="assign-supervisor-id" required>
                                    <option value="">Select Supervisor</option>
                                    ${supervisors
                                        .map(
                                            (sup) => `<option value="${escapeHTML(sup.id)}">${escapeHTML(sup.name)} · ${escapeHTML(sup.company || "Company")}</option>`
                                        )
                                        .join("")}
                                </select>
                            </div>
                            <div>
                                <label for="assign-company">Company Name</label>
                                <input id="assign-company" type="text" placeholder="e.g. ABC Tech Solutions" required>
                            </div>
                            <div>
                                <label for="assign-department">Department / Role</label>
                                <input id="assign-department" type="text" placeholder="e.g. Web Development">
                            </div>
                        </div>
                        <div class="form-submit-row">
                            <button type="submit" class="primary-btn">Save / Update Assignment</button>
                        </div>
                        <p id="assign-student-msg" class="form-message"></p>
                    </form>
                </div>
            `
            : "";

        contentArea.innerHTML = `
            ${coordinatorFormHTML}
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>Registered Students Record</h3>
                        <p>Search, filter, or update student assignments.</p>
                    </div>
                </div>
                <div class="filter-bar">
                    <input id="student-search-input" type="text" placeholder="Search name, ID, or program..." value="${escapeHTML(studentFilterSearch)}">
                    <select id="student-company-select">
                        <option value="all">All Companies</option>
                        <option value="unassigned" ${studentFilterCompany === "unassigned" ? "selected" : ""}>Unassigned</option>
                        ${companyOptions
                            .map((c) => `<option value="${escapeHTML(c)}" ${studentFilterCompany === c ? "selected" : ""}>${escapeHTML(c)}</option>`)
                            .join("")}
                    </select>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ID Number</th>
                                <th>Student</th>
                                <th>Program</th>
                                <th>Assigned Company & Supervisor</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                                filteredStudents.length
                                    ? filteredStudents
                                          .map((st) => {
                                              const assign = assignments.find((a) => a.studentId === st.id && a.status === "Active");
                                              return `
                                        <tr>
                                            <td>${escapeHTML(st.idNumber)}</td>
                                            <td><strong>${escapeHTML(st.name)}</strong></td>
                                            <td>${escapeHTML(st.program || "-")}</td>
                                            <td>${
                                                assign
                                                    ? `${escapeHTML(assign.company)} · ${escapeHTML(assign.supervisorName)}`
                                                    : `<span class="badge warning">Unassigned</span>`
                                            }</td>
                                            <td>
                                                ${
                                                    account.role === "coordinator" && assign
                                                        ? `<button type="button" class="small-btn danger-btn remove-assign-btn" data-assign-id="${escapeHTML(assign.id)}">Remove</button>`
                                                        : "-"
                                                }
                                            </td>
                                        </tr>
                                    `;
                                          })
                                          .join("")
                                    : `<tr><td colspan="5" class="empty-state">No student records found.</td></tr>`
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        const assignForm = $("assign-student-form");
        if (assignForm) {
            $("assign-supervisor-id").addEventListener("change", () => {
                const sup = supervisors.find((s) => s.id === $("assign-supervisor-id").value);
                if (sup && sup.company && !$("assign-company").value.trim()) {
                    $("assign-company").value = sup.company;
                }
            });

            assignForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const msg = $("assign-student-msg");
                msg.className = "form-message";

                const studentId = $("assign-student-id").value;
                const supervisorId = $("assign-supervisor-id").value;
                const company = $("assign-company").value.trim();
                const department = $("assign-department").value.trim();

                const student = students.find((s) => s.id === studentId);
                const supervisor = supervisors.find((s) => s.id === supervisorId);
                if (!student || !supervisor || !company) {
                    msg.classList.add("error");
                    msg.textContent = "Please select a student, approved supervisor, and company.";
                    return;
                }

                const updated = getAssignments().map((a) =>
                    a.studentId === studentId && a.status === "Active" ? { ...a, status: "Replaced" } : a
                );
                updated.unshift({
                    id: "assign_" + Date.now(),
                    studentId,
                    studentName: student.name,
                    supervisorId,
                    supervisorName: supervisor.name,
                    company,
                    department,
                    status: "Active",
                    updatedAt: new Date().toISOString()
                });
                saveAssignments(updated);

                pushNotification(studentId, "Internship Assigned", `You are assigned to ${company} under ${supervisor.name}.`);
                pushNotification(supervisorId, "New Intern Assigned", `${student.name} (${student.idNumber}) was assigned to you.`);

                msg.classList.add("success");
                msg.textContent = "Assignment saved!";
                renderStudentsPage(account);
            });
        }

        $("student-search-input").addEventListener("input", (e) => {
            studentFilterSearch = e.target.value;
            renderStudentsPage(account);
        });

        $("student-company-select").addEventListener("change", (e) => {
            studentFilterCompany = e.target.value;
            renderStudentsPage(account);
        });

        contentArea.querySelectorAll(".remove-assign-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const assignId = btn.getAttribute("data-assign-id");
                const updated = getAssignments().map((a) => (a.id === assignId ? { ...a, status: "Inactive" } : a));
                saveAssignments(updated);
                renderStudentsPage(account);
            });
        });
    }

    function renderSupervisorsPage(account) {
        const supervisors = getAccounts().filter((a) => a.role === "supervisor");

        contentArea.innerHTML = `
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>Supervisor Accounts & Approval</h3>
                        <p>Coordinator approval control for registered supervisors.</p>
                    </div>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ID Number</th>
                                <th>Supervisor</th>
                                <th>Company & Position</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                                supervisors.length
                                    ? supervisors
                                          .map(
                                              (sup) => `
                                        <tr>
                                            <td>${escapeHTML(sup.idNumber)}</td>
                                            <td><strong>${escapeHTML(sup.name)}</strong><br><span class="muted">${escapeHTML(sup.email)}</span></td>
                                            <td>${escapeHTML(sup.company || "-")}${sup.position ? ` · ${escapeHTML(sup.position)}` : ""}</td>
                                            <td><span class="badge ${sup.approved ? "success" : "warning"}">${sup.approved ? "Approved" : "Pending"}</span></td>
                                            <td>
                                                ${
                                                    account.role === "coordinator"
                                                        ? `
                                                            <button type="button" class="small-btn approve-btn toggle-sup-btn" data-sup-id="${escapeHTML(sup.id)}" data-approved="${sup.approved ? "true" : "false"}">
                                                                ${sup.approved ? "Revoke Approval" : "Approve"}
                                                            </button>
                                                        `
                                                        : "-"
                                                }
                                            </td>
                                        </tr>
                                    `
                                          )
                                          .join("")
                                    : `<tr><td colspan="5" class="empty-state">No supervisor accounts registered yet.</td></tr>`
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        contentArea.querySelectorAll(".toggle-sup-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const supId = btn.getAttribute("data-sup-id");
                const currentlyApproved = btn.getAttribute("data-approved") === "true";
                const updated = getAccounts().map((acc) =>
                    acc.id === supId ? { ...acc, approved: !currentlyApproved } : acc
                );
                saveAccounts(updated);
                pushNotification(
                    supId,
                    "Supervisor Account Status Updated",
                    !currentlyApproved
                        ? "Your supervisor account has been approved by the Internship Coordinator."
                        : "Your supervisor approval status has been set to pending."
                );
                renderSupervisorsPage(account);
            });
        });
    }

    function renderInternsPage(account) {
        const interns = account.role === "supervisor"
            ? getAssignedStudentsForSupervisor(account.id)
            : getAccounts().filter((a) => a.role === "student");

        contentArea.innerHTML = `
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>Assigned Student Interns</h3>
                        <p>Interns assigned to your supervision by the Internship Coordinator.</p>
                    </div>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ID Number</th>
                                <th>Name</th>
                                <th>Program & Year</th>
                                <th>Rendered Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                                interns.length
                                    ? interns
                                          .map(
                                              (st) => `
                                        <tr>
                                            <td>${escapeHTML(st.idNumber)}</td>
                                            <td><strong>${escapeHTML(st.name)}</strong></td>
                                            <td>${escapeHTML(st.program || "-")} ${escapeHTML(st.yearLevel ? "· " + st.yearLevel : "")}</td>
                                            <td>${formatHours(getStudentRenderedHours(st.id))} / ${st.requiredHours || DEFAULT_REQUIRED_HOURS} hrs</td>
                                        </tr>
                                    `
                                          )
                                          .join("")
                                    : `<tr><td colspan="4" class="empty-state">No assigned student interns yet.</td></tr>`
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // SUPERVISOR TASK ASSIGNMENT + UPDATABLE TASKS + STUDENT SUBMISSION
    function renderTasksPage(account) {
        const allAccounts = getAccounts();
        const assignedStudents = account.role === "supervisor" ? getAssignedStudentsForSupervisor(account.id) : [];
        const tasks = getTasks();
        const submissions = getSubmissions();
        const taskToEdit = editingTaskId ? tasks.find((t) => t.id === editingTaskId) : null;

        const assignFormHTML = account.role === "supervisor"
            ? `
                <div class="panel">
                    <div class="panel-header">
                        <div>
                            <h3>${taskToEdit ? "Update Assigned Task" : "Assign Task to Intern"}</h3>
                            <p>${taskToEdit ? "Edit and update task details." : "Create and assign a task to an intern assigned to you."}</p>
                        </div>
                    </div>
                    <form id="assign-task-form">
                        <div class="form-grid">
                            <div>
                                <label for="task-student-select">Assigned Intern</label>
                                <select id="task-student-select" required>
                                    <option value="">Select Assigned Intern</option>
                                    ${assignedStudents
                                        .map(
                                            (st) => `<option value="${escapeHTML(st.id)}" ${taskToEdit && taskToEdit.studentId === st.id ? "selected" : ""}>${escapeHTML(st.name)} (${escapeHTML(st.idNumber)})</option>`
                                        )
                                        .join("")}
                                </select>
                            </div>
                            <div>
                                <label for="task-due-date">Due Date</label>
                                <input id="task-due-date" type="date" value="${escapeHTML(taskToEdit ? taskToEdit.dueDate : "")}" required>
                            </div>
                            <div>
                                <label for="task-title">Task Title</label>
                                <input id="task-title" type="text" placeholder="e.g. Build login form module" value="${escapeHTML(taskToEdit ? taskToEdit.title : "")}" required>
                            </div>
                            <div>
                                <label for="task-status">Status</label>
                                <select id="task-status">
                                    <option value="Pending" ${!taskToEdit || taskToEdit.status === "Pending" ? "selected" : ""}>Pending</option>
                                    <option value="In Progress" ${taskToEdit && taskToEdit.status === "In Progress" ? "selected" : ""}>In Progress</option>
                                    <option value="Completed" ${taskToEdit && taskToEdit.status === "Completed" ? "selected" : ""}>Completed</option>
                                </select>
                            </div>
                            <div class="full-span">
                                <label for="task-description">Instructions / Description</label>
                                <textarea id="task-description" rows="3" placeholder="Enter task details..." required>${escapeHTML(taskToEdit ? taskToEdit.description : "")}</textarea>
                            </div>
                        </div>
                        <div class="form-submit-row btn-row">
                            <button type="submit" class="primary-btn">${taskToEdit ? "Update Task" : "Assign Task"}</button>
                            ${
                                taskToEdit
                                    ? `<button type="button" id="cancel-task-edit-btn" class="secondary-btn">Cancel Edit</button>`
                                    : ""
                            }
                        </div>
                        <p id="task-assign-message" class="form-message"></p>
                    </form>
                </div>
            `
            : "";

        const visibleTasks = account.role === "student"
            ? tasks.filter((t) => t.studentId === account.id)
            : account.role === "supervisor"
            ? tasks.filter((t) => t.supervisorId === account.id)
            : tasks;

        const tasksHTML = visibleTasks.length
            ? visibleTasks
                  .map((task) => {
                      const student = allAccounts.find((a) => a.id === task.studentId);
                      const sub = submissions.find((s) => s.taskId === task.id);
                      const isDone = task.status === "Completed" || Boolean(sub);

                      return `
                        <div class="task-card">
                            <div class="task-card-top">
                                <div>
                                    <h3>${escapeHTML(task.title)}</h3>
                                    <p>${escapeHTML(task.description)}</p>
                                </div>
                                <span class="badge ${isDone ? "success" : "warning"}">${escapeHTML(task.status || "Pending")}</span>
                            </div>
                            <div class="task-due muted">
                                <strong>Intern:</strong> ${escapeHTML(student ? `${student.name} (${student.idNumber})` : "Student Intern")} ·
                                <strong>Due:</strong> ${escapeHTML(formatDateOnly(task.dueDate))}
                            </div>
                            ${
                                sub
                                    ? `<p class="muted"><strong>Submission:</strong> ${escapeHTML(sub.notes)} (${escapeHTML(formatDateTime(sub.submittedAt))})</p>`
                                    : ""
                            }
                            ${
                                account.role === "supervisor"
                                    ? `
                                        <div class="btn-row" style="margin-top: 12px;">
                                            <button type="button" class="small-btn edit-task-btn" data-task-id="${escapeHTML(task.id)}">Edit / Update</button>
                                            <button type="button" class="small-btn danger-btn delete-task-btn" data-task-id="${escapeHTML(task.id)}">Delete</button>
                                        </div>
                                    `
                                    : ""
                            }
                            ${
                                account.role === "student"
                                    ? `
                                        <form class="task-submit-form" data-task-id="${escapeHTML(task.id)}">
                                            <textarea placeholder="${sub ? "Update your task submission notes or link..." : "Write your task submission notes or link..."}">${escapeHTML(sub ? sub.notes : "")}</textarea>
                                            <button type="submit" class="primary-btn">${sub ? "Update Submission" : "Submit Task"}</button>
                                        </form>
                                    `
                                    : ""
                            }
                        </div>
                    `;
                  })
                  .join("")
            : `<div class="empty-state"><h3>No tasks yet</h3><p>Assigned tasks will appear here.</p></div>`;

        contentArea.innerHTML = `
            ${assignFormHTML}
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>${account.role === "student" ? "My Assigned Tasks" : "Assigned Tasks List"}</h3>
                        <p>Track, update, and manage internship tasks.</p>
                    </div>
                </div>
                <div class="task-list">${tasksHTML}</div>
            </div>
        `;

        const assignForm = $("assign-task-form");
        if (assignForm) {
            assignForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const msg = $("task-assign-message");
                msg.className = "form-message";

                const studentId = $("task-student-select").value;
                const dueDate = $("task-due-date").value;
                const title = $("task-title").value.trim();
                const status = $("task-status").value;
                const description = $("task-description").value.trim();

                if (!studentId || !dueDate || !title || !description) {
                    msg.classList.add("error");
                    msg.textContent = "Please complete all task fields.";
                    return;
                }

                const updatedTasks = getTasks();
                if (editingTaskId) {
                    const idx = updatedTasks.findIndex((t) => t.id === editingTaskId);
                    if (idx !== -1) {
                        updatedTasks[idx] = {
                            ...updatedTasks[idx],
                            studentId,
                            dueDate,
                            title,
                            status,
                            description,
                            updatedAt: new Date().toISOString()
                        };
                    }
                    editingTaskId = null;
                    saveTasks(updatedTasks);
                    pushNotification(studentId, "Task Updated", `${account.name} updated task "${title}".`);
                    msg.classList.add("success");
                    msg.textContent = "Task updated successfully!";
                } else {
                    updatedTasks.unshift({
                        id: "task_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
                        supervisorId: account.id,
                        studentId,
                        title,
                        description,
                        dueDate,
                        status: status || "Pending",
                        createdAt: new Date().toISOString()
                    });
                    saveTasks(updatedTasks);
                    pushNotification(studentId, "New Task Assigned", `${account.name} assigned you a task: "${title}".`);
                    msg.classList.add("success");
                    msg.textContent = "Task assigned successfully!";
                }

                assignForm.reset();
                renderTasksPage(account);
            });
        }

        const cancelEditBtn = $("cancel-task-edit-btn");
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener("click", () => {
                editingTaskId = null;
                renderTasksPage(account);
            });
        }

        contentArea.querySelectorAll(".edit-task-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                editingTaskId = btn.getAttribute("data-task-id");
                renderTasksPage(account);
            });
        });

        contentArea.querySelectorAll(".delete-task-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const taskId = btn.getAttribute("data-task-id");
                if (editingTaskId === taskId) editingTaskId = null;
                saveTasks(getTasks().filter((t) => t.id !== taskId));
                saveSubmissions(getSubmissions().filter((s) => s.taskId !== taskId));
                renderTasksPage(account);
            });
        });

        contentArea.querySelectorAll(".task-submit-form").forEach((form) => {
            form.addEventListener("submit", (e) => {
                e.preventDefault();
                const taskId = form.getAttribute("data-task-id");
                const textarea = form.querySelector("textarea");
                const notes = textarea ? textarea.value.trim() : "";
                if (!notes) return;

                const subs = getSubmissions();
                const existingIdx = subs.findIndex((s) => s.taskId === taskId && s.studentId === account.id);
                const payload = {
                    id: existingIdx !== -1 ? subs[existingIdx].id : "sub_" + Date.now(),
                    taskId,
                    studentId: account.id,
                    notes,
                    submittedAt: new Date().toISOString()
                };
                if (existingIdx !== -1) {
                    subs[existingIdx] = payload;
                } else {
                    subs.unshift(payload);
                }
                saveSubmissions(subs);

                const allTasks = getTasks().map((t) => (t.id === taskId ? { ...t, status: "Completed" } : t));
                saveTasks(allTasks);

                const targetTask = allTasks.find((t) => t.id === taskId);
                if (targetTask && targetTask.supervisorId) {
                    pushNotification(
                        targetTask.supervisorId,
                        "Task Submission Updated",
                        `${account.name} submitted/updated task "${targetTask.title}".`
                    );
                }

                renderTasksPage(account);
            });
        });
    }

    // ATTENDANCE LOGGING & VERIFICATION
    function renderAttendancePage(account) {
        const allAccounts = getAccounts();
        const students = allAccounts.filter((a) => a.role === "student");
        const records = getAttendance();

        const filtered = records.filter((r) => {
            const st = allAccounts.find((a) => a.id === r.studentId);
            const matchesSearch =
                !attendanceFilterSearch ||
                (st &&
                    (st.name.toLowerCase().includes(attendanceFilterSearch.toLowerCase()) ||
                        st.idNumber.toLowerCase().includes(attendanceFilterSearch.toLowerCase())));
            const matchesStatus = attendanceFilterStatus === "all" || r.status === attendanceFilterStatus;
            return matchesSearch && matchesStatus;
        });

        const logFormHTML =
            account.role === "supervisor" || account.role === "coordinator"
                ? `
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>Log / Update Attendance Hours</h3>
                        <p>Record or verify internship hours for a student intern.</p>
                    </div>
                </div>
                <form id="attendance-log-form">
                    <div class="form-grid">
                        <div>
                            <label for="att-student-id">Student Intern</label>
                            <select id="att-student-id" required>
                                <option value="">Select Student Intern</option>
                                ${students
                                    .map(
                                        (st) => `<option value="${escapeHTML(st.id)}">${escapeHTML(st.name)} (${escapeHTML(st.idNumber)})</option>`
                                    )
                                    .join("")}
                            </select>
                        </div>
                        <div>
                            <label for="att-date">Date</label>
                            <input id="att-date" type="date" required>
                        </div>
                        <div>
                            <label for="att-hours">Hours Rendered</label>
                            <input id="att-hours" type="number" step="0.25" min="0.25" max="24" placeholder="e.g. 8" required>
                        </div>
                        <div>
                            <label for="att-status">Verification Status</label>
                            <select id="att-status">
                                <option value="Verified">Verified</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-submit-row">
                        <button type="submit" class="primary-btn">Save Attendance Log</button>
                    </div>
                    <p id="att-log-msg" class="form-message"></p>
                </form>
            </div>
        `
                : "";

        contentArea.innerHTML = `
            ${logFormHTML}
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>Attendance Records</h3>
                        <p>Filter and update attendance verification status.</p>
                    </div>
                </div>
                <div class="filter-bar">
                    <input id="att-search-input" type="text" placeholder="Search student name or ID..." value="${escapeHTML(attendanceFilterSearch)}">
                    <select id="att-status-select">
                        <option value="all" ${attendanceFilterStatus === "all" ? "selected" : ""}>All Status</option>
                        <option value="Pending" ${attendanceFilterStatus === "Pending" ? "selected" : ""}>Pending</option>
                        <option value="Verified" ${attendanceFilterStatus === "Verified" ? "selected" : ""}>Verified</option>
                    </select>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Student Intern</th>
                                <th>Hours</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                                filtered.length
                                    ? filtered
                                          .map((rec) => {
                                              const st = allAccounts.find((a) => a.id === rec.studentId);
                                              return `
                                        <tr>
                                            <td>${escapeHTML(formatDateOnly(rec.date))}</td>
                                            <td><strong>${escapeHTML(st ? st.name : "Student")}</strong> (${escapeHTML(st ? st.idNumber : "-")})</td>
                                            <td>${escapeHTML(formatHours(rec.hours))} hrs</td>
                                            <td><span class="badge ${rec.status === "Verified" ? "success" : "warning"}">${escapeHTML(rec.status)}</span></td>
                                            <td>
                                                ${
                                                    account.role === "supervisor" || account.role === "coordinator"
                                                        ? `
                                                            <div class="btn-row">
                                                                <button type="button" class="small-btn approve-btn verify-att-btn" data-att-id="${escapeHTML(rec.id)}">Verify</button>
                                                                <button type="button" class="small-btn danger-btn del-att-btn" data-att-id="${escapeHTML(rec.id)}">Delete</button>
                                                            </div>
                                                        `
                                                        : "-"
                                                }
                                            </td>
                                        </tr>
                                    `;
                                          })
                                          .join("")
                                    : `<tr><td colspan="5" class="empty-state">No attendance logs found.</td></tr>`
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        const attForm = $("attendance-log-form");
        if (attForm) {
            attForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const msg = $("att-log-msg");
                msg.className = "form-message";
                const studentId = $("att-student-id").value;
                const date = $("att-date").value;
                const hours = Number($("att-hours").value);
                const status = $("att-status").value;

                if (!studentId || !date || !hours || hours <= 0) {
                    msg.classList.add("error");
                    msg.textContent = "Please complete all attendance fields.";
                    return;
                }

                const list = getAttendance();
                list.unshift({
                    id: "att_" + Date.now(),
                    studentId,
                    date,
                    hours,
                    status,
                    recordedBy: account.id
                });
                saveAttendance(list);
                pushNotification(studentId, "Attendance Logged", `${formatHours(hours)} hrs on ${formatDateOnly(date)} (${status}).`);
                attForm.reset();
                msg.classList.add("success");
                msg.textContent = "Attendance log saved!";
                renderAttendancePage(account);
            });
        }

        $("att-search-input").addEventListener("input", (e) => {
            attendanceFilterSearch = e.target.value;
            renderAttendancePage(account);
        });

        $("att-status-select").addEventListener("change", (e) => {
            attendanceFilterStatus = e.target.value;
            renderAttendancePage(account);
        });

        contentArea.querySelectorAll(".verify-att-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const attId = btn.getAttribute("data-att-id");
                saveAttendance(getAttendance().map((r) => (r.id === attId ? { ...r, status: "Verified" } : r)));
                renderAttendancePage(account);
            });
        });

        contentArea.querySelectorAll(".del-att-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const attId = btn.getAttribute("data-att-id");
                saveAttendance(getAttendance().filter((r) => r.id !== attId));
                renderAttendancePage(account);
            });
        });
    }

    function renderProgressPage(account) {
        const students = getAccounts().filter((a) => a.role === "student");
        const targets = account.role === "student" ? students.filter((s) => s.id === account.id) : students;

        const filtered = targets.filter((st) => {
            const rendered = getStudentRenderedHours(st.id);
            const req = Number(st.requiredHours) || DEFAULT_REQUIRED_HOURS;
            const complete = rendered >= req;
            const matchesSearch =
                !progressFilterSearch ||
                st.name.toLowerCase().includes(progressFilterSearch.toLowerCase()) ||
                st.idNumber.toLowerCase().includes(progressFilterSearch.toLowerCase());
            const matchesStatus =
                progressFilterStatus === "all" ||
                (progressFilterStatus === "completed" && complete) ||
                (progressFilterStatus === "ongoing" && !complete);
            return matchesSearch && matchesStatus;
        });

        contentArea.innerHTML = `
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>Internship Hours Progress</h3>
                        <p>Track rendered vs. required hours.</p>
                    </div>
                </div>
                ${
                    account.role !== "student"
                        ? `
                    <div class="filter-bar">
                        <input id="prog-search-input" type="text" placeholder="Search intern name or ID..." value="${escapeHTML(progressFilterSearch)}">
                        <select id="prog-status-select">
                            <option value="all" ${progressFilterStatus === "all" ? "selected" : ""}>All Progress</option>
                            <option value="ongoing" ${progressFilterStatus === "ongoing" ? "selected" : ""}>Ongoing</option>
                            <option value="completed" ${progressFilterStatus === "completed" ? "selected" : ""}>Completed</option>
                        </select>
                    </div>
                `
                        : ""
                }
                <div class="list-stack">
                    ${
                        filtered.length
                            ? filtered
                                  .map((st) => {
                                      const rendered = getStudentRenderedHours(st.id);
                                      const req = Number(st.requiredHours) || DEFAULT_REQUIRED_HOURS;
                                      const pct = Math.min(100, Math.round((rendered / req) * 100));
                                      return `
                                <div class="list-item list-item-stacked">
                                    <div class="progress-block">
                                        <div class="progress-meta">
                                            <strong>${escapeHTML(st.name)} (${escapeHTML(st.idNumber)})</strong>
                                            <span>${escapeHTML(formatHours(rendered))} / ${escapeHTML(String(req))} hrs (${pct}%)</span>
                                        </div>
                                        <div class="progress-track">
                                            <div class="progress-fill" style="width: ${pct}%;"></div>
                                        </div>
                                    </div>
                                </div>
                            `;
                                  })
                                  .join("")
                            : `<div class="empty-state"><h3>No progress records</h3><p>Verified attendance hours will update progress here.</p></div>`
                    }
                </div>
            </div>
        `;

        const searchEl = $("prog-search-input");
        const statusEl = $("prog-status-select");
        if (searchEl) {
            searchEl.addEventListener("input", (e) => {
                progressFilterSearch = e.target.value;
                renderProgressPage(account);
            });
        }
        if (statusEl) {
            statusEl.addEventListener("change", (e) => {
                progressFilterStatus = e.target.value;
                renderProgressPage(account);
            });
        }
    }

    // SUPERVISOR INTERN EVALUATION & FEEDBACK + UPDATABLE
    function renderEvaluationPage(account) {
        const allAccounts = getAccounts();
        const assignedStudents = account.role === "supervisor" ? getAssignedStudentsForSupervisor(account.id) : [];
        const evaluations = getEvaluations();
        const evalToEdit = editingEvalId ? evaluations.find((ev) => ev.id === editingEvalId) : null;

        const evalFormHTML = account.role === "supervisor"
            ? `
                <div class="panel">
                    <div class="panel-header">
                        <div>
                            <h3>${evalToEdit ? "Update Student Evaluation" : "Evaluate Assigned Intern"}</h3>
                            <p>${evalToEdit ? "Edit the rating or feedback notes." : "Rate your assigned intern's performance and provide feedback."}</p>
                        </div>
                    </div>
                    <form id="evaluate-intern-form">
                        <div class="form-grid">
                            <div>
                                <label for="eval-student-select">Assigned Intern</label>
                                <select id="eval-student-select" required>
                                    <option value="">Select Assigned Intern</option>
                                    ${assignedStudents
                                        .map(
                                            (st) => `<option value="${escapeHTML(st.id)}" ${evalToEdit && evalToEdit.studentId === st.id ? "selected" : ""}>${escapeHTML(st.name)} (${escapeHTML(st.idNumber)})</option>`
                                        )
                                        .join("")}
                                </select>
                            </div>
                            <div>
                                <label for="eval-rating">Rating (1 to 5)</label>
                                <select id="eval-rating" required>
                                    <option value="5" ${!evalToEdit || Number(evalToEdit.rating) === 5 ? "selected" : ""}>5 - Excellent</option>
                                    <option value="4" ${evalToEdit && Number(evalToEdit.rating) === 4 ? "selected" : ""}>4 - Very Good</option>
                                    <option value="3" ${evalToEdit && Number(evalToEdit.rating) === 3 ? "selected" : ""}>3 - Satisfactory</option>
                                    <option value="2" ${evalToEdit && Number(evalToEdit.rating) === 2 ? "selected" : ""}>2 - Needs Improvement</option>
                                    <option value="1" ${evalToEdit && Number(evalToEdit.rating) === 1 ? "selected" : ""}>1 - Poor</option>
                                </select>
                            </div>
                            <div class="full-span">
                                <label for="eval-feedback">Evaluation Feedback</label>
                                <textarea id="eval-feedback" rows="3" placeholder="Write constructive feedback for the student intern..." required>${escapeHTML(evalToEdit ? evalToEdit.feedback : "")}</textarea>
                            </div>
                        </div>
                        <div class="form-submit-row btn-row">
                            <button type="submit" class="primary-btn">${evalToEdit ? "Update Evaluation" : "Submit Evaluation"}</button>
                            ${
                                evalToEdit
                                    ? `<button type="button" id="cancel-eval-edit-btn" class="secondary-btn">Cancel Edit</button>`
                                    : ""
                            }
                        </div>
                        <p id="eval-submit-message" class="form-message"></p>
                    </form>
                </div>
            `
            : "";

        const visibleEvals = account.role === "student"
            ? evaluations.filter((ev) => ev.studentId === account.id)
            : account.role === "supervisor"
            ? evaluations.filter((ev) => ev.supervisorId === account.id)
            : evaluations;

        const filteredEvals = visibleEvals.filter((ev) => {
            const st = allAccounts.find((a) => a.id === ev.studentId);
            const matchesSearch =
                !evalFilterSearch ||
                (st &&
                    (st.name.toLowerCase().includes(evalFilterSearch.toLowerCase()) ||
                        st.idNumber.toLowerCase().includes(evalFilterSearch.toLowerCase()))) ||
                (ev.feedback || "").toLowerCase().includes(evalFilterSearch.toLowerCase());
            const matchesRating = evalFilterRating === "all" || Number(ev.rating) === Number(evalFilterRating);
            return matchesSearch && matchesRating;
        });

        const evalListHTML = filteredEvals.length
            ? filteredEvals
                  .map((ev) => {
                      const student = allAccounts.find((a) => a.id === ev.studentId);
                      const supervisor = allAccounts.find((a) => a.id === ev.supervisorId);
                      return `
                        <div class="list-item list-item-stacked">
                            <div class="task-card-top">
                                <div>
                                    <strong>${escapeHTML(student ? `${student.name} (${student.idNumber})` : "Student Intern")}</strong>
                                    <p class="muted">Evaluated by ${escapeHTML(supervisor ? supervisor.name : "Supervisor")} · ${escapeHTML(formatDateTime(ev.updatedAt || ev.createdAt))}</p>
                                </div>
                                <span class="badge success">Rating: ${escapeHTML(String(ev.rating))} / 5</span>
                            </div>
                            <p>${escapeHTML(ev.feedback)}</p>
                            ${
                                account.role === "supervisor" && ev.supervisorId === account.id
                                    ? `
                                        <div class="btn-row" style="margin-top: 10px;">
                                            <button type="button" class="small-btn edit-eval-btn" data-eval-id="${escapeHTML(ev.id)}">Edit / Update</button>
                                            <button type="button" class="small-btn danger-btn delete-eval-btn" data-eval-id="${escapeHTML(ev.id)}">Delete</button>
                                        </div>
                                    `
                                    : ""
                            }
                        </div>
                    `;
                  })
                  .join("")
            : `<div class="empty-state"><h3>No evaluations yet</h3><p>Submitted intern evaluations will appear here.</p></div>`;

        contentArea.innerHTML = `
            ${evalFormHTML}
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>Evaluation Records & Feedback</h3>
                        <p>Review, update, or filter ratings and feedback notes.</p>
                    </div>
                </div>
                <div class="filter-bar">
                    <input id="eval-search-input" type="text" placeholder="Search intern or feedback..." value="${escapeHTML(evalFilterSearch)}">
                    <select id="eval-rating-select">
                        <option value="all" ${evalFilterRating === "all" ? "selected" : ""}>All Ratings</option>
                        <option value="5" ${evalFilterRating === "5" ? "selected" : ""}>5 Stars</option>
                        <option value="4" ${evalFilterRating === "4" ? "selected" : ""}>4 Stars</option>
                        <option value="3" ${evalFilterRating === "3" ? "selected" : ""}>3 Stars</option>
                        <option value="2" ${evalFilterRating === "2" ? "selected" : ""}>2 Stars</option>
                        <option value="1" ${evalFilterRating === "1" ? "selected" : ""}>1 Star</option>
                    </select>
                </div>
                <div class="list-stack">${evalListHTML}</div>
            </div>
        `;

        const evalForm = $("evaluate-intern-form");
        if (evalForm) {
            evalForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const msg = $("eval-submit-message");
                msg.className = "form-message";

                const studentId = $("eval-student-select").value;
                const rating = Number($("eval-rating").value);
                const feedback = $("eval-feedback").value.trim();

                if (!studentId || !rating || !feedback) {
                    msg.classList.add("error");
                    msg.textContent = "Please select an assigned intern, rating, and feedback.";
                    return;
                }

                const updatedEvals = getEvaluations();
                if (editingEvalId) {
                    const idx = updatedEvals.findIndex((ev) => ev.id === editingEvalId);
                    if (idx !== -1) {
                        updatedEvals[idx] = {
                            ...updatedEvals[idx],
                            studentId,
                            rating,
                            feedback,
                            updatedAt: new Date().toISOString()
                        };
                    }
                    editingEvalId = null;
                    saveEvaluations(updatedEvals);
                    pushNotification(studentId, "Evaluation Updated", `${account.name} updated your evaluation (${rating}/5).`);
                    msg.classList.add("success");
                    msg.textContent = "Evaluation updated successfully!";
                } else {
                    updatedEvals.unshift({
                        id: "eval_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
                        supervisorId: account.id,
                        studentId,
                        rating,
                        feedback,
                        createdAt: new Date().toISOString()
                    });
                    saveEvaluations(updatedEvals);
                    pushNotification(studentId, "New Internship Evaluation", `${account.name} submitted an evaluation (${rating}/5) for you.`);
                    msg.classList.add("success");
                    msg.textContent = "Evaluation submitted successfully!";
                }

                evalForm.reset();
                renderEvaluationPage(account);
            });
        }

        const cancelEvalBtn = $("cancel-eval-edit-btn");
        if (cancelEvalBtn) {
            cancelEvalBtn.addEventListener("click", () => {
                editingEvalId = null;
                renderEvaluationPage(account);
            });
        }

        contentArea.querySelectorAll(".edit-eval-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                editingEvalId = btn.getAttribute("data-eval-id");
                renderEvaluationPage(account);
            });
        });

        contentArea.querySelectorAll(".delete-eval-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const evalId = btn.getAttribute("data-eval-id");
                if (editingEvalId === evalId) editingEvalId = null;
                saveEvaluations(getEvaluations().filter((ev) => ev.id !== evalId));
                renderEvaluationPage(account);
            });
        });

        $("eval-search-input").addEventListener("input", (e) => {
            evalFilterSearch = e.target.value;
            renderEvaluationPage(account);
        });

        $("eval-rating-select").addEventListener("change", (e) => {
            evalFilterRating = e.target.value;
            renderEvaluationPage(account);
        });
    }

    function renderReportsPage(account) {
        const accounts = getAccounts();
        const students = accounts.filter((a) => a.role === "student");
        const assignments = getAssignments().filter((a) => a.status === "Active");
        const evaluations = getEvaluations();

        contentArea.innerHTML = `
            <div class="panel">
                <div class="report-header-box">
                    <h2>InternTrack Summary Report</h2>
                    <p>Generated by ${escapeHTML(account.name)} (${escapeHTML(roleNames[account.role] || account.role)})</p>
                </div>
                <div class="filter-bar no-print">
                    <input id="report-search-input" type="text" placeholder="Filter report rows..." value="${escapeHTML(reportSearch)}">
                    <select id="report-type-select">
                        <option value="assignments" ${reportType === "assignments" ? "selected" : ""}>Student Assignments & Hours</option>
                        <option value="evaluations" ${reportType === "evaluations" ? "selected" : ""}>Evaluations Summary</option>
                    </select>
                    <button type="button" id="print-report-btn" class="primary-btn">Print Report</button>
                </div>
                <div class="table-wrap">
                    ${
                        reportType === "evaluations"
                            ? `
                        <table>
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Supervisor</th>
                                    <th>Rating</th>
                                    <th>Feedback</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${
                                    evaluations.length
                                        ? evaluations
                                              .filter(
                                                  (ev) =>
                                                      !reportSearch ||
                                                      (ev.feedback || "").toLowerCase().includes(reportSearch.toLowerCase())
                                              )
                                              .map((ev) => {
                                                  const st = accounts.find((a) => a.id === ev.studentId);
                                                  const sup = accounts.find((a) => a.id === ev.supervisorId);
                                                  return `
                                                <tr>
                                                    <td>${escapeHTML(st ? st.name : "-")}</td>
                                                    <td>${escapeHTML(sup ? sup.name : "-")}</td>
                                                    <td>${escapeHTML(String(ev.rating))} / 5</td>
                                                    <td>${escapeHTML(ev.feedback)}</td>
                                                </tr>
                                            `;
                                              })
                                              .join("")
                                        : `<tr><td colspan="4" class="empty-state">No evaluation rows.</td></tr>`
                                }
                            </tbody>
                        </table>
                    `
                            : `
                        <table>
                            <thead>
                                <tr>
                                    <th>ID Number</th>
                                    <th>Student</th>
                                    <th>Company & Supervisor</th>
                                    <th>Rendered Hours</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${
                                    students.length
                                        ? students
                                              .filter(
                                                  (st) =>
                                                      !reportSearch ||
                                                      st.name.toLowerCase().includes(reportSearch.toLowerCase()) ||
                                                      st.idNumber.toLowerCase().includes(reportSearch.toLowerCase())
                                              )
                                              .map((st) => {
                                                  const assign = assignments.find((a) => a.studentId === st.id);
                                                  return `
                                                <tr>
                                                    <td>${escapeHTML(st.idNumber)}</td>
                                                    <td>${escapeHTML(st.name)}</td>
                                                    <td>${escapeHTML(assign ? `${assign.company} · ${assign.supervisorName}` : "Unassigned")}</td>
                                                    <td>${formatHours(getStudentRenderedHours(st.id))} / ${st.requiredHours || DEFAULT_REQUIRED_HOURS} hrs</td>
                                                </tr>
                                            `;
                                              })
                                              .join("")
                                        : `<tr><td colspan="4" class="empty-state">No student rows.</td></tr>`
                                }
                            </tbody>
                        </table>
                    `
                    }
                </div>
            </div>
        `;

        $("report-search-input").addEventListener("input", (e) => {
            reportSearch = e.target.value;
            renderReportsPage(account);
        });

        $("report-type-select").addEventListener("change", (e) => {
            reportType = e.target.value;
            renderReportsPage(account);
        });

        $("print-report-btn").addEventListener("click", () => window.print());
    }

    function renderNotificationsPage(account) {
        const allNotifs = getNotifications();
        const mine = allNotifs.filter((n) => n.userId === account.id);

        const updated = allNotifs.map((n) => (n.userId === account.id ? { ...n, read: true } : n));
        saveNotifications(updated);
        updateUnreadBadge(account.id);

        contentArea.innerHTML = `
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>Notifications</h3>
                        <p>Updates on tasks, evaluations, and account activity.</p>
                    </div>
                </div>
                <div class="list-stack">
                    ${
                        mine.length
                            ? mine
                                  .map(
                                      (n) => `
                                <div class="list-item list-item-stacked">
                                    <strong>${escapeHTML(n.title)}</strong>
                                    <p>${escapeHTML(n.message)}</p>
                                    <p class="muted">${escapeHTML(formatDateTime(n.createdAt))}</p>
                                </div>
                            `
                                  )
                                  .join("")
                            : `<div class="empty-state"><h3>No notifications</h3><p>You have no alerts yet.</p></div>`
                    }
                </div>
            </div>
        `;
    }

    function renderStudentQrSection(account) {
        if (account.role !== "student") return "";
        return `
            <div class="qr-card">
                <h3>Student QR Code</h3>
                <p>Your personal InternTrack QR ID for quick identification.</p>
                <div id="student-qr-box" class="qr-code-box"></div>
                <div class="qr-id">${escapeHTML(account.idNumber || account.id)}</div>
                <button type="button" id="download-qr-btn" class="secondary-btn">Download QR Code</button>
            </div>
        `;
    }

    function initStudentQrCode(account) {
        if (account.role !== "student") return;
        const box = $("student-qr-box");
        if (!box || typeof QRCode === "undefined") return;

        box.innerHTML = "";
        const payload = JSON.stringify({
            system: "InternTrack",
            role: "student",
            idNumber: account.idNumber,
            name: account.name,
            program: account.program || ""
        });

        new QRCode(box, {
            text: payload,
            width: 190,
            height: 190,
            colorDark: "#181a1f",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });

        const dlBtn = $("download-qr-btn");
        if (dlBtn) {
            dlBtn.addEventListener("click", () => {
                const canvas = box.querySelector("canvas");
                const img = box.querySelector("img");
                let dataUrl = "";
                if (canvas) {
                    dataUrl = canvas.toDataURL("image/png");
                } else if (img && img.src) {
                    dataUrl = img.src;
                }
                if (!dataUrl) return;
                const link = document.createElement("a");
                link.href = dataUrl;
                link.download = `${account.idNumber || "student"}-qr.png`;
                link.click();
            });
        }
    }

    function renderProfilePage(account) {
        const qrSectionHTML = renderStudentQrSection(account);
        const profileFormHTML = `
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>Update My Profile</h3>
                        <p>Edit and save your account details.</p>
                    </div>
                </div>
                <form id="update-profile-form">
                    <div class="form-grid">
                        <div>
                            <label for="prof-name">Full Name</label>
                            <input id="prof-name" type="text" value="${escapeHTML(account.name)}" required>
                        </div>
                        <div>
                            <label for="prof-email">Email Address</label>
                            <input id="prof-email" type="email" value="${escapeHTML(account.email)}" required>
                        </div>
                        <div>
                            <label for="prof-contact">Contact Number</label>
                            <input id="prof-contact" type="text" value="${escapeHTML(account.contact || "")}">
                        </div>
                        <div>
                            <label for="prof-req-hours">Required Internship Hours</label>
                            <input id="prof-req-hours" type="number" min="1" value="${escapeHTML(String(account.requiredHours || DEFAULT_REQUIRED_HOURS))}">
                        </div>
                        <div class="full-span">
                            <label for="prof-address">Address</label>
                            <textarea id="prof-address" rows="2">${escapeHTML(account.address || "")}</textarea>
                        </div>
                    </div>
                    <div class="form-submit-row">
                        <button type="submit" class="primary-btn">Save Changes</button>
                    </div>
                    <p id="prof-save-msg" class="form-message"></p>
                </form>
            </div>
        `;

        contentArea.innerHTML = account.role === "student"
            ? `<div class="profile-layout">${qrSectionHTML}${profileFormHTML}</div>`
            : profileFormHTML;

        initStudentQrCode(account);

        $("update-profile-form").addEventListener("submit", (e) => {
            e.preventDefault();
            const msg = $("prof-save-msg");
            msg.className = "form-message";

            const name = $("prof-name").value.trim();
            const email = $("prof-email").value.trim().toLowerCase();
            const contact = $("prof-contact").value.trim();
            const requiredHours = Number($("prof-req-hours").value) || DEFAULT_REQUIRED_HOURS;
            const address = $("prof-address").value.trim();

            if (!name || !email) {
                msg.classList.add("error");
                msg.textContent = "Name and email are required.";
                return;
            }

            const accounts = getAccounts();
            const idx = accounts.findIndex((a) => a.id === account.id);
            if (idx !== -1) {
                accounts[idx] = {
                    ...accounts[idx],
                    name,
                    email,
                    contact,
                    requiredHours,
                    address
                };
                saveAccounts(accounts);
                syncTopbarAccount(accounts[idx]);
                msg.classList.add("success");
                msg.textContent = "Profile updated successfully!";
                renderProfilePage(accounts[idx]);
            }
        });
    }

    // INITIALIZATION
    applyTheme(localStorage.getItem(KEYS.theme) || "light");
    syncBrandSidebarState();

    try {
        const savedLogin = localStorage.getItem(KEYS.remembered);
        if (savedLogin && $("login-id")) {
            $("login-id").value = savedLogin;
            if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
        }
    } catch (_) {}

    const isLoggedIn = localStorage.getItem(KEYS.session) === "true";
    const activeAccount = getCurrentAccount();

    if (isLoggedIn && activeAccount) {
        showSystemPage(activeAccount);
    } else {
        showAuthPage("login");
    }
})();