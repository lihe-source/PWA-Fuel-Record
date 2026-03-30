// app.js - 油耗紀錄 PWA 主程式

const APP_VERSION = '1.1.0';
const DRIVE_FOLDER_NAME = 'PWA-Fuel-Record-Backups'; // Google Drive backup folder name
const DRIVE_MAX_BACKUPS = 5; // Maximum number of Drive backups to keep

// ── Swipe gesture thresholds ──────────────────────
const SWIPE_EDGE_THRESHOLD = 40;    // px from left edge to start gesture
const SWIPE_MIN_START = 8;          // minimum dx to begin drag
const SWIPE_COMPLETE_THRESHOLD = 80; // dx required to trigger close
const SWIPE_DIRECTIONAL_RATIO = 1.5; // |dx| must exceed |dy| * ratio

// ── 預設假資料 ──────────────────────────────────────
const defaultVehicles = [
  { id: 1, name: 'Toyota RAV4', type: 'car', note: '2021年 2.0L', createdAt: new Date().toISOString() },
  { id: 2, name: 'SYM Fiddle', type: 'motorcycle', note: '125cc', createdAt: new Date().toISOString() }
];

const defaultRecords = [
  { vehicleId: 1, type: 'fuel', date: '2025-03-01', odometer: 44800, liters: 45.2, fuelCost: 1950, fuelEfficiency: 12.1, note: '', createdAt: new Date().toISOString() },
  { vehicleId: 1, type: 'fuel', date: '2025-03-20', odometer: 45230, liters: 35.0, fuelCost: 1520, fuelEfficiency: 12.3, note: '', createdAt: new Date().toISOString() },
  { vehicleId: 1, type: 'maintenance', date: '2025-02-10', odometer: 44000, items: ['換機油', '換濾芯'], maintenanceCost: 1800, nextOdometerReminder: 49000, note: '5000km 後換油', createdAt: new Date().toISOString() },
  { vehicleId: 2, type: 'fuel', date: '2025-03-15', odometer: 18600, liters: 3.5, fuelCost: 150, fuelEfficiency: 37.1, note: '', createdAt: new Date().toISOString() },
  { vehicleId: 2, type: 'fuel', date: '2025-03-25', odometer: 18760, liters: 4.2, fuelCost: 180, fuelEfficiency: 38.5, note: '', createdAt: new Date().toISOString() },
  { vehicleId: 2, type: 'maintenance', date: '2025-01-20', odometer: 17500, items: ['換機油'], maintenanceCost: 350, nextOdometerReminder: 20000, note: '', createdAt: new Date().toISOString() }
];

// ── State ─────────────────────────────────────────
let vehicles = [];
let records = [];
let currentPage = 'dashboard';
let swRegistration = null;
let gisTokenClient = null;
let driveAccessToken = null;
let activeVehicleFilter = 'all';
let activeTypeFilter = 'all';
let historySortOrder = 'desc';
let selectedMaintItems = [];
let expandedVehicleId = null;
let swipeCooldown = false;

// ── DOM Helpers ───────────────────────────────────
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

// ── Toast ─────────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  const t = $('toast');
  clearTimeout(toastTimer);
  t.textContent = msg;
  t.className = type ? `show ${type}` : 'show';
  toastTimer = setTimeout(() => { t.className = ''; }, 2500);
}

// ── Navigation ────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const pageEl = $(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  const navBtn = $(`nav-${page}`);
  if (navBtn) navBtn.classList.add('active');
  currentPage = page;
  if (page === 'dashboard') renderDashboard();
  if (page === 'history') renderHistory();
  if (page === 'vehicles') renderVehiclesPage();
  if (page === 'settings') renderSettings();
}

// ── Modal ─────────────────────────────────────────
function openModal(id) {
  const m = $(id);
  if (!m) return;
  m.classList.add('slide-in');
}

function closeModal(id, cb) {
  const m = $(id);
  if (!m) return;
  m.classList.remove('slide-in');
  if (cb) setTimeout(cb, 300);
}

// ── Sheet ─────────────────────────────────────────
function openSheet(overlayId, panelId) {
  const ov = $(overlayId);
  const pn = $(panelId);
  if (ov) ov.classList.add('show');
  if (pn) pn.classList.add('slide-up');
}

function closeSheet(overlayId, panelId, cb) {
  const ov = $(overlayId);
  const pn = $(panelId);
  if (ov) ov.classList.remove('show');
  if (pn) pn.classList.remove('slide-up');
  if (cb) setTimeout(cb, 300);
}

// ── Theme ─────────────────────────────────────────
function applyTheme() {
  const isLight = localStorage.getItem('theme') === 'light';
  document.body.classList.toggle('light-mode', isLight);
  $('theme-toggle-btn').textContent = isLight ? '☀️' : '🌙';
  const toggle = $('theme-toggle-settings');
  if (toggle) toggle.checked = isLight;
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light-mode');
  localStorage.setItem('theme', isLight ? 'dark' : 'light');
  applyTheme();
}

// ── Version Check ─────────────────────────────────
function isNewerVersion(remote, current) {
  const r = remote.split('.').map(Number);
  const c = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (r[i] > c[i]) return true;
    if (r[i] < c[i]) return false;
  }
  return false;
}

