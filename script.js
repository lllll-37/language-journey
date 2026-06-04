// ===== 核心狀態與資料設定 =====
const STORAGE_KEY = 'languageJourneyApp';
const NOTES_STORAGE_KEY = 'language_journey_notes'; // 隨手筆記專用 Key

let appData = {
    checkins: [],  // { id, date, content, time, note }
    mistakes: [],  // { id, lang, date, q, myans, correct, reason }
    settings: {
        dailyGoal: 30,
        theme: 'light'
    }
};

// 隨手筆記狀態管理
let savedNotes = [
    { type: 'reminder', text: '📌 在編輯 GitHub 程式時要記得按鉛筆 ✏️ 進入編輯狀態！' }
];

// 每日格言庫
const quotes = [
    "「學習另一種語言，就是擁有第二個靈魂。」 - 查理曼大帝",
    "「語言是靈魂的血液。」 - 奧利弗·溫德爾·霍姆斯",
    "「懂一種語言就是了解一個世界。」 - 弗朗茨·法農",
    "「每天進步一點點，持續的力量是驚人的。」",
    "「不怕慢，只怕站。」 - 中國諺語"
];

// 初始化
function init() {
    loadData();
    applyTheme();
    setupNavigation();
    setupForms();
    setupQuickNotesForm(); // 🔥 綁定隨手筆記表單
    setDailyQuote();
    renderAll();
}

// ===== 資料管理 (LocalStorage) =====
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            appData = JSON.parse(saved);
            if (!appData.settings) appData.settings = { dailyGoal: 30, theme: 'light' };
        } catch (e) { console.error("資料載入錯誤", e); }
    }

    // 載入隨手筆記資料
    const savedNotesData = localStorage.getItem(NOTES_STORAGE_KEY);
    if (savedNotesData) {
        try {
            savedNotes = JSON.parse(savedNotesData);
        } catch (e) { console.error("筆記載入錯誤", e); }
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    renderAll(); // 存檔後自動刷新畫面
}

// 隨手筆記專用存檔
function saveNotesData() {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(savedNotes));
    renderQuickNotes(); // 只刷新筆記畫面
}

// ===== 介面渲染與導覽 =====
function setupNavigation() {
    const links = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.page-section');
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const targetId = link.getAttribute('data-target');
            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === targetId) sec.classList.add('active');
            });
            
            if(targetId === 'reports') renderCharts();

            if(window.innerWidth <= 768) sidebar.classList.remove('open');
        });
    });

    mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

function setDailyQuote() {
    const quoteEl = document.getElementById('daily-quote');
    const todayIndex = new Date().getDay() % quotes.length;
    quoteEl.innerText = quotes[todayIndex];
}

