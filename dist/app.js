// ====== 常量 ======
const DATA = { single: [], multi: [], judge: [] };
const LOG_KEY = 'practice_logs';
const WRONG_KEY = 'wrong_records';
const VERSION_KEY = 'practice_version';

let currentType = 'single';
let currentNum = 1;
let wrongIndex = 0;
let answered = false;
let answerRevealed = false;
let logs = [];
let wrongQids = [];  // 当前错题列表 (排序后的 qid 数组)

// ====== 工具函数 ======
function getData() { return DATA[currentType]; }

function getQuestion() {
  if (currentType === 'wrong') return getWrongQuestion();
  const arr = getData();
  const pfx = { single:'single', multi:'multi', judge:'judge' }[currentType];
  return arr.find(q => parseInt(q.i.replace(pfx, '')) === currentNum);
}

function getWrongQuestion() {
  const qid = wrongQids[wrongIndex];
  if (!qid) return null;
  const prefix = qid.startsWith('single') ? 'single' : qid.startsWith('multi') ? 'multi' : 'judge';
  const num = parseInt(qid.replace(prefix, ''));
  return DATA[prefix].find(q => parseInt(q.i.replace(prefix, '')) === num);
}

function typeLabel(t) {
  return { single:'单选题', multi:'多选题', judge:'判断题' }[t];
}

function diffClass(d) {
  return d === '初级' ? 'easy' : d === '中级' ? 'mid' : 'hard';
}

function qidPrefix(qid) {
  if (qid.startsWith('single')) return 'single';
  if (qid.startsWith('multi')) return 'multi';
  return 'judge';
}

function qidNum(qid) {
  return parseInt(qid.replace(qidPrefix(qid), ''));
}

// ====== 错题集管理 ======
function getWrongRecords() {
  try { return JSON.parse(localStorage.getItem(WRONG_KEY)) || {}; } catch { return {}; }
}
function saveWrongRecords(wr) {
  localStorage.setItem(WRONG_KEY, JSON.stringify(wr));
  rebuildWrongQids(wr);
  updateWrongCount();
}
function rebuildWrongQids(wr) {
  wrongQids = Object.keys(wr || {}).sort();
}
function getProgress(qid) {
  const wr = getWrongRecords();
  const recs = wr[qid] || [];
  return { current: recs.filter(r => r.correct).length, total: 3 };
}
function isMastered(qid) {
  const wr = getWrongRecords();
  const recs = wr[qid];
  return !recs || recs.every(r => r.correct);
}
function updateWrongRecord(qid, correct, userAns, correctAns) {
  const wr = getWrongRecords();
  if (!wr[qid]) wr[qid] = [];
  wr[qid].unshift({ time: new Date().toLocaleString('zh-CN'), correct, userAns, correctAns });
  if (wr[qid].length > 3) wr[qid] = wr[qid].slice(0, 3);

  // 全部正确 → 移出错题集（无需满 3 条）
  const mastered = wr[qid].every(r => r.correct);
  if (mastered) {
    delete wr[qid];
  }
  saveWrongRecords(wr);

  // 如果当前在错题模式，掌握后自动跳到下一题
  if (mastered && currentType === 'wrong') {
    setTimeout(() => showMasteryToast(qid), 300);
    if (wrongQids.length === 0) {
      // 没有更多错题了
      setTimeout(() => render(), 500);
    } else if (wrongIndex >= wrongQids.length) {
      wrongIndex = wrongQids.length - 1;
      setTimeout(() => render(), 500);
    }
  }
}

function updateWrongCount() {
  const el = document.getElementById('wrongCount');
  if (el) el.textContent = wrongQids.length;
}

