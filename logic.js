// =============================================
// CSA EXAM PREP — ENHANCED LOGIC
// =============================================

// App State
let examQuestions = [];
let currentIndex = 0;
let userAnswers = [];
let isChecked = [];
let score = 0;
let timerInterval = null;
let elapsedSeconds = 0;
let isStudyMode = false;
let isInfiniteMode = false;

// DOM Nodes
const startScreen = document.getElementById('start-screen');
const examScreen = document.getElementById('exam-screen');
const resultScreen = document.getElementById('result-screen');

const startBtns = document.querySelectorAll('.btn-option');
const restartBtn = document.getElementById('restart-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const progressFill = document.getElementById('progress-fill');
const questionCard = document.getElementById('question-card');
const questionTypeBadge = document.getElementById('question-type-badge');
const questionNavGrid = document.getElementById('question-nav-grid');
const explainAiBtn = document.getElementById('explain-ai-btn');

const qCurrent = document.getElementById('q-current');
const qTotal = document.getElementById('q-total');
const timerValue = document.getElementById('timer-value');

const sidebarAnswered = document.getElementById('sidebar-answered');
const sidebarTotal = document.getElementById('sidebar-total');

const jumbleOptionsCheckbox = document.getElementById('jumble-options');

// Listeners
startBtns.forEach(btn => {
    btn.addEventListener('click', (e) => startExam(e.target.dataset.mode));
});
restartBtn.addEventListener('click', resetToHome);
prevBtn.addEventListener('click', goPrev);
nextBtn.addEventListener('click', handleNextClick);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (!examScreen.classList.contains('active')) return;

    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!prevBtn.disabled) goPrev();
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNextClick();
    }
});

// Init
renderHistory();
updateQuestionCount();

function updateQuestionCount() {
    const defaultSpan = document.getElementById('total-questions-count');
    const multiSpans = document.querySelectorAll('.total-q-num');

    if (typeof rawQuestions !== 'undefined') {
        const count = rawQuestions.length;
        if (defaultSpan) defaultSpan.textContent = `${count} Questions Ready`;
        multiSpans.forEach(span => span.textContent = count);
    }
}

// =============================================
// EXAM START
// =============================================
function startExam(mode) {
    let pool = [...rawQuestions];
    let limit = pool.length;
    let inSequence = false;
    let studyMode = false;
    let infiniteMode = false;

    // Determine config based on mode
    if (mode === 'random-10') limit = 10;
    else if (mode === 'random-25') limit = 25;
    else if (mode === 'random-50') limit = 50;
    else if (mode === 'random-100') limit = 100;
    else if (mode === 'random-all') limit = pool.length;
    else if (mode === 'sequence') inSequence = true;
    else if (mode === 'study') { inSequence = true; studyMode = true; }
    else if (mode === 'infinite') { infiniteMode = true; limit = pool.length; } // Infinite will just cycle

    // Shuffle pool if not in sequence
    if (!inSequence) {
        pool.sort(() => Math.random() - 0.5);
    }

    // Apply limit
    pool = pool.slice(0, limit);

    const shouldJumble = jumbleOptionsCheckbox ? jumbleOptionsCheckbox.checked : true;
    isStudyMode = studyMode;
    isInfiniteMode = infiniteMode;

    examQuestions = pool.map(q => {
        let optionsToUse = [...q.options];
        if (shouldJumble && !studyMode) {
            optionsToUse.sort(() => Math.random() - 0.5);
        }

        let correctArr = Array.isArray(q.correct) ? q.correct : [q.correct];
        return {
            ...q,
            options: optionsToUse,
            correct: correctArr,
            isMultiple: correctArr.length > 1
        };
    });

    currentIndex = 0;
    userAnswers = Array.from({ length: examQuestions.length }, () => []);
    isChecked = Array(examQuestions.length).fill(false);
    score = 0;
    elapsedSeconds = 0;

    startScreen.classList.remove('active');
    examScreen.classList.add('active');

    // Update sidebar total
    sidebarTotal.textContent = examQuestions.length;
    sidebarAnswered.textContent = '0';

    startTimer();
    buildNavigator();
    loadQuestion();
}

