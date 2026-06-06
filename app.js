/**
 * Novel-to-Screenplay · app.js
 * 从 config.js 读取配置，动态支持 阿里云Qwen / Anthropic 等多服务商
 */
'use strict';

// ══ § 1  读取配置 ══════════════════════════════════
if (typeof CONFIG === 'undefined') {
  alert('找不到 config.js！请确认文件在根目录。');
  throw new Error('config.js missing');
}

const PROVIDER_NAME = CONFIG.PROVIDER || 'anthropic';
const PROVIDER      = CONFIG.PROVIDERS?.[PROVIDER_NAME];

if (!PROVIDER) {
  alert(`config.js 中找不到 "${PROVIDER_NAME}" 的配置，请检查 PROVIDER 字段。`);
  throw new Error('provider config missing');
}

const API_KEY    = PROVIDER.API_KEY  || '';
const BASE_URL   = PROVIDER.BASE_URL || '';
const MODEL      = PROVIDER.MODEL    || '';
const MAX_TOKENS = CONFIG.MAX_TOKENS || 4000;

// 页脚显示当前服务商 + 模型
document.getElementById('footer-model').textContent = `${PROVIDER_NAME} / ${MODEL}`;

// Key 未配置时显示警告
const configAlert = document.getElementById('config-alert');
const KEY_UNFILLED = !API_KEY
  || API_KEY.includes('你的')
  || API_KEY.startsWith('sk-ant-你')
  || API_KEY.startsWith('sk-你');
if (KEY_UNFILLED) {
  configAlert.classList.remove('hidden');
} else {
  configAlert.classList.add('hidden');
}

// ══ § 2  DOM ══════════════════════════════════════
const $           = id => document.getElementById(id);
const novelInput  = $('novel-input');
const yamlOutput  = $('yaml-output');
const btnConvert  = $('btn-convert');
const btnCopy     = $('btn-copy');
const btnDownload = $('btn-download');
const btnSample   = $('btn-sample');
const btnClear    = $('btn-clear');
const fileUpload  = $('file-upload');
const charCount   = $('char-count');
const chapterEl   = $('chapter-count');
const progressWrap = $('progress-wrap');
const progressFill = $('progress-fill');
const progressLbl  = $('progress-label');
const errorBox    = $('error-box');
// ✨ 修复：HTML 中实际的 ID 是 stats-strip
const statsRow    = $('stats-strip'); 
const outputHint  = $('output-hint');
const steps       = [1,2,3,4].map(i => $(`step-${i}`));

// ══ § 3  示例文本 ══════════════════════════════════
const DEMO_TEXT = `第一章 尘封的记忆

深秋的午后，阳光像锈迹斑斑的金币，懒洋洋地洒在江南小镇的青石板路上。

林晚舟推开那扇吱呀作响的木门，扑面而来的是二十年未曾散去的樟木气息。

"你回来了。"角落里，一个白发苍苍的老人头也没抬，手中的紫砂壶稳稳地注入茶水。

林晚舟愣了一下，随即苦笑："外公，您怎么知道是我？"

"脚步声。二十年了，你的脚步还是当年那个拖鞋走路的小鬼头。"

第二章 旧伤未愈

三天后，林晚舟在老屋的阁楼上发现了那个落满灰尘的铁皮箱子。

"你不应该来这里。"

林晚舟猛地回头——门口站着一个四十多岁的男人，穿着笔挺的西装。

"我叫顾明川，你父亲的同事，也是他临死前托付的人。"

顾明川从怀里取出一个信封："这封信，等你自己来拿的那一天，才能交给你。"

林晚舟缓缓抬头，眼眶泛红："他说，他不是自写自杀的。"

第三章 暗流涌动

镇上唯一的茶馆里，林晚舟和顾明川相对而坐。

"你相信他写的？"顾明川声音压得极低。

"我相信我的父亲。他做了二十年会计，从来一丝不苟。"

"林工走之前，发现了一笔账目问题，涉及到镇上的陈家开发项目……"

"我是记者。顾先生，你今天来，不只是为了送信吧？"

顾明川低下头："林工生前拷贝了文件，只有你才能找到。"

"告诉我在哪里。"`;

// ══ § 4  章节检测 ══════════════════════════════════
function detectChapters(text) {
  const patterns = [
    /第\s*[一二三四五六七八九十百千\d]+\s*章/g,
    /Chapter\s+\d+/gi,
  ];
  return Math.max(...patterns.map(p => (text.match(p) || []).length));
}

function refreshStats() {
  const text = novelInput.value;
  charCount.textContent = `${text.length.toLocaleString()} 字`;
  const n = detectChapters(text);
  chapterEl.textContent = `检测到 ${n} 章节`;
  chapterEl.className = 'chapter-indicator' + (n >= 3 ? '' : ' warn');
}

novelInput.addEventListener('input', refreshStats);