// ====== 渲染 ======
function render() {
  const q = getQuestion();
  if (!q) {
    if (currentType === 'wrong' && wrongQids.length === 0) {
      document.getElementById('qText').textContent = '🎉 暂无错题，继续保持！';
    } else {
      document.getElementById('qText').textContent = `⚠ 未找到题目`;
    }
    document.getElementById('optionsContainer').innerHTML = '';
    document.getElementById('qTag').textContent = '-';
    document.getElementById('qDiff').textContent = '-';
    document.getElementById('qSummary').textContent = '';
    document.getElementById('progressBar').style.display = 'none';
    document.getElementById('qNum').disabled = false;
    updateNavInfo();
    return;
  }

  const isWrongMode = currentType === 'wrong';
  const actualType = isWrongMode ? qidPrefix(q.i) : currentType;

  document.getElementById('qTag').textContent = typeLabel(actualType);
  const diffEl = document.getElementById('qDiff');
  diffEl.textContent = q.d || '中级';
  diffEl.className = 'q-tag diff-' + diffClass(q.d);
  document.getElementById('qSummary').textContent = q.s || '';
  document.getElementById('qText').textContent = q.q || '';

  // 错题进度条
  const pb = document.getElementById('progressBar');
  if (isWrongMode) {
    const prog = getProgress(q.i);
    const pct = (prog.current / 3) * 100;
    pb.style.display = 'block';
    pb.innerHTML = `
      <div class="prog-label">📌 错题训练 · 已连续答对 <strong>${prog.current}</strong>/3</div>
      <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>`;
  } else {
    pb.style.display = 'none';
  }

  // 选项
  const container = document.getElementById('optionsContainer');
  container.innerHTML = '';
  answered = false;
  answerRevealed = false;
  const fb = document.getElementById('feedback');
  fb.className = 'feedback';
  fb.style.display = 'none';
  document.getElementById('btnSubmit').disabled = false;
  document.getElementById('btnShowAns').textContent = '👁 显示答案';

  const inputType = actualType === 'multi' ? 'checkbox' : 'radio';

  q.o.forEach(opt => {
    const div = document.createElement('div');
    div.className = 'opt-item';
    div.dataset.label = opt.l;

    const input = document.createElement('input');
    input.type = inputType;
    input.name = `opt_${actualType}_${q.i}`;
    input.value = opt.l;
    input.id = `opt_${actualType}_${q.i}_${opt.l}`;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'opt-label';
    labelSpan.textContent = opt.l + '.';

    const textSpan = document.createElement('span');
    textSpan.className = 'opt-text';
    textSpan.textContent = opt.t;

    div.appendChild(input);
    div.appendChild(labelSpan);
    div.appendChild(textSpan);
    div.addEventListener('click', e => {
      if (div.classList.contains('disabled')) return;
      const inp = div.querySelector('input');
      if (inputType === 'radio') {
        container.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        container.querySelectorAll('.opt-item').forEach(o => o.classList.remove('selected'));
      }
      inp.checked = !inp.checked;
      div.classList.toggle('selected', inp.checked);
    });
    container.appendChild(div);
  });

  updateNavInfo();
}

function updateNavInfo() {
  if (currentType === 'wrong') {
    const total = wrongQids.length;
    document.getElementById('navInfo').textContent = total ? `${wrongIndex + 1} / ${total}` : '0 / 0';
    document.getElementById('qNum').value = wrongIndex + 1;
    document.getElementById('qNum').max = total || 1;
    document.getElementById('qNum').disabled = false;
    document.getElementById('btnPrev').disabled = wrongIndex <= 0;
    document.getElementById('btnNext').disabled = wrongIndex >= total - 1;
  } else {
    const total = getData().length;
    document.getElementById('navInfo').textContent = `${currentNum} / ${total}`;
    document.getElementById('qNum').max = total;
    document.getElementById('qNum').value = currentNum;
    document.getElementById('qNum').disabled = false;
    document.getElementById('btnPrev').disabled = currentNum <= 1;
    document.getElementById('btnNext').disabled = currentNum >= total;
  }
}

// ====== 提交判对错 ======
document.getElementById('btnSubmit').addEventListener('click', function () {
  if (answered) return;
  const q = getQuestion();
  if (!q) return;

  const isWrongMode = currentType === 'wrong';
  const actualType = isWrongMode ? qidPrefix(q.i) : currentType;

  const container = document.getElementById('optionsContainer');
  const selected = [];
  container.querySelectorAll('input:checked').forEach(inp => selected.push(inp.value));
  selected.sort();

  const correctLabels = q.o.filter(o => o.c).map(o => o.l);
  correctLabels.sort();

  container.querySelectorAll('.opt-item').forEach(el => {
    el.classList.add('disabled');
    const label = el.dataset.label;
    const isC = correctLabels.includes(label);
    const isS = selected.includes(label);
    if (isC && isS) el.classList.add('correct');
    else if (isC && !isS) el.classList.add('missed');
    else if (!isC && isS) el.classList.add('wrong');
  });

  const isCorrect = JSON.stringify(selected) === JSON.stringify(correctLabels);
  const fb = document.getElementById('feedback');
  if (isCorrect) {
    fb.className = 'feedback correct show';
    fb.innerHTML = `✅ <strong>回答正确！</strong><br>正确答案：<span class="fb-ans">${correctLabels.join('、')}</span>`;
  } else {
    fb.className = 'feedback wrong show';
    fb.innerHTML = `❌ <strong>回答错误</strong><br>你的答案：${selected.length ? selected.join('、') : '（未选）'}<br>正确答案：<span class="fb-ans">${correctLabels.join('、')}</span>`;
  }

  answered = true;
  answerRevealed = true;
  document.getElementById('btnShowAns').textContent = '🔒 隐藏答案';
  this.disabled = true;

  // 双写：logs + wrong_records
  if (isWrongMode) {
    logAttempt(q, selected, correctLabels, isCorrect, q.i);
  } else {
    logAttempt(q, selected, correctLabels, isCorrect);
  }
});