// =============================================
// TIMER
// =============================================
function startTimer() {
    clearInterval(timerInterval);
    elapsedSeconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        elapsedSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function updateTimerDisplay() {
    const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const secs = String(elapsedSeconds % 60).padStart(2, '0');
    timerValue.textContent = `${mins}:${secs}`;
}

function getTimeString() {
    const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const secs = String(elapsedSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

// =============================================
// SIDEBAR NAVIGATOR
// =============================================
function buildNavigator() {
    questionNavGrid.innerHTML = '';
    examQuestions.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'nav-dot';
        dot.textContent = i + 1;
        dot.addEventListener('click', () => {
            currentIndex = i;
            loadQuestion();
        });
        questionNavGrid.appendChild(dot);
    });
}

function updateNavigator() {
    const dots = questionNavGrid.querySelectorAll('.nav-dot');
    let answeredCount = 0;

    dots.forEach((dot, i) => {
        dot.className = 'nav-dot';

        if (i === currentIndex) {
            dot.classList.add('current');
        } else if (isChecked[i]) {
            const q = examQuestions[i];
            const selected = userAnswers[i];
            const isCorrect = q.correct.length === selected.length &&
                q.correct.every(val => selected.includes(val));
            dot.classList.add(isCorrect ? 'checked-correct' : 'checked-wrong');
        } else if (userAnswers[i].length > 0) {
            dot.classList.add('answered');
        }

        if (isChecked[i]) answeredCount++;
    });

    sidebarAnswered.textContent = answeredCount;
}

// =============================================
// PROGRESS BAR
// =============================================
function updateProgress() {
    const answered = isChecked.filter(Boolean).length;
    const percent = (answered / examQuestions.length) * 100;
    progressFill.style.width = `${percent}%`;
}

// =============================================
// LOAD QUESTION
// =============================================
function loadQuestion() {
    const q = examQuestions[currentIndex];

    qCurrent.textContent = currentIndex + 1;
    qTotal.textContent = examQuestions.length;

    // Type badge
    if (q.isMultiple) {
        questionTypeBadge.textContent = `● Select ${q.correct.length} answers`;
    } else {
        questionTypeBadge.textContent = `● Single choice`;
    }

    questionText.textContent = q.question;

    // Hide Explain AI button
    explainAiBtn.classList.remove('visible');

    // Build options
    optionsContainer.innerHTML = '';
    const inputType = q.isMultiple ? 'checkbox' : 'radio';
    const letters = 'ABCDEFGHIJ';

    q.options.forEach((opt, idx) => {
        const label = document.createElement('label');
        label.className = 'option-label';

        const input = document.createElement('input');
        input.type = inputType;
        input.name = 'exam-option';
        input.value = opt;

        const letterSpan = document.createElement('span');
        letterSpan.className = 'option-letter';
        letterSpan.textContent = letters[idx] || '';

        const textSpan = document.createElement('span');
        textSpan.className = 'option-text';
        textSpan.textContent = opt;

        // Restore selection
        if (userAnswers[currentIndex].includes(opt)) {
            input.checked = true;
            label.classList.add('selected');
        }

        // Checked state
        if (isChecked[currentIndex]) {
            input.disabled = true;
            label.classList.add('disabled');

            if (q.correct.includes(opt)) {
                label.classList.add('correct');
            } else if (userAnswers[currentIndex].includes(opt) && !q.correct.includes(opt)) {
                label.classList.add('wrong');
            }
        } else {
            input.addEventListener('change', () => {
                if (!q.isMultiple) {
                    userAnswers[currentIndex] = [opt];
                    optionsContainer.querySelectorAll('.option-label').forEach(lbl => {
                        lbl.classList.remove('selected');
                    });
                    label.classList.add('selected');
                } else {
                    if (input.checked) {
                        userAnswers[currentIndex].push(opt);
                        label.classList.add('selected');
                    } else {
                        userAnswers[currentIndex] = userAnswers[currentIndex].filter(v => v !== opt);
                        label.classList.remove('selected');
                    }
                }
                updateNavigator();
            });
        }

        label.appendChild(input);
        label.appendChild(letterSpan);
        label.appendChild(textSpan);
        optionsContainer.appendChild(label);
    });

    // Buttons
    prevBtn.disabled = currentIndex === 0 && !isInfiniteMode;

    if (isStudyMode) {
        // In study mode, automatically check it but don't score it (or let them just read it)
        isChecked[currentIndex] = true;
        optionsContainer.querySelectorAll('input').forEach(inp => inp.disabled = true);

        optionsContainer.querySelectorAll('.option-label').forEach(label => {
            const input = label.querySelector('input');
            label.classList.add('disabled');
            if (q.correct.includes(input.value)) {
                label.classList.add('correct');
                input.checked = true; // visually show it's the correct one
                label.classList.add('selected');
            }
        });

        // Show Explain AI Button
        const query = encodeURIComponent(`Explain ${q.question} ${q.options} in detail with example`);
        explainAiBtn.href = `https://www.google.com/search?q=${query}`;
        explainAiBtn.classList.add('visible');

        nextBtn.textContent = (currentIndex === examQuestions.length - 1 && !isInfiniteMode) ? 'Finish Exam →' : 'Next →';
        updateProgress();
        updateNavigator();
    } else if (isChecked[currentIndex]) {
        nextBtn.textContent = (currentIndex === examQuestions.length - 1 && !isInfiniteMode) ? 'Finish Exam →' : 'Next →';
    } else {
        nextBtn.textContent = 'Check Answer ✓';
    }

    if (!isStudyMode) {
        updateProgress();
        updateNavigator();
    }
}

// =============================================
// CHECK / NEXT
// =============================================
function handleNextClick() {
    const q = examQuestions[currentIndex];
    const selected = userAnswers[currentIndex];

    if (!isChecked[currentIndex]) {
        if (selected.length === 0) {
            showToast('Please select an answer before checking.');
            return;
        }

        isChecked[currentIndex] = true;

        const isFullyCorrect = q.correct.length === selected.length &&
            q.correct.every(val => selected.includes(val));
        if (isFullyCorrect) score++;

        const labels = optionsContainer.querySelectorAll('.option-label');
        labels.forEach(label => {
            const input = label.querySelector('input');
            input.disabled = true;
            label.classList.add('disabled');

            if (q.correct.includes(input.value)) {
                label.classList.add('correct');
            } else if (selected.includes(input.value) && !q.correct.includes(input.value)) {
                label.classList.add('wrong');
            }
        });

        // Show Explain AI Button
        const query = encodeURIComponent(`Explain ${q.question} ${q.options} in detail with example`);
        explainAiBtn.href = `https://www.google.com/search?q=${query}`;
        explainAiBtn.classList.add('visible');

        nextBtn.textContent = (currentIndex === examQuestions.length - 1 && !isInfiniteMode) ? 'Finish Exam →' : 'Next →';
        updateNavigator();
        updateProgress();

    } else {
        if (currentIndex < examQuestions.length - 1) {
            currentIndex++;
            loadQuestion();
        } else if (isInfiniteMode) {
            currentIndex = 0; // loop back
            loadQuestion();
        } else {
            showResult();
        }
    }
}

// =============================================
// NAVIGATION
// =============================================
function goPrev() {
    if (currentIndex > 0) {
        currentIndex--;
        loadQuestion();
    } else if (isInfiniteMode && examQuestions.length > 0) {
        currentIndex = examQuestions.length - 1;
        loadQuestion();
    }
}

// =============================================
// TOAST
// =============================================
function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => {
        toast.classList.remove('visible');
    }, 2500);
}

