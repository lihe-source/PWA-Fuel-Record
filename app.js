// app.js - 油耗紀錄 PWA 主程式 v1.1.0

const APP_VERSION = '1.1.0';

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

// ── Google Drive Folder ID ──────────────────────────
const GDRIVE_FOLDER_ID = '1LqlXKg8BBthb5Iyijf6eQliXNETaDXP1';
const GDRIVE_BACKUP_KEEP = 5;

// ── State ─────────────────────────────────────────
let vehicles = [];
let records = [];
let currentPage = 'dashboard';
let swRegistration = null;
let gisTokenClient = null;
let driveAccessToken = null;
let driveUserName = '';
let activeVehicleFilter = 'all';
let activeTypeFilter = 'all';
let historySort = 'desc';
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
  m.style.transform = '';
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
  const themeBtn = $('theme-toggle-btn');
  if (themeBtn) themeBtn.textContent = isLight ? '☀️' : '🌙';
  const settingsBtn = $('settings-theme-btn');
  if (settingsBtn) settingsBtn.textContent = isLight ? '☀️' : '🌙';
  const toggle = $('settings-theme-toggle');
  if (toggle) toggle.classList.toggle('active', isLight);
  const label = $('theme-status-label');
  if (label) label.textContent = isLight ? '目前：淺色模式' : '目前：深色模式';
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
        <small>點擊下方「車輛」來新增第一台車輛</small>
      </div>`;
    return;
  }

  vehicles.forEach(v => {
    const vRecords = records.filter(r => r.vehicleId === v.id);
    const fuelRecords = vRecords.filter(r => r.type === 'fuel').sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const maintRecords = vRecords.filter(r => r.type === 'maintenance').sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

    const allSorted = [...fuelRecords, ...maintRecords].sort((a, b) => b.date.localeCompare(a.date));
    const latestOdometer = allSorted[0]?.odometer || '—';
    const latestEfficiency = fuelRecords[0]?.fuelEfficiency;
    const latestMaint = maintRecords[0];

    const emoji = v.type === 'motorcycle' ? '🛵' : '🚗';
    const isOpen = expandedVehicleId === v.id;

    let fuelStat = `<div class="vc-stat no-data">⛽ 尚無油耗記錄</div>`;
    if (latestEfficiency) {
      fuelStat = `<div class="vc-stat fuel">⛽ ${latestEfficiency.toFixed(1)} km/L</div>`;
    }

    let maintStat = `<div class="vc-stat no-data">🔧 尚無保養記錄</div>`;
    if (latestMaint && latestMaint.nextOdometerReminder && latestOdometer !== '—') {
      const diff = latestMaint.nextOdometerReminder - latestOdometer;
      if (diff > 0) {
        maintStat = `<div class="vc-stat maintenance">🔧 還差 ${diff.toLocaleString()} km</div>`;
      } else {
        maintStat = `<div class="vc-stat" style="color:var(--red)">🔧 已達保養里程，請儘速保養</div>`;
      }
    } else if (latestMaint) {
      maintStat = `<div class="vc-stat maintenance">🔧 上次保養 ${latestMaint.date}</div>`;
    }

    const card = el('div', 'card glass vehicle-card');
    card.dataset.vid = v.id;

    // Header (always visible)
    const cardHeader = el('div', 'vc-header');
    cardHeader.innerHTML = `
      <div class="vc-top" style="margin-bottom:0">
        <div class="vc-left">
          <span class="vc-emoji">${emoji}</span>
          <div>
            <div class="vc-name">${escHtml(v.name)}</div>
            <div class="vc-note">${escHtml(v.note || '')}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="text-align:right;">
            <span class="vc-odometer">${latestOdometer !== '—' ? Number(latestOdometer).toLocaleString() : '—'}</span>
            <span class="vc-odometer-unit">km</span>
          </div>
          <button class="vc-expand-toggle" data-vid="${v.id}" aria-label="展開/收合">${isOpen ? '∨' : '›'}</button>
        </div>
      </div>
      <div class="vc-stats" style="padding-top:6px;border-top:1px solid var(--border);margin-top:8px;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;">${fuelStat}${maintStat}</div>
      </div>`;

    // Expanded body
    const expandedBody = el('div', `vc-expanded-body${isOpen ? ' open' : ''}`);

    // Build inner content
    const recentFuel = fuelRecords.slice(0, 5);
    const recentMaint = maintRecords.slice(0, 3);

    const avgEff = fuelRecords.length > 0
      ? (fuelRecords.reduce((s, r) => s + (r.fuelEfficiency || 0), 0) / fuelRecords.length).toFixed(1)
      : '—';
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthFuelCost = fuelRecords
      .filter(r => r.date && r.date.startsWith(thisMonth))
      .reduce((s, r) => s + (r.fuelCost || 0), 0);
    const totalMaintCost = maintRecords.reduce((s, r) => s + (r.maintenanceCost || 0), 0);

    let fuelRows = recentFuel.map(r =>
      `<div class="vc-mini-record">
        <span class="vc-mini-left">${r.date}・${Number(r.odometer).toLocaleString()}km</span>
        <span class="vc-mini-right green">${r.fuelEfficiency > 0 ? r.fuelEfficiency.toFixed(1) + ' km/L' : '—'}・$${Number(r.fuelCost).toLocaleString()}</span>
      </div>`
    ).join('') || '<div style="font-size:12px;color:var(--text3);padding:4px 0">尚無油耗記錄</div>';

    let maintRows = recentMaint.map(r =>
      `<div class="vc-mini-record">
        <span class="vc-mini-left">${r.date}・${Number(r.odometer).toLocaleString()}km・${(r.items || []).join('、')}</span>
        <span class="vc-mini-right">$${Number(r.maintenanceCost).toLocaleString()}</span>
      </div>`
    ).join('') || '<div style="font-size:12px;color:var(--text3);padding:4px 0">尚無保養記錄</div>';

    expandedBody.innerHTML = `
      <div class="vc-expanded-inner">
        <div class="vc-expand-section-title">📊 最近 5 筆油耗</div>
        ${fuelRows}
        <div class="vc-expand-section-title">🔧 最近 3 筆保養</div>
        ${maintRows}
        <div class="vc-expand-section-title">📈 統計摘要</div>
        <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
          <div class="stat-box" style="flex:1;min-width:80px"><div class="stat-val">${avgEff}</div><div class="stat-label">平均油耗</div></div>
          <div class="stat-box" style="flex:1;min-width:80px"><div class="stat-val" style="font-size:13px">$${monthFuelCost.toLocaleString()}</div><div class="stat-label">本月花費</div></div>
          <div class="stat-box" style="flex:1;min-width:80px"><div class="stat-val" style="font-size:13px">$${totalMaintCost.toLocaleString()}</div><div class="stat-label">累計保養費</div></div>
        </div>
        <div class="vc-expand-actions">
          <button class="btn-vc-action" data-action="add-fuel" data-vid="${v.id}">➕ 新增油耗</button>
          <button class="btn-vc-action" data-action="add-maint" data-vid="${v.id}">🔧 新增保養</button>
          <button class="btn-vc-action" data-action="view-all" data-vid="${v.id}">📋 查看全部</button>
        </div>
      </div>`;

    if (isOpen) {
      // Set max-height after appending so scroll height is measurable
      requestAnimationFrame(() => {
        expandedBody.style.maxHeight = expandedBody.scrollHeight + 'px';
      });
    }

    card.appendChild(cardHeader);
    card.appendChild(expandedBody);
    list.appendChild(card);

    // Toggle expand on header click
    cardHeader.addEventListener('click', (e) => {
      if (e.target.closest('.vc-expand-toggle') || e.target.closest('.btn-vc-action')) return;
      toggleAccordion(v.id, expandedBody, card);
    });

    // Expand toggle button
    const toggleBtn = card.querySelector('.vc-expand-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAccordion(v.id, expandedBody, card);
      });
    }

    // Action buttons inside expanded
    expandedBody.querySelectorAll('.btn-vc-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const vid = parseInt(btn.dataset.vid);
        if (action === 'add-fuel') { openAddModal(vid, 'fuel'); }
        else if (action === 'add-maint') { openAddModal(vid, 'maintenance'); }
        else if (action === 'view-all') { openVehicleDetail(vid); }
      });
    });
  });
}

function toggleAccordion(vehicleId, expandedBody, card) {
  const isCurrentlyOpen = expandedVehicleId === vehicleId;

  // Close all first
  document.querySelectorAll('.vc-expanded-body.open').forEach(body => {
    body.style.maxHeight = '0px';
    body.classList.remove('open');
  });
  document.querySelectorAll('.vc-expand-toggle').forEach(btn => {
    btn.textContent = '›';
  });

  if (!isCurrentlyOpen) {
    expandedVehicleId = vehicleId;
    expandedBody.classList.add('open');
    expandedBody.style.maxHeight = expandedBody.scrollHeight + 'px';
    const toggleBtn = card.querySelector('.vc-expand-toggle');
    if (toggleBtn) toggleBtn.textContent = '∨';
  } else {
    expandedVehicleId = null;
  }
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

  document.querySelectorAll('.detail-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === detailTab);
  });

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

// ── Vehicles Page ──────────────────────────────────
function renderVehiclesPage() {
  const list = $('vehicles-list');
  if (!list) return;
  list.innerHTML = '';

  if (vehicles.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚗</div>
        <p>尚無車輛</p>
        <small>點擊右上角「＋ 新增車輛」來新增</small>
      </div>`;
    return;
  }

  vehicles.forEach(v => {
    const vRecords = records.filter(r => r.vehicleId === v.id);
    const emoji = v.type === 'motorcycle' ? '🛵' : '🚗';
    const card = el('div', 'card vehicle-manage-card');
    card.innerHTML = `
      <span class="vmc-emoji">${emoji}</span>
      <div class="vmc-body">
        <div class="vmc-name">${escHtml(v.name)}</div>
        <div class="vmc-note">${escHtml(v.note || '—')}</div>
        <div class="vmc-count">共 ${vRecords.length} 筆記錄</div>
      </div>
      <span class="vmc-arrow">›</span>`;

    card.addEventListener('click', () => openVehicleDetail(v.id));

    // Long press to delete
    let pressTimer;
    const startPress = () => {
      pressTimer = setTimeout(() => confirmDeleteVehicle(v), 700);
    };
    const endPress = () => clearTimeout(pressTimer);
    card.addEventListener('touchstart', startPress, { passive: true });
    card.addEventListener('touchend', endPress);
    card.addEventListener('touchcancel', endPress);
    card.addEventListener('mousedown', startPress);
    card.addEventListener('mouseup', endPress);

    list.appendChild(card);
  });
}