function applyTheme() {
    if (appData.settings.theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function renderAll() {
    renderDashboard();
    renderLogs();
    renderMistakes();
    renderHeatmap();
    renderQuickNotes(); // 🔥 讓筆記在初始化與任何重新渲染時自動顯示
    updateMistakeFilters();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('checkin-date').value = today;
    document.getElementById('mistake-date').value = today;
    document.getElementById('setting-goal').value = appData.settings.dailyGoal;
}

// ===== 日期與統計輔助函數 =====
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

function calculateStreak() {
    let dates = appData.checkins.map(c => c.date).sort().reverse();
    dates = [...new Set(dates)];
    
    if (dates.length === 0) return 0;
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0,0,0,0);
    
    let lastRecordDate = new Date(dates[0]);
    lastRecordDate.setHours(0,0,0,0);
    const diffTime = Math.abs(currentDate - lastRecordDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 1) return 0;
    
    let expectedDate = new Date(dates[0]);
    for (let d of dates) {
        let recordD = new Date(d);
        if (recordD.getTime() === expectedDate.getTime()) {
            streak++;
            expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

// ===== Dashboard 邏輯 =====
function renderDashboard() {
    const today = getTodayString();
    const todayLogs = appData.checkins.filter(c => c.date === today);
    const todayTime = todayLogs.reduce((sum, c) => sum + parseInt(c.time), 0);
    
    const statusEl = document.getElementById('dash-status');
    if (todayLogs.length > 0) {
        statusEl.innerText = '✅ 已打卡';
        statusEl.className = 'stat-value text-green';
    } else {
        statusEl.innerText = '❌ 未打卡';
        statusEl.className = 'stat-value text-red';
    }

    document.getElementById('dash-streak').innerHTML = `${calculateStreak()} 天 <i class="fa-solid fa-fire"></i>`;
    const totalTime = appData.checkins.reduce((sum, c) => sum + parseInt(c.time), 0);
    document.getElementById('dash-time').innerText = `${totalTime} 分鐘`;

    const goal = appData.settings.dailyGoal;
    const progressText = document.getElementById('dash-progress-text');
    const progressBar = document.getElementById('dash-progress');
    progressText.innerText = `${todayTime} / ${goal} 分鐘`;
    let percent = Math.min((todayTime / goal) * 100, 100);
    progressBar.style.width = `${percent}%`;

    const recentLogs = [...appData.checkins].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    const logsHtml = recentLogs.map(l => `<li><span>${l.date}</span> <span>${l.content} (${l.time}m)</span></li>`).join('');
    document.getElementById('dash-recent-logs').innerHTML = logsHtml || '<li>尚無紀錄</li>';

    const recentMistakes = [...appData.mistakes].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    const misHtml = recentMistakes.map(m => `<li><span>[${m.lang}]</span> <span>${m.q}</span></li>`).join('');
    document.getElementById('dash-recent-mistakes').innerHTML = misHtml || '<li>尚無錯題</li>';
}

// ===== 表單處理 =====
function setupForms() {
    // 每日打卡
    document.getElementById('checkin-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const newRecord = {
            id: Date.now(),
            date: document.getElementById('checkin-date').value,
            content: document.getElementById('checkin-content').value,
            time: document.getElementById('checkin-time').value,
            note: document.getElementById('checkin-note').value
        };
        appData.checkins.push(newRecord);
        saveData();
        e.target.reset();
        document.getElementById('checkin-date').value = getTodayString();
        alert('打卡成功！繼續保持！');
    });

    // 錯題新增
    document.getElementById('mistake-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const newMistake = {
            id: Date.now(),
            lang: document.getElementById('mistake-lang').value,
            date: document.getElementById('mistake-date').value,
            q: document.getElementById('mistake-q').value,
            myans: document.getElementById('mistake-myans').value,
            correct: document.getElementById('mistake-correct').value,
            reason: document.getElementById('mistake-reason').value
        };
        appData.mistakes.push(newMistake);
        saveData();
        e.target.reset();
        document.getElementById('mistake-date').value = getTodayString();
        alert('錯題新增成功！');
    });

    document.getElementById('search-logs').addEventListener('input', renderLogs);
    document.getElementById('search-mistakes').addEventListener('input', renderMistakes);
    document.getElementById('filter-mistakes').addEventListener('change', renderMistakes);

    document.getElementById('btn-toggle-theme').addEventListener('click', () => {
        appData.settings.theme = appData.settings.theme === 'light' ? 'dark' : 'light';
        applyTheme();
        saveData();
    });

    document.getElementById('btn-save-goal').addEventListener('click', () => {
        const goal = document.getElementById('setting-goal').value;
        appData.settings.dailyGoal = parseInt(goal) || 30;
        saveData();
        alert('學習目標已更新！');
    });

    document.getElementById('btn-export').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "LanguageJourney_Backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    document.getElementById('file-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                if(importedData.checkins && importedData.mistakes) {
                    appData = importedData;
                    saveData();
                    alert('資料匯入成功！');
                } else {
                    alert('無效的備份檔案格式。');
                }
            } catch(err) {
                alert('匯入失敗，檔案可能損毀。');
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('flashcard').addEventListener('click', toggleFlashcard);
    document.getElementById('btn-show-answer').addEventListener('click', toggleFlashcard);
    document.getElementById('btn-next-card').addEventListener('click', loadRandomFlashcard);
    
    document.querySelector('[data-target="review"]').addEventListener('click', loadRandomFlashcard);
}