async function checkForUpdate() {
  try {
    const res = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    if (isNewerVersion(data.version, APP_VERSION)) {
      showUpdateSheet(data.version);
    }
  } catch (e) { /* offline */ }
}

function showUpdateSheet(newVer) {
  $('update-new-ver').textContent = newVer;
  openSheet('update-overlay', 'update-sheet');
}

// ── Data Load ─────────────────────────────────────
async function loadData() {
  vehicles = await getAllVehicles();
  records = await getAllRecords();

  // Seed default data if empty
  if (vehicles.length === 0) {
    for (const v of defaultVehicles) await addVehicle(v);
    for (const r of defaultRecords) await addRecord(r);
    vehicles = await getAllVehicles();
    records = await getAllRecords();
  }
}

// ── Dashboard (Accordion) ─────────────────────────
function renderDashboard() {
  const list = $('vehicle-list');
  if (!list) return;
  list.innerHTML = '';

  if (vehicles.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚗</div>
        <p>尚無車輛資料</p>
        <small>前往「車輛」頁面新增您的車輛</small>
      </div>`;
    return;
  }

  vehicles.forEach(v => {
    const vRecords = records.filter(r => r.vehicleId === v.id);
    const fuelRecords = vRecords.filter(r => r.type === 'fuel').sort((a, b) => b.date.localeCompare(a.date));
    const maintRecords = vRecords.filter(r => r.type === 'maintenance').sort((a, b) => b.date.localeCompare(a.date));

    const allSorted = [...vRecords].sort((a, b) => b.date.localeCompare(a.date));
    const latestOdometer = allSorted[0]?.odometer || null;
    const latestEfficiency = fuelRecords[0]?.fuelEfficiency || null;
    const avgEfficiency = fuelRecords.length > 0
      ? fuelRecords.reduce((s, r) => s + (r.fuelEfficiency || 0), 0) / fuelRecords.length
      : null;
    const totalCost = vRecords.reduce((s, r) => s + (r.fuelCost || 0) + (r.maintenanceCost || 0), 0);
    const latestMaint = maintRecords[0];
    const emoji = v.type === 'motorcycle' ? '🛵' : '🚗';
    const isOpen = expandedVehicleId === v.id;

    // Maintenance info
    let maintDateStr = '—';
    let nextMaintStr = '';
    let nextMaintClass = '';
    if (latestMaint) {
      maintDateStr = latestMaint.date;
      if (latestMaint.nextOdometerReminder && latestOdometer) {
        const diff = latestMaint.nextOdometerReminder - latestOdometer;
        if (diff > 0) {
          nextMaintStr = `還差 ${diff.toLocaleString()} km`;
        } else {
          nextMaintStr = '已到期';
          nextMaintClass = 'overdue';
        }
      }
    }

    // Recent 3 records
    const recent3 = allSorted.slice(0, 3);
    const recentHtml = recent3.length === 0 ? '<div style="font-size:11px;color:var(--text3);padding:4px 0">尚無記錄</div>' :
      recent3.map(r => `
        <div class="vc-recent-item">
          <span class="vc-recent-icon">${r.type === 'fuel' ? '⛽' : '🔧'}</span>
          <div class="vc-recent-info">
            <div class="vc-recent-date">${r.date}</div>
          </div>
          <div class="vc-recent-val">
            ${r.type === 'fuel' ? (r.fuelEfficiency > 0 ? r.fuelEfficiency.toFixed(1) + ' km/L' : `$${Number(r.fuelCost).toLocaleString()}`) : `$${Number(r.maintenanceCost).toLocaleString()}`}
          </div>
        </div>`).join('');

    const card = el('div', 'card glass vehicle-card');
    card.innerHTML = `
      <div class="vc-header" data-vid="${v.id}">
        <div class="vc-header-left">
          <span class="vc-emoji">${emoji}</span>
          <div>
            <div class="vc-name">${escHtml(v.name)}</div>
            <div class="vc-note">${escHtml(v.note || '')}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="text-align:right">
            <span class="vc-odometer">${latestOdometer !== null ? Number(latestOdometer).toLocaleString() : '—'}</span>
            ${latestOdometer !== null ? '<span class="vc-odometer-unit">km</span>' : ''}
          </div>
          <span class="vc-chevron${isOpen ? ' open' : ''}">▼</span>
        </div>
      </div>
      <div class="vc-body${isOpen ? ' open' : ''}">
        <div class="vc-body-inner">
          <!-- Stats row -->
          <div class="vc-stats-row">
            <div class="vc-stat-box">
              <div class="vsb-val">⛽ ${latestEfficiency !== null ? latestEfficiency.toFixed(1) + ' km/L' : '—'}</div>
              <div class="vsb-label">最近油耗</div>
            </div>
            <div class="vc-stat-box">
              <div class="vsb-val">📊 ${avgEfficiency !== null ? avgEfficiency.toFixed(1) + ' km/L' : '—'}</div>
              <div class="vsb-label">平均油耗</div>
            </div>
            <div class="vc-stat-box">
              <div class="vsb-val">💰 $${totalCost.toLocaleString()}</div>
              <div class="vsb-label">累計花費</div>
            </div>
          </div>
          <!-- Maintenance info -->
          <div class="vc-maint-row">
            <div class="vc-maint-item">🔧 上次保養：${escHtml(maintDateStr)}</div>
            ${nextMaintStr ? `<div class="vc-maint-item ${nextMaintClass}">🔔 下次保養：${escHtml(nextMaintStr)}</div>` : ''}
          </div>
          <!-- Recent records -->
          <div class="vc-recent-records">${recentHtml}</div>
          <!-- Quick actions -->
          <div class="vc-actions">
            <button class="vc-action-btn" data-action="history" data-vid="${v.id}">查看全部記錄</button>
            <button class="vc-action-btn" data-action="add" data-vid="${v.id}">新增記錄</button>
          </div>
        </div>
      </div>`;

    // Accordion toggle
    card.querySelector('.vc-header').addEventListener('click', () => {
      if (expandedVehicleId === v.id) {
        expandedVehicleId = null;
      } else {
        expandedVehicleId = v.id;
      }
      renderDashboard();
    });

    // Quick action buttons
    card.querySelector('[data-action="history"]').addEventListener('click', (e) => {
      e.stopPropagation();
      activeVehicleFilter = String(v.id);
      navigate('history');
    });
    card.querySelector('[data-action="add"]').addEventListener('click', (e) => {
      e.stopPropagation();
      openAddModal(v.id);
    });

    list.appendChild(card);
  });
}

// ── Vehicle Detail Modal ───────────────────────────
let detailVehicleId = null;
let detailTab = 'fuel';

function openVehicleDetail(vehicleId) {
  detailVehicleId = vehicleId;
  detailTab = 'fuel';
  renderVehicleDetail();
  openModal('vehicle-detail-modal');
}

function renderVehicleDetail() {
  const v = vehicles.find(v => v.id === detailVehicleId);
  if (!v) return;
  const vRecords = records.filter(r => r.vehicleId === v.id);
  const fuelRecords = vRecords.filter(r => r.type === 'fuel').sort((a, b) => b.date.localeCompare(a.date));
  const maintRecords = vRecords.filter(r => r.type === 'maintenance').sort((a, b) => b.date.localeCompare(a.date));

  const emoji = v.type === 'motorcycle' ? '🛵' : '🚗';
  $('detail-vehicle-title').textContent = `${emoji} ${v.name}`;

  // Stats
  const avgEff = fuelRecords.length > 0
    ? (fuelRecords.reduce((s, r) => s + (r.fuelEfficiency || 0), 0) / fuelRecords.length).toFixed(1)
    : '—';
  const totalFuelCost = fuelRecords.reduce((s, r) => s + (r.fuelCost || 0), 0);
  const totalMaintCost = maintRecords.reduce((s, r) => s + (r.maintenanceCost || 0), 0);
  const latestOdometer = [...fuelRecords, ...maintRecords].sort((a, b) => b.date.localeCompare(a.date))[0]?.odometer || '—';

  $('detail-stats').innerHTML = `
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-val">${avgEff}</div>
        <div class="stat-label">平均油耗</div>
      </div>
      <div class="stat-box">
        <div class="stat-val">${fuelRecords.length}</div>
        <div class="stat-label">加油次數</div>
      </div>
      <div class="stat-box">
        <div class="stat-val">${latestOdometer !== '—' ? Number(latestOdometer).toLocaleString() : '—'}</div>
        <div class="stat-label">最新里程</div>
      </div>
    </div>
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-val" style="font-size:14px">$${totalFuelCost.toLocaleString()}</div>
        <div class="stat-label">油費合計</div>
      </div>
      <div class="stat-box">
        <div class="stat-val" style="font-size:14px">$${totalMaintCost.toLocaleString()}</div>
        <div class="stat-label">保養費合計</div>
      </div>
      <div class="stat-box">
        <div class="stat-val">${maintRecords.length}</div>
        <div class="stat-label">保養次數</div>
      </div>
    </div>`;

  // Tabs
  document.querySelectorAll('.detail-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === detailTab);
  });

  // Records
  const recList = $('detail-records');
  recList.innerHTML = '';
  const displayRecords = detailTab === 'fuel' ? fuelRecords : maintRecords;

  if (displayRecords.length === 0) {
    recList.innerHTML = `<div class="empty-state" style="padding:24px 0"><p>尚無${detailTab === 'fuel' ? '油耗' : '保養'}記錄</p></div>`;
    return;
  }

  displayRecords.forEach(r => {
    recList.appendChild(buildRecordCard(r, v));
  });
}

// ── Add Record Modal ───────────────────────────────
let addType = 'fuel';

function openAddModal(vehicleId) {
  addType = 'fuel';
  populateVehicleSelect();
  if (vehicleId) $('add-vehicle-select').value = vehicleId;
  $('add-date').value = new Date().toISOString().split('T')[0];
  $('add-odometer').value = '';
  $('add-liters').value = '';
  $('add-fuel-cost').value = '';
  $('add-fuel-note').value = '';
  $('add-maint-date').value = new Date().toISOString().split('T')[0];
  $('add-maint-odometer').value = '';
  $('add-maint-cost').value = '';
  $('add-next-reminder').value = '';
  $('add-maint-note').value = '';
  selectedMaintItems = [];
  renderMaintChips();
  setAddType('fuel');
  updateFuelEstimate();
  openModal('add-modal');
}

function populateVehicleSelect() {
  const sel = $('add-vehicle-select');
  sel.innerHTML = vehicles.map(v =>
    `<option value="${v.id}">${v.type === 'motorcycle' ? '🛵' : '🚗'} ${escHtml(v.name)}</option>`
  ).join('');
}

function setAddType(type) {
  addType = type;
  document.querySelectorAll('.type-tab').forEach(t => t.classList.toggle('active', t.dataset.type === type));
  $('fuel-form').style.display = type === 'fuel' ? 'block' : 'none';
  $('maint-form').style.display = type === 'maintenance' ? 'block' : 'none';
}

function renderMaintChips() {
  const items = ['換機油', '換濾芯', '換輪胎', '換煞車皮', '冷卻液', '其他'];
  $('maint-chips').innerHTML = items.map(item =>
    `<button class="chip${selectedMaintItems.includes(item) ? ' selected' : ''}" data-item="${escHtml(item)}">${escHtml(item)}</button>`
  ).join('');
  $('maint-chips').querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.dataset.item;
      if (selectedMaintItems.includes(item)) {
        selectedMaintItems = selectedMaintItems.filter(i => i !== item);
      } else {
        selectedMaintItems.push(item);
      }
      renderMaintChips();
    });
  });
}

function updateFuelEstimate() {
  const odometer = parseFloat($('add-odometer').value);
  const vehicleId = parseInt($('add-vehicle-select').value);
  const est = $('fuel-estimate');
  if (!odometer || !vehicleId) {
    est.textContent = '預估油耗：需填入當下里程';
    return;
  }
  const vFuelRecords = records.filter(r => r.vehicleId === vehicleId && r.type === 'fuel')
    .sort((a, b) => b.odometer - a.odometer);
  const prevRecord = vFuelRecords.find(r => r.odometer < odometer);
  const liters = parseFloat($('add-liters').value);
  if (!prevRecord) {
    est.textContent = '預估油耗：需有前一筆里程記錄';
    return;
  }
  if (!liters || liters <= 0) {
    est.textContent = `預估油耗：已行駛 ${(odometer - prevRecord.odometer).toFixed(0)} km`;
    return;
  }
  const km = odometer - prevRecord.odometer;
  const eff = km / liters;
  est.textContent = `預估油耗：${eff.toFixed(1)} km/L（${km.toFixed(0)} km / ${liters} L）`;
}

async function submitAddRecord() {
  const vehicleId = parseInt($('add-vehicle-select').value);
  if (!vehicleId) { showToast('請選擇車輛', 'error'); return; }

  if (addType === 'fuel') {
    const date = $('add-date').value;
    const odometer = parseFloat($('add-odometer').value);
    const liters = parseFloat($('add-liters').value);
    const fuelCost = parseFloat($('add-fuel-cost').value);
    const note = $('add-fuel-note').value.trim();

    if (!date || !odometer || !liters || !fuelCost) { showToast('請填寫必要欄位', 'error'); return; }

    const vFuelRecords = records.filter(r => r.vehicleId === vehicleId && r.type === 'fuel')
      .sort((a, b) => b.odometer - a.odometer);
    const prevRecord = vFuelRecords.find(r => r.odometer < odometer);
    const fuelEfficiency = prevRecord ? parseFloat(((odometer - prevRecord.odometer) / liters).toFixed(2)) : 0;

    await addRecord({ vehicleId, type: 'fuel', date, odometer, liters, fuelCost, fuelEfficiency, note, createdAt: new Date().toISOString() });
  } else {
    const date = $('add-maint-date').value;
    const odometer = parseFloat($('add-maint-odometer').value);
    const maintenanceCost = parseFloat($('add-maint-cost').value);
    const nextOdometerReminder = parseFloat($('add-next-reminder').value) || 0;
    const note = $('add-maint-note').value.trim();

    if (!date || !odometer || !maintenanceCost) { showToast('請填寫必要欄位', 'error'); return; }
    if (selectedMaintItems.length === 0) { showToast('請選擇保養項目', 'error'); return; }

    await addRecord({ vehicleId, type: 'maintenance', date, odometer, items: [...selectedMaintItems], maintenanceCost, nextOdometerReminder, note, createdAt: new Date().toISOString() });
  }

  records = await getAllRecords();
  showToast('✅ 記錄已儲存', 'success');
  closeModal('add-modal', () => { renderDashboard(); });
}

// ── History Page ───────────────────────────────────
function renderHistory() {
  renderHistoryFilters();
  renderHistoryList();
}

function renderHistoryFilters() {
  // Vehicle filter
  const vf = $('history-vehicle-filter');
  vf.innerHTML = `<button class="filter-pill${activeVehicleFilter === 'all' ? ' active' : ''}" data-vid="all">全部</button>`;
  vehicles.forEach(v => {
    const btn = el('button', `filter-pill${activeVehicleFilter === String(v.id) ? ' active' : ''}`);
    btn.dataset.vid = v.id;
    btn.textContent = `${v.type === 'motorcycle' ? '🛵' : '🚗'} ${v.name}`;
    vf.appendChild(btn);
  });
  vf.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      activeVehicleFilter = btn.dataset.vid;
      renderHistory();
    });
  });

  // Type filter
  const tf = $('history-type-filter');
  tf.innerHTML = '';
  [['all', '全部'], ['fuel', '⛽ 油耗'], ['maintenance', '🔧 保養']].forEach(([val, label]) => {
    const btn = el('button', `filter-pill${activeTypeFilter === val ? ' active' : ''}`);
    btn.dataset.type = val;
    btn.textContent = label;
    tf.appendChild(btn);
  });
  tf.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTypeFilter = btn.dataset.type;
      renderHistory();
    });
  });
}

function renderHistoryList() {
  let filtered = [...records];
  if (activeVehicleFilter !== 'all') filtered = filtered.filter(r => r.vehicleId === parseInt(activeVehicleFilter));
  if (activeTypeFilter !== 'all') filtered = filtered.filter(r => r.type === activeTypeFilter);

  if (historySortOrder === 'asc') {
    filtered.sort((a, b) => a.date.localeCompare(b.date));
  } else {
    filtered.sort((a, b) => b.date.localeCompare(a.date));
  }

  const list = $('history-list');
  list.innerHTML = '';

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>尚無符合條件的記錄</p></div>`;
    return;
  }

  filtered.forEach(r => {
    const v = vehicles.find(v => v.id === r.vehicleId);
    list.appendChild(buildRecordCard(r, v));
  });
}