// ====== 显示/隐藏答案 ======
document.getElementById('btnShowAns').addEventListener('click', function () {
  const q = getQuestion();
  if (!q) return;
  const container = document.getElementById('optionsContainer');
  if (!answerRevealed) {
    const correctLabels = q.o.filter(o => o.c).map(o => o.l);
    container.querySelectorAll('.opt-item').forEach(el => {
      el.classList.add('disabled');
      if (correctLabels.includes(el.dataset.label)) el.classList.add('correct');
    });
    answerRevealed = true;
    this.textContent = '🔒 隐藏答案';
  } else if (!answered) {
    container.querySelectorAll('.opt-item').forEach(el => {
      el.classList.remove('disabled', 'correct', 'wrong', 'missed');
    });
    answerRevealed = false;
    this.textContent = '👁 显示答案';
  }
});

// ====== 下一题 ======
function goNext() {
  if (currentType === 'wrong') {
    if (wrongIndex < wrongQids.length - 1) { wrongIndex++; render(); }
  } else {
    if (currentNum < getData().length) { currentNum++; render(); }
  }
}
function goPrev() {
  if (currentType === 'wrong') {
    if (wrongIndex > 0) { wrongIndex--; render(); }
  } else {
    if (currentNum > 1) { currentNum--; render(); }
  }
}

document.getElementById('btnPrev').addEventListener('click', goPrev);
document.getElementById('btnNext').addEventListener('click', goNext);
document.getElementById('btnNextQ').addEventListener('click', goNext);
document.getElementById('qNum').addEventListener('change', function () {
  if (currentType === 'wrong') {
    let v = parseInt(this.value) || 1;
    if (v < 1) v = 1;
    if (v > wrongQids.length) v = wrongQids.length;
    wrongIndex = v - 1;
    render();
  } else {
    let v = parseInt(this.value) || 1;
    const total = getData().length;
    if (v < 1) v = 1;
    if (v > total) v = total;
    currentNum = v;
    render();
  }
});

// ====== 掌握提示 ======
let toastTimer = null;
function showMasteryToast(qid) {
  const old = document.getElementById('masteryToast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.id = 'masteryToast';
  toast.className = 'mastery-toast';
  toast.textContent = `🎉 ${qid} 已全部答对，移出错题集！`;
  document.body.appendChild(toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 2500);
}

// ====== Tab 切换 ======
document.getElementById('tabBar').addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentType = btn.dataset.type;

  // 显示/隐藏区域
  const theoryArea = document.querySelector('.theory-area');
  const practicalArea = document.getElementById('practicalArea');
  const logSection = document.getElementById('logSection');

  if (currentType === 'practical') {
    if (theoryArea) theoryArea.style.display = 'none';
    if (practicalArea) { practicalArea.style.display = 'block'; initPractical(); }
  } else {
    if (practicalArea) practicalArea.style.display = 'none';
    if (theoryArea) theoryArea.style.display = 'block';

    if (currentType === 'wrong') {
      const wr = getWrongRecords();
      rebuildWrongQids(wr);
      wrongIndex = 0;
    } else {
      currentNum = 1;
    }
    render();
  }
});

