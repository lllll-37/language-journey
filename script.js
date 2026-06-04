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
    { type: 'update', text: '✨ 在編輯 GitHub 程式時要記得按鉛筆 ✏️ 進入編輯狀態！' }
];

// 每日格言庫
const quotes = [
    "「學習另一種語言，就是擁有第二個靈魂。」 - 查理曼大帝",
    "「語言是靈魂的血液。」 - 奧利弗·溫德爾·霍姆斯",
    "「懂一種語言就是了解一個世界。」 - 弗朗茨·法農",
    "「每天進步一點點，持續的力量是驚人的。」",
    "「不怕慢，只怕站。」 - 中國諺語"
];

// 閃卡當前狀態
let currentFlashcardIndex = -1;

// 初始化執行
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    loadData();
    applyTheme();
    setupNavigation();
    setupForms();
    setupQuickNotesForm(); // 綁定隨手筆記表單
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

// ===== 介面導覽與基礎設定 =====
function setupNavigation() {
    const links = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.page-section');
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');

    links.forEach(link => {
        link.addEventListener('click', () => {
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const targetId = link.getAttribute('data-target');
            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === targetId) sec.classList.add('active');
            });
            
            if(targetId === 'reports') renderCharts();

            // RWD 縮小時，點擊選項自動收回選單
            if(window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}

function setDailyQuote() {
    const quoteEl = document.getElementById('daily-quote');
    if (quoteEl) {
        const todayIndex = new Date().getDay() % quotes.length;
        quoteEl.innerText = quotes[todayIndex];
    }
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
    renderQuickNotes(); // 自動渲染筆記
    updateMistakeFilters();
    
    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('checkin-date')) document.getElementById('checkin-date').value = today;
    if(document.getElementById('mistake-date')) document.getElementById('mistake-date').value = today;
    if(document.getElementById('setting-goal')) document.getElementById('setting-goal').value = appData.settings.dailyGoal;
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
    const todayTime = todayLogs.reduce((sum, c) => sum + parseInt(c.time || 0), 0);
    
    const statusEl = document.getElementById('dash-status');
    if (statusEl) {
        if (todayLogs.length > 0) {
            statusEl.innerText = '✅ 已打卡';
            statusEl.className = 'stat-value text-green';
        } else {
            statusEl.innerText = '❌ 未打卡';
            statusEl.className = 'stat-value text-red';
        }
    }

    const streakEl = document.getElementById('dash-streak');
    if (streakEl) streakEl.innerHTML = `${calculateStreak()} 天 <i class="fa-solid fa-fire"></i>`;
    
    const totalTime = appData.checkins.reduce((sum, c) => sum + parseInt(c.time || 0), 0);
    const timeEl = document.getElementById('dash-time');
    if (timeEl) timeEl.innerText = `${totalTime} 分鐘`;

    const goal = appData.settings.dailyGoal;
    const progressText = document.getElementById('dash-progress-text');
    const progressBar = document.getElementById('dash-progress');
    if (progressText && progressBar) {
        progressText.innerText = `${todayTime} / ${goal} 分鐘`;
        let percent = Math.min((todayTime / goal) * 100, 100);
        progressBar.style.width = `${percent}%`;
    }

    const recentLogs = [...appData.checkins].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    const logsHtml = recentLogs.map(l => `<li><span>${l.date}</span> <span>${l.content} (${l.time}m)</span></li>`).join('');
    const recentLogsEl = document.getElementById('dash-recent-logs');
    if (recentLogsEl) recentLogsEl.innerHTML = logsHtml || '<li>尚無紀錄</li>';

    const recentMistakes = [...appData.mistakes].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    const misHtml = recentMistakes.map(m => `<li><span>[${m.lang}]</span> <span>${m.q}</span></li>`).join('');
    const recentMistakesEl = document.getElementById('dash-recent-mistakes');
    if (recentMistakesEl) recentMistakesEl.innerHTML = misHtml || '<li>尚無錯題</li>';
}

// ===== 表單與事件監聽處理 =====
function setupForms() {
    // 每日打卡送出
    document.getElementById('checkin-form')?.addEventListener('submit', (e) => {
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

    // 錯題新增送出
    document.getElementById('mistake-form')?.addEventListener('submit', (e) => {
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

    document.getElementById('search-logs')?.addEventListener('input', renderLogs);
    document.getElementById('search-mistakes')?.addEventListener('input', renderMistakes);
    document.getElementById('filter-mistakes')?.addEventListener('change', renderMistakes);

    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
        appData.settings.theme = appData.settings.theme === 'light' ? 'dark' : 'light';
        applyTheme();
        saveData();
    });

    document.getElementById('btn-save-goal')?.addEventListener('click', () => {
        const goal = document.getElementById('setting-goal').value;
        appData.settings.dailyGoal = parseInt(goal) || 30;
        saveData();
        alert('學習目標已更新！');
    });

    document.getElementById('btn-export')?.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "LanguageJourney_Backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    document.getElementById('file-import')?.addEventListener('change', (e) => {
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

    // 閃卡事件綁定
    document.getElementById('flashcard')?.addEventListener('click', toggleFlashcard);
    document.getElementById('btn-show-answer')?.addEventListener('click', toggleFlashcard);
    document.getElementById('btn-next-card')?.addEventListener('click', loadRandomFlashcard);
    
    document.querySelector('[data-target="review"]')?.addEventListener('click', loadRandomFlashcard);
}

// ===== 📝 隨手筆記核心邏輯 =====
function setupQuickNotesForm() {
    const noteForm = document.getElementById('note-form');
    if (noteForm) {
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const type = document.getElementById('note-type').value;
            const noteTextInput = document.getElementById('note-text');
            const text = noteTextInput.value.trim();
            const prefix = type === 'update' ? '✨ ' : '📖 ';

            if (text) {
                savedNotes.push({
                    type: type,
                    text: prefix + text
                });
                saveNotesData(); 
                noteTextInput.value = ''; 
            }
        });
    }
}

function renderQuickNotes() {
    const updateList = document.getElementById('update-list');
    const memoList = document.getElementById('memo-list');
    
    if (!updateList || !memoList) return; 

    updateList.innerHTML = '';
    text = '';
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

        if (note.type === 'update' || note.type === 'reminder') { 
            updateList.appendChild(li);
            hasUpdate = true;
        } else {
            memoList.appendChild(li);
            hasMemo = true;
        }
    });

    if (!hasUpdate) updateList.innerHTML = '<li style="padding: 10px 0; color: gray;">💡 目前尚無待更新或優化想法。</li>';
    if (!hasMemo) memoList.innerHTML = '<li style="padding: 10px 0; color: gray;">💡 目前尚無學習備忘紀錄。</li>';

    // 重新綁定刪除按鈕
    document.querySelectorAll('.btn-delete-note').forEach(btn => {
        btn.onclick = (e) => {
            const indexToRemove = e.currentTarget.getAttribute('data-index');
            savedNotes.splice(indexToRemove, 1);
            saveNotesData();
        };
    });
}