function buildRecordCard(r, v) {
  const wrap = el('div', 'card record-card');
  const iconEl = el('div', `record-icon-wrap ${r.type}`);
  iconEl.textContent = r.type === 'fuel' ? '⛽' : '🔧';

  const body = el('div', 'record-body');
  const vName = v ? v.name : '未知車輛';
  body.innerHTML = `
    <div class="record-title">${escHtml(vName)}</div>
    <div class="record-sub">${r.date} · ${Number(r.odometer).toLocaleString()} km</div>
    ${r.type === 'maintenance' && r.items ? `<div class="record-chips">${r.items.map(i => `<span class="record-chip">${escHtml(i)}</span>`).join('')}</div>` : ''}
  `;

  const right = el('div', 'record-right');
  if (r.type === 'fuel') {
    right.innerHTML = `
      <div class="record-value efficiency">${r.fuelEfficiency > 0 ? r.fuelEfficiency.toFixed(1) + ' km/L' : '—'}</div>
      <div class="record-cost">$${Number(r.fuelCost).toLocaleString()}</div>
    `;
  } else {
    right.innerHTML = `
      <div class="record-value">$${Number(r.maintenanceCost).toLocaleString()}</div>
    `;
  }

  wrap.appendChild(iconEl);
  wrap.appendChild(body);
  wrap.appendChild(right);

  // Long press to delete
  let pressTimer;
  const startPress = () => {
    pressTimer = setTimeout(() => confirmDeleteRecord(r.id), 600);
  };
  const endPress = () => clearTimeout(pressTimer);
  wrap.addEventListener('touchstart', startPress, { passive: true });
  wrap.addEventListener('touchend', endPress);
  wrap.addEventListener('touchcancel', endPress);
  wrap.addEventListener('mousedown', startPress);
  wrap.addEventListener('mouseup', endPress);

  return wrap;
}