async function confirmDeleteVehicle(v) {
  const count = records.filter(r => r.vehicleId === v.id).length;
  if (!confirm(`確定要刪除「${v.name}」？\n這將同時刪除 ${count} 筆關聯記錄，且無法復原。`)) return;
  const toDelete = records.filter(r => r.vehicleId === v.id);
  for (const r of toDelete) await deleteRecord(r.id);
  await deleteVehicle(v.id);
  vehicles = await getAllVehicles();
  records = await getAllRecords();
  showToast('🗑️ 車輛已刪除', 'info');
  renderVehiclesPage();
  if (currentPage === 'dashboard') renderDashboard();
}

function openAddVehicleModal() {
  $('new-vehicle-name').value = '';
  $('new-vehicle-type').value = 'car';
  $('new-vehicle-note').value = '';
  openModal('add-vehicle-modal');
}

async function saveNewVehicle() {
  const name = $('new-vehicle-name').value.trim();
  const type = $('new-vehicle-type').value;
  const note = $('new-vehicle-note').value.trim();
  if (!name) { showToast('請填寫車輛名稱', 'error'); return; }
  await addVehicle({ name, type, note, createdAt: new Date().toISOString() });
  vehicles = await getAllVehicles();
  showToast('✅ 車輛已新增', 'success');
  closeModal('add-vehicle-modal', () => renderVehiclesPage());
}