// ===== 📝 隨手筆記與注意事項 核心邏輯 (新分類版) =====
function setupQuickNotesForm() {
    const noteForm = document.getElementById('note-form');
    if (noteForm) {
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const type = document.getElementById('note-type').value;
            const noteTextInput = document.getElementById('note-text');
            const text = noteTextInput.value.trim();
            // 根據不同分類給予不同的圖示前綴
            const prefix = type === 'update' ? '✨ ' : '📖 ';

            if (text) {
                savedNotes.push({
                    type: type,
                    text: prefix + text
                });
                saveNotesData(); // 存檔並刷新
                noteTextInput.value = ''; // 清空輸入框
            }
        });
    }
}

function renderQuickNotes() {
    const updateList = document.getElementById('update-list');
    const memoList = document.getElementById('memo-list');
    
    if (!updateList || !memoList) return; // 安全機制

    updateList.innerHTML = '';
    memoList.innerHTML = '';

    let hasUpdate = false;
    let hasMemo = false;

    savedNotes.forEach((note, index) => {
        const li = document.createElement('li');
        li.style.padding = '10px 0';
        li.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';

        li.innerHTML = `
            <span>${note.text}</span>
            <button class="btn-delete-note" data-index="${index}" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0 5px;">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;

        // 根據新分類分流投放到對應的區塊
        if (note.type === 'update' || note.type === 'reminder') { 
            // 註：保留 note.type === 'reminder' 是為了相容你之前瀏覽器留下的舊快取資料，避免出錯
            updateList.appendChild(li);
            hasUpdate = true;
        } else {
            memoList.appendChild(li);
            hasMemo = true;
        }
    });

    if (!hasUpdate) updateList.innerHTML = '<li style="padding: 10px 0; color: gray;">💡 目前尚無待更新或優化想法。</li>';
    if (!hasMemo) memoList.innerHTML = '<li style="padding: 10px 0; color: gray;">💡 目前尚無學習備忘紀錄。</li>';

    // 重新綁定垃圾桶刪除按鈕
    document.querySelectorAll('.btn-delete-note').forEach(btn => {
        btn.onclick = (e) => {
            const indexToRemove = e.currentTarget.getAttribute('data-index');
            savedNotes.splice(indexToRemove, 1);
            saveNotesData();
        };
    });
}
function renderQuickNotes() {
    const reminderList = document.getElementById('reminder-list');
    const noticeList = document.getElementById('notice-list');
    
    if (!reminderList || !noticeList) return; // 安全機制

    reminderList.innerHTML = '';
    noticeList.innerHTML = '';

    let hasReminder = false;
    let hasNotice = false;

    savedNotes.forEach((note, index) => {
        const li = document.createElement('li');
        li.style.padding = '10px 0';
        li.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';

        li.innerHTML = `
            <span>${note.text}</span>
            <button class="btn-delete-note" data-index="${index}" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0 5px;">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;

        if (note.type === 'reminder') {
            reminderList.appendChild(li);
            hasReminder = true;
        } else {
            noticeList.appendChild(li);
            hasNotice = true;
        }
    });

    if (!hasReminder) reminderList.innerHTML = '<li style="padding: 10px 0; color: gray;">💡 目前尚無小提醒。</li>';
    if (!hasNotice) noticeList.innerHTML = '<li style="padding: 10px 0; color: gray;">📭 目前尚無注意事項。</li>';

    // 綁定刪除按鈕
    document.querySelectorAll('.btn-delete-note').forEach(btn => {
        btn.onclick = (e) => {
            const indexToRemove = e.currentTarget.getAttribute('data-index');
            savedNotes.splice(indexToRemove, 1);
            saveNotesData();
        };
    });
}

