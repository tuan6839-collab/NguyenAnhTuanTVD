// ==================== INITIAL DATA & STATE ====================
const DEFAULT_SUBMISSIONS = [
    { name: "Nguyễn Diệu", exam: "Kiểm tra Thường xuyên 2 · 12.2TVD", status: "Đã nộp", score: 5.21, date: "22-10", warnings: 0 },
    { name: "Huỳnh Thị Kim Minh", exam: "Kiểm tra Thường xuyên 2 · 12.6TVD", status: "Đã nộp", score: 7.00, date: "18-10", warnings: 0 },
    { name: "Nguyễn thị tiến Giang", exam: "Kiểm tra Thường xuyên 2 · 12.6TVD", status: "Đã nộp", score: 7.46, date: "16-10", warnings: 0 },
    { name: "Haz Hu", exam: "Kiểm tra Thường xuyên 2 · 12.6TVD", status: "Đã nộp", score: 0.00, date: "16-10", warnings: 0 },
    { name: "NGUYỄN HOÀNG ÁNH DƯƠNG", exam: "Kiểm tra Thường xuyên 2 · 12.2TVD", status: "Đã nộp", score: 7.86, date: "15-10", warnings: 0 },
    { name: "Nguyễn Thị Thanh Thảo", exam: "Kiểm tra Thường xuyên 2 · 12.2TVD", status: "Đã nộp", score: 4.75, date: "15-10", warnings: 2 },
    { name: "Võ Hoàng Ngọc Ngân", exam: "Kiểm tra Thường xuyên 2 · 12.2TVD", status: "Đã nộp", score: 5.54, date: "15-10", warnings: 0 },
    { name: "Trần Huyền Diệu", exam: "Kiểm tra Thường xuyên 2 · 12.2TVD", status: "Đã nộp", score: 7.14, date: "14-10", warnings: 0 },
    { name: "pham thu trang", exam: "Kiểm tra Thường xuyên 2 · 12.2TVD", status: "Đã nộp", score: 7.11, date: "14-10", warnings: 0 },
    { name: "Huỳnh Thị Kim Minh", exam: "Kiểm tra Thường xuyên 2 · 12.6TVD", status: "Đã nộp", score: 6.61, date: "14-10", warnings: 0 }
];

const DEFAULT_EXAMS = [
    {
        code: "TOAN12",
        title: "Kiểm tra Thường xuyên 2 - Giải tích & Hình học 12",
        duration: 45,
        createdAt: "14-10-2026",
        questions: [
            {
                q: "Cho hàm số $y = \frac{2x - 1}{x - 2}$. Tiệm cận đứng của đồ thị hàm số đã cho là đường thẳng có phương trình:",
                options: ["$x = 2$", "$y = 2$", "$x = -2$", "$y = \frac{1}{2}$"],
                answer: 0
            },
            {
                q: "Tìm tập nghiệm $S$ của bất phương trình $\log_2(x - 1) < 3$.",
                options: ["$S = (-\infty; 9)$", "$S = (1; 9)$", "$S = (1; 7)$", "$S = (0; 9)$"],
                answer: 1
            },
            {
                q: "Trong không gian $Oxyz$, cho mặt phẳng $(P): 2x - y + 3z - 5 = 0$. Vectơ nào dưới đây là một vectơ pháp tuyến của $(P)$?",
                options: ["$\vec{n}_1 = (2; 1; 3)$", "$\vec{n}_2 = (-2; -1; 3)$", "$\vec{n}_3 = (2; -1; 3)$", "$\vec{n}_4 = (2; -1; -5)$"],
                answer: 2
            },
            {
                q: "Tính tích phân $I = \int_0^1 e^{2x}\,dx$.",
                options: ["$I = \frac{e^2 - 1}{2}$", "$I = e^2 - 1$", "$I = \frac{e^2 + 1}{2}$", "$I = 2(e^2 - 1)$"],
                answer: 0
            },
            {
                q: "Cho khối chóp $S.ABC$ có đáy $ABC$ là tam giác vuông tại $B$, $AB = a$, $BC = 2a$, cạnh bên $SA$ vuông góc với đáy và $SA = 3a$. Thể tích khối chóp $S.ABC$ bằng:",
                options: ["$6a^3$", "$2a^3$", "$a^3$", "$3a^3$"],
                answer: 2
            }
        ]
    }
];