// =============================================
// RESULT SCREEN
// =============================================
function showResult() {
    stopTimer();

    examScreen.classList.remove('active');
    resultScreen.classList.add('active');

    const total = examQuestions.length;
    const wrong = total - score;
    const percentage = Math.round((score / total) * 100);

    document.getElementById('res-total').textContent = total;
    document.getElementById('res-correct').textContent = score;
    document.getElementById('res-wrong').textContent = wrong;
    document.getElementById('res-time').textContent = getTimeString();

    animateScoreRing(percentage);

    const grade = getGrade(percentage);
    const gradeEl = document.getElementById('result-grade');
    gradeEl.textContent = grade.letter;
    gradeEl.className = `result-grade ${grade.colorClass}`;

    const perfMsg = document.getElementById('performance-msg');
    perfMsg.innerHTML = `<span class="emoji">${grade.emoji}</span>${grade.message}`;

    saveHistory(score, total, percentage);
    renderHistory();
}

function animateScoreRing(percentage) {
    const ring = document.getElementById('score-ring');
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (percentage / 100) * circumference;

    ring.style.transition = 'none';
    ring.setAttribute('stroke-dashoffset', circumference);

    const percentDisplay = document.getElementById('score-percent-display');
    percentDisplay.textContent = '0%';

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            ring.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)';
            ring.setAttribute('stroke-dashoffset', offset);

            let current = 0;
            const duration = 1500;
            const step = percentage / (duration / 16);
            const counter = setInterval(() => {
                current += step;
                if (current >= percentage) {
                    current = percentage;
                    clearInterval(counter);
                }
                percentDisplay.textContent = `${Math.round(current)}%`;
            }, 16);
        });
    });
}