function confirmDeleteRecord(id) {
  if (confirm('確定要刪除這筆記錄？')) {
    deleteRecord(id).then(async () => {
      records = await getAllRecords();
      showToast('已刪除', 'info');
      if (currentPage === 'history') renderHistory();
      if (currentPage === 'dashboard') renderDashboard();
      if (detailVehicleId) renderVehicleDetail();
    });
  }
}

// ── Vehicles Management Page ───────────────────────
function renderVehiclesPage() {
  const list = $('vehicles-list');
  if (!list) return;
  list.innerHTML = '';

  if (vehicles.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚗</div>
        <p>尚無車輛資料</p>
        <small>點擊下方按鈕新增車輛</small>
      </div>`;
    return;
  }

  vehicles.forEach(v => {
    const emoji = v.type === 'motorcycle' ? '🛵' : '🚗';
    const card = el('div', 'vehicle-manage-card glass');
    card.innerHTML = `
      <span class="vm-emoji">${emoji}</span>
      <div class="vm-info">
        <div class="vm-name">${escHtml(v.name)}</div>
        ${v.note ? `<div class="vm-note">${escHtml(v.note)}</div>` : ''}
      </div>
      <button class="vm-menu-btn" data-vid="${v.id}" aria-label="選項">⋮</button>`;

    const menuBtn = card.querySelector('.vm-menu-btn');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Remove any existing dropdowns
      document.querySelectorAll('.vm-dropdown').forEach(d => d.remove());
      const dropdown = el('div', 'vm-dropdown');
      dropdown.innerHTML = `
        <button class="vm-dropdown-item" data-action="edit">✏️ 編輯</button>
        <button class="vm-dropdown-item danger" data-action="delete">🗑 刪除</button>`;
      menuBtn.appendChild(dropdown);
      dropdown.querySelector('[data-action="edit"]').addEventListener('click', (ev) => {
        ev.stopPropagation();
        dropdown.remove();
        openVehicleModal(v.id);
      });
      dropdown.querySelector('[data-action="delete"]').addEventListener('click', (ev) => {
        ev.stopPropagation();
        dropdown.remove();
        confirmDeleteVehicle(v.id);
      });
      // Close on outside click
      setTimeout(() => {
        document.addEventListener('click', function handler() {
          dropdown.remove();
          document.removeEventListener('click', handler);
        }, { once: true });
      }, 0);
    });

    list.appendChild(card);
  });
}

function openVehicleModal(vehicleId) {
  const isEdit = vehicleId != null;
  $('vehicle-modal-title').textContent = isEdit ? '編輯車輛' : '新增車輛';
  $('vehicle-edit-id').value = vehicleId || '';

  if (isEdit) {
    const v = vehicles.find(v => v.id === vehicleId);
    if (v) {
      $('vehicle-name-input').value = v.name;
      $('vehicle-type-input').value = v.type;
      $('vehicle-note-input').value = v.note || '';
    }
  } else {
    $('vehicle-name-input').value = '';
    $('vehicle-type-input').value = 'car';
    $('vehicle-note-input').value = '';
  }
  openModal('vehicle-modal');
}

async function submitVehicle() {
  const name = $('vehicle-name-input').value.trim();
  if (!name) { showToast('請填入車輛名稱', 'error'); return; }
  const type = $('vehicle-type-input').value;
  const note = $('vehicle-note-input').value.trim();
  const editId = $('vehicle-edit-id').value;

  if (editId) {
    await updateVehicle(parseInt(editId), { name, type, note });
    showToast('✅ 車輛已更新', 'success');
  } else {
    await addVehicle({ name, type, note, createdAt: new Date().toISOString() });
    showToast('✅ 車輛已新增', 'success');
  }

  vehicles = await getAllVehicles();
  closeModal('vehicle-modal', () => { renderVehiclesPage(); renderDashboard(); });
}

async function confirmDeleteVehicle(id) {
  const v = vehicles.find(v => v.id === id);
  const vRecords = records.filter(r => r.vehicleId === id);
  if (!confirm(`確定要刪除「${v ? v.name : ''}」？\n同時刪除 ${vRecords.length} 筆關聯記錄。`)) return;
  await deleteVehicle(id);
  vehicles = await getAllVehicles();
  records = await getAllRecords();
  showToast('已刪除車輛', 'info');
  renderVehiclesPage();
  renderDashboard();
}

// ── Settings Page ──────────────────────────────────
function renderSettings() {
  const toggle = $('theme-toggle-settings');
  if (toggle) {
    toggle.checked = localStorage.getItem('theme') === 'light';
  }
  const clientId = localStorage.getItem('gdrive_client_id') || '';
  const input = $('gdrive-client-id-input');
  if (input) input.value = clientId;
}

// ── Backup / Export / Import ───────────────────────
async function exportJSON() {
  const data = {
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    vehicles: await getAllVehicles(),
    records: await getAllRecords()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fuel-record-backup-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ 備份已匯出', 'success');
}

function importJSON() {
  $('import-file-input').click();
}

async function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.vehicles || !data.records) { showToast('❌ 檔案格式錯誤', 'error'); return; }
    if (!confirm(`確定要匯入備份？\n這將覆蓋目前所有資料（${data.vehicles.length} 輛車，${data.records.length} 筆記錄）`)) return;
    await importData({ vehicles: data.vehicles, records: data.records });
    vehicles = await getAllVehicles();
    records = await getAllRecords();
    showToast('✅ 備份已還原', 'success');
    renderDashboard();
  } catch (err) {
    showToast('❌ 匯入失敗', 'error');
  }
  e.target.value = '';
}

// ── Clear All Data ─────────────────────────────────
async function handleClearAllData() {
  if (!confirm('確定要清除所有資料？\n此操作無法復原，所有車輛與記錄將被刪除。')) return;
  await clearAllData();
  vehicles = [];
  records = [];
  showToast('✅ 所有資料已清除', 'info');
  navigate('dashboard');
}

// ── Google Drive Backup ────────────────────────────
const GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

function initGIS() {
  const clientId = localStorage.getItem('gdrive_client_id');
  if (!clientId || !window.google) return;
  gisTokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: GDRIVE_SCOPE,
    callback: async (resp) => {
      if (resp.error) { showToast('❌ 登入失敗', 'error'); return; }
      driveAccessToken = resp.access_token;
      const userNameEl = $('gdrive-user-name');
      if (userNameEl) userNameEl.textContent = '✅ 已連線 Google Drive';
      $('gdrive-login-btn').style.display = 'none';
      $('gdrive-user-info').style.display = 'flex';
      $('gdrive-upload-row').style.display = 'block';
      $('gdrive-file-section').style.display = 'block';
      showToast('✅ 已登入 Google', 'success');
      await listDriveBackups();
    }
  });
}

function googleLogin() {
  const clientId = $('gdrive-client-id-input').value.trim();
  if (!clientId) { showToast('請先填入 Client ID', 'error'); return; }
  localStorage.setItem('gdrive_client_id', clientId);
  if (!window.google) { showToast('Google SDK 未載入', 'error'); return; }
  initGIS();
  if (gisTokenClient) gisTokenClient.requestAccessToken();
}

function googleLogout() {
  driveAccessToken = null;
  gisTokenClient = null;
  $('gdrive-login-btn').style.display = 'flex';
  $('gdrive-user-info').style.display = 'none';
  $('gdrive-upload-row').style.display = 'none';
  $('gdrive-file-section').style.display = 'none';
  showToast('已登出 Google', 'info');
}

// ── Drive folder helper ────────────────────────────
async function getOrCreateDriveFolder() {
  // Search for existing folder
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name%3D'${encodeURIComponent(DRIVE_FOLDER_NAME)}'+and+mimeType%3D'application%2Fvnd.google-apps.folder'+and+trashed%3Dfalse&fields=files(id,name)`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${driveAccessToken}` }
  });
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }
  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${driveAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
  });
  const folder = await createRes.json();
  return folder.id;
}

async function uploadToDrive() {
  if (!driveAccessToken) { showToast('請先登入 Google', 'error'); return; }
  try {
    const folderId = await getOrCreateDriveFolder();
    const data = {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      vehicles: await getAllVehicles(),
      records: await getAllRecords()
    };
    const now = new Date();
    const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 15);
    const filename = `fuel-record-backup-${ts}.json`;
    const meta = { name: filename, mimeType: 'application/json', parents: [folderId] };
    const content = JSON.stringify(data, null, 2);
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${driveAccessToken}` },
      body: form
    });
    if (res.ok) {
      showToast('✅ 已上傳至 Google Drive', 'success');
      await cleanupOldBackups(folderId);
      await listDriveBackups();
    } else {
      showToast('❌ 上傳失敗', 'error');
    }
  } catch (e) {
    showToast('❌ 上傳失敗', 'error');
  }
}