const DEFAULT_CLASSES = [
    { name: "12.2TVD", students: 42, avgScore: 6.85 },
    { name: "12.6TVD", students: 40, avgScore: 6.42 }
];

// State loaded from localStorage
let submissions = JSON.parse(localStorage.getItem('matht_submissions')) || DEFAULT_SUBMISSIONS;
let exams = JSON.parse(localStorage.getItem('matht_exams')) || DEFAULT_EXAMS;
let classes = JSON.parse(localStorage.getItem('matht_classes')) || DEFAULT_CLASSES;
let currentUser = JSON.parse(localStorage.getItem('matht_user')) || null;

// Active Exam Session State
let activeExam = null;
let studentAnswers = {};
let examTimerInterval = null;
let timeRemaining = 0;
let tabViolations = 0;
let currentStudentInfo = { name: "", className: "" };

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
    renderMath();
    renderRecentActivities();
    renderExamsGrid();
    renderClassesList();
    renderQuestionBank();
    renderLatexPreview();
    initActivityChart();
    init3DCanvas();

    if (currentUser) {
        updateUserProfileUI();
    }
});

function renderMath(el = document.body) {
    if (window.renderMathInElement) {
        renderMathInElement(el, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false }
            ],
            throwOnError: false
        });
    }
}

// ==================== VIEW NAVIGATION ====================
function showView(viewName) {
    document.getElementById('view-landing').classList.add('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-exam-room').classList.add('hidden');

    document.getElementById(`view-${viewName}`).classList.remove('hidden');
    window.scrollTo(0, 0);
}