// ====== 日志管理 ======
function loadLogs() {
  try { logs = JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch { logs = []; }
}
function saveLogs() {
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  renderLogStats();
  renderLogTable();
  document.getElementById('hintLogCount').textContent = `日志: ${logs.length} 条`;
}
function logAttempt(q, selected, correctLabels, isCorrect, forcedQid) {
  loadLogs();
  const qid = forcedQid || q.i;
  logs.push({
    time: new Date().toLocaleString('zh-CN'),
    qid: qid, type: typeLabel(qidPrefix(qid)), summary: q.s || '',
    userAns: selected.join('、') || '（未选）',
    correctAns: correctLabels.join('、'),
    result: isCorrect ? '✓' : '✗'
  });
  saveLogs();

  // 双写 wrong_records
  updateWrongRecord(qid, isCorrect, selected.join('、') || '（未选）', correctLabels.join('、'));
}
function renderLogStats() {
  const total = logs.length;
  const correct = logs.filter(l => l.result === '✓').length;
  const wrong = total - correct;
  const rate = total ? (correct / total * 100).toFixed(1) : 0;
  const singleN = logs.filter(l => l.qid.startsWith('single')).length;
  const multiN = logs.filter(l => l.qid.startsWith('multi')).length;
  const judgeN = logs.filter(l => l.qid.startsWith('judge')).length;
  document.getElementById('logStats').innerHTML = `
    <div class="stat-card"><div class="num">${total}</div><div class="label">总答题数</div></div>
    <div class="stat-card"><div class="num green">${correct}</div><div class="label">正确数</div></div>
    <div class="stat-card"><div class="num red">${wrong}</div><div class="label">错误数</div></div>
    <div class="stat-card"><div class="num">${rate}%</div><div class="label">正确率</div></div>
    <div class="stat-card"><div class="num">${singleN}</div><div class="label">单选</div></div>
    <div class="stat-card"><div class="num">${multiN}</div><div class="label">多选</div></div>
    <div class="stat-card"><div class="num">${judgeN}</div><div class="label">判断</div></div>
    <div class="stat-card"><div class="num" style="color:var(--danger)">${wrongQids.length}</div><div class="label">待掌握错题</div></div>`;
}
function renderLogTable() {
  const tbody = document.getElementById('logBody');
  if (!logs.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:20px;">暂无答题记录</td></tr>';
    return;
  }
  const recent = [...logs].reverse().slice(0, 100);
  tbody.innerHTML = recent.map(l => `<tr>
    <td>${l.time}</td><td><strong>${l.qid}</strong></td>
    <td>${l.userAns}</td><td>${l.correctAns}</td>
    <td><span class="badge ${l.result === '✓' ? 'badge-ok' : 'badge-fail'}">${l.result === '✓' ? '正确' : '错误'}</span></td>
  </tr>`).join('');
}

// ====== 导出/导入 ======
document.getElementById('btnExportLog').addEventListener('click', () => {
  if (!logs.length) { alert('暂无日志可导出'); return; }
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    practice_logs: logs,
    wrong_records: getWrongRecords()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `答题记录_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(blob);
});

document.getElementById('btnImportLog').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.practice_logs) {
        alert('无效的导入文件：未找到做题记录');
        return;
      }

      const existCount = logs.length;
      const importCount = data.practice_logs.length;

      // 合并 practice_logs（去重，按 qid+time 去重）
      const existing = new Set(logs.map(l => l.qid + '|' + l.time));
      const merged = [...logs];
      let added = 0;
      data.practice_logs.forEach(l => {
        const key = l.qid + '|' + l.time;
        if (!existing.has(key)) { merged.push(l); added++; }
      });
      merged.sort((a, b) => new Date(a.time) - new Date(b.time));
      logs = merged;
      localStorage.setItem(LOG_KEY, JSON.stringify(logs));

      // 合并 wrong_records
      if (data.wrong_records) {
        const wr = getWrongRecords();
        const wrKeys = new Set(Object.keys(wr));
        Object.entries(data.wrong_records).forEach(([qid, recs]) => {
          if (wrKeys.has(qid)) {
            // 已有该题记录，合并去重（time-based）
            const existingTimes = new Set(wr[qid].map(r => r.time));
            recs.forEach(r => { if (!existingTimes.has(r.time)) wr[qid].push(r); });
            wr[qid].sort((a, b) => new Date(b.time) - new Date(a.time));
            wr[qid] = wr[qid].slice(0, 3);
          } else {
            wr[qid] = recs;
          }
          // 检查是否已掌握
          if (wr[qid].every(r => r.correct)) {
            delete wr[qid];
          }
        });
        saveWrongRecords(wr);
      }

      renderLogStats();
      renderLogTable();
      document.getElementById('hintLogCount').textContent = `日志: ${logs.length} 条`;
      alert(`✅ 导入完成！原有 ${existCount} 条，新增 ${added} 条，共 ${logs.length} 条记录`);
    } catch (err) {
      alert('导入失败：' + err.message);
    }
  };
  input.click();
});

document.getElementById('btnClearLog').addEventListener('click', () => {
  if (logs.length && confirm('确定清空所有答题记录和错题集？')) {
    logs = [];
    saveLogs();
    saveWrongRecords({});
    if (currentType === 'wrong') { currentType = 'single'; currentNum = 1; render(); }
    // 重置 tab 高亮
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.type === 'single');
    });
  }
});

document.getElementById('logToggle').addEventListener('click', () => {
  document.getElementById('logSection').classList.toggle('open');
  document.getElementById('logArrow').classList.toggle('open');
});

// ====== 键盘快捷键 ======
document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea')) return;
  if (e.key === 'ArrowLeft') goPrev();
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
  if (e.key === 'Enter') document.getElementById('btnSubmit').click();
  if (e.key === 'a' || e.key === 'A') document.getElementById('btnShowAns').click();
});

// ====== 旧数据迁移 ======
function checkMigration() {
  const ver = localStorage.getItem(VERSION_KEY);
  const hasLogs = logs.length > 0;
  const hasWrong = Object.keys(getWrongRecords()).length > 0;

  // 新版已初始化过 wrong_records → 无需迁移
  if (hasWrong) return;

  // 有旧日志但无 wrong_records → 弹窗
  if (hasLogs) {
    const overlay = document.getElementById('migrateOverlay');
    if (overlay) {
      document.getElementById('migrateCount').textContent = logs.length;
      overlay.style.display = 'flex';
    }
  }
}

function doMigrate() {
  const wr = {};
  // 按题号分组
  const groups = {};
  logs.forEach(l => {
    if (!groups[l.qid]) groups[l.qid] = [];
    groups[l.qid].push({
      time: l.time,
      correct: l.result === '✓',
      userAns: l.userAns,
      correctAns: l.correctAns
    });
  });

  Object.entries(groups).forEach(([qid, recs]) => {
    // 取最近3条
    recs.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recent = recs.slice(0, 3);
    // 只要最近3条中有任意一条答错过，就进错题集
    if (recent.some(r => !r.correct)) {
      wr[qid] = recent;
    }
    // 如果3条全对且长度=3，说明已掌握，不加入
  });

  saveWrongRecords(wr);
  const count = Object.keys(wr).length;
  document.getElementById('migrateOverlay').style.display = 'none';
  localStorage.setItem(VERSION_KEY, '2');
  document.getElementById('wrongCount').textContent = count;
  alert(`✅ 已导入错题集！识别到 ${count} 道需巩固的题目`);
}

function skipMigration() {
  document.getElementById('migrateOverlay').style.display = 'none';
  localStorage.setItem(VERSION_KEY, '2');
}

// ====== 初始化 ======
function init() {
  if (typeof QUESTION_DATA === 'undefined') {
    document.getElementById('loading').innerHTML =
      '<div style="color:var(--danger);font-size:40px;margin-bottom:12px;">⚠</div>' +
      '<div style="color:var(--text-light)">题库数据加载失败</div>' +
      '<div style="margin-top:12px;font-size:13px;color:var(--text-light)">' +
      '请确保 data.js 与 index.html 在同一目录</div>';
    return;
  }
  DATA.single = QUESTION_DATA.s;
  DATA.multi = QUESTION_DATA.m;
  DATA.judge = QUESTION_DATA.j;

  const s = DATA.single.length, m = DATA.multi.length, j = DATA.judge.length;
  document.getElementById('countSingle').textContent = s;
  document.getElementById('countMulti').textContent = m;
  document.getElementById('countJudge').textContent = j;
  document.getElementById('hintTotal').textContent = `题库: ${s + m + j} 题`;

  loadLogs();
  const wr = getWrongRecords();
  rebuildWrongQids(wr);
  updateWrongCount();
  renderLogStats();
  renderLogTable();

  document.getElementById('loading').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  render();

  // 旧数据迁移检查
  checkMigration();
}

document.getElementById('btnMigrateYes').addEventListener('click', doMigrate);
document.getElementById('btnMigrateNo').addEventListener('click', skipMigration);

init();