// ══ § 5  文件上传 ══════════════════════════════════
fileUpload.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    novelInput.value = ev.target.result;
    refreshStats();
    clearError();
  };
  reader.readAsText(file, 'UTF-8');
  fileUpload.value = '';
});

// ══ § 6  YAML 高亮 ═════════════════════════════════
function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function colorVal(v) {
  const t = v.trim();
  if (!t) return '';
  if (/^['"]/.test(t))               return `<span class="yv">${esc(v)}</span>`;
  if (/^\d+(\.\d+)?$/.test(t))       return `<span class="yn">${esc(v)}</span>`;
  if (/^(true|false|null)$/i.test(t))return `<span class="yd">${esc(v)}</span>`;
  return `<span class="yv">${esc(v)}</span>`;
}
function highlightYaml(raw) {
  return raw.split('\n').map(line => {
    if (/^\s*#/.test(line)) return `<span class="yc">${esc(line)}</span>`;
    const kv = line.match(/^(\s*)([\w_-]+)(\s*:\s*)(.*)$/);
    if (kv) {
      const [,indent,key,sep,val] = kv;
      return `${esc(indent)}<span class="yk">${esc(key)}</span>${esc(sep)}${colorVal(val)}`;
    }
    if (/^\s*-\s/.test(line)) {
      const i = line.indexOf('-');
      return `${esc(line.slice(0,i))}<span class="yd">-</span>${colorVal(line.slice(i+1))}`;
    }
    return esc(line);
  }).join('\n');
}

// ══ § 7  统计解析 ══════════════════════════════════
function parseStats(yaml) {
  return {
    acts:    (yaml.match(/^\s*-\s+act_number:/gm)  || []).length || 1,
    scenes:  (yaml.match(/^\s*-\s+scene_id:/gm)    || []).length,
    chars:   Math.max((yaml.match(/^\s*-\s+name:/gm)||[]).length - 2, 0),
    dialogs: (yaml.match(/type:\s*['"]?dialogue/gm) || []).length,
  };
}

// ══ § 8  进度 / 错误 / 步骤 ════════════════════════
const sleep = ms => new Promise(r => setTimeout(r, ms));

function setProgress(pct, label = '') {
  progressWrap.classList.remove('hidden');
  progressFill.style.width = `${pct}%`;
  if (label) progressLbl.textContent = label;
}
function hideProgress() {
  setTimeout(() => { progressWrap.classList.add('hidden'); progressFill.style.width = '0%'; }, 700);
}
function showError(msg) { errorBox.textContent = msg; errorBox.classList.remove('hidden'); }
function clearError()   { errorBox.classList.add('hidden'); }

function setStep(n) {
  steps.forEach((s, i) => {
    if(s) {
      s.classList.toggle('done',   i < n - 1);
      s.classList.toggle('active', i === n - 1);
    }
  });
}
function resetSteps()  { steps.forEach(s => s && s.classList.remove('active','done')); }
function finishSteps() { steps.forEach(s => { if(s){ s.classList.remove('active'); s.classList.add('done'); } }); }

// ══ § 9  Prompt ════════════════════════════════════
const SYSTEM_PROMPT = `你是一位专业剧本改编师，将中文小说改编为结构化影视剧本。

【输出要求】
1. 只输出 YAML 纯文本，不加任何解释，不加 markdown 代码块
2. 所有字符串值用单引号包裹（含单引号则改双引号）
3. 保留原著人物性格和情节脉络
4. 每章至少生成 2 个场景

【Schema】
screenplay:
  meta:
    title: string
    genre: string
    author: string         # 未知则写"未知"
    adapter: string        # 固定写 "Novel-to-Screenplay AI"
    version: string        # 初稿写 "1.0"
    logline: string        # 不超过50字

  characters:
    - name: string
      role: string         # protagonist/antagonist/supporting/minor
      description: string

  acts:
    - act_number: integer  # 1/2/3
      title: string
      scenes:
        - scene_id: string           # A1S1 格式
          chapter_source: string
          location: string
          time_of_day: string        # DAY/NIGHT/DAWN/DUSK/CONTINUOUS
          atmosphere: string
          beats:
            - type: string           # action/dialogue/transition
              character: string      # 仅 dialogue 时填
              content: string
              direction: string      # 可选`;

// ══ § 10  API 调用 ═════════════════════════════════

function buildRequest(novelText) {
  if (PROVIDER_NAME === 'anthropic') {
    return {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: novelText }],
    };
  }
  // 兼容 OpenAI 格式（如阿里云通义千问）
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: novelText },
    ],
  };
}

function buildHeaders() {
  if (PROVIDER_NAME === 'anthropic') {
    return {
      'Content-Type':      'application/json',
      'x-api-key':         API_KEY,
      'anthropic-version': '2023-06-01',
    };
  }
  // 阿里云等标准 Bearer 头
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  };
}