async function cleanupOldBackups(folderId) {
  if (!driveAccessToken) return;
  try {
    const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed%3Dfalse&fields=files(id,name,createdTime)&orderBy=createdTime+desc`;
    const res = await fetch(listUrl, { headers: { Authorization: `Bearer ${driveAccessToken}` } });
    const data = await res.json();
    if (!data.files) return;
    const toDelete = data.files.slice(DRIVE_MAX_BACKUPS);
    for (const f of toDelete) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${driveAccessToken}` }
      });
    }
  } catch (e) { /* ignore */ }
}

async function listDriveBackups() {
  if (!driveAccessToken) return;
  try {
    const folderId = await getOrCreateDriveFolder();
    const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed%3Dfalse&fields=files(id,name,createdTime)&orderBy=createdTime+desc&pageSize=${DRIVE_MAX_BACKUPS}`;
    const res = await fetch(listUrl, { headers: { Authorization: `Bearer ${driveAccessToken}` } });
    const data = await res.json();
    const listEl = $('gdrive-file-list');
    listEl.innerHTML = '';
    if (!data.files || data.files.length === 0) {
      listEl.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:8px 0">尚無備份檔案</div>';
      return;
    }
    data.files.forEach(f => {
      const d = new Date(f.createdTime);
      const ts = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
      const item = el('div', 'backup-file-item');
      item.innerHTML = `
        <div>
          <div class="backup-file-name">☁️ ${escHtml(f.name)}</div>
          <div class="backup-file-date">${ts}</div>
        </div>
        <button style="background:none;border:1px solid var(--border2);border-radius:var(--radius-xs);padding:5px 10px;color:var(--blue);font-size:12px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent">還原</button>
      `;
      item.querySelector('button').addEventListener('click', () => restoreFromDrive(f.id, f.name));
      listEl.appendChild(item);
    });
  } catch (e) { /* ignore */ }
}

async function restoreFromDrive(fileId, fileName) {
  if (!confirm(`確定要從 Google Drive 還原備份？\n檔案：${fileName}\n這將覆蓋目前所有資料`)) return;
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${driveAccessToken}` }
    });
    const data = await res.json();
    if (!data.vehicles || !data.records) { showToast('❌ 備份格式錯誤', 'error'); return; }
    await importData({ vehicles: data.vehicles, records: data.records });
    vehicles = await getAllVehicles();
    records = await getAllRecords();
    showToast('✅ 已從 Drive 還原', 'success');
    renderDashboard();
  } catch (e) {
    showToast('❌ 還原失敗', 'error');
  }
}