function getGrade(percentage) {
    if (percentage >= 90) return { letter: 'A+', colorClass: 'grade-a-plus', emoji: '🏆', message: 'Outstanding! You\'re exam-ready!' };
    if (percentage >= 80) return { letter: 'A', colorClass: 'grade-a', emoji: '🌟', message: 'Excellent work! Almost perfect!' };
    if (percentage >= 70) return { letter: 'B', colorClass: 'grade-b', emoji: '💪', message: 'Good job! A little more practice and you\'ll ace it!' };
    if (percentage >= 60) return { letter: 'C', colorClass: 'grade-c', emoji: '📚', message: 'Not bad! Focus on weak areas and try again.' };
    return { letter: 'F', colorClass: 'grade-f', emoji: '🔄', message: 'Keep practicing! Review the material and try again.' };
}

// =============================================
// RESET
// =============================================
function resetToHome() {
    resultScreen.classList.remove('active');
    startScreen.classList.add('active');
}

// =============================================
// HISTORY
// =============================================
function saveHistory(score, total, percentage) {
    const history = JSON.parse(localStorage.getItem('csaExamHistory')) || [];

    const d = new Date();
    const dateStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const grade = getGrade(percentage);

    history.push({
        score, total, percentage,
        date: dateStr,
        time: getTimeString(),
        elapsedSeconds: elapsedSeconds, // Save raw seconds for calculating average
        grade: grade.letter,
        gradeClass: grade.colorClass
    });

    localStorage.setItem('csaExamHistory', JSON.stringify(history));
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('csaExamHistory')) || [];
    const list1 = document.getElementById('history-list');
    const list2 = document.getElementById('res-history-list');

    if (list1) list1.innerHTML = '';
    if (list2) list2.innerHTML = '';

    if (history.length === 0) {
        const noData = '<li class="no-history">No previous attempts yet. Start your first exam!</li>';
        if (list1) list1.innerHTML = noData;
        if (list2) list2.innerHTML = noData;
        return;
    }

    [...history].reverse().forEach((item) => {
        const gradeClass = item.gradeClass || 'grade-c';
        const gradeLetter = item.grade || '—';

        let avgStr = '—';
        if (item.elapsedSeconds && item.total > 0) {
            const avgSecs = Math.round(item.elapsedSeconds / item.total);
            const m = Math.floor(avgSecs / 60);
            const s = avgSecs % 60;
            avgStr = m > 0 ? `${m}m ${s}s/q` : `${s}s/q`;
        }

        const liContent = `
            <div class="history-main-row">
                <div>
                    <span class="history-score">${item.score}/${item.total}</span>
                    <span style="color: var(--text-muted); margin-left: 8px;">(${item.percentage}%)</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="history-grade ${gradeClass}">${gradeLetter}</span>
                    <span class="history-date">${item.date}</span>
                </div>
            </div>
            <div class="history-time-row">
                <span>⏱ Total: ${item.time || '—'}</span>
                <span>⚡ Avg: ${avgStr}</span>
            </div>
        `;

        const li1 = document.createElement('li');
        li1.innerHTML = liContent;
        if (list1) list1.appendChild(li1);

        const li2 = document.createElement('li');
        li2.innerHTML = liContent;
        if (list2) list2.appendChild(li2);
    });
}