// ── Add Record Modal ───────────────────────────────
let addType = 'fuel';

function openAddModal(vehicleId, type) {
  addType = type || 'fuel';
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
  setAddType(addType);
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

  // Sort buttons
  const sf = $('history-sort-bar');
  sf.innerHTML = '<span style="font-size:11px;color:var(--text3);font-weight:600;align-self:center;margin-right:2px;">排序：</span>';
  [['desc', '↓ 最新'], ['asc', '↑ 最舊']].forEach(([val, label]) => {
    const btn = el('button', `filter-pill${historySort === val ? ' active' : ''}`);
    btn.dataset.sort = val;
    btn.textContent = label;
    sf.appendChild(btn);
  });
  sf.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      historySort = btn.dataset.sort;
      renderHistory();
    });
  });
}

function renderHistoryList() {
  let filtered = [...records];
  if (activeVehicleFilter !== 'all') filtered = filtered.filter(r => r.vehicleId === parseInt(activeVehicleFilter));
  if (activeTypeFilter !== 'all') filtered = filtered.filter(r => r.type === activeTypeFilter);

  if (historySort === 'desc') {
    filtered.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  } else {
    filtered.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
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

  let pressTimer;
  const startPress = () => { pressTimer = setTimeout(() => confirmDeleteRecord(r.id), 600); };
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

// ── Settings Page ──────────────────────────────────
function renderSettings() {
  applyTheme();
  // Restore stored client ID
  const stored = localStorage.getItem('gdrive_client_id');
  if (stored) $('gdrive-client-id-input').value = stored;
  // Update login button state
  if (driveAccessToken) {
    $('gdrive-login-btn').style.display = 'none';
    $('gdrive-logout-btn').style.display = 'flex';
    $('gdrive-logout-btn').textContent = `登出 ${driveUserName}`;
    $('gdrive-upload-btn').style.display = 'flex';
    $('gdrive-file-section').style.display = 'block';
  } else {
    $('gdrive-login-btn').style.display = 'flex';
    $('gdrive-logout-btn').style.display = 'none';
    $('gdrive-upload-btn').style.display = 'none';
    $('gdrive-file-section').style.display = 'none';
  }
}

// ── Local Backup ───────────────────────────────────
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
  if (!confirm('⚠️ 確認清除？\n所有車輛與記錄將永久刪除，且無法復原。')) return;
  await clearAllData();
  // Reload default data
  for (const v of defaultVehicles) await addVehicle(v);
  for (const r of defaultRecords) await addRecord(r);
  vehicles = await getAllVehicles();
  records = await getAllRecords();
  showToast('🗑️ 資料已清除', 'error');
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
      // Try to get user info
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${driveAccessToken}` }
        });
        const info = await infoRes.json();
        driveUserName = info.email || info.name || 'Google';
      } catch (e) { driveUserName = 'Google'; }
      $('gdrive-login-btn').style.display = 'none';
      $('gdrive-logout-btn').style.display = 'flex';
      $('gdrive-logout-btn').textContent = `登出 ${driveUserName}`;
      $('gdrive-upload-btn').style.display = 'flex';
      $('gdrive-file-section').style.display = 'block';
      showToast('✅ 已登入 Google', 'success');
      listDriveBackups();
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
  driveUserName = '';
  $('gdrive-login-btn').style.display = 'flex';
  $('gdrive-logout-btn').style.display = 'none';
  $('gdrive-upload-btn').style.display = 'none';
  $('gdrive-file-section').style.display = 'none';
  showToast('已登出 Google', 'info');
}

async function uploadToDrive() {
  if (!driveAccessToken) { showToast('請先登入 Google', 'error'); return; }
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const data = {
    version: APP_VERSION,
    exportedAt: now.toISOString(),
    vehicles: await getAllVehicles(),
    records: await getAllRecords()
  };
  const filename = `fuel-record-backup-${dateStr}.json`;
  const meta = {
    name: filename,
    mimeType: 'application/json',
    parents: [GDRIVE_FOLDER_ID]
  };
  const content = JSON.stringify(data, null, 2);
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: 'application/json' }));
  try {
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${driveAccessToken}` },
      body: form
    });
    if (res.ok) {
      showToast('✅ 已上傳至 Google Drive', 'success');
      await pruneOldBackups();
      listDriveBackups();
    } else {
      showToast('❌ 上傳失敗', 'error');
    }
  } catch (e) {
    showToast('❌ 上傳失敗', 'error');
  }
}