function switchDashboardTab(tabName) {
    document.querySelectorAll('.dash-tab').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.dash-nav-btn').forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.remove('hidden');

    const targetNav = document.getElementById(`nav-${tabName}`);
    if (targetNav) targetNav.classList.add('active');

    const titles = {
        overview: "Tổng quan",
        guide: "Hướng dẫn sử dụng",
        classes: "Lớp học",
        exams: "Đề của tôi",
        shuffle: "Trộn đề",
        convert: "Convert iMath-Tex to Word",
        geometry3d: "Hình không gian",
        bank: "Ngân hàng của tôi",
        "public-bank": "Kho đề cộng đồng",
        plan: "Gói của tôi",
        support: "Báo lỗi & góp ý"
    };
    document.getElementById('breadcrumb-current').textContent = titles[tabName] || "Tổng quan";

    // Close mobile sidebar if open
    document.getElementById('sidebar').classList.add('-translate-x-full');
    renderMath();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

function quickOpenTool(toolTab) {
    if (!currentUser) {
        currentUser = { name: "Nguyễn Văn Trường", email: "truongtamson123@gmail.com", role: "teacher" };
        updateUserProfileUI();
    }
    showView('dashboard');
    switchDashboardTab(toolTab);
}

// ==================== AUTH MODAL & LOGIN ====================
function openAuthModal(mode = 'login') {
    document.getElementById('auth-modal').classList.remove('hidden');
    if (mode === 'exam-code') {
        switchAuthTab('exam');
    } else if (mode === 'register') {
        switchAuthTab('register');
    } else {
        switchAuthTab('login');
    }
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function switchAuthTab(tab) {
    const formLogin = document.getElementById('form-login');
    const formExam = document.getElementById('form-exam-now');
    const formReg = document.getElementById('form-register');
    const tabExam = document.getElementById('tab-exam-now');
    const tabLogin = document.getElementById('tab-login-now');
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');

    formLogin.classList.add('hidden');
    formExam.classList.add('hidden');
    formReg.classList.add('hidden');

    tabExam.className = "py-2.5 px-4 rounded-xl text-sm font-semibold text-indigo-500 flex items-center justify-center gap-2 transition cursor-pointer";
    tabLogin.className = "py-2.5 px-4 rounded-xl text-sm font-semibold text-indigo-500 flex items-center justify-center gap-2 transition cursor-pointer";

    if (tab === 'exam') {
        formExam.classList.remove('hidden');
        tabExam.className = "py-2.5 px-4 rounded-xl text-sm font-bold text-indigo-700 bg-white shadow-xs flex items-center justify-center gap-2 transition cursor-pointer";
        title.textContent = "Vào phòng thi";
        subtitle.textContent = "Nhập mã đề giáo viên cung cấp";
    } else if (tab === 'register') {
        formReg.classList.remove('hidden');
        title.textContent = "Đăng ký tài khoản";
        subtitle.textContent = "Tạo tài khoản Math.T miễn phí";
    } else {
        formLogin.classList.remove('hidden');
        tabLogin.className = "py-2.5 px-4 rounded-xl text-sm font-bold text-indigo-700 bg-white shadow-xs flex items-center justify-center gap-2 transition cursor-pointer";
        title.textContent = "Đăng nhập";
        subtitle.textContent = "Chào mừng trở lại";
    }
}

function togglePasswordVisibility() {
    const pwd = document.getElementById('login-password');
    const icon = document.getElementById('eye-icon');
    if (pwd.type === 'password') {
        pwd.type = 'text';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    } else {
        pwd.type = 'password';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    }
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const displayName = email === "truongtamson123@gmail.com" ? "Nguyễn Văn Trường" : email.split('@')[0];
    currentUser = { name: displayName, email: email, role: "teacher" };
    localStorage.setItem('matht_user', JSON.stringify(currentUser));
    updateUserProfileUI();
    closeAuthModal();
    showView('dashboard');
    switchDashboardTab('overview');
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const role = document.getElementById('reg-role').value;
    currentUser = { name, email, role };
    localStorage.setItem('matht_user', JSON.stringify(currentUser));
    updateUserProfileUI();
    closeAuthModal();
    if (role === 'student') {
        switchAuthTab('exam');
        openAuthModal('exam-code');
    } else {
        showView('dashboard');
    }
}

function updateUserProfileUI() {
    if (!currentUser) return;
    document.getElementById('user-display-name').textContent = currentUser.name;
    document.getElementById('user-display-email').textContent = currentUser.email;
}

function logout() {
    currentUser = null;
    localStorage.removeItem('matht_user');
    showView('landing');
}

// ==================== DASHBOARD RENDERING ====================
function renderRecentActivities() {
    const container = document.getElementById('recent-activity-list');
    container.innerHTML = submissions.map(item => {
        const isLow = item.score < 5.0;
        const scoreColor = isLow ? "text-rose-600" : "text-slate-800";
        const warningTag = item.warnings > 0
            ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold ml-1.5"><i class="fa-solid fa-triangle-exclamation text-amber-500"></i> ${item.warnings}</span>`
            : "";

        return `
            <div class="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-2 rounded-lg transition">
                <div class="min-w-0">
                    <div class="text-sm font-bold text-slate-800 truncate flex items-center">
                        ${item.name} ${warningTag}
                    </div>
                    <div class="text-xs text-slate-400 truncate mt-0.5">${item.exam}</div>
                </div>
                <div class="flex items-center gap-6 shrink-0">
                    <span class="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ${item.status}
                    </span>
                    <div class="text-right w-16">
                        <span class="text-sm font-extrabold ${scoreColor}">${item.score.toString().replace('.', ',')}</span><span class="text-xs text-slate-400">/10</span>
                    </div>
                    <div class="text-xs text-slate-400 w-12 text-right">${item.date} ›</div>
                </div>
            </div>
        `;
    }).join('');

    // Update total attempts counter
    document.getElementById('stat-total-attempts').textContent = `${41 + submissions.length} lượt thi tổng cộng`;
}

function initActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['01/11', '04/11', '07/11', '10/11', '13/11', '15/11', '17/11'],
            datasets: [{
                label: 'Lượt thi',
                data: [0, 1, 0, 0, 2, 0, 1],
                backgroundColor: '#10b981',
                borderRadius: 6,
                barThickness: 18
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false }, ticks: { font: { size: 11 } } }
            }
        }
    });
}