// ── Swipe Back Gesture ─────────────────────────────
function attachSwipeBack(modalId) {
  const panel = $(modalId);
  if (!panel) return;
  let startX = 0, startY = 0, dragging = false;

  panel.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    dragging = false;
  }, { passive: true });

  panel.addEventListener('touchmove', (e) => {
    if (!panel.classList.contains('slide-in')) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (!dragging && startX < SWIPE_EDGE_THRESHOLD && dx > SWIPE_MIN_START && Math.abs(dx) > Math.abs(dy)) {
      dragging = true;
    }
    if (dragging) {
      const clampedDx = Math.max(0, dx);
      panel.style.transform = `translateX(${clampedDx}px)`;
    }
  }, { passive: true });

  panel.addEventListener('touchend', (e) => {
    if (!dragging) { panel.style.transform = ''; return; }
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    panel.style.transform = '';
    dragging = false;
    if (swipeCooldown) return;
    if (dx > SWIPE_COMPLETE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * SWIPE_DIRECTIONAL_RATIO) {
      swipeCooldown = true;
      closeModal(modalId);
      setTimeout(() => { swipeCooldown = false; }, 300);
    }
  }, { passive: true });
}

// ── Service Worker ─────────────────────────────────
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    swRegistration = reg;
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          checkForUpdate();
        }
      });
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    location.reload();
  });
}