async function listDriveBackups() {
  if (!driveAccessToken) return;
  try {
    const query = encodeURIComponent(`'${GDRIVE_FOLDER_ID}' in parents and name contains 'fuel-record-backup' and trashed=false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime)&orderBy=createdTime+desc&pageSize=10`, {
      headers: { Authorization: `Bearer ${driveAccessToken}` }
    });
    const data = await res.json();
    const listEl = $('gdrive-file-list');
    listEl.innerHTML = '';
    if (!data.files || data.files.length === 0) {
      listEl.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:8px 0">尚無備份檔案</div>';
      return;
    }
    const files = data.files.slice(0, GDRIVE_BACKUP_KEEP);
    files.forEach(f => {
      const dt = new Date(f.createdTime);
      const formatted = `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}:${String(dt.getSeconds()).padStart(2,'0')}`;
      const item = el('div', 'backup-file-item');
      item.innerHTML = `
        <div>
          <div class="backup-file-name">☁️ ${escHtml(f.name)}</div>
          <div class="backup-file-date">${formatted}</div>
        </div>
        <span style="color:var(--blue);font-size:12px;font-weight:600">還原</span>
      `;
      item.addEventListener('click', () => restoreFromDrive(f.id, f.name));
      listEl.appendChild(item);
    });
  } catch (e) { /* ignore */ }
}

