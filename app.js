
(() => {
    "use strict";

    const KEYS = {
        accounts: "internAccounts",
        oldAccount: "internAccount",
        session: "internLoggedIn",
        current: "internCurrentAccountId",
        theme: "internTheme",
        attendance: "internAttendanceRecords",
        requirements: "internRequirements",
        notifications: "internNotifications",
        tasks: "internTasks",
        submissions: "internTaskSubmissions",
        feedback: "internFeedback"
    };

    const REQUIRED_HOURS = 486;

    const DEFAULT_TASKS = [
        {
            id: "weekly-report",
            title: "Weekly Accomplishment Report",
            description: "Summarize the work you completed this week and the skills you practiced.",
            due: "End of each week"
        },
        {
            id: "journal",
            title: "Internship Journal",
            description: "Write what you learned, the tasks you handled, and any challenges you faced.",
            due: "Every Friday"
        },
        {
            id: "final-report",
            title: "Final Internship Report",
            description: "Prepare your final report covering your hours, outputs, and internship experience.",
            due: "Before internship ends"
        }
    ];

    const roleNames = {
        student: "Student",
        supervisor: "Supervisor",
        coordinator: "Coordinator"
    };

    const menus = {
        student: [
            ["dashboard", "⌂", "Dashboard"],
            ["tasks", "☰", "My Task"],
            ["attendance", "◷", "Attendance"],
            ["progress", "↗", "Progress Tracking"],
            ["evaluation", "★", "Evaluation and Feedback"]
        ],
        supervisor: [
            ["dashboard", "⌂", "Dashboard"],
            ["interns", "♙", "My Interns"],
            ["attendance", "◷", "Attendance Records"],
            ["scan-attendance", "▣", "Scan QR Attendance"],
            ["requirements", "☷", "Requirements Review"],
            ["evaluation", "★", "Evaluations"],
            ["notifications", "♧", "Notifications"]
        ],
        coordinator: [
            ["dashboard", "⌂", "Dashboard"],
            ["students", "♙", "Students"],
            ["companies", "▤", "Companies"],
            ["requirements", "☷", "Requirements"],
            ["attendance", "◷", "Attendance"],
            ["documents", "▧", "Documents"],
            ["progress", "↗", "Internship Progress"],
            ["reports", "▥", "Reports"]
        ]
    };

    const studentTools = [
        ["profile", "♙", "My Profile"],
        ["notifications", "♧", "Notifications"]
    ];

    const subtitles = {
        dashboard: "Your internship overview.",
        profile: "View your registered student information.",
        tasks: "View your assigned tasks and submit your work.",
        company: "View your internship placement information.",
        requirements: "Monitor internship requirements and review status.",
        attendance: "Review attendance and rendered internship hours.",
        "my-qr": "Show your personal QR code to your supervisor.",
        "scan-attendance": "Scan a student's QR code to record attendance.",
        documents: "Manage internship document information.",
        evaluation: "Review internship evaluation information.",
        notifications: "View updates and reminders.",
        interns: "View registered student interns.",
        students: "Monitor student internship information.",
        companies: "View registered company information.",
        progress: "Monitor student internship progress.",
        reports: "View attendance and internship summaries."
    };

    const $ = (selector) => document.querySelector(selector);

    let currentPage = "dashboard";
    let activeScanner = null;
    let scannerStarting = false;
    let scannerBusy = false;
    let scannerStartButton = null;
    let scannerStopButton = null;

    function readJSON(key, fallback = []) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.error("Unable to read local data:", error);
            return fallback;
        }
    }

    function saveJSON(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function loadAccounts() {
        let accounts = readJSON(KEYS.accounts, []);

        if (!Array.isArray(accounts)) {
            accounts = [];
        }

        const oldAccount = readJSON(KEYS.oldAccount, null);

        if (oldAccount && typeof oldAccount === "object") {
            const oldId = String(oldAccount.id || oldAccount.idNumber || "");
            const exists = accounts.some(account => String(account.id) === oldId);

            if (oldId && !exists) {
                accounts.push({
                    name: oldAccount.name || oldAccount.fullName || "Student",
                    id: oldId,
                    role: oldAccount.role || "student",
                    password: oldAccount.password || ""
                });
                saveJSON(KEYS.accounts, accounts);
            }
        }

        return accounts;
    }

    function saveAccounts(accounts) {
        saveJSON(KEYS.accounts, accounts);
    }

    function getAttendance() {
        const records = readJSON(KEYS.attendance, []);
        return Array.isArray(records) ? records : [];
    }

    function saveAttendance(records) {
        saveJSON(KEYS.attendance, records);
    }

    function getCurrentAccount() {
        const id = localStorage.getItem(KEYS.current);
        if (!id) return null;

        return loadAccounts().find(account => String(account.id) === String(id)) || null;
    }

    function getRole(account = getCurrentAccount()) {
        return account && menus[account.role] ? account.role : null;
    }

    function showOnly(pageId) {
        ["login-page", "register-page", "forgot-page", "system-page"].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.classList.toggle("hidden", id !== pageId);
        });
    }

    function setMessage(selector, message, type = "error") {
        const element = $(selector);
        if (!element) return;

        element.textContent = message;
        element.className = "form-message " + type;
    }

    function clearMessage(selector) {
        const element = $(selector);
        if (element) {
            element.textContent = "";
            element.className = "form-message";
        }
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function initials(name) {
        return String(name || "IT")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part.charAt(0))
            .join("")
            .toUpperCase();
    }

    function formatDate(dateString) {
        if (!dateString) return "—";

        const date = new Date(dateString + "T00:00:00");
        if (Number.isNaN(date.getTime())) return escapeHTML(dateString);

        return date.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function todayString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function timeString(date = new Date()) {
        return date.toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    }

    function parseTime(time) {
        if (!time) return null;

        const match = String(time).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return null;

        let hour = Number(match[1]);
        const minute = Number(match[2]);
        const meridiem = match[3].toUpperCase();

        if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

        if (meridiem === "AM" && hour === 12) hour = 0;
        if (meridiem === "PM" && hour !== 12) hour += 12;

        return hour * 60 + minute;
    }

    function hoursBetween(timeIn, timeOut) {
        const start = parseTime(timeIn);
        const end = parseTime(timeOut);

        if (start === null || end === null || end < start) return 0;
        return Number(((end - start) / 60).toFixed(2));
    }

    function totalHours(records) {
        return records.reduce((sum, record) => sum + Number(record.hours || 0), 0);
    }

    function statusBadge(status) {
        let type = "neutral";

        if (["Completed", "Present", "Approved", "Time Out Recorded", "Submitted", "Active"].includes(status)) {
            type = "success";
        } else if (["Pending", "In Progress", "Timed In"].includes(status)) {
            type = "warning";
        } else if (["Rejected", "Absent"].includes(status)) {
            type = "danger";
        }

        return `<span class="badge ${type}">${escapeHTML(status)}</span>`;
    }

    function emptyState(title, description, icon = "▧") {
        return `
            <div class="empty-state">
                <div class="empty-icon">${icon}</div>
                <h3>${escapeHTML(title)}</h3>
                <p>${escapeHTML(description)}</p>
            </div>`;
    }

    function statCard(label, value, icon, note = "") {
        return `
            <article class="stat-card">
                <div class="stat-top">
                    <span class="stat-label">${escapeHTML(label)}</span>
                    <span class="stat-icon">${icon}</span>
                </div>
                <div class="stat-value">${escapeHTML(value)}</div>
                <div class="stat-note">${escapeHTML(note)}</div>
            </article>`;
    }

    function panel(title, content, note = "") {
        return `
            <section class="panel">
                <div class="panel-header">
                    <div>
                        <h3>${escapeHTML(title)}</h3>
                        ${note ? `<p>${escapeHTML(note)}</p>` : ""}
                    </div>
                </div>
                ${content}
            </section>`;
    }

    function table(headers, rows) {
        return `
            <div class="table-wrap">
                <table>
                    <thead><tr>${headers.map(header => `<th>${escapeHTML(header)}</th>`).join("")}</tr></thead>
                    <tbody>${rows.length ? rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("") : `
                        <tr><td colspan="${headers.length}">
                            ${emptyState("No records yet", "Records will appear here when available.")}
                        </td></tr>`}
                    </tbody>
                </table>
            </div>`;
    }

    function buildNavigation(role) {
        const nav = $("#sidebar-nav");
        nav.innerHTML = "";

        (menus[role] || []).forEach(([id, icon, label]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "menu-btn";
            button.dataset.page = id;
            button.innerHTML = `
                <span class="menu-icon">${icon}</span>
                <span>${escapeHTML(label)}</span>`;

            button.addEventListener("click", () => showPage(id));
            nav.appendChild(button);
        });
    }

    function applyTheme() {
        const savedTheme = localStorage.getItem(KEYS.theme) || "light";
        const theme = savedTheme === "dark" ? "dark" : "light";
        const nextLabel = theme === "dark" ? "Light Mode" : "Dark Mode";
        const nextIcon = theme === "dark" ? "☾" : "☀";

        document.documentElement.dataset.theme = theme;

        const icon = $("#theme-icon");
        const label = $("#theme-label");
        const studentIcon = $("#student-theme-icon");
        const studentLabel = $("#student-theme-label");
        const studentToggle = $("#student-theme-toggle");

        if (icon) icon.textContent = nextIcon;
        if (label) label.textContent = nextLabel;
        if (studentIcon) studentIcon.textContent = nextIcon;
        if (studentLabel) studentLabel.textContent = nextLabel;
        if (studentToggle) studentToggle.title = nextLabel;
    }

    function toggleTheme() {
        const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        localStorage.setItem(KEYS.theme, nextTheme);
        applyTheme();
    }

    function setRoleChrome(role) {
        const isStudent = role === "student";
        document.body.classList.toggle("student-session", isStudent);

        const arrow = $("#sidebar-user-arrow");
        const menu = $("#student-quick-menu");
        const topUser = $(".topbar-user");
        const theme = $("#theme-toggle");
        const logout = $("#logout-btn");
        const toggle = $("#sidebar-user-toggle");

        if (arrow) arrow.classList.toggle("hidden", !isStudent);
        if (menu) menu.classList.add("hidden");
        if (topUser) topUser.classList.toggle("hidden", isStudent);
        if (theme) theme.classList.toggle("hidden", isStudent);

        if (logout) {
            logout.innerHTML = isStudent
                ? "<span>↪</span> Log Out"
                : "<span>↪</span> Sign Out";
        }

        if (toggle) toggle.setAttribute("aria-expanded", "false");
    }

    function toggleStudentMenu() {
        if (!document.body.classList.contains("student-session")) return;

        const menu = $("#student-quick-menu");
        const toggle = $("#sidebar-user-toggle");
        if (!menu || !toggle) return;

        const open = menu.classList.contains("hidden");
        menu.classList.toggle("hidden", !open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function closeStudentMenu() {
        const menu = $("#student-quick-menu");
        const toggle = $("#sidebar-user-toggle");

        if (menu) menu.classList.add("hidden");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
    }

    function updateAccountHeader(account) {
        const role = getRole(account);

        $("#sidebar-name").textContent = account.name;
        $("#sidebar-role").textContent = roleNames[role] || roleNames.student;

        if ($("#sidebar-id")) {
            $("#sidebar-id").textContent = `ID ${account.id}`;
        }

        $("#sidebar-avatar").textContent = initials(account.name);

        const headerAvatar = $("#header-avatar");
        const headerName = $("#header-name");
        const headerId = $("#header-id");

        if (headerAvatar) headerAvatar.textContent = initials(account.name);
        if (headerName) headerName.textContent = account.name;
        if (headerId) headerId.textContent = `ID ${account.id}`;

        const dateEl = $("#header-date");

        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString("en-PH", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric"
            });
        }
    }

    function signIn(account) {
        localStorage.setItem(KEYS.current, String(account.id));
        localStorage.setItem(KEYS.session, "true");

        updateAccountHeader(account);
        setRoleChrome(account.role);
        buildNavigation(account.role);
        applyTheme();
        showOnly("system-page");
        showPage("dashboard");
    }

    function signOut() {
        stopScanner();
        localStorage.removeItem(KEYS.session);
        localStorage.removeItem(KEYS.current);
        currentPage = "dashboard";
        document.body.classList.remove("student-session");
        setRoleChrome("supervisor");
        showOnly("login-page");

        if ($("#login-form")) $("#login-form").reset();
        clearMessage("#login-message");
    }

    function showPage(pageId) {
        const account = getCurrentAccount();
        const role = getRole(account);

        if (!account || !role) {
            signOut();
            return;
        }

        const pageList = [
            ...(menus[role] || []),
            ...(role === "student" ? studentTools : [])
        ];

        const allowedPages = pageList.map(item => item[0]);

        if (!allowedPages.includes(pageId)) {
            pageId = "dashboard";
        }

        if (currentPage === "scan-attendance" && pageId !== "scan-attendance") {
            stopScanner();
        }

        currentPage = pageId;
        closeStudentMenu();

        document.querySelectorAll(".menu-btn").forEach(button => {
            button.classList.toggle("active", button.dataset.page === pageId);
        });

        const menuItem = [
            ...(menus[role] || []),
            ...(role === "student" ? studentTools : [])
        ].find(item => item[0] === pageId);

        $("#page-title").textContent = menuItem ? menuItem[2] : "Dashboard";

        const studentSubtitles = {
            attendance: "Show your QR code, check rendered hours, and review attendance records.",
            progress: "Track your rendered hours and internship progress.",
            evaluation: "Review your evaluation and feedback."
        };

        $("#page-subtitle").textContent =
            (role === "student" && studentSubtitles[pageId]) ||
            subtitles[pageId] ||
            "Manage internship information.";

        const content = $("#content");
        content.classList.remove("content-refresh");
        content.innerHTML = renderPage(pageId, account, role);
        void content.offsetWidth;
        content.classList.add("content-refresh");

        bindPageActions(pageId, account, role);
    }

    function renderPage(pageId, account, role) {
        const renderers = {
            dashboard: renderDashboard,
            tasks: renderTasks,
            profile: renderProfile,
            company: renderCompany,
            requirements: renderRequirements,
            attendance: renderAttendance,
            "my-qr": renderMyQR,
            "scan-attendance": renderScanner,
            documents: renderDocuments,
            evaluation: renderEvaluation,
            notifications: renderNotifications,
            interns: renderInterns,
            students: renderStudents,
            companies: renderCompanies,
            progress: renderProgress,
            reports: renderReports
        };

        const renderer = renderers[pageId];

        return renderer
            ? renderer(account, role)
            : emptyState("Page not found", "Choose a page from the sidebar.");
    }

    function visibleAttendance(account, role) {
        const records = getAttendance();

        if (role === "student") {
            return records.filter(record => String(record.studentId) === String(account.id));
        }

        return records;
    }

    // UPDATED STUDENT DASHBOARD
    function renderDashboard(account, role) {
        const allAccounts = loadAccounts();
        const students = allAccounts.filter(item => item.role === "student");
        const attendance = getAttendance();
        const todayRecords = attendance.filter(record => record.date === todayString());
        const myRecords = attendance.filter(record => String(record.studentId) === String(account.id));

        let cards = "";
        let intro = "";

        if (role === "student") {
            const hours = totalHours(myRecords);
            const tasks = getTasks();
            const submitted = getSubmissions(account).length;

            cards = [
                statCard("Attendance", myRecords.filter(item => item.timeOut).length, "◷", "Completed attendance"),
                statCard("Records", myRecords.length, "▧", "Attendance records"),
                statCard("Rendered Hours", hours.toFixed(2), "⌛", `of ${REQUIRED_HOURS} required hours`),
                statCard("Tasks", `${submitted}/${tasks.length}`, "☰", "Submitted tasks")
            ].join("");

            intro = "Your attendance, records, rendered hours, tasks, and internship progress.";

        } else if (role === "supervisor") {
            cards = [
                statCard("Registered Students", students.length, "♙", "Student accounts in this demo"),
                statCard("Today's Attendance", todayRecords.length, "◷", "Records for today"),
                statCard("Completed Time Outs", todayRecords.filter(item => item.timeOut).length, "✓", "Attendance completed"),
                statCard("Open Attendance", todayRecords.filter(item => !item.timeOut).length, "⌛", "Awaiting time out")
            ].join("");

            intro = "Use the QR scanner to record your interns' time in and time out.";

        } else {
            cards = [
                statCard("Registered Students", students.length, "♙", "Student accounts"),
                statCard("Supervisors", allAccounts.filter(item => item.role === "supervisor").length, "♧", "Supervisor accounts"),
                statCard("Attendance Records", attendance.length, "◷", "All saved records"),
                statCard("Rendered Hours", totalHours(attendance).toFixed(2), "⌛", "Completed attendance hours")
            ].join("");

            intro = "Monitor registered accounts and internship attendance information.";
        }

        // Recent Attendance is hidden only on the Student Dashboard.
        let recentPanel = "";

        if (role !== "student") {
            const recentRecords = visibleAttendance(account, role).slice(-5).reverse();

            const recentRows = recentRecords.map(record => [
                escapeHTML(record.studentName),
                escapeHTML(formatDate(record.date)),
                escapeHTML(record.timeIn || "—"),
                escapeHTML(record.timeOut || "—"),
                `${Number(record.hours || 0).toFixed(2)} hrs`
            ]);

            recentPanel = panel(
                "Recent Attendance Records",
                table(["Student", "Date", "Time In", "Time Out", "Hours"], recentRows),
                "Latest attendance records saved in this browser."
            );
        }

        const studentExtras = role === "student"
            ? `${internshipInfoPanel(account)}${internshipProgressPanel(account)}`
            : "";

        return `
            <div class="welcome-banner">
                <p class="welcome-kicker">Dashboard</p>
                <h2>Hello, ${escapeHTML(account.name)}</h2>
                <p>${escapeHTML(intro)}</p>
            </div>

            <div class="card-grid">
                ${cards}
            </div>

            ${recentPanel}
            ${studentExtras}
        `;
    }

    function getTasks() {
        const tasks = readJSON(KEYS.tasks, []);

        if (!Array.isArray(tasks) || !tasks.length) {
            saveJSON(KEYS.tasks, DEFAULT_TASKS);
            return DEFAULT_TASKS.slice();
        }

        return tasks;
    }

    function getSubmissions(account) {
        const records = readJSON(KEYS.submissions, []);

        if (!Array.isArray(records)) return [];

        return records.filter(item => String(item.studentId) === String(account.id));
    }

    function progressMarkup(hours) {
        const percent = Math.max(0, Math.min(100, (hours / REQUIRED_HOURS) * 100));

        return `
            <div class="progress-block">
                <div class="progress-meta">
                    <strong>${hours.toFixed(2)} / ${REQUIRED_HOURS} hrs</strong>
                    <span>${percent.toFixed(0)}%</span>
                </div>

                <div class="progress-track" aria-hidden="true">
                    <div class="progress-fill" style="width:${percent.toFixed(2)}%"></div>
                </div>
            </div>`;
    }

    // UPDATED BRIEF INTERNSHIP INFO
    function internshipInfoPanel(account) {
        const company = account.company || "Not yet assigned";

        return panel(
            "Brief Internship Info",
            `
            <div class="card-grid">
                ${statCard("Student Name", account.name, "♙", "Registered student")}
                ${statCard("ID Number", account.id, "▧", "Student identification")}
                ${statCard("Company", company, "▤", "Internship placement")}
                ${statCard("Required Hours", `${REQUIRED_HOURS} hrs`, "⌛", "Total required hours")}
            </div>
            `
        );
    }

    // UPDATED INTERNSHIP PROGRESS
    function internshipProgressPanel(account) {
        const hours = totalHours(visibleAttendance(account, "student"));
        const percent = Math.max(0, Math.min(100, (hours / REQUIRED_HOURS) * 100));
        const remaining = Math.max(0, REQUIRED_HOURS - hours);

        const company = account.company || "";

        const status = !company
            ? "Not yet assigned"
            : hours >= REQUIRED_HOURS
                ? "Completed"
                : hours > 0
                    ? "In Progress"
                    : "Pending";

        return panel(
            "Internship Progress",
            `
            ${progressMarkup(hours)}

            <div class="card-grid" style="margin-top: 20px;">
                ${statCard("Progress", `${hours.toFixed(2)} / ${REQUIRED_HOURS} hrs`, "↗", `${percent.toFixed(0)}% completed`)}
                ${statCard("Rendered Hours", `${hours.toFixed(2)} hrs`, "⌛", "Total completed hours")}
                ${statCard("Remaining", `${remaining.toFixed(2)} hrs`, "◷", "Hours left to complete")}
                ${statCard("Status", status, "▧", "Internship placement status")}
            </div>
            `
        );
    }

    function renderTasks(account, role) {
        if (role !== "student") {
            return emptyState("Access restricted", "Only student accounts can view and submit tasks.");
        }

        const submissions = getSubmissions(account);

        const cards = getTasks().map(task => {
            const submission = submissions.find(item => item.taskId === task.id);
            const status = submission ? "Submitted" : "Pending";

            return `
                <article class="task-card">
                    <div class="task-card-top">
                        <div>
                            <h3>${escapeHTML(task.title)}</h3>
                            <p>${escapeHTML(task.description)}</p>
                        </div>

                        ${statusBadge(status)}
                    </div>

                    <p class="task-due">Due: ${escapeHTML(task.due || "No due date")}</p>

                    ${submission ? `
                        <div class="notice">
                            <strong>Your submission</strong>
                            <p>${escapeHTML(submission.note)}</p>
                            <p class="muted">Submitted ${escapeHTML(formatDate(submission.date))}</p>
                        </div>
                    ` : `
                        <form class="task-submit-form" data-task-id="${escapeHTML(task.id)}">
                            <label for="task-note-${escapeHTML(task.id)}">Submission</label>
                            <textarea id="task-note-${escapeHTML(task.id)}" required placeholder="Write your task submission"></textarea>
                            <button class="primary-btn" type="submit">Submit</button>
                        </form>
                    `}
                </article>`;
        }).join("");

        return panel(
            "My Tasks",
            `<div class="task-list">${cards}</div>`,
            "View each task, then submit your work."
        );
    }

    function renderProfile(account, role) {
        return `
            <div class="panel">
                <div class="info-grid">
                    <div class="info-card">
                        <span>Full Name</span>
                        <strong>${escapeHTML(account.name)}</strong>
                    </div>

                    <div class="info-card">
                        <span>ID Number</span>
                        <strong>${escapeHTML(account.id)}</strong>
                    </div>

                    <div class="info-card">
                        <span>Role</span>
                        <strong>${escapeHTML(roleNames[role])}</strong>
                    </div>

                    <div class="info-card">
                        <span>Account Status</span>
                        <strong>${statusBadge("Active")}</strong>
                    </div>
                </div>
            </div>`;
    }

    function renderCompany(account) {
        return `
            ${panel(
                "Company / Placement",
                `
                <div class="notice">
                    Your internship placement details can be added here when your company information is available.
                </div>

                <div class="info-grid">
                    <div class="info-card">
                        <span>Student Name</span>
                        <strong>${escapeHTML(account.name)}</strong>
                    </div>

                    <div class="info-card">
                        <span>Student ID</span>
                        <strong>${escapeHTML(account.id)}</strong>
                    </div>

                    <div class="info-card">
                        <span>Company Name</span>
                        <strong>Not yet assigned</strong>
                    </div>

                    <div class="info-card">
                        <span>Placement Status</span>
                        <strong>${statusBadge("Pending")}</strong>
                    </div>
                </div>
                `
            )}`;
    }

    function getRequirements(account) {
        const all = readJSON(KEYS.requirements, []);

        return Array.isArray(all)
            ? all.filter(item => String(item.studentId) === String(account.id))
            : [];
    }

    function renderRequirements(account, role) {
        const allRequirements = readJSON(KEYS.requirements, []);
        let records;

        if (role === "student") {
            records = getRequirements(account);
        } else {
            records = allRequirements;
        }

        const rows = records.map(item => {
            const student = loadAccounts().find(user => String(user.id) === String(item.studentId));

            return [
                escapeHTML(student ? student.name : item.studentName || "Unknown"),
                escapeHTML(item.name || "Requirement"),
                statusBadge(item.status || "Pending"),
                escapeHTML(item.date || "—")
            ];
        });

        let addForm = "";

        if (role === "student") {
            addForm = `
                <form id="requirement-form" class="inline-form">
                    <div class="field">
                        <label for="requirement-name">Requirement Name</label>
                        <input id="requirement-name" required placeholder="e.g. Endorsement Letter">
                    </div>

                    <button class="primary-btn" type="submit">Add Requirement</button>
                </form>`;
        } else if (role === "supervisor" || role === "coordinator") {
            addForm = `
                <form id="requirement-review-form" class="form-grid">
                    <div>
                        <label for="review-student-id">Student ID</label>
                        <input id="review-student-id" required placeholder="Student ID">
                    </div>

                    <div>
                        <label for="review-requirement-name">Requirement Name</label>
                        <input id="review-requirement-name" required placeholder="Requirement name">
                    </div>

                    <div class="full-span">
                        <label for="review-status">Status</label>
                        <select id="review-status">
                            <option>Pending</option>
                            <option>Approved</option>
                            <option>Rejected</option>
                        </select>
                    </div>

                    <div class="full-span">
                        <button class="primary-btn" type="submit">Save Requirement Status</button>
                    </div>
                </form>`;
        }

        return `
            ${panel(role === "student" ? "My Requirements" : "Requirements Review", addForm)}
            ${panel("Requirement Records", table(["Student", "Requirement", "Status", "Date"], rows))}
        `;
    }

    function renderStudentAttendance(account) {
        const records = visibleAttendance(account, "student").slice().reverse();
        const hours = totalHours(records);

        const rows = records.map(record => [
            escapeHTML(formatDate(record.date)),
            escapeHTML(record.timeIn || "—"),
            escapeHTML(record.timeOut || "—"),
            `${Number(record.hours || 0).toFixed(2)} hrs`,
            statusBadge(record.timeOut ? "Completed" : "Timed In")
        ]);

        return `
            <div class="qr-layout">
                <section class="qr-card">
                    <h3>QR Code</h3>
                    <p>Show this code to your supervisor to record attendance.</p>

                    <div id="student-qr" class="qr-code-box">
                        <span class="muted">Generating QR code...</span>
                    </div>

                    <div class="qr-id">${escapeHTML(account.id)}</div>
                    <p>${escapeHTML(account.name)}</p>

                    <button id="download-qr" class="secondary-btn" type="button">
                        Download QR Code
                    </button>

                    <p id="qr-message" class="form-message"></p>
                </section>

                <section class="panel">
                    <div class="panel-header">
                        <div>
                            <h3>Rendered Hours</h3>
                            <p>Hours completed from your attendance records.</p>
                        </div>
                    </div>

                    ${progressMarkup(hours)}

                    <div class="info-grid" style="margin-top:16px">
                        <div class="info-card">
                            <span>Rendered Hours</span>
                            <strong>${hours.toFixed(2)} hrs</strong>
                        </div>

                        <div class="info-card">
                            <span>Records</span>
                            <strong>${records.length}</strong>
                        </div>
                    </div>
                </section>
            </div>

            ${panel(
                "Attendance Records",
                table(["Date", "Time In", "Time Out", "Hours", "Status"], rows)
            )}
        `;
    }

    function renderAttendance(account, role) {
        if (role === "student") {
            return renderStudentAttendance(account);
        }

        const records = visibleAttendance(account, role).slice().reverse();

        const rows = records.map(record => [
            escapeHTML(record.studentName),
            escapeHTML(formatDate(record.date)),
            escapeHTML(record.timeIn || "—"),
            escapeHTML(record.timeOut || "—"),
            `${Number(record.hours || 0).toFixed(2)} hrs`,
            statusBadge(record.timeOut ? "Completed" : "Timed In")
        ]);

        return `
            <div class="notice">
                <strong>Attendance:</strong>
                Use Scan QR Attendance to record student time in and time out.
            </div>

            <div class="card-grid">
                ${statCard("Total Records", records.length, "◷", "Visible attendance records")}
                ${statCard("Rendered Hours", totalHours(records).toFixed(2), "⌛", "Completed hours")}
                ${statCard("Completed", records.filter(item => item.timeOut).length, "✓", "Time out recorded")}
                ${statCard("In Progress", records.filter(item => !item.timeOut).length, "◴", "Waiting for time out")}
            </div>

            ${panel(
                "Attendance Records",
                table(["Student", "Date", "Time In", "Time Out", "Hours", "Status"], rows)
            )}
        `;
    }

    function renderMyQR(account, role) {
        if (role !== "student") {
            return emptyState("Access restricted", "Only student accounts can display a student QR code.");
        }

        return `
            <div class="qr-layout">
                <section class="qr-card">
                    <h3>Student Identification</h3>
                    <p>This QR code contains your InternTrack student ID.</p>

                    <div id="student-qr" class="qr-code-box">
                        <span class="muted">Generating QR code...</span>
                    </div>

                    <div class="qr-id">${escapeHTML(account.id)}</div>
                    <p>${escapeHTML(account.name)}</p>

                    <button id="download-qr" class="secondary-btn" type="button">
                        Download QR Code
                    </button>

                    <p id="qr-message" class="form-message"></p>
                </section>

                <section class="panel">
                    <div class="panel-header">
                        <h3>How to Use Your QR Code</h3>
                    </div>

                    <div class="list-stack">
                        <div class="list-item">
                            <div>
                                <strong>1. Open your QR Code</strong>
                                <p>Go to Attendance in the sidebar.</p>
                            </div>
                        </div>

                        <div class="list-item">
                            <div>
                                <strong>2. Show it to your supervisor</strong>
                                <p>Keep your screen bright so the camera can read the code.</p>
                            </div>
                        </div>

                        <div class="list-item">
                            <div>
                                <strong>3. Confirm your attendance</strong>
                                <p>Your supervisor scans the code to record time in and time out.</p>
                            </div>
                        </div>
                    </div>

                    <div class="notice" style="margin-top:18px">
                        <strong>Important:</strong>
                        Your QR code identifies your account. Attendance is saved in the browser used by this demo.
                    </div>
                </section>
            </div>`;
    }

    function renderScanner(account, role) {
        if (role !== "supervisor") {
            return emptyState("Access restricted", "Only supervisor accounts can use the QR attendance scanner.");
        }

        return `
            <div class="notice">
                <strong>How it works:</strong>
                First scan records Time In. The second scan records Time Out.
                Rendered hours are calculated after Time Out.
            </div>

            <div class="qr-layout">
                <section class="panel">
                    <div class="panel-header">
                        <div>
                            <h3>Camera Scanner</h3>
                            <p>Allow camera access when your browser asks.</p>
                        </div>
                    </div>

                    <div id="qr-reader" class="scanner-box"></div>

                    <div class="scanner-actions">
                        <button id="start-scanner" class="primary-btn" type="button">
                            Start Camera
                        </button>

                        <button id="stop-scanner" class="secondary-btn" type="button" disabled>
                            Stop Camera
                        </button>
                    </div>

                    <div id="scan-status" class="scanner-status">
                        Press Start Camera to begin scanning.
                    </div>
                </section>

                <section class="panel">
                    <div class="panel-header">
                        <h3>Scan Result</h3>
                    </div>

                    <div id="scan-result">
                        ${emptyState("Waiting for scan", "The student's information will appear here after a successful scan.", "▦")}
                    </div>

                    <div class="notice" style="margin-top:18px">
                        The camera usually works on HTTPS or localhost. If permission is denied, check your browser's camera settings.
                    </div>
                </section>
            </div>`;
    }

    function renderDocuments() {
        return panel(
            "Documents",
            `
            <div class="notice">
                This section is ready for internship documents such as forms, reports, and certificates.
            </div>

            ${emptyState("No documents added", "Document upload and storage have not been connected in this local demo.")}
            `
        );
    }

    function renderEvaluation(account, role) {
        if (role === "student") {
            const feedback = readJSON(KEYS.feedback, []);

            const mine = Array.isArray(feedback)
                ? feedback.filter(item => String(item.studentId) === String(account.id))
                : [];

            return `
                ${panel(
                    "Evaluation",
                    `
                    <div class="info-grid">
                        <div class="info-card">
                            <span>Student</span>
                            <strong>${escapeHTML(account.name)}</strong>
                        </div>

                        <div class="info-card">
                            <span>Evaluation Status</span>
                            <strong>${statusBadge("Pending")}</strong>
                        </div>
                    </div>

                    <p class="muted">
                        Your evaluation results will appear here when your supervisor records them.
                    </p>
                    `
                )}

                ${panel(
                    "Feedback",
                    mine.length
                        ? `<div class="list-stack">${mine.map(item => `
                            <div class="list-item">
                                <div>
                                    <strong>${escapeHTML(item.title || "Feedback")}</strong>
                                    <p>${escapeHTML(item.message || "")}</p>
                                </div>
                                <span class="muted">${escapeHTML(item.date || "")}</span>
                            </div>
                        `).join("")}</div>`
                        : emptyState("No feedback yet", "Feedback from your supervisor will appear here.", "★")
                )}
            `;
        }

        const students = loadAccounts().filter(item => item.role === "student");

        const rows = students.map(student => [
            escapeHTML(student.name),
            escapeHTML(student.id),
            statusBadge("Pending")
        ]);

        return panel(
            role === "supervisor" ? "Intern Evaluations" : "Evaluation Overview",
            table(["Student", "Student ID", "Evaluation Status"], rows)
        );
    }

    function renderNotifications(account, role) {
        const notifications = readJSON(KEYS.notifications, []);

        const visible = Array.isArray(notifications)
            ? notifications.filter(item => !item.role || item.role === role)
            : [];

        return panel(
            "Notifications",
            visible.length
                ? `<div class="list-stack">${visible.map(item => `
                    <div class="list-item">
                        <div>
                            <strong>${escapeHTML(item.title || "Notification")}</strong>
                            <p>${escapeHTML(item.message || "")}</p>
                        </div>
                        <span class="muted">${escapeHTML(item.date || "")}</span>
                    </div>
                `).join("")}</div>`
                : emptyState("No notifications yet", "Updates and reminders will appear here.", "♧")
        );
    }

    function renderInterns() {
        const students = loadAccounts().filter(account => account.role === "student");

        const rows = students.map(student => {
            const records = getAttendance().filter(item => String(item.studentId) === String(student.id));

            return [
                escapeHTML(student.name),
                escapeHTML(student.id),
                `${totalHours(records).toFixed(2)} hrs`,
                statusBadge(records.length ? "In Progress" : "Pending")
            ];
        });

        return panel(
            "Registered Student Interns",
            table(["Student Name", "Student ID", "Rendered Hours", "Status"], rows),
            "Student accounts registered in this demo."
        );
    }

    function renderStudents() {
        const students = loadAccounts().filter(account => account.role === "student");

        const rows = students.map(student => [
            escapeHTML(student.name),
            escapeHTML(student.id),
            statusBadge("Active")
        ]);

        return panel(
            "Student Directory",
            table(["Full Name", "Student ID", "Status"], rows)
        );
    }

    function renderCompanies() {
        return panel(
            "Company Directory",
            emptyState("No company records", "Company registration and management have not been connected yet.")
        );
    }

    function renderProgress(account, role) {
        if (role === "student") {
            const records = visibleAttendance(account, "student");
            const hours = totalHours(records);

            const rows = records.slice().reverse().map(record => [
                escapeHTML(formatDate(record.date)),
                escapeHTML(record.timeIn || "—"),
                escapeHTML(record.timeOut || "—"),
                `${Number(record.hours || 0).toFixed(2)} hrs`
            ]);

            return `
                ${panel("Internship Progress", progressMarkup(hours))}

                <div class="card-grid">
                    ${statCard("Rendered Hours", hours.toFixed(2), "⌛", "Completed hours")}
                    ${statCard("Remaining Hours", Math.max(0, REQUIRED_HOURS - hours).toFixed(2), "◴", "Hours left to complete")}
                    ${statCard("Attendance Records", records.length, "◷", "Saved attendance")}
                    ${statCard("Required Hours", REQUIRED_HOURS, "★", "Internship requirement")}
                </div>

                ${panel(
                    "Hours from Attendance",
                    table(["Date", "Time In", "Time Out", "Hours"], rows)
                )}
            `;
        }

        const students = loadAccounts().filter(item => item.role === "student");

        const rows = students.map(student => {
            const records = getAttendance().filter(item => String(item.studentId) === String(student.id));
            const hours = totalHours(records);

            return [
                escapeHTML(student.name),
                escapeHTML(student.id),
                `${hours.toFixed(2)} hrs`,
                statusBadge(hours > 0 ? "In Progress" : "Pending")
            ];
        });

        return panel(
            "Internship Progress",
            table(["Student", "ID Number", "Rendered Hours", "Progress"], rows)
        );
    }

    function renderReports() {
        const records = getAttendance();
        const students = loadAccounts().filter(account => account.role === "student");

        const rows = students.map(student => {
            const ownRecords = records.filter(item => String(item.studentId) === String(student.id));

            return [
                escapeHTML(student.name),
                escapeHTML(student.id),
                ownRecords.length,
                `${totalHours(ownRecords).toFixed(2)} hrs`,
                ownRecords.filter(item => item.timeOut).length
            ];
        });

        return `
            <div class="card-grid">
                ${statCard("Total Students", students.length, "♙", "Registered student accounts")}
                ${statCard("Attendance Records", records.length, "◷", "All recorded attendance")}
                ${statCard("Rendered Hours", totalHours(records).toFixed(2), "⌛", "Completed hours")}
                ${statCard("Completed Sessions", records.filter(item => item.timeOut).length, "✓", "Time out recorded")}
            </div>

            ${panel(
                "Student Attendance Summary",
                table(["Student", "ID Number", "Records", "Hours", "Completed Sessions"], rows)
            )}
        `;
    }

    function setScanStatus(message, type = "") {
        const status = $("#scan-status");
        if (!status) return;

        status.textContent = message;
        status.className = "scanner-status" + (type ? " " + type : "");
    }

    function renderScanResult(record, message) {
        const container = $("#scan-result");
        if (!container) return;

        container.innerHTML = `
            <div class="info-grid">
                <div class="info-card">
                    <span>Student Name</span>
                    <strong>${escapeHTML(record.studentName)}</strong>
                </div>

                <div class="info-card">
                    <span>Student ID</span>
                    <strong>${escapeHTML(record.studentId)}</strong>
                </div>

                <div class="info-card">
                    <span>Date</span>
                    <strong>${escapeHTML(formatDate(record.date))}</strong>
                </div>

                <div class="info-card">
                    <span>Time In</span>
                    <strong>${escapeHTML(record.timeIn || "—")}</strong>
                </div>

                <div class="info-card">
                    <span>Time Out</span>
                    <strong>${escapeHTML(record.timeOut || "—")}</strong>
                </div>

                <div class="info-card">
                    <span>Rendered Hours</span>
                    <strong>${Number(record.hours || 0).toFixed(2)} hrs</strong>
                </div>
            </div>

            <div class="notice" style="margin-top:16px">
                ${escapeHTML(message)}
            </div>`;
    }

    function handleStudentScan(decodedText, supervisor) {
        if (scannerBusy) return;

        scannerBusy = true;

        try {
            let payload;

            try {
                payload = JSON.parse(decodedText);
            } catch (error) {
                setScanStatus("Invalid QR code. Please scan an InternTrack student QR code.", "error");
                return;
            }

            if (
                !payload ||
                payload.app !== "InternTrack" ||
                payload.type !== "student" ||
                !payload.id
            ) {
                setScanStatus("This QR code is not a valid InternTrack student code.", "error");
                return;
            }

            const student = loadAccounts().find(item =>
                String(item.id) === String(payload.id) && item.role === "student"
            );

            if (!student) {
                setScanStatus("Student account not found. Ask the student to verify their registered account.", "error");
                return;
            }

            const records = getAttendance();
            const today = todayString();

            let record = records.find(item =>
                String(item.studentId) === String(student.id) && item.date === today
            );

            let message;

            if (!record) {
                record = {
                    studentId: String(student.id),
                    studentName: student.name,
                    date: today,
                    timeIn: timeString(),
                    timeOut: "",
                    hours: 0,
                    supervisorId: String(supervisor.id),
                    supervisorName: supervisor.name
                };

                records.push(record);
                message = "Time In recorded successfully.";

            } else if (record.timeIn && !record.timeOut) {
                record.timeOut = timeString();
                record.hours = hoursBetween(record.timeIn, record.timeOut);
                record.supervisorId = String(supervisor.id);
                record.supervisorName = supervisor.name;

                message = `Time Out recorded. Rendered hours: ${record.hours.toFixed(2)}.`;

            } else {
                setScanStatus("Attendance for this student is already complete today.", "error");
                renderScanResult(record, "This student already has a Time In and Time Out record for today.");
                return;
            }

            saveAttendance(records);
            setScanStatus(message, "success");
            renderScanResult(record, message);

        } finally {
            window.setTimeout(() => {
                scannerBusy = false;
            }, 1200);
        }
    }

    async function startScanner(account) {
        if (getRole(account) !== "supervisor") {
            setScanStatus("Only supervisors can start the attendance scanner.", "error");
            return;
        }

        if (scannerStarting || activeScanner) return;

        if (!window.Html5Qrcode) {
            setScanStatus("The QR scanner library did not load. Check your internet connection and reload the page.", "error");
            return;
        }

        scannerStarting = true;

        scannerStartButton = $("#start-scanner");
        scannerStopButton = $("#stop-scanner");

        if (scannerStartButton) scannerStartButton.disabled = true;

        try {
            activeScanner = new Html5Qrcode("qr-reader");

            setScanStatus("Starting camera. Please allow camera permission.");

            await activeScanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 240, height: 240 },
                    aspectRatio: 1
                },
                decodedText => handleStudentScan(decodedText, account),
                () => {}
            );

            if (scannerStopButton) scannerStopButton.disabled = false;

            setScanStatus("Camera is active. Point it at a student's QR code.", "success");

        } catch (error) {
            console.error("Camera start failed:", error);

            if (activeScanner) {
                try {
                    await activeScanner.clear();
                } catch (clearError) {
                    console.warn(clearError);
                }
            }

            activeScanner = null;

            setScanStatus("Unable to start camera. Allow camera access and use HTTPS or localhost.", "error");

        } finally {
            scannerStarting = false;

            if (scannerStartButton) {
                scannerStartButton.disabled = Boolean(activeScanner);
            }
        }
    }

    async function stopScanner() {
        if (!activeScanner) {
            if (scannerStopButton) scannerStopButton.disabled = true;
            if (scannerStartButton) scannerStartButton.disabled = false;
            return;
        }

        const scanner = activeScanner;
        activeScanner = null;

        try {
            if (scanner.isScanning) {
                await scanner.stop();
            }
        } catch (error) {
            console.warn("Unable to stop scanner cleanly:", error);
        }

        try {
            await scanner.clear();
        } catch (error) {
            console.warn("Unable to clear scanner:", error);
        }

        if (scannerStopButton) scannerStopButton.disabled = true;
        if (scannerStartButton) scannerStartButton.disabled = false;

        if ($("#scan-status")) {
            setScanStatus("Camera stopped. Press Start Camera to scan again.");
        }
    }

    function generateStudentQR(account) {
        const container = $("#student-qr");
        if (!container) return;

        container.innerHTML = "";

        if (!window.QRCode) {
            container.innerHTML = '<span class="muted">QR library unavailable. Check your internet connection.</span>';
            return;
        }

        const payload = JSON.stringify({
            app: "InternTrack",
            type: "student",
            id: String(account.id)
        });

        new QRCode(container, {
            text: payload,
            width: 220,
            height: 220,
            colorDark: "#171717",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    function bindPageActions(pageId, account, role) {
        if ((pageId === "my-qr" || pageId === "attendance") && role === "student") {
            generateStudentQR(account);

            const downloadButton = $("#download-qr");

            if (downloadButton) {
                downloadButton.addEventListener("click", () => {
                    const container = $("#student-qr");
                    const image = container && container.querySelector("img");
                    const canvas = container && container.querySelector("canvas");

                    let url = "";

                    if (image && image.src) {
                        url = image.src;
                    } else if (canvas) {
                        url = canvas.toDataURL("image/png");
                    }

                    if (!url) {
                        setMessage("#qr-message", "QR code is not ready yet.", "error");
                        return;
                    }

                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `InternTrack-QR-${account.id}.png`;

                    document.body.appendChild(link);
                    link.click();
                    link.remove();

                    setMessage("#qr-message", "QR code download started.", "success");
                });
            }
        }

        if (pageId === "scan-attendance" && role === "supervisor") {
            const startButton = $("#start-scanner");
            const stopButton = $("#stop-scanner");

            scannerStartButton = startButton;
            scannerStopButton = stopButton;

            if (startButton) {
                startButton.addEventListener("click", () => startScanner(account));
            }

            if (stopButton) {
                stopButton.addEventListener("click", stopScanner);
            }
        }

        if (pageId === "tasks" && role === "student") {
            document.querySelectorAll(".task-submit-form").forEach(form => {
                form.addEventListener("submit", event => {
                    event.preventDefault();

                    const taskId = form.dataset.taskId;
                    const noteField = form.querySelector("textarea");
                    const note = noteField ? noteField.value.trim() : "";

                    if (!taskId || !note) return;

                    const records = readJSON(KEYS.submissions, []);
                    const list = Array.isArray(records) ? records : [];

                    const existing = list.find(item =>
                        String(item.studentId) === String(account.id) && item.taskId === taskId
                    );

                    if (existing) {
                        existing.note = note;
                        existing.date = todayString();
                    } else {
                        list.push({
                            taskId,
                            studentId: String(account.id),
                            studentName: account.name,
                            note,
                            date: todayString()
                        });
                    }

                    saveJSON(KEYS.submissions, list);
                    showPage("tasks");
                });
            });
        }

        if (pageId === "requirements") {
            const studentForm = $("#requirement-form");

            if (studentForm && role === "student") {
                studentForm.addEventListener("submit", event => {
                    event.preventDefault();

                    const name = $("#requirement-name").value.trim();
                    if (!name) return;

                    const records = readJSON(KEYS.requirements, []);

                    records.push({
                        studentId: String(account.id),
                        studentName: account.name,
                        name,
                        status: "Pending",
                        date: todayString()
                    });

                    saveJSON(KEYS.requirements, records);
                    showPage("requirements");
                });
            }

            const reviewForm = $("#requirement-review-form");

            if (reviewForm && (role === "supervisor" || role === "coordinator")) {
                reviewForm.addEventListener("submit", event => {
                    event.preventDefault();

                    const studentId = $("#review-student-id").value.trim();
                    const name = $("#review-requirement-name").value.trim();
                    const status = $("#review-status").value;

                    const student = loadAccounts().find(item =>
                        String(item.id) === studentId && item.role === "student"
                    );

                    if (!student) {
                        alert("Student ID not found. Please enter a registered student ID.");
                        return;
                    }

                    const records = readJSON(KEYS.requirements, []);

                    const existing = records.find(item =>
                        String(item.studentId) === studentId &&
                        item.name.toLowerCase() === name.toLowerCase()
                    );

                    if (existing) {
                        existing.status = status;
                        existing.date = todayString();
                    } else {
                        records.push({
                            studentId,
                            studentName: student.name,
                            name,
                            status,
                            date: todayString()
                        });
                    }

                    saveJSON(KEYS.requirements, records);
                    showPage("requirements");
                });
            }
        }
    }

    function initLogin() {
        $("#login-form").addEventListener("submit", event => {
            event.preventDefault();
            clearMessage("#login-message");

            const id = $("#login-id").value.trim();
            const password = $("#login-password").value;

            const account = loadAccounts().find(item =>
                String(item.id) === id && item.password === password
            );

            if (!account) {
                setMessage("#login-message", "Incorrect ID number or password.");
                return;
            }

            if (!menus[account.role]) {
                setMessage("#login-message", "This account has an invalid role.");
                return;
            }

            signIn(account);
        });
    }

    function initRegister() {
        $("#register-form").addEventListener("submit", event => {
            event.preventDefault();
            clearMessage("#register-message");

            const name = $("#register-name").value.trim();
            const id = $("#register-id").value.trim();
            const role = $("#register-role").value;
            const password = $("#register-password").value;
            const confirm = $("#register-confirm").value;

            if (name.length < 2) {
                setMessage("#register-message", "Please enter your complete name.");
                return;
            }

            if (id.length < 5) {
                setMessage("#register-message", "ID number must contain at least 5 characters.");
                return;
            }

            if (password.length < 6) {
                setMessage("#register-message", "Password must contain at least 6 characters.");
                return;
            }

            if (password !== confirm) {
                setMessage("#register-message", "Passwords do not match.");
                return;
            }

            if (!menus[role]) {
                setMessage("#register-message", "Please choose a valid account role.");
                return;
            }

            const accounts = loadAccounts();

            if (accounts.some(item => String(item.id) === id)) {
                setMessage("#register-message", "An account with this ID number already exists.");
                return;
            }

            const account = { name, id, role, password };

            accounts.push(account);
            saveAccounts(accounts);

            $("#register-form").reset();

            setMessage(
                "#register-message",
                "Account created successfully. You can now sign in.",
                "success"
            );
        });
    }

    function initForgotPassword() {
        $("#forgot-form").addEventListener("submit", event => {
            event.preventDefault();
            clearMessage("#forgot-message");

            const id = $("#forgot-id").value.trim();
            const password = $("#forgot-password").value;
            const confirm = $("#forgot-confirm").value;

            if (password.length < 6) {
                setMessage("#forgot-message", "New password must contain at least 6 characters.");
                return;
            }

            if (password !== confirm) {
                setMessage("#forgot-message", "Passwords do not match.");
                return;
            }

            const accounts = loadAccounts();
            const account = accounts.find(item => String(item.id) === id);

            if (!account) {
                setMessage("#forgot-message", "No account was found with this ID number.");
                return;
            }

            account.password = password;
            saveAccounts(accounts);

            $("#forgot-form").reset();

            setMessage(
                "#forgot-message",
                "Password updated. You can now sign in.",
                "success"
            );
        });
    }

    function initNavigation() {
        $("#show-register").addEventListener("click", () => {
            clearMessage("#register-message");
            showOnly("register-page");
        });

        $("#show-login").addEventListener("click", () => {
            clearMessage("#login-message");
            showOnly("login-page");
        });

        $("#show-forgot").addEventListener("click", () => {
            clearMessage("#forgot-message");
            showOnly("forgot-page");
        });

        $("#forgot-back").addEventListener("click", () => {
            clearMessage("#login-message");
            showOnly("login-page");
        });

        $("#logout-btn").addEventListener("click", signOut);
        $("#theme-toggle").addEventListener("click", toggleTheme);

        const studentTheme = $("#student-theme-toggle");

        if (studentTheme) {
            studentTheme.addEventListener("click", event => {
                event.stopPropagation();
                toggleTheme();
            });
        }

        const userToggle = $("#sidebar-user-toggle");

        if (userToggle) {
            userToggle.addEventListener("click", toggleStudentMenu);
        }

        document.querySelectorAll("[data-quick-page]").forEach(button => {
            button.addEventListener("click", () => showPage(button.dataset.quickPage));
        });

        document.addEventListener("click", event => {
            const wrap = $(".sidebar-user-wrap");

            if (!wrap || wrap.contains(event.target)) return;

            closeStudentMenu();
        });
    }

    function init() {
        applyTheme();
        initLogin();
        initRegister();
        initForgotPassword();
        initNavigation();

        const isLoggedIn = localStorage.getItem(KEYS.session) === "true";
        const account = getCurrentAccount();

        if (isLoggedIn && account && menus[account.role]) {
            signIn(account);
        } else {
            localStorage.removeItem(KEYS.session);
            localStorage.removeItem(KEYS.current);
            showOnly("login-page");
        }
    }
    
    document.addEventListener("DOMContentLoaded", init);
})();