// ── Utilities ─────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Apply theme (prevent FOUC)
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
  }
  applyTheme();

  // Load data
  await loadData();

  // Render default page
  navigate('dashboard');

  // Bottom nav events
  ['dashboard', 'history', 'vehicles', 'settings'].forEach(page => {
    const btn = $(`nav-${page}`);
    if (btn) btn.addEventListener('click', () => navigate(page));
  });
  const addBtn = $('nav-add');
  if (addBtn) addBtn.addEventListener('click', () => openAddModal(null));

  // Theme toggle (header)
  $('theme-toggle-btn').addEventListener('click', toggleTheme);

  // Theme toggle (settings)
  const themeToggleSettings = $('theme-toggle-settings');
  if (themeToggleSettings) {
    themeToggleSettings.addEventListener('change', toggleTheme);
  }

  // Add modal events
  document.querySelectorAll('.type-tab').forEach(btn => {
    btn.addEventListener('click', () => setAddType(btn.dataset.type));
  });
  $('add-vehicle-select').addEventListener('change', updateFuelEstimate);
  $('add-odometer').addEventListener('input', updateFuelEstimate);
  $('add-liters').addEventListener('input', updateFuelEstimate);
  $('add-submit-btn').addEventListener('click', submitAddRecord);
  $('add-modal-back').addEventListener('click', () => closeModal('add-modal'));

  // Vehicle detail modal
  $('detail-modal-back').addEventListener('click', () => closeModal('vehicle-detail-modal'));
  document.querySelectorAll('.detail-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      detailTab = btn.dataset.tab;
      renderVehicleDetail();
    });
  });

  // Vehicle management
  $('add-vehicle-fab').addEventListener('click', () => openVehicleModal(null));
  $('vehicle-modal-back').addEventListener('click', () => closeModal('vehicle-modal'));
  $('vehicle-save-btn').addEventListener('click', submitVehicle);

  // Settings page
  $('export-btn').addEventListener('click', exportJSON);
  $('import-btn').addEventListener('click', importJSON);
  $('import-file-input').addEventListener('change', handleImportFile);
  $('gdrive-login-btn').addEventListener('click', googleLogin);
  $('gdrive-logout-btn').addEventListener('click', googleLogout);
  $('gdrive-upload-btn').addEventListener('click', uploadToDrive);
  $('clear-data-btn').addEventListener('click', handleClearAllData);

  const saveClientIdBtn = $('gdrive-save-client-id-btn');
  if (saveClientIdBtn) {
    saveClientIdBtn.addEventListener('click', () => {
      const val = $('gdrive-client-id-input').value.trim();
      localStorage.setItem('gdrive_client_id', val);
      showToast('✅ Client ID 已儲存', 'success');
    });
  }

  // Collapsible
  $('gdrive-api-toggle').addEventListener('click', () => {
    const arrow = $('gdrive-api-arrow');
    const body = $('gdrive-api-body');
    const isOpen = arrow.classList.contains('open');
    arrow.classList.toggle('open', !isOpen);
    body.classList.toggle('open', !isOpen);
  });

  // History sort
  $('sort-desc-btn').addEventListener('click', () => {
    historySortOrder = 'desc';
    $('sort-desc-btn').classList.add('active');
    $('sort-asc-btn').classList.remove('active');
    renderHistoryList();
  });
  $('sort-asc-btn').addEventListener('click', () => {
    historySortOrder = 'asc';
    $('sort-asc-btn').classList.add('active');
    $('sort-desc-btn').classList.remove('active');
    renderHistoryList();
  });

  // Update sheet
  $('update-later-btn').addEventListener('click', () => closeSheet('update-overlay', 'update-sheet'));
  $('update-now-btn').addEventListener('click', () => {
    closeSheet('update-overlay', 'update-sheet');
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ action: 'skipWaiting' });
    }
  });
  $('update-overlay').addEventListener('click', () => closeSheet('update-overlay', 'update-sheet'));

  // Attach swipe-back to all modal panels
  attachSwipeBack('add-modal');
  attachSwipeBack('vehicle-detail-modal');
  attachSwipeBack('vehicle-modal');

  // Register SW and check for updates
  registerSW();
  setTimeout(checkForUpdate, 3000);

  // Init GIS if stored
  if (window.google && localStorage.getItem('gdrive_client_id')) {
    initGIS();
  }
  window.addEventListener('load', () => {
    if (window.google && localStorage.getItem('gdrive_client_id')) initGIS();
  });
});