// ==================== MY EXAMS & CREATE EXAM ====================
function renderExamsGrid() {
    const grid = document.getElementById('exams-grid');
    grid.innerHTML = exams.map(ex => `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between gap-2 mb-2">
                    <span class="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono font-bold text-xs rounded-lg">Mã đề: ${ex.code}</span>
                    <span class="text-xs text-slate-400">${ex.questions.length} câu · ${ex.duration} phút</span>
                </div>
                <h3 class="font-bold text-slate-900 text-base">${ex.title}</h3>
                <p class="text-xs text-slate-400 mt-1">Ngày tạo: ${ex.createdAt}</p>
            </div>
            <div class="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100">
                <button onclick="copyExamShareLink('${ex.code}')" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">
                    <i class="fa-regular fa-copy mr-1"></i> Copy mã đề
                </button>
                <button onclick="startExamSimulation('${ex.code}', 'Học sinh Test', '12.2TVD')" class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer">
                    <i class="fa-solid fa-play mr-1"></i> Vào thi thử
                </button>
            </div>
        </div>
    `).join('');
}

function copyExamShareLink(code) {
    navigator.clipboard?.writeText(code);
    alert(`Đã sao chép mã đề "${code}"! Hãy gửi mã này cho học sinh để vào thi.`);
}

function openCreateExamModal() {
    document.getElementById('create-exam-modal').classList.remove('hidden');
}

function closeCreateExamModal() {
    document.getElementById('create-exam-modal').classList.add('hidden');
}