// ===== 日誌與錯題列表渲染 =====
function renderLogs() {
    const container = document.getElementById('logs-timeline');
    if (!container) return;
    
    const keyword = document.getElementById('search-logs')?.value.toLowerCase() || '';
    
    let filtered = [...appData.checkins].sort((a,b) => new Date(b.date) - new Date(a.date));
    if (keyword) {
        filtered = filtered.filter(l => l.content.toLowerCase().includes(keyword) || (l.note && l.note.toLowerCase().includes(keyword)));
    }

    container.innerHTML = filtered.length ? '' : '<p class="text-gray">無相符紀錄。</p>';
    
    filtered.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-item card';
        div.style.marginBottom = '15px';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4>${log.date} - ${log.content}</h4>
                    <p style="color:gray; margin-top:5px;"><i class="fa-regular fa-clock"></i> ${log.time} 分鐘 | 備註: ${log.note || '無'}</p>
                </div>
                <button class="btn" style="background-color:#ef4444; padding:5px 10px;" onclick="deleteData('checkins', ${log.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderMistakes() {
    const container = document.getElementById('mistakes-list');
    if (!container) return;

    const keyword = document.getElementById('search-mistakes')?.value.toLowerCase() || '';
    const langFilter = document.getElementById('filter-mistakes')?.value || '';

    let filtered = [...appData.mistakes].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if (keyword) {
        filtered = filtered.filter(m => m.q.toLowerCase().includes(keyword) || m.reason.toLowerCase().includes(keyword));
    }
    if (langFilter) {
        filtered = filtered.filter(m => m.lang === langFilter);
    }

    container.innerHTML = filtered.length ? '' : '<p class="text-gray">無相符錯題紀錄。</p>';

    filtered.forEach(m => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div style="display:flex; justify-content:between; align-items:start; flex-direction:column; gap:8px; position:relative;">
                <span class="badge-blue" style="padding:2px 6px; font-size:0.8rem; border-radius:4px;">${m.lang} (${m.date})</span>
                <h4 style="margin-top:5px;">題目：${m.q}</h4>
                <p class="text-red">您的答案：${m.myans || '未填'}</p>
                <p class="text-green">正確答案：${m.correct}</p>
                <p style="font-size:0.95rem;"><strong>解析：</strong>${m.reason}</p>
                <button class="btn" style="background-color:#ef4444; padding:3px 8px; position:absolute; right:0; top:0;" onclick="deleteData('mistakes', ${m.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

function updateMistakeFilters() {
    const filterSelect = document.getElementById('filter-mistakes');
    if (!filterSelect) return;
    
    const langs = [...new Set(appData.mistakes.map(m => m.lang))];
    filterSelect.innerHTML = '<option value="">所有語言</option>';
    langs.forEach(lang => {
        if(lang) filterSelect.innerHTML += `<option value="${lang}">${lang}</option>`;
    });
}

// ===== 🗑️ 通用刪除功能 =====
function deleteData(type, id) {
    if (confirm('確定要刪除此筆紀錄嗎？')) {
        appData[type] = appData[type].filter(item => item.id !== id);
        saveData();
    }
}

// ===== 🎴 隨機複習閃卡邏輯 =====
function loadRandomFlashcard() {
    const contentEl = document.getElementById('flashcard-content');
    const answerEl = document.getElementById('flashcard-answer');
    
    if (!contentEl || !answerEl) return;

    answerEl.classList.add('hidden'); // 隱藏答案

    if (appData.mistakes.length === 0) {
        contentEl.innerHTML = '<p class="text-gray">目前沒有錯題紀錄可以複習，先去新增一些吧！</p>';
        currentFlashcardIndex = -1;
        return;
    }

    const randIndex = Math.floor(Math.random() * appData.mistakes.length);
    currentFlashcardIndex = randIndex;
    const card = appData.mistakes[randIndex];

    contentEl.innerHTML = `
        <span class="badge-blue" style="padding:2px 6px; font-size:0.8rem; border-radius:4px;">${card.lang}</span>
        <h3 style="margin-top:15px; font-size:1.3rem;">🎯 題目：${card.q}</h3>
        <p class="text-gray" style="margin-top:10px; font-size:0.9rem;"><i class="fa-solid fa-pointer"></i> 點擊卡片或下方按鈕顯示答案</p>
    `;

    document.getElementById('fc-correct').innerText = card.correct;
    document.getElementById('fc-myans').innerText = card.myans || '未填';
    document.getElementById('fc-reason').innerText = card.reason;
}

function toggleFlashcard() {
    const answerEl = document.getElementById('flashcard-answer');
    if (answerEl && currentFlashcardIndex !== -1) {
        answerEl.classList.toggle('hidden');
    }
}

// ===== 📊 統計圖表與熱力圖模擬佔位 =====
function renderHeatmap() {
    const heatmapContainer = document.getElementById('heatmap');
    if (!heatmapContainer) return;
    // 建立 53 週 x 7 天的極簡 GitHub 熱力矩陣模擬
    heatmapContainer.innerHTML = '';
    for(let i=0; i<35; i++) { // 畫面呈現示範 35 格
        const box = document.createElement('div');
        box.style.width = '12px';
        box.style.height = '12px';
        box.style.backgroundColor = appData.checkins.length > 0 ? '#10b981' : '#e5e7eb';
        box.style.borderRadius = '2px';
        box.style.display = 'inline-block';
        box.style.margin = '2px';
        heatmapContainer.appendChild(box);
    }
}

function renderCharts() {
    const ctx = document.getElementById('timeChart');
    if (!ctx) return;
    
    // 清除舊圖表防止重疊錯誤
    if (window.myDailyChart) window.myDailyChart.destroy();

    // 取得最近 7 天標籤與統計時間
    const labels = [];
    const dataset = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        labels.push(dateStr.slice(5)); // 只拿 MM-DD
        
        const logs = appData.checkins.filter(c => c.date === dateStr);
        const mins = logs.reduce((sum, c) => sum + parseInt(c.time || 0), 0);
        dataset.push(mins);
    }

    if (typeof Chart !== 'undefined') {
        window.myDailyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '學習時間 (分鐘)',
                    data: dataset,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}