async function pruneOldBackups() {
  if (!driveAccessToken) return;
  try {
    const query = encodeURIComponent(`'${GDRIVE_FOLDER_ID}' in parents and name contains 'fuel-record-backup' and trashed=false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,createdTime)&orderBy=createdTime+desc`, {
      headers: { Authorization: `Bearer ${driveAccessToken}` }
    });
    const data = await res.json();
    if (!data.files || data.files.length <= GDRIVE_BACKUP_KEEP) return;
    const toDelete = data.files.slice(GDRIVE_BACKUP_KEEP);
    for (const f of toDelete) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${driveAccessToken}` }
      });
    }
  } catch (e) { /* ignore */ }
}

async function restoreFromDrive(fileId, fileName) {
  if (!confirm(`確認用此備份還原？\n檔案：${fileName}\n現有資料將被覆蓋。`)) return;
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

// ── Swipe-to-Close for Modal Panels ───────────────
function attachSwipeClose(modalId) {
  const modal = $(modalId);
  if (!modal) return;

  let startX = 0, startY = 0, startTime = 0;
  let tracking = false;

  modal.addEventListener('touchstart', (e) => {
    if (swipeCooldown) return;
    const touch = e.touches[0];
    if (touch.clientX > 30) return; // Only start from left 30px edge
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
    tracking = true;
    modal.style.transition = 'none';
  }, { passive: true });

  modal.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (dx <= 0) { tracking = false; modal.style.transition = ''; return; }
    if (Math.abs(dx) > Math.abs(dy) * 1.5) {
      modal.style.transform = `translateX(${dx}px)`;
    }
  }, { passive: true });

  modal.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    modal.style.transition = '';
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (dx > 80 && Math.abs(dx) > Math.abs(dy) * 2) {
      // Trigger close
      swipeCooldown = true;
      modal.style.transform = 'translateX(105%)';
      setTimeout(() => {
        closeModal(modalId);
        modal.style.transform = '';
        setTimeout(() => { swipeCooldown = false; }, 300);
      }, 280);
    } else {
      // Snap back
      modal.style.transform = 'translateX(0)';
    }
  }, { passive: true });

  modal.addEventListener('touchcancel', () => {
    if (!tracking) return;
    tracking = false;
    modal.style.transition = '';
    modal.style.transform = '';
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
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
  }
  applyTheme();

  await loadData();
  navigate('dashboard');

  // Bottom nav events
  ['dashboard', 'history', 'vehicles', 'settings'].forEach(page => {
    const btn = $(`nav-${page}`);
    if (btn) btn.addEventListener('click', () => navigate(page));
  });
  const navAdd = $('nav-add');
  if (navAdd) navAdd.addEventListener('click', () => openAddModal(null, 'fuel'));

  // Theme toggles
  const themeToggle = $('theme-toggle-btn');
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  const settingsThemeBtn = $('settings-theme-btn');
  if (settingsThemeBtn) settingsThemeBtn.addEventListener('click', toggleTheme);
  const settingsThemeToggle = $('settings-theme-toggle');
  if (settingsThemeToggle) settingsThemeToggle.addEventListener('click', toggleTheme);

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

  // Vehicles page
  $('add-vehicle-btn').addEventListener('click', openAddVehicleModal);
  $('add-vehicle-modal-back').addEventListener('click', () => closeModal('add-vehicle-modal'));
  $('save-vehicle-btn').addEventListener('click', saveNewVehicle);

  // Settings page
  $('export-btn').addEventListener('click', exportJSON);
  $('import-btn').addEventListener('click', importJSON);
  $('import-file-input').addEventListener('change', handleImportFile);
  $('gdrive-login-btn').addEventListener('click', googleLogin);
  $('gdrive-logout-btn').addEventListener('click', googleLogout);
  $('gdrive-upload-btn').addEventListener('click', uploadToDrive);
  $('clear-data-btn').addEventListener('click', handleClearAllData);

  // Collapsible API guide
  $('gdrive-api-toggle').addEventListener('click', () => {
    const arrow = $('gdrive-api-arrow');
    const body = $('gdrive-api-body');
    const isOpen = arrow.classList.contains('open');
    arrow.classList.toggle('open', !isOpen);
    body.classList.toggle('open', !isOpen);
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

  // Attach swipe-to-close for all modal panels
  ['add-modal', 'vehicle-detail-modal', 'add-vehicle-modal'].forEach(id => {
    attachSwipeClose(id);
  });

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