function parseRawQuestions(rawText) {
    const blocks = rawText.trim().split(/
\s*
/);
    const parsed = [];
    blocks.forEach(block => {
        const lines = block.split('
').map(l => l.trim()).filter(Boolean);
        if (lines.length >= 2) {
            const qText = lines[0].replace(/^Câu\s*\d+[:.]\s*/i, '');
            const opts = [];
            let ansIdx = 0;
            lines.slice(1).forEach((line, idx) => {
                let isCorrect = false;
                let cleanLine = line;
                if (cleanLine.startsWith('*')) {
                    isCorrect = true;
                    cleanLine = cleanLine.substring(1).trim();
                }
                cleanLine = cleanLine.replace(/^[A-D][.:]\s*/i, '');
                if (isCorrect) ansIdx = opts.length;
                opts.push(cleanLine);
            });
            if (opts.length > 0) {
                parsed.push({ q: qText, options: opts, answer: ansIdx });
            }
        }
    });
    return parsed;
}

function saveNewExam() {
    const title = document.getElementById('new-exam-title').value.trim() || "Đề kiểm tra Toán mới";
    const code = (document.getElementById('new-exam-code').value.trim() || "MATH" + Math.floor(10 + Math.random() * 89)).toUpperCase();
    const raw = document.getElementById('new-exam-raw').value;
    const questions = parseRawQuestions(raw);

    if (questions.length === 0) {
        alert("Vui lòng nhập ít nhất 1 câu hỏi đúng định dạng!");
        return;
    }

    exams.unshift({
        code,
        title,
        duration: 45,
        createdAt: "17-11-2026",
        questions
    });
    localStorage.setItem('matht_exams', JSON.stringify(exams));
    renderExamsGrid();
    closeCreateExamModal();
    alert(`Đã xuất bản đề "${title}" với mã vào thi: ${code}`);
}

function clonePublicExam(title) {
    const code = "CH" + Math.floor(100 + Math.random() * 899);
    exams.unshift({
        code,
        title,
        duration: 50,
        createdAt: "17-11-2026",
        questions: DEFAULT_EXAMS[0].questions
    });
    localStorage.setItem('matht_exams', JSON.stringify(exams));
    renderExamsGrid();
    switchDashboardTab('exams');
    alert(`Đã lưu "${title}" vào danh sách Đề của tôi (Mã: ${code})!`);
}

// ==================== STUDENT EXAM ROOM & ANTI-CHEAT ====================
function handleQuickExamStart(e) {
    e.preventDefault();
    const name = document.getElementById('student-name-input').value.trim();
    const className = document.getElementById('student-class-input').value.trim();
    const code = document.getElementById('exam-code-input').value.trim().toUpperCase();
    closeAuthModal();
    startExamSimulation(code, name, className);
}

function startExamSimulation(code, studentName, className) {
    const found = exams.find(e => e.code === code) || exams[0];
    activeExam = found;
    currentStudentInfo = { name: studentName, className: className };
    studentAnswers = {};
    tabViolations = 0;

    document.getElementById('exam-room-title').textContent = found.title;
    document.getElementById('exam-room-student-info').textContent = `Thí sinh: ${studentName} · Lớp ${className} · Mã đề: ${found.code}`;
    document.getElementById('violation-counter').textContent = "0";

    renderExamQuestions();
    showView('exam-room');

    // Start Timer
    clearInterval(examTimerInterval);
    timeRemaining = found.duration * 60;
    updateTimerDisplay();
    examTimerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        if (timeRemaining <= 0) {
            clearInterval(examTimerInterval);
            submitStudentExam(true);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    const secs = (timeRemaining % 60).toString().padStart(2, '0');
    document.getElementById('exam-timer').textContent = `${mins}:${secs}`;
}

function renderExamQuestions() {
    const container = document.getElementById('exam-questions-container');
    const palette = document.getElementById('question-palette');
    const letters = ['A', 'B', 'C', 'D'];

    container.innerHTML = activeExam.questions.map((item, qIdx) => `
        <div id="q-card-${qIdx}" class="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <div class="flex items-center gap-2 mb-3">
                <span class="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg">Câu ${qIdx + 1}</span>
            </div>
            <div class="text-slate-900 font-medium text-base mb-4 leading-relaxed">${item.q}</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${item.options.map((opt, oIdx) => `
                    <label onclick="selectAnswer(${qIdx}, ${oIdx})" id="opt-${qIdx}-${oIdx}"
                        class="opt-label-${qIdx} flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer transition">
                        <span class="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                            ${letters[oIdx]}
                        </span>
                        <span class="text-sm text-slate-800">${opt}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');

    palette.innerHTML = activeExam.questions.map((_, qIdx) => `
        <a href="#q-card-${qIdx}" id="palette-btn-${qIdx}"
            class="h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 hover:border-indigo-400 transition">
            ${qIdx + 1}
        </a>
    `).join('');

    renderMath(container);
}

function selectAnswer(qIdx, oIdx) {
    studentAnswers[qIdx] = oIdx;

    // Update option styles
    document.querySelectorAll(`.opt-label-${qIdx}`).forEach(el => {
        el.classList.remove('border-indigo-600', 'bg-indigo-50', 'ring-2', 'ring-indigo-200');
    });
    const chosen = document.getElementById(`opt-${qIdx}-${oIdx}`);
    if (chosen) {
        chosen.classList.add('border-indigo-600', 'bg-indigo-50', 'ring-2', 'ring-indigo-200');
    }

    // Update palette button
    const pBtn = document.getElementById(`palette-btn-${qIdx}`);
    if (pBtn) {
        pBtn.className = "h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs transition";
    }
}

// Anti-cheat listener when student is in exam room
document.addEventListener("visibilitychange", () => {
    const examRoomVisible = !document.getElementById('view-exam-room').classList.contains('hidden');
    if (document.hidden && examRoomVisible && activeExam) {
        tabViolations++;
        document.getElementById('violation-counter').textContent = tabViolations;
    }
});

function submitStudentExam(auto = false) {
    if (!auto && !confirm("Thầy/em có chắc chắn muốn nộp bài thi ngay bây giờ?")) return;
    clearInterval(examTimerInterval);

    let correct = 0;
    const total = activeExam.questions.length;
    activeExam.questions.forEach((q, idx) => {
        if (studentAnswers[idx] === q.answer) correct++;
    });

    const score = Number(((correct / total) * 10).toFixed(2));

    // Save to dashboard recent activities
    submissions.unshift({
        name: currentStudentInfo.name || "Thí sinh tự do",
        exam: `${activeExam.title} · ${currentStudentInfo.className}`,
        status: "Đã nộp",
        score: score,
        date: "17-11",
        warnings: tabViolations
    });
    localStorage.setItem('matht_submissions', JSON.stringify(submissions));
    renderRecentActivities();

    alert(`NỘP BÀI THÀNH CÔNG!

- Thí sinh: ${currentStudentInfo.name}
- Số câu đúng: ${correct}/${total}
- Điểm số: ${score}/10
- Cảnh báo rời tab: ${tabViolations}`);

    activeExam = null;
    if (currentUser) {
        showView('dashboard');
        switchDashboardTab('overview');
    } else {
        showView('landing');
    }
}

// ==================== EXAM SHUFFLER TOOL ====================
let lastShuffledOutput = "";

function runExamShuffler() {
    const raw = document.getElementById('shuffle-input').value;
    const count = parseInt(document.getElementById('shuffle-count').value) || 4;
    const startCode = parseInt(document.getElementById('shuffle-start-code').value) || 101;
    const shuffleQ = document.getElementById('shuffle-q').checked;
    const shuffleA = document.getElementById('shuffle-a').checked;

    const baseQuestions = parseRawQuestions(raw);
    if (baseQuestions.length === 0) {
        alert("Không nhận diện được câu hỏi! Vui lòng kiểm tra định dạng.");
        return;
    }

    const letters = ['A', 'B', 'C', 'D'];
    let fullText = "";
    let answerKeySummary = "=== BẢNG ĐÁP ÁN TỔNG HỢP ===
";

    for (let i = 0; i < count; i++) {
        const code = startCode + i;
        let qList = JSON.parse(JSON.stringify(baseQuestions));
        if (shuffleQ) qList.sort(() => Math.random() - 0.5);

        fullText += `
==============================
MÃ ĐỀ: ${code}
==============================
`;
        let codeKeys = [];

        qList.forEach((item, idx) => {
            let optsWithFlag = item.options.map((text, oIdx) => ({ text, isCorrect: oIdx === item.answer }));
            if (shuffleA) optsWithFlag.sort(() => Math.random() - 0.5);

            const correctIndex = optsWithFlag.findIndex(o => o.isCorrect);
            codeKeys.push(`${idx + 1}.${letters[correctIndex]}`);

            fullText += `
Câu ${idx + 1}: ${item.q}
`;
            optsWithFlag.forEach((o, oIdx) => {
                fullText += `   ${letters[oIdx]}. ${o.text}
`;
            });
        });

        answerKeySummary += `Mã đề ${code}: ${codeKeys.join(" | ")}
`;
    }

    lastShuffledOutput = answerKeySummary + "
" + fullText;
    const outBox = document.getElementById('shuffle-output-area');
    outBox.textContent = lastShuffledOutput;
    outBox.classList.remove('hidden');
    document.getElementById('btn-download-shuffled').classList.remove('hidden');
}

function downloadShuffledTxt() {
    const blob = new Blob([lastShuffledOutput], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Bo_De_Tron_MathT.txt";
    link.click();
}

// ==================== CONVERT IMATH-TEX TO WORD ====================
function renderLatexPreview() {
    const input = document.getElementById('latex-convert-input').value;
    const preview = document.getElementById('latex-convert-preview');
    preview.innerHTML = input.replace(/
/g, '<br>');
    renderMath(preview);
}

function exportWordDoc() {
    const content = document.getElementById('latex-convert-preview').innerHTML;
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Math.T Export</title></head><body>${content}</body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Tai_Lieu_Toan_MathT.doc';
    link.click();
}

function copyCleanText() {
    const text = document.getElementById('latex-convert-input').value;
    navigator.clipboard?.writeText(text);
    alert("Đã sao chép nội dung vào bộ nhớ tạm!");
}

// ==================== CLASSES & QUESTION BANK ====================
function renderClassesList() {
    const list = document.getElementById('classes-list');
    list.innerHTML = classes.map(c => `
        <div class="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
                <h4 class="font-bold text-slate-900 text-base">Lớp ${c.name}</h4>
                <p class="text-xs text-slate-500 mt-0.5">Sĩ số: ${c.students} học sinh · Điểm TB: <strong class="text-indigo-600">${c.avgScore}</strong></p>
            </div>
            <span class="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg">Đang hoạt động</span>
        </div>
    `).join('');
}

function addNewClassPrompt() {
    const name = prompt("Nhập tên lớp mới (ví dụ: 12.1TVD):");
    if (name && name.trim()) {
        classes.push({ name: name.trim(), students: 40, avgScore: 0 });
        localStorage.setItem('matht_classes', JSON.stringify(classes));
        renderClassesList();
    }
}

function renderQuestionBank() {
    const container = document.getElementById('question-bank-list');
    container.innerHTML = DEFAULT_EXAMS[0].questions.map((item, i) => `
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm">
            <div class="font-bold text-indigo-700 text-xs mb-1">Câu hỏi #${i + 1} · Toán 12</div>
            <div class="text-slate-800">${item.q}</div>
        </div>
    `).join('');
}

// ==================== 3D GEOMETRY SIMULATOR (CANVAS) ====================
let currentShape = 'pyramid';
let rotX = 0.35, rotY = 0.55;
let isDragging3D = false, lastMouseX = 0, lastMouseY = 0;

function set3DShape(shape) {
    currentShape = shape;
    draw3DShape();
}

function init3DCanvas() {
    const canvas = document.getElementById('canvas3d');
    if (!canvas) return;

    canvas.addEventListener('mousedown', e => {
        isDragging3D = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });
    window.addEventListener('mouseup', () => isDragging3D = false);
    window.addEventListener('mousemove', e => {
        if (!isDragging3D) return;
        rotY += (e.clientX - lastMouseX) * 0.01;
        rotX += (e.clientY - lastMouseY) * 0.01;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        draw3DShape();
    });

    draw3DShape();
}

function draw3DShape() {
    const canvas = document.getElementById('canvas3d');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    let vertices = [], edges = [], labels = [];

    if (currentShape === 'pyramid') {
        vertices = [
            [0, -1.2, 0],     // S
            [-1, 0.8, -1],    // A
            [1, 0.8, -1],     // B
            [1.2, 0.8, 1],    // C
            [-1.2, 0.8, 1]    // D
        ];
        labels = ['S', 'A', 'B', 'C', 'D'];
        edges = [
            [0, 1, true], [0, 2, false], [0, 3, false], [0, 4, false],
            [1, 2, true], [2, 3, false], [3, 4, false], [4, 1, true]
        ];
    } else if (currentShape === 'prism') {
        vertices = [
            [-0.9, -1, -0.7], [0.9, -1, -0.7], [0, -1, 0.9],
            [-0.9, 1, -0.7], [0.9, 1, -0.7], [0, 1, 0.9]
        ];
        labels = ["A'", "B'", "C'", "A", "B", "C"];
        edges = [
            [0, 1, false], [1, 2, false], [2, 0, false],
            [3, 4, true], [4, 5, false], [5, 3, false],
            [0, 3, false], [1, 4, false], [2, 5, false]
        ];
    } else {
        vertices = [
            [-0.9, -0.9, -0.9], [0.9, -0.9, -0.9], [0.9, -0.9, 0.9], [-0.9, -0.9, 0.9],
            [-0.9, 0.9, -0.9], [0.9, 0.9, -0.9], [0.9, 0.9, 0.9], [-0.9, 0.9, 0.9]
        ];
        labels = ["A'", "B'", "C'", "D'", "A", "B", "C", "D"];
        edges = [
            [0, 1, false], [1, 2, false], [2, 3, false], [3, 0, false],
            [4, 5, true], [5, 6, false], [6, 7, false], [7, 4, true],
            [0, 4, true], [1, 5, false], [2, 6, false], [3, 7, false]
        ];
    }

    const projected = vertices.map(([x, y, z]) => {
        // Rotate Y
        let x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
        let z1 = x * Math.sin(rotY) + z * Math.cos(rotY);
        // Rotate X
        let y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        let z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
        const scale = 135;
        return [w / 2 + x1 * scale, h / 2 + y2 * scale];
    });

    edges.forEach(([i, j, dashed]) => {
        ctx.beginPath();
        ctx.setLineDash(dashed ? [6, 6] : []);
        ctx.strokeStyle = dashed ? '#64748b' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.moveTo(projected[i][0], projected[i][1]);
        ctx.lineTo(projected[j][0], projected[j][1]);
        ctx.stroke();
    });

    ctx.setLineDash([]);
    projected.forEach(([px, py], idx) => {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText(labels[idx], px + 8, py - 6);
    });
}

// ==================== MODALS ====================
function openLiveGameModal() {
    document.getElementById('live-game-modal').classList.remove('hidden');
}

function closeLiveGameModal() {
    document.getElementById('live-game-modal').classList.add('hidden');
}

function openDemoVideoModal() {
    alert("Hướng dẫn nhanh:
1. Giáo viên nhấn 'Đăng nhập' (tài khoản mặc định đã điền sẵn) để vào Bảng điều khiển.
2. Học sinh nhấn 'Tham gia thi ngay' và nhập mã đề TOAN12 để làm bài thi trực tuyến.");
}