function extractText(data) {
  if (PROVIDER_NAME === 'anthropic') {
    const block = data.content?.find(b => b.type === 'text');
    if (!block?.text) throw new Error('Anthropic 返回内容为空');
    return block.text;
  }
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('API 返回内容为空，请检查 Key 或余额');
  return text;
}

async function callAPI(novelText) {
  // 加上针对特定客户端缺少默认 /chat/completions 后缀的鲁棒兼容
  let targetUrl = BASE_URL;
  if (PROVIDER_NAME !== 'anthropic' && !targetUrl.endsWith('/chat/completions')) {
      targetUrl = targetUrl.replace(/\/+$/, '') + '/chat/completions';
  }

  const resp = await fetch(targetUrl, {
    method:  'POST',
    headers: buildHeaders(),
    body:    JSON.stringify(buildRequest(novelText)),
  });

  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try { msg = (await resp.json()).error?.message || msg; } catch {}
    throw new Error(`[${PROVIDER_NAME}] ${msg}`);
  }

  const data = await resp.json();
  const raw  = extractText(data);

  return raw
    .replace(/^```ya?ml\s*/i, '')
    .replace(/\s*```\s*$/i,   '')
    .trim();
}

// ══ § 11  主流程 ════════════════════════════════════
async function runConvert() {
  const text = novelInput.value.trim();
  clearError();

  if (!text) { showError('请先输入或上传小说文本'); return; }
  
  // ✨ 修复：优化 Key 校验拦截，兼容任意服务商
  if (!API_KEY || API_KEY.includes('xxxxx') || API_KEY.includes('你的')) {
    showError(`请先在 config.js 中填写你的 ${PROVIDER_NAME} API Key，保存后刷新页面`);
    return;
  }
  
  const n = detectChapters(text);
  if (n < 3) {
    showError(`检测到 ${n} 个章节，需要至少 3 章。请确认标题格式（如"第一章""第二章"）`);
    return;
  }

  // 锁定 UI
  btnConvert.disabled = true;
  btnConvert.classList.add('loading');
  btnCopy.disabled = true;
  btnDownload.disabled = true;
  if (statsRow) statsRow.classList.add('hidden');
  outputHint.textContent = '生成中…';
  yamlOutput.innerHTML = '<span class="cursor">正在分析文本...</span>';
  resetSteps();

  try {
    // 进度条会在这里正常被触发亮起
    setStep(1); setProgress(10, '解析章节结构…'); await sleep(500);
    setStep(2); setProgress(28, '提取人物关系…'); await sleep(400);
    setStep(3); setProgress(52, '调用 AI 生成剧本…');

    const yaml = await callAPI(text);

    setProgress(85, '格式化输出…'); setStep(4); await sleep(300);

    // 渲染
    yamlOutput.innerHTML = highlightYaml(yaml);
    yamlOutput._raw = yaml;

    const s = parseStats(yaml);
    $('stat-acts').textContent    = s.acts    || '—';
    $('stat-scenes').textContent  = s.scenes  || '—';
    $('stat-chars').textContent   = s.chars   || '—';
    $('stat-dialogs').textContent = s.dialogs || '—';
    
    if (statsRow) statsRow.classList.remove('hidden');

    setProgress(100); hideProgress(); finishSteps();
    outputHint.textContent = '生成完成 ✓';
    btnCopy.disabled = false;
    btnDownload.disabled = false;

  } catch (err) {
    console.error(err);
    resetSteps();
    yamlOutput.innerHTML = '<span class="pre-placeholder">生成失败，请重试</span>';
    outputHint.textContent = '生成失败';
    showError(`错误：${err.message}`);
    hideProgress();
  } finally {
    btnConvert.disabled = false;
    btnConvert.classList.remove('remove');
    btnConvert.classList.remove('loading');
  }
}

// ══ § 12  事件绑定 ═════════════════════════════════
btnConvert.addEventListener('click', runConvert);

btnSample.addEventListener('click', () => {
  novelInput.value = DEMO_TEXT;
  refreshStats();
  clearError();
});

btnClear.addEventListener('click', () => {
  novelInput.value = '';
  refreshStats();
  clearError();
});

btnCopy.addEventListener('click', async () => {
  const raw = yamlOutput._raw || yamlOutput.textContent;
  try {
    await navigator.clipboard.writeText(raw);
    const orig = btnCopy.textContent;
    btnCopy.textContent = '已复制 ✓';
    setTimeout(() => { btnCopy.textContent = orig; }, 2000);
  } catch {
    showError('复制失败，请手动选中后 Ctrl+C');
  }
});

btnDownload.addEventListener('click', () => {
  const raw = yamlOutput._raw;
  if (!raw) return;
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([raw], { type: 'text/yaml;charset=utf-8' })),
    download: `screenplay_${new Date().toISOString().slice(0,10)}.yaml`,
  });
  a.click();
});

// 初始化
refreshStats();