// ===== 日誌與錯題渲染 =====
function renderLogs() {
    const container = document.getElementById('logs-timeline');
    const keyword = document.getElementById('search-logs').value.toLowerCase();
    
    let filtered = [...appData.checkins].sort((a,b) => new Date(b.date) - new Date(a.date));
    if (keyword) {
        filtered = filtered.filter(l => l.content.toLowerCase().includes(keyword) || l.note.toLowerCase().includes(keyword));
    }

    container.innerHTML = filtered.length ? '' : '<p class="text-gray">無相符紀錄。</p>';
    
    filtered.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-item card';
        div.innerHTML = `
            <div class="log-info">
                <h4>${log.date} - ${log.content}</h4>
                <p><i class="fa-regular fa-clock"></i> ${log.time} 分鐘 | 備註: ${log.note || '無'}</p>
            </div>
            <button class="delete-btn" onclick="deleteData('checkins', ${log.id})"><i class="fa-solid fa-trash"></i></button>
        `;
        container.appendChild(div);
    });
}

function renderMistakes() {
    const container = document.getElementById('mistakes-list');
    const keyword = document.getElementById('search-mistakes').value.toLowerCase();
    const langFilter = document.getElementById('filter-mistakes').value;

    let filtered = [...appData.mistakes].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if (langFilter) {
        filtered = filtered.filter(m => m.lang === langFilter);
    }
    if (keyword) {
        filtered = filtered.filter(m => m.q.toLowerCase().includes(keyword) || m.reason.toLowerCase().includes(keyword));
    }

    container.innerHTML = filtered.length ? '' : '<p class="text-gray">無相符錯題。</p>';
    
    filtered.forEach(m => {
        const div = document.createElement('div');
        div.className = 'card mistake-card';
        div.innerHTML = `
            <span class="mistake-tag">${m.lang}</span>
            <h4>${m.q}</h4>
            <p><strong>我的答案：</strong><span class="text-red">${m.myans || '(空白)'}</span></p>
            <p><strong>正確答案：</strong><span class="text-green">${m.correct}</span></p>
            <p class="text-gray mt-1"><small>原因：${m.reason}</small></p>
            <div style="text-align: right; margin-top: 10px;">
                <button class="delete-btn" onclick="deleteData('mistakes', ${m.id})"><i class="fa-solid fa-trash"></i> 刪除</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function updateMistakeFilters() {
    const select = document.getElementById('filter-mistakes');
    const langs = [...new Set(appData.mistakes.map(m => m.lang))];
    const currentVal = select.value;
    select.innerHTML = '<option value="">所有語言</option>';
    langs.forEach(lang => {
        select.innerHTML += `<option value="${lang}">${lang}</option>`;
    });
    select.value = currentVal;
}

window.deleteData = function(type, id) {
    if(confirm('確定要刪除這筆紀錄嗎？')) {
        appData[type] = appData[type].filter(item => item.id !== id);
        saveData();
    }
};

// ===== 錯題隨機複習 =====
let currentFlashcardVisible = false;

function loadRandomFlashcard() {
    const contentDiv = document.getElementById('flashcard-content');
    const answerDiv = document.getElementById('flashcard-answer');
    
    if(appData.mistakes.length === 0) {
        contentDiv.innerHTML = '<p class="text-gray">目前錯題庫沒有資料，快去新增吧！</p>';
        answerDiv.classList.add('hidden');
        document.getElementById('btn-show-answer').style.display = 'none';
        return;
    }

    document.getElementById('btn-show-answer').style.display = 'block';
    
    const randIndex = Math.floor(Math.random() * appData.mistakes.length);
    const m = appData.mistakes[randIndex];

    contentDiv.innerHTML = `<h3>[${m.lang}]</h3><h2>${m.q}</h2>`;
    document.getElementById('fc-correct').innerText = m.correct;
    document.getElementById('fc-myans').innerText = m.myans || '(空白)';
    document.getElementById('fc-reason').innerText = m.reason;

    currentFlashcardVisible = false;
    answerDiv.classList.add('hidden');
}

function toggleFlashcard() {
    if(appData.mistakes.length === 0) return;
    const answerDiv = document.getElementById('flashcard-answer');
    if(!currentFlashcardVisible) {
        answerDiv.classList.remove('hidden');
        currentFlashcardVisible = true;
    }
}

// ===== 熱力圖 (GitHub Contribution Style) =====
function renderHeatmap() {
    const container = document.getElementById('heatmap');
    if (!container) return;
    container.innerHTML = '';
    
    const today = new Date();
    const map = {};
    appData.checkins.forEach(c => {
        map[c.date] = (map[c.date] || 0) + 1;
    });

    for (let col = 52; col >= 0; col--) {
        const colDiv = document.createElement('div');
        colDiv.className = 'heatmap-col';
        for (let row = 0; row < 7; row++) {
            const d = new Date(today);
            d.setDate(d.getDate() - (col * 7 + (6 - row))); 
            
            if (d > today) {
                const empty = document.createElement('div');
                empty.style.width = '12px'; empty.style.height = '12px';
                colDiv.appendChild(empty);
                continue;
            }

            const dateStr = d.toISOString().split('T')[0];
            const count = map[dateStr] || 0;
            
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            
            if (count === 1) cell.classList.add('level-1');
            else if (count === 2) cell.classList.add('level-2');
            else if (count === 3) cell.classList.add('level-3');
            else if (count >= 4) cell.classList.add('level-4');

            cell.title = `${dateStr}: 打卡 ${count} 次`;
            colDiv.appendChild(cell);
        }
        container.appendChild(colDiv);
    }
    container.scrollLeft = container.scrollWidth;
}

// ===== 統計報告與 Chart.js =====
function renderCharts() {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let weekDays = new Set();
    let weekTime = 0;
    let monthDays = new Set();
    let langCounts = {};

    appData.checkins.forEach(c => {
        const d = new Date(c.date);
        const diffTime = today - d;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if(diffDays <= 7) {
            weekDays.add(c.date);
            weekTime += parseInt(c.time);
        }
        if(diffDays <= 30) {
            monthDays.add(c.date);
        }
    });

    appData.mistakes.forEach(m => {
        langCounts[m.lang] = (langCounts[m.lang] || 0) + 1;
    });
    let topLang = "無資料";
    if(Object.keys(langCounts).length > 0) {
        topLang = Object.keys(langCounts).reduce((a, b) => langCounts[a] > langCounts[b] ? a : b);
    }

    const monthRate = Math.round((monthDays.size / 30) * 100);

    document.getElementById('report-week-days').innerText = `${weekDays.size}/7 天`;
    document.getElementById('report-week-time').innerText = `${weekTime} 分鐘`;
    document.getElementById('report-month-rate').innerText = `${monthRate}%`;
    document.getElementById('report-top-lang').innerText = topLang;

    const msgEl = document.getElementById('report-message');
    if(monthRate >= 90) msgEl.innerText = "太強了！這月幾乎天天都在進步！🏆";
    else if(monthRate >= 70) msgEl.innerText = "表現不錯，保持這個節奏！🔥";
    else if(monthRate >= 50) msgEl.innerText = "已經累積不少成果了，再多一點就更棒！👍";
    else msgEl.innerText = "別灰心，重新開始永遠不嫌晚！🌱";

    const chartCanvas = document.getElementById('timeChart');
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d');
    
    let labels = [];
    let data = [];
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('zh-TW', {month:'short', day:'numeric'}));
        
        const dayLogs = appData.checkins.filter(c => c.date === dateStr);
        const dayTime = dayLogs.reduce((sum, c) => sum + parseInt(c.time), 0);
        data.push(dayTime);
    }

    if(timeChartInstance) {
        timeChartInstance.destroy();
    }

    const isDark = appData.settings.theme === 'dark';
    const textColor = isDark ? '#f9fafb' : '#1f2937';
    const gridColor = isDark ? '#374151' : '#e5e7eb';

    timeChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '學習時間 (分鐘)',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: textColor } } },
            scales: {
                x: { ticks: { color: textColor }, grid: { color: gridColor } },
                y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true }
            }
        }
    });
}

// 啟動應用程式
init();
