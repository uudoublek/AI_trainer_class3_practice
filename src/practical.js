// ====== 操作题模块 ======
const PRACTICAL = typeof PRACTICAL_DATA !== 'undefined' ? PRACTICAL_DATA : [];
// ANSWERS_31 由 answers_31.js 定义（var），通过 self 访问
let currentPracticalIdx = 0;

// ── 简易 Markdown 渲染 ──
function renderMarkdown(md) {
  let html = '';
  const lines = md.split('\n');
  let inCode = false, codeBuf = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 代码块
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html += `<pre class="prac-code">${escHtml(codeBuf.join('\n'))}</pre>`;
        codeBuf = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    const trimmed = line.trim();

    // 空行
    if (!trimmed) { html += '<div style="height:8px"></div>'; continue; }

    // 标题
    if (trimmed.startsWith('### ')) { html += `<h3>${inlineMd(trimmed.slice(4))}</h3>`; continue; }
    if (trimmed.startsWith('## ')) { html += `<h2>${inlineMd(trimmed.slice(3))}</h2>`; continue; }
    if (trimmed.startsWith('# ')) { html += `<h1>${inlineMd(trimmed.slice(2))}</h1>`; continue; }

    // 分割线
    if (/^-{3,}$/.test(trimmed)) { html += '<hr>'; continue; }

    // 无序列表
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      html += `<li>${inlineMd(trimmed.replace(/^[*-]\s*/, ''))}</li>`;
      // 检查下一条是否也是列表项
      while (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (next.startsWith('* ') || next.startsWith('- ')) {
          i++;
          html += `<li>${inlineMd(next.replace(/^[*-]\s*/, ''))}</li>`;
        } else break;
      }
      html = html.replace(/^(<li>)/, '<ul>$1').replace(/(<\/li>)$/, '$1</ul>');
      continue;
    }

    // 有序列表
    if (/^\d+\.\s/.test(trimmed)) {
      html += `<li>${inlineMd(trimmed.replace(/^\d+\.\s*/, ''))}</li>`;
      while (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (/^\d+\.\s/.test(next)) {
          i++;
          html += `<li>${inlineMd(next.replace(/^\d+\.\s*/, ''))}</li>`;
        } else break;
      }
      html = html.replace(/^(<li>)/, '<ol>$1').replace(/(<\/li>)$/, '$1</ol>');
      continue;
    }

    // 普通段落
    html += `<p>${inlineMd(trimmed)}</p>`;
  }

  // 处理表格 (简单 pipe 表格)
  html = html.replace(/\|(.+)\|\s*<br>\s*\|[-| :]+\|\s*<br>((?:\|.+\|\s*<br>\s*)*)/g, (_, header, bodyRows) => {
    const headers = header.split('|').map(h => `<th>${h.trim()}</th>`).join('');
    const rows = bodyRows.trim().split('<br>').filter(r => r.trim()).map(r => {
      const cells = r.split('|').filter((_, i, a) => i > 0 && i < a.length - 1 || a.length <= 2).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });
  // Fallback: 简单 pipe 行转表格
  html = html.replace(/\|(.+)\|\n\|([-| :]+)\|\n((?:\|.+\|\n)*)/g, (match, header, sep, body) => {
    const headers = header.split('|').filter(h => h.trim()).map(h => `<th>${h.trim()}</th>`).join('');
    const rows = body.trim().split('\n').filter(r => r.trim()).map(r => {
      const cells = r.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  return html;
}

function inlineMd(text) {
  return escHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function isLongAnswer(text) {
  return text.includes('<') || text.length > 50;
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderPractical() {
  const q = PRACTICAL[currentPracticalIdx];
  if (!q) {
    document.getElementById('pracContainer').innerHTML = '<p style="color:var(--text-light);padding:40px;text-align:center;">暂无操作题数据</p>';
    updatePracNav();
    return;
  }

  // 3.1.x → 使用参考答案 Markdown 渲染（跳过量表阅读材料，避免重复）
  const is31 = q.i.startsWith('3.1');
  if (is31 && self.ANSWERS_31 && self.ANSWERS_31[q.i]) {
    renderAnswer31(q);
    return;
  }

  const meta = q.m || {};
  const subs = q.q || [];

  // 标题 & 元信息
  let html = `
    <div class="prac-header">
      <div class="prac-meta">
        <span class="q-tag">${q.i}</span>
        <span class="q-tag diff-${diffClass(q.d)}">${q.d || ''}</span>
        <span class="q-summary">${escHtml(q.s || '')}</span>
      </div>
      <div class="prac-info">
        ${meta.子题数量 ? `<span>子题: ${meta.子题数量}</span>` : ''}
        ${meta.总分 ? `<span>总分: ${meta.总分}</span>` : ''}
        ${meta.预计时长 ? `<span>时长: ${meta.预计时长}</span>` : ''}
      </div>
    </div>`;

  // 阅读材料 (折叠)
  if (q.r) {
    html += `
      <details class="prac-reading" ${subs.length === 0 ? 'open' : ''}>
        <summary>📄 阅读材料</summary>
        <div class="prac-reading-body">${q.r}</div>
      </details>`;
  }

  // 子题目
  if (subs.length === 0 && !q.r) {
    html += '<p style="color:var(--text-light);text-align:center;padding:20px;">该题暂无子题目</p>';
  }

  subs.forEach((sub, si) => {
    const body = sub.b || {};
    const template = body.p || '';
    const blanks = body.a || [];

    html += `<div class="prac-subq" data-sub="${si}">`;
    html += `<div class="prac-subq-title">${escHtml(sub.t || sub.y || `第 ${sub.n || si+1} 题`)}</div>`;

    // 4.x.x：直接填充答案到文本中，特殊颜色标注
    if (q.i.startsWith('4.') && blanks.length > 0) {
      let filled = template;
      blanks.forEach(b => {
        filled = filled.replace(`{{${b.i}}}`, `<span class="prac-answer-fill">${escHtml(b.a)}</span>`);
      });
      html += `<div class="prac-answer-prose prac-answer-4">${filled.replace(/\n/g, '<br>')}</div>`;
      html += `</div>`;
      return;
    }

    if (blanks.length === 0) {
      // 无空白，直接渲染模板为代码
      html += `<pre class="prac-code">${escHtml(template)}</pre>`;
    } else {
      // 判断是否为"大篇幅答案"模式
      const allLong = blanks.every(b => isLongAnswer(b.a));
      // 判断模板是否包含实质代码（含 import/def/=等关键字才算代码）
      const cleaned = template.replace(/\{\{\d+\}\}/g, '').trim();
      const hasCode = /(?:import |def |class |return |print\(|\.\w+\(|\w+\s*=\s*|data\[|pd\.|np\.)/.test(cleaned);
      
      if (allLong && !hasCode) {
        // 纯问答模式：直接显示答案（非等宽字体，紧凑排版）
        html += `<div class="prac-answer-prose">`;
        blanks.forEach(b => {
          if (b.a.includes('<')) {
            html += `<div class="prac-ans-block">${b.a}</div>`;
          } else {
            html += `<pre class="prac-code">${escHtml(b.a)}</pre>`;
          }
        });
        html += `</div>`;
      } else if (allLong && hasCode) {
        // 代码+长答案模式
        let filled = template;
        blanks.forEach(b => {
          filled = filled.replace(`{{${b.i}}}`, `<span class="prac-answer-inline">${b.a}</span>`);
        });
        html += `<pre class="prac-code prac-code-answered">${filled}</pre>`;
      } else {
        // 填空模式：将模板中的 {{N}} 替换为 input
        let parts = template.split(/(\{\{\d+\}\})/);
        let codeHtml = '';
        parts.forEach(part => {
          const m = part.match(/^\{\{(\d+)\}\}$/);
          if (m) {
            const blank = blanks.find(b => String(b.i) === m[1]);
            if (blank) {
              const ans = blank.a;
              if (isLongAnswer(ans)) {
                // 单个长答案也直接显示
                codeHtml += `<span class="prac-answer-inline">${ans}</span>`;
              } else {
                const val = escHtml(ans);
                codeHtml += `<input type="text" class="prac-input" 
                  data-answer="${val}"
                  value="" placeholder="..." 
                  style="min-width:6ch;width:6ch"
                  ondblclick="revealPracAnswer(this)"
                  oninput="autoGrowInput(this)"
                  onkeydown="pracInputKeydown(event)">`;
              }
            }
          } else {
            codeHtml += escHtml(part);
          }
        });
        html += `<pre class="prac-code">${codeHtml}</pre>`;
        
        // 显示/隐藏答案按钮
        html += `<div class="prac-actions">
          <button class="btn btn-outline btn-sm" onclick="togglePracAnswers(this)">👁 显示本空答案</button>
        </div>`;
      }
    }

    html += `</div>`;
  });

  document.getElementById('pracContainer').innerHTML = html;
  updatePracNav();
  updatePracChapterNav();
}

// ── 3.1.x 参考答案渲染 ──
function renderAnswer31(q) {
  const meta = q.m || {};
  const md = self.ANSWERS_31[q.i];
  const mdHtml = renderMarkdown(md);

  let imgs = '';
  // 加载图片：位置1同时试 答案.png 和 答案1.png（兼容不同命名规则）
  const imgNames = [`${q.i}答案.png`, `${q.i}答案1.png`];
  for (let n = 2; n <= 5; n++) imgNames.push(`${q.i}答案${n}.png`);
  imgNames.forEach(name => {
    imgs += `<img src="3.1答案/${name}" class="prac-img" onerror="this.style.display='none'" loading="lazy">`;
  });

  const html = `
    <div class="prac-header">
      <div class="prac-meta">
        <span class="q-tag">${q.i}</span>
        <span class="q-tag diff-${diffClass(q.d)}">${q.d || ''}</span>
        <span class="q-summary">${escHtml(q.s || '')}</span>
      </div>
      <div class="prac-info">
        ${meta.子题数量 ? `<span>子题: ${meta.子题数量}</span>` : ''}
        ${meta.总分 ? `<span>总分: ${meta.总分}</span>` : ''}
        ${meta.预计时长 ? `<span>时长: ${meta.预计时长}</span>` : ''}
      </div>
    </div>
    <div class="prac-answer-31">
      <div class="prac-subq-title">📝 参考答案</div>
      <div class="prac-md-body">${mdHtml}</div>
      <div class="prac-imgs">${imgs}</div>
    </div>`;

  document.getElementById('pracContainer').innerHTML = html;
  updatePracNav();
  updatePracChapterNav();
}


function updatePracNav() {
  const total = PRACTICAL.length;
  document.getElementById('pracInfo').textContent = total ? `${currentPracticalIdx + 1} / ${total}` : '0 / 0';
  document.getElementById('pracPrev').disabled = currentPracticalIdx <= 0;
  document.getElementById('pracNext').disabled = currentPracticalIdx >= total - 1;
}

function updatePracChapterNav() {
  const container = document.getElementById('pracChapterNav');
  const chapters = {};
  PRACTICAL.forEach((q, i) => {
    const ch = q.i.split('.')[0];
    if (!chapters[ch]) chapters[ch] = [];
    chapters[ch].push(i);
  });
  
  let html = '';
  Object.entries(chapters).forEach(([ch, indices]) => {
    const active = indices.includes(currentPracticalIdx);
    html += `<span class="prac-chapter ${active ? 'active' : ''}">`;
    html += `<span class="prac-ch-title">第${ch}章</span>`;
    html += `<span class="prac-ch-items">`;
    indices.forEach(idx => {
      const q = PRACTICAL[idx];
      const isActive = idx === currentPracticalIdx;
      html += `<span class="prac-ch-item ${isActive ? 'active' : ''}" 
        onclick="window._gotoPrac(${idx})" title="${q.s || q.i}">${q.i.split('.')[1]}.${q.i.split('.')[2]}</span>`;
    });
    html += `</span></span>`;
  });
  container.innerHTML = html;
}

window._gotoPrac = function(idx) {
  currentPracticalIdx = idx;
  renderPractical();
};

function pracGoPrev() {
  if (currentPracticalIdx > 0) { currentPracticalIdx--; renderPractical(); }
}
function pracGoNext() {
  if (currentPracticalIdx < PRACTICAL.length - 1) { currentPracticalIdx++; renderPractical(); }
}

// Input auto-grow
function autoGrowInput(el) {
  const len = el.value.length || 1;
  el.style.width = `min(${Math.max(6, len + 2)}ch, 95%)`;
  if (el.value.length === 0) el.style.width = '6ch';
}

// Reveal single answer (double-click)
function revealPracAnswer(el) {
  const ans = el.dataset.answer;
  if (!ans) return;
  if (el.classList.contains('revealed')) {
    el.value = '';
    el.classList.remove('revealed');
  } else {
    el.value = ans;
    el.classList.add('revealed');
    autoGrowInput(el);
  }
}

// Toggle all answers in sub-question
function togglePracAnswers(btn) {
  const container = btn.closest('.prac-subq');
  const inputs = container.querySelectorAll('.prac-input');
  const allRevealed = Array.from(inputs).every(inp => inp.classList.contains('revealed'));
  
  inputs.forEach(inp => {
    if (allRevealed) {
      inp.value = '';
      inp.classList.remove('revealed');
    } else {
      inp.value = inp.dataset.answer;
      inp.classList.add('revealed');
      autoGrowInput(inp);
    }
  });
  
  btn.textContent = allRevealed ? '👁 显示本空答案' : '🔒 隐藏本空答案';
}

// Keyboard: Cmd+Enter / Ctrl+Enter
function pracInputKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    revealPracAnswer(e.target);
  }
}

// ====== Init practical from tab switch ======
function initPractical() {
  const btn = document.querySelector('[data-type="practical"]');
  if (btn) document.getElementById('pracCount').textContent = PRACTICAL.length;
  if (PRACTICAL.length > 0) renderPractical();
}
