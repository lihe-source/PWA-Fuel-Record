// app.js - 油耗紀錄 PWA 主程式 v1.3.0

const APP_VERSION = '1.3.0';

// ── Constants ──────────────────────────────────────
const LONG_PRESS_DURATION_MS = 650;
const SWIPE_EDGE_THRESHOLD = 30;
const SWIPE_CLOSE_THRESHOLD = 80;
const SWIPE_HORIZONTAL_RATIO = 2;
const SWIPE_MOVE_RATIO = 1.5;
const SWIPE_COOLDOWN_MS = 500;
const TOAST_STAGGER_DELAY_MS = 300;

// ── 預設假資料 ──────────────────────────────────────
const defaultVehicles = [
  { id: 1, name: 'Toyota RAV4', type: 'car', note: '2021年 2.0L', createdAt: new Date().toISOString() },
  { id: 2, name: 'SYM Fiddle', type: 'motorcycle', note: '125cc', createdAt: new Date().toISOString() }
];

const defaultRecords = [
  { vehicleId: 1, type: 'fuel', date: '2025-03-01', odometer: 44800, liters: 45.2, fuelCost: 1950, fuelEfficiency: 12.1, fuelGrade: '95', note: '', createdAt: new Date().toISOString() },
  { vehicleId: 1, type: 'fuel', date: '2025-03-20', odometer: 45230, liters: 35.0, fuelCost: 1520, fuelEfficiency: 12.3, fuelGrade: '95', note: '', createdAt: new Date().toISOString() },
  { vehicleId: 1, type: 'maintenance', date: '2025-02-10', odometer: 44000, items: ['換機油', '換濾芯'], maintenanceCost: 1800, nextOdometerReminder: 49000, note: '5000km 後換油', createdAt: new Date().toISOString() },
  { vehicleId: 2, type: 'fuel', date: '2025-03-15', odometer: 18600, liters: 3.5, fuelCost: 150, fuelEfficiency: 37.1, fuelGrade: '95', note: '', createdAt: new Date().toISOString() },
  { vehicleId: 2, type: 'fuel', date: '2025-03-25', odometer: 18760, liters: 4.2, fuelCost: 180, fuelEfficiency: 38.5, fuelGrade: '95', note: '', createdAt: new Date().toISOString() },
  { vehicleId: 2, type: 'maintenance', date: '2025-01-20', odometer: 17500, items: ['換機油'], maintenanceCost: 350, nextOdometerReminder: 20000, note: '', createdAt: new Date().toISOString() }
];

// ── Google Drive ────────────────────────────────────
const GDRIVE_FOLDER_ID = '1LqlXKg8BBthb5Iyijf6eQliXNETaDXP1';
const GDRIVE_BACKUP_KEEP = 5;

// ── CPC 油價 ────────────────────────────────────────
const CPC_FALLBACK_PRICES = { '92': 28.5, '95': 30.1, '98': 32.1 };
let cpcPrices = null;
let cpcPricesSource = ''; // 'live' | 'cached' | 'fallback'

async function fetchCPCPrices() {
  // Check localStorage cache (4 hours)
  try {
    const cached = localStorage.getItem('cpc_prices');
    const ts = Number(localStorage.getItem('cpc_prices_ts') || 0);
    if (cached && Date.now() - ts < 4 * 3600000) {
      cpcPrices = JSON.parse(cached);
      cpcPricesSource = 'cached';
      updateFuelPriceBadge();
      return;
    }
  } catch(e) {}

  updateFuelPriceBadgeLoading();

  try {
    const target = 'https://www.cpc.com.tw/GetOilPriceByType.aspx?type=2';
    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(target);
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(proxyUrl, { signal: ctrl.signal });
    clearTimeout(tid);
    const text = await res.text();

    // Try JSON parse
    let parsed = null;
    try { parsed = JSON.parse(text); } catch(e) {}

    if (Array.isArray(parsed) && parsed.length > 0) {
      const prices = {};
      parsed.forEach(item => {
        const name = String(item.NAME || item.OilTypeName || item.name || item.oilname || '');
        const price = parseFloat(item.PRICE || item.Price || item.price || 0);
        if (price > 0) {
          if (name.includes('92')) prices['92'] = price;
          else if (name.includes('98')) prices['98'] = price;
          else if (name.includes('95')) prices['95'] = price;
        }
      });
      if (prices['95'] > 0) {
        if (!prices['92']) prices['92'] = parseFloat((prices['95'] - 1.6).toFixed(1));
        if (!prices['98']) prices['98'] = parseFloat((prices['95'] + 2.0).toFixed(1));
        cpcPrices = prices;
        cpcPricesSource = 'live';
        localStorage.setItem('cpc_prices', JSON.stringify(prices));
        localStorage.setItem('cpc_prices_ts', Date.now().toString());
        updateFuelPriceBadge();
        return;
      }
    }

    // Try HTML parsing as fallback
    const m92 = text.match(/92[^0-9]*?(\d{2,3}\.\d)/);
    const m95 = text.match(/95[^0-9]*?(\d{2,3}\.\d)/);
    const m98 = text.match(/98[^0-9]*?(\d{2,3}\.\d)/);
    if (m95) {
      const prices = {
        '92': m92 ? parseFloat(m92[1]) : parseFloat((parseFloat(m95[1]) - 1.6).toFixed(1)),
        '95': parseFloat(m95[1]),
        '98': m98 ? parseFloat(m98[1]) : parseFloat((parseFloat(m95[1]) + 2.0).toFixed(1))
      };
      cpcPrices = prices;
      cpcPricesSource = 'live';
      localStorage.setItem('cpc_prices', JSON.stringify(prices));
      localStorage.setItem('cpc_prices_ts', Date.now().toString());
      updateFuelPriceBadge();
      return;
    }

    throw new Error('parse failed');
  } catch(e) {
    try {
      const cached = localStorage.getItem('cpc_prices');
      if (cached) {
        cpcPrices = JSON.parse(cached);
        cpcPricesSource = 'cached';
      } else {
        cpcPrices = { ...CPC_FALLBACK_PRICES };
        cpcPricesSource = 'fallback';
      }
    } catch(e2) {
      cpcPrices = { ...CPC_FALLBACK_PRICES };
      cpcPricesSource = 'fallback';
    }
    updateFuelPriceBadge();
  }
}

function updateFuelPriceBadgeLoading() {
  const badge = $('fuel-price-badge');
  const status = $('fuel-price-status');
  if (badge) badge.textContent = '取得中…';
  if (status) { status.textContent = '正在連線中油…'; status.style.color = 'var(--text3)'; }
}

function updateFuelPriceBadge() {
  const badge = $('fuel-price-badge');
  const status = $('fuel-price-status');
  if (!badge || !cpcPrices) return;
  const grade = ($('add-fuel-grade') || {}).value || '95';
  const price = cpcPrices[grade];
  badge.textContent = price ? `${price.toFixed(1)} 元/L` : '-- 元/L';
  if (status) {
    if (cpcPricesSource === 'live') {
      status.textContent = '✅ 即時油價（中油）';
      status.style.color = 'var(--green)';
    } else if (cpcPricesSource === 'cached') {
      status.textContent = '🕐 快取油價（4小時內）';
      status.style.color = 'var(--text3)';
    } else {
      status.textContent = '⚠️ 參考油價（離線）';
      status.style.color = 'var(--amber)';
    }
  }
}

// ── State ─────────────────────────────────────────
let vehicles = [];
let records = [];
let maintenanceTemplates = [];
let currentPage = 'dashboard';
let swRegistration = null;
let gisTokenClient = null;
let driveAccessToken = null;
let driveUserName = '';
let activeVehicleFilter = 'all';
let activeTypeFilter = 'all';
let historySort = 'desc';
let selectedMaintItems = [];
let selectedEditMaintItems = [];
let expandedVehicleId = null;
let swipeCooldown = false;
let activeMaintTemplateType = 'car';

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
  const isLight = localStorage.getItem('theme') !== 'dark';
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
    if (isNewerVersion(data.version, APP_VERSION)) showUpdateSheet(data.version);
  } catch(e) {}
}

function showUpdateSheet(newVer) {
  $('update-new-ver').textContent = newVer;
  openSheet('update-overlay', 'update-sheet');
}

// ── Default Maintenance Templates ──────────────────
const defaultCarTemplates = [
  { vehicleType: 'car', itemName: '機油', intervalKm: 5000, note: '' },
  { vehicleType: 'car', itemName: '機油芯', intervalKm: 10000, note: '' },
  { vehicleType: 'car', itemName: '空氣濾芯', intervalKm: 20000, note: '' },
  { vehicleType: 'car', itemName: '冷卻液', intervalKm: 40000, note: '' },
  { vehicleType: 'car', itemName: '火星塞', intervalKm: 30000, note: '' },
  { vehicleType: 'car', itemName: '煞車油', intervalKm: 40000, note: '' },
  { vehicleType: 'car', itemName: '變速箱油', intervalKm: 60000, note: '' },
];
const defaultMotorcycleTemplates = [
  { vehicleType: 'motorcycle', itemName: '機油', intervalKm: 2000, note: '' },
  { vehicleType: 'motorcycle', itemName: '空氣濾芯', intervalKm: 6000, note: '' },
  { vehicleType: 'motorcycle', itemName: '火星塞', intervalKm: 8000, note: '' },
  { vehicleType: 'motorcycle', itemName: '煞車皮', intervalKm: 10000, note: '' },
  { vehicleType: 'motorcycle', itemName: '傳動皮帶', intervalKm: 20000, note: '' },
  { vehicleType: 'motorcycle', itemName: '齒輪油', intervalKm: 6000, note: '' },
];

// ── Data Load ─────────────────────────────────────
async function loadData() {
  vehicles = await getAllVehicles();
  records = await getAllRecords();
  maintenanceTemplates = await getAllMaintenanceTemplates();

  if (maintenanceTemplates.length === 0) {
    for (const t of [...defaultCarTemplates, ...defaultMotorcycleTemplates]) {
      await addMaintenanceTemplate(t);
    }
    maintenanceTemplates = await getAllMaintenanceTemplates();
  }
}

// ── Dashboard ─────────────────────────────────────
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

    const vTemplates = maintenanceTemplates.filter(t => t.vehicleType === v.type);
    let maintOverdue = false;
    if (vTemplates.length > 0 && latestOdometer !== '—') {
      const currentKm = Number(latestOdometer);
      for (const tmpl of vTemplates) {
        const lastMaintWithItem = maintRecords.find(r => (r.items || []).includes(tmpl.itemName));
        if (lastMaintWithItem) {
          const nextKm = lastMaintWithItem.odometer + tmpl.intervalKm;
          if (currentKm >= nextKm) { maintOverdue = true; break; }
        }
      }
    }

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

    const cardHeader = el('div', 'vc-header');
    cardHeader.innerHTML = `
      <div class="vc-top" style="margin-bottom:0">
        <div class="vc-left">
          <span class="vc-emoji">${emoji}</span>
          <div>
            <div class="vc-name">${escHtml(v.name)}${maintOverdue ? ' <span style="color:var(--red);font-size:14px" title="有保養項目已超過更換里程">⚠️</span>' : ''}</div>
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

    const expandedBody = el('div', `vc-expanded-body${isOpen ? ' open' : ''}`);

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
      requestAnimationFrame(() => {
        expandedBody.style.maxHeight = expandedBody.scrollHeight + 'px';
      });
    }

    card.appendChild(cardHeader);
    card.appendChild(expandedBody);
    list.appendChild(card);

    cardHeader.addEventListener('click', (e) => {
      if (e.target.closest('.vc-expand-toggle') || e.target.closest('.btn-vc-action')) return;
      toggleAccordion(v.id, expandedBody, card);
    });

    const toggleBtn = card.querySelector('.vc-expand-toggle');
    if (toggleBtn) toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAccordion(v.id, expandedBody, card);
    });

    expandedBody.querySelectorAll('.btn-vc-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const vid = parseInt(btn.dataset.vid);
        if (action === 'add-fuel') openAddModal(vid, 'fuel');
        else if (action === 'add-maint') openAddModal(vid, 'maintenance');
        else if (action === 'view-all') openVehicleDetail(vid);
      });
    });
  });
}

function toggleAccordion(vehicleId, expandedBody, card) {
  const isCurrentlyOpen = expandedVehicleId === vehicleId;
  document.querySelectorAll('.vc-expanded-body.open').forEach(body => {
    body.style.maxHeight = '0px';
    body.classList.remove('open');
  });
  document.querySelectorAll('.vc-expand-toggle').forEach(btn => { btn.textContent = '›'; });

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
      <div class="stat-box"><div class="stat-val">${avgEff}</div><div class="stat-label">平均油耗</div></div>
      <div class="stat-box"><div class="stat-val">${fuelRecords.length}</div><div class="stat-label">加油次數</div></div>
      <div class="stat-box"><div class="stat-val">${latestOdometer !== '—' ? Number(latestOdometer).toLocaleString() : '—'}</div><div class="stat-label">最新里程</div></div>
    </div>
    <div class="stats-row">
      <div class="stat-box"><div class="stat-val" style="font-size:14px">$${totalFuelCost.toLocaleString()}</div><div class="stat-label">油費合計</div></div>
      <div class="stat-box"><div class="stat-val" style="font-size:14px">$${totalMaintCost.toLocaleString()}</div><div class="stat-label">保養費合計</div></div>
      <div class="stat-box"><div class="stat-val">${maintRecords.length}</div><div class="stat-label">保養次數</div></div>
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

  displayRecords.forEach(r => recList.appendChild(buildRecordCard(r, v)));
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
      <div class="vmc-actions">
        <button class="vmc-edit-btn" data-vid="${v.id}" aria-label="編輯">✏️</button>
        <button class="vmc-delete-btn" data-vid="${v.id}" aria-label="刪除">🗑️</button>
      </div>`;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.vmc-edit-btn') || e.target.closest('.vmc-delete-btn')) return;
      openVehicleDetail(v.id);
    });
    card.querySelector('.vmc-edit-btn').addEventListener('click', (e) => { e.stopPropagation(); openEditVehicleModal(v); });
    card.querySelector('.vmc-delete-btn').addEventListener('click', (e) => { e.stopPropagation(); confirmDeleteVehicle(v); });
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

function openEditVehicleModal(v) {
  $('edit-vehicle-id').value = v.id;
  $('edit-vehicle-name').value = v.name;
  $('edit-vehicle-type').value = v.type;
  $('edit-vehicle-note').value = v.note || '';
  openModal('edit-vehicle-modal');
}

async function saveEditVehicle() {
  const id = parseInt($('edit-vehicle-id').value);
  const name = $('edit-vehicle-name').value.trim();
  const type = $('edit-vehicle-type').value;
  const note = $('edit-vehicle-note').value.trim();
  if (!name) { showToast('請填寫車輛名稱', 'error'); return; }
  const existing = vehicles.find(v => v.id === id);
  if (!existing) return;
  await updateVehicle({ ...existing, name, type, note });
  vehicles = await getAllVehicles();
  showToast('✅ 車輛資料已更新', 'success');
  closeModal('edit-vehicle-modal', () => renderVehiclesPage());
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
  $('add-fuel-grade').value = '95';
  selectedMaintItems = [];
  renderMaintChips();
  setAddType(addType);
  updateFuelEstimate();
  // Fetch/show CPC price
  updateFuelPriceBadge();
  if (!cpcPrices) fetchCPCPrices();
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
  const vehicleId = parseInt($('add-vehicle-select').value);
  const vehicle = vehicles.find(v => v.id === vehicleId);
  const vType = vehicle ? vehicle.type : 'car';
  const tmplItems = maintenanceTemplates.filter(t => t.vehicleType === vType).map(t => t.itemName);
  const staticItems = ['換機油', '換濾芯', '換輪胎', '換煞車皮', '冷卻液', '其他'];
  const allItems = [...new Set([...tmplItems, ...staticItems])];
  $('maint-chips').innerHTML = allItems.map(item =>
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

  // Get liters: from input or calculate from cost+price
  let liters = parseFloat($('add-liters').value);
  if ((!liters || isNaN(liters))) {
    const cost = parseFloat($('add-fuel-cost').value);
    const grade = $('add-fuel-grade').value;
    if (cost > 0 && cpcPrices && cpcPrices[grade]) {
      liters = cost / cpcPrices[grade];
    }
  }

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
  est.textContent = `預估油耗：${eff.toFixed(1)} km/L（${km.toFixed(0)} km / ${liters.toFixed(2)} L）`;
}

async function submitAddRecord() {
  const vehicleId = parseInt($('add-vehicle-select').value);
  if (!vehicleId) { showToast('請選擇車輛', 'error'); return; }

  if (addType === 'fuel') {
    const date = $('add-date').value;
    const odometer = parseFloat($('add-odometer').value);
    const fuelCost = parseFloat($('add-fuel-cost').value);
    const fuelGrade = $('add-fuel-grade').value;
    const note = $('add-fuel-note').value.trim();

    // Liters: manual input or calculate from cost / price
    let liters = parseFloat($('add-liters').value);
    if ((!liters || isNaN(liters)) && fuelCost > 0 && cpcPrices && cpcPrices[fuelGrade]) {
      liters = parseFloat((fuelCost / cpcPrices[fuelGrade]).toFixed(2));
    }

    if (!date || !odometer || !fuelCost) { showToast('請填寫日期、里程、加油金額', 'error'); return; }
    if (!liters || liters <= 0) { showToast('請填寫加油量，或確保已取得油價以自動計算', 'error'); return; }

    const vFuelRecords = records.filter(r => r.vehicleId === vehicleId && r.type === 'fuel')
      .sort((a, b) => b.odometer - a.odometer);
    const prevRecord = vFuelRecords.find(r => r.odometer < odometer);
    const fuelEfficiency = prevRecord ? parseFloat(((odometer - prevRecord.odometer) / liters).toFixed(2)) : 0;

    await addRecord({ vehicleId, type: 'fuel', date, odometer, liters, fuelCost, fuelEfficiency, fuelGrade, note, createdAt: new Date().toISOString() });

    records = await getAllRecords();
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      const vTemplates = maintenanceTemplates.filter(t => t.vehicleType === vehicle.type);
      const maintRecords = records.filter(r => r.vehicleId === vehicleId && r.type === 'maintenance');
      const overdueItems = [];
      for (const tmpl of vTemplates) {
        const lastMaintWithItem = maintRecords.sort((a, b) => b.odometer - a.odometer)
          .find(r => (r.items || []).includes(tmpl.itemName));
        if (lastMaintWithItem) {
          const nextKm = lastMaintWithItem.odometer + tmpl.intervalKm;
          if (odometer >= nextKm) overdueItems.push({ name: tmpl.itemName, nextKm });
        }
      }
      overdueItems.forEach(item => {
        setTimeout(() => showToast(`⚠️ 里程提醒：「${item.name}」應於 ${item.nextKm.toLocaleString()} km 更換！`, 'error'), TOAST_STAGGER_DELAY_MS);
      });
    }
  } else {
    const date = $('add-maint-date').value;
    const odometer = parseFloat($('add-maint-odometer').value);
    const maintenanceCost = parseFloat($('add-maint-cost').value);
    let nextOdometerReminder = parseFloat($('add-next-reminder').value) || 0;
    const note = $('add-maint-note').value.trim();

    if (!date || !odometer || !maintenanceCost) { showToast('請填寫必要欄位', 'error'); return; }
    if (selectedMaintItems.length === 0) { showToast('請選擇保養項目', 'error'); return; }

    const vehicle = vehicles.find(v => v.id === vehicleId);
    const autoReminders = [];
    if (vehicle && !nextOdometerReminder) {
      for (const itemName of selectedMaintItems) {
        const tmpl = maintenanceTemplates.find(t => t.vehicleType === vehicle.type && t.itemName === itemName);
        if (tmpl) {
          const nextKm = odometer + tmpl.intervalKm;
          autoReminders.push({ name: itemName, nextKm });
          if (!nextOdometerReminder || nextKm < nextOdometerReminder) nextOdometerReminder = nextKm;
        }
      }
    }

    await addRecord({ vehicleId, type: 'maintenance', date, odometer, items: [...selectedMaintItems], maintenanceCost, nextOdometerReminder, note, createdAt: new Date().toISOString() });
    records = await getAllRecords();
    showToast('✅ 記錄已儲存', 'success');
    autoReminders.forEach(r => {
      setTimeout(() => showToast(`🔧 下次「${r.name}」預計於 ${r.nextKm.toLocaleString()} km`, 'info'), TOAST_STAGGER_DELAY_MS);
    });
    closeModal('add-modal', () => renderDashboard());
    return;
  }

  records = await getAllRecords();
  showToast('✅ 記錄已儲存', 'success');
  closeModal('add-modal', () => renderDashboard());
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
    btn.addEventListener('click', () => { activeVehicleFilter = btn.dataset.vid; renderHistory(); });
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
    btn.addEventListener('click', () => { activeTypeFilter = btn.dataset.type; renderHistory(); });
  });

  const sf = $('history-sort-bar');
  sf.innerHTML = '<span style="font-size:11px;color:var(--text3);font-weight:600;align-self:center;margin-right:2px;">排序：</span>';
  [['desc', '↓ 最新'], ['asc', '↑ 最舊']].forEach(([val, label]) => {
    const btn = el('button', `filter-pill${historySort === val ? ' active' : ''}`);
    btn.dataset.sort = val;
    btn.textContent = label;
    sf.appendChild(btn);
  });
  sf.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => { historySort = btn.dataset.sort; renderHistory(); });
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
  const gradeTag = (r.type === 'fuel' && r.fuelGrade)
    ? `<span class="record-chip" style="background:var(--amber-dim);color:var(--amber)">${escHtml(r.fuelGrade)}汽油</span>` : '';
  body.innerHTML = `
    <div class="record-title">${escHtml(vName)}</div>
    <div class="record-sub">${r.date} · ${Number(r.odometer).toLocaleString()} km</div>
    ${r.type === 'maintenance' && r.items
      ? `<div class="record-chips">${r.items.map(i => `<span class="record-chip">${escHtml(i)}</span>`).join('')}</div>`
      : (gradeTag ? `<div class="record-chips">${gradeTag}</div>` : '')}
  `;

  const right = el('div', 'record-right');
  if (r.type === 'fuel') {
    right.innerHTML = `
      <div class="record-value efficiency">${r.fuelEfficiency > 0 ? r.fuelEfficiency.toFixed(1) + ' km/L' : '—'}</div>
      <div class="record-cost">$${Number(r.fuelCost).toLocaleString()}</div>
    `;
  } else {
    right.innerHTML = `<div class="record-value">$${Number(r.maintenanceCost).toLocaleString()}</div>`;
  }

  // Action buttons row
  const actions = el('div', 'record-actions');
  const editBtn = el('button', 'record-action-btn edit', '✏️ 編輯');
  const delBtn = el('button', 'record-action-btn delete', '🗑️ 刪除');
  editBtn.addEventListener('click', (e) => { e.stopPropagation(); openEditRecordModal(r); });
  delBtn.addEventListener('click', (e) => { e.stopPropagation(); confirmDeleteRecord(r.id); });
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  const top = el('div', 'record-top');
  top.appendChild(iconEl);
  top.appendChild(body);
  top.appendChild(right);

  wrap.appendChild(top);
  wrap.appendChild(actions);

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

// ── Edit Record Modal ──────────────────────────────
function openEditRecordModal(r) {
  $('edit-record-id').value = r.id;
  $('edit-record-type').value = r.type;

  if (r.type === 'fuel') {
    $('edit-record-modal-title').textContent = '編輯油耗記錄';
    $('edit-fuel-form').style.display = 'block';
    $('edit-maint-form').style.display = 'none';
    $('edit-date').value = r.date;
    $('edit-odometer').value = r.odometer;
    $('edit-fuel-grade').value = r.fuelGrade || '95';
    $('edit-liters').value = r.liters;
    $('edit-fuel-cost').value = r.fuelCost;
    $('edit-fuel-note').value = r.note || '';
  } else {
    $('edit-record-modal-title').textContent = '編輯保養記錄';
    $('edit-fuel-form').style.display = 'none';
    $('edit-maint-form').style.display = 'block';
    $('edit-maint-date').value = r.date;
    $('edit-maint-odometer').value = r.odometer;
    $('edit-maint-cost').value = r.maintenanceCost;
    $('edit-next-reminder').value = r.nextOdometerReminder || '';
    $('edit-maint-note').value = r.note || '';
    selectedEditMaintItems = [...(r.items || [])];
    // Render chips: need vehicleId
    const v = vehicles.find(vv => vv.id === r.vehicleId);
    renderEditMaintChips(v ? v.type : 'car');
  }

  openModal('edit-record-modal');
}

function renderEditMaintChips(vType) {
  const tmplItems = maintenanceTemplates.filter(t => t.vehicleType === vType).map(t => t.itemName);
  const staticItems = ['換機油', '換濾芯', '換輪胎', '換煞車皮', '冷卻液', '其他'];
  const allItems = [...new Set([...tmplItems, ...staticItems, ...selectedEditMaintItems])];
  $('edit-maint-chips').innerHTML = allItems.map(item =>
    `<button class="chip${selectedEditMaintItems.includes(item) ? ' selected' : ''}" data-item="${escHtml(item)}">${escHtml(item)}</button>`
  ).join('');
  $('edit-maint-chips').querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.dataset.item;
      if (selectedEditMaintItems.includes(item)) {
        selectedEditMaintItems = selectedEditMaintItems.filter(i => i !== item);
      } else {
        selectedEditMaintItems.push(item);
      }
      const r = records.find(r => r.id === parseInt($('edit-record-id').value));
      const v = r ? vehicles.find(vv => vv.id === r.vehicleId) : null;
      renderEditMaintChips(v ? v.type : 'car');
    });
  });
}

async function saveEditRecord() {
  const id = parseInt($('edit-record-id').value);
  const type = $('edit-record-type').value;
  const existing = records.find(r => r.id === id);
  if (!existing) { showToast('記錄不存在', 'error'); return; }

  if (type === 'fuel') {
    const date = $('edit-date').value;
    const odometer = parseFloat($('edit-odometer').value);
    const liters = parseFloat($('edit-liters').value);
    const fuelCost = parseFloat($('edit-fuel-cost').value);
    const fuelGrade = $('edit-fuel-grade').value;
    const note = $('edit-fuel-note').value.trim();

    if (!date || !odometer || !liters || !fuelCost) { showToast('請填寫必要欄位', 'error'); return; }

    // Recalculate efficiency
    const vFuelRecords = records.filter(r => r.vehicleId === existing.vehicleId && r.type === 'fuel' && r.id !== id)
      .sort((a, b) => b.odometer - a.odometer);
    const prevRecord = vFuelRecords.find(r => r.odometer < odometer);
    const fuelEfficiency = prevRecord ? parseFloat(((odometer - prevRecord.odometer) / liters).toFixed(2)) : 0;

    await updateRecord({ ...existing, date, odometer, liters, fuelCost, fuelEfficiency, fuelGrade, note });
  } else {
    const date = $('edit-maint-date').value;
    const odometer = parseFloat($('edit-maint-odometer').value);
    const maintenanceCost = parseFloat($('edit-maint-cost').value);
    const nextOdometerReminder = parseFloat($('edit-next-reminder').value) || 0;
    const note = $('edit-maint-note').value.trim();

    if (!date || !odometer || !maintenanceCost) { showToast('請填寫必要欄位', 'error'); return; }
    if (selectedEditMaintItems.length === 0) { showToast('請選擇保養項目', 'error'); return; }

    await updateRecord({ ...existing, date, odometer, items: [...selectedEditMaintItems], maintenanceCost, nextOdometerReminder, note });
  }

  records = await getAllRecords();
  showToast('✅ 記錄已更新', 'success');
  closeModal('edit-record-modal', () => {
    if (currentPage === 'history') renderHistory();
    if (currentPage === 'dashboard') renderDashboard();
    if (detailVehicleId) renderVehicleDetail();
  });
}

// ── Settings Page ──────────────────────────────────
function renderSettings() {
  applyTheme();
  const stored = localStorage.getItem('gdrive_client_id');
  if (stored) $('gdrive-client-id-input').value = stored;
  if (driveAccessToken) {
    $('gdrive-login-btn').style.display = 'none';
    $('gdrive-logout-btn').style.display = 'flex';
    $('gdrive-upload-btn').style.display = 'flex';
    $('gdrive-show-backups-btn').style.display = 'flex';
    const userInfo = $('gdrive-user-info');
    if (userInfo) { userInfo.style.display = 'block'; userInfo.textContent = `✅ 已登入：${driveUserName}`; }
  } else {
    $('gdrive-login-btn').style.display = 'flex';
    $('gdrive-logout-btn').style.display = 'none';
    $('gdrive-upload-btn').style.display = 'none';
    $('gdrive-show-backups-btn').style.display = 'none';
    const userInfo = $('gdrive-user-info');
    if (userInfo) { userInfo.style.display = 'none'; userInfo.textContent = ''; }
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

function importJSON() { $('import-file-input').click(); }

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
  } catch(err) { showToast('❌ 匯入失敗', 'error'); }
  e.target.value = '';
}

// ── Clear All Data ─────────────────────────────────
async function handleClearAllData() {
  if (!confirm('⚠️ 確認清除？\n所有車輛與記錄將永久刪除，但設定與保養項目模板不受影響。')) return;
  await clearAllData();
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
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${driveAccessToken}` }
        });
        const info = await infoRes.json();
        driveUserName = info.email || info.name || 'Google';
      } catch(e) { driveUserName = 'Google'; }
      $('gdrive-login-btn').style.display = 'none';
      $('gdrive-logout-btn').style.display = 'flex';
      $('gdrive-upload-btn').style.display = 'flex';
      $('gdrive-show-backups-btn').style.display = 'flex';
      const userInfo = $('gdrive-user-info');
      if (userInfo) { userInfo.style.display = 'block'; userInfo.textContent = `✅ 已登入：${driveUserName}`; }
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
  $('gdrive-show-backups-btn').style.display = 'none';
  const userInfo = $('gdrive-user-info');
  if (userInfo) { userInfo.style.display = 'none'; userInfo.textContent = ''; }
  showToast('已登出 Google', 'info');
}

async function uploadToDrive() {
  if (!driveAccessToken) { showToast('請先登入 Google', 'error'); return; }
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const data = { version: APP_VERSION, exportedAt: now.toISOString(), vehicles: await getAllVehicles(), records: await getAllRecords() };
  const filename = `fuel-record-backup-${dateStr}.json`;
  const meta = { name: filename, mimeType: 'application/json', parents: [GDRIVE_FOLDER_ID] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  try {
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${driveAccessToken}` },
      body: form
    });
    if (res.ok) { showToast('✅ 已上傳至 Google Drive', 'success'); await pruneOldBackups(); listDriveBackups(); }
    else showToast('❌ 上傳失敗', 'error');
  } catch(e) { showToast('❌ 上傳失敗', 'error'); }
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
    data.files.slice(0, GDRIVE_BACKUP_KEEP).forEach(f => {
      const dt = new Date(f.createdTime);
      const formatted = `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
      const item = el('div', 'backup-file-item');
      item.innerHTML = `
        <div>
          <div class="backup-file-name">☁️ ${escHtml(f.name)}</div>
          <div class="backup-file-date">${formatted}</div>
        </div>
        <span style="color:var(--blue);font-size:12px;font-weight:600">還原</span>`;
      item.addEventListener('click', () => restoreFromDrive(f.id, f.name));
      listEl.appendChild(item);
    });
  } catch(e) {}
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
    for (const f of data.files.slice(GDRIVE_BACKUP_KEEP)) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${driveAccessToken}` }
      });
    }
  } catch(e) {}
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
  } catch(e) { showToast('❌ 還原失敗', 'error'); }
}

// ── Maintenance Templates UI ───────────────────────
function openMaintTemplatesModal() {
  activeMaintTemplateType = 'car';
  renderMaintTemplatesList();
  openModal('maint-templates-modal');
}

function renderMaintTemplatesList() {
  const list = $('maint-templates-list');
  if (!list) return;
  const filtered = maintenanceTemplates.filter(t => t.vehicleType === activeMaintTemplateType);
  if (filtered.length === 0) {
    list.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:8px 0">尚無保養項目</div>';
    return;
  }
  list.innerHTML = '';
  filtered.forEach(tmpl => {
    const row = el('div', 'card maint-tmpl-row');
    row.innerHTML = `
      <div class="maint-tmpl-info">
        <div class="maint-tmpl-name">${escHtml(tmpl.itemName)}</div>
        <div class="maint-tmpl-detail">每 ${Number(tmpl.intervalKm).toLocaleString()} km${tmpl.note ? ' · ' + escHtml(tmpl.note) : ''}</div>
      </div>
      <div class="maint-tmpl-btns">
        <button class="vmc-edit-btn" data-tid="${tmpl.id}" aria-label="編輯">✏️</button>
        <button class="vmc-delete-btn" data-tid="${tmpl.id}" aria-label="刪除">🗑️</button>
      </div>`;
    row.querySelector('.vmc-edit-btn').addEventListener('click', () => openAddMaintTemplateModal(tmpl));
    row.querySelector('.vmc-delete-btn').addEventListener('click', () => confirmDeleteMaintTemplate(tmpl));
    list.appendChild(row);
  });
}

function openAddMaintTemplateModal(tmpl) {
  if (tmpl) {
    $('add-maint-template-title').textContent = '編輯保養項目';
    $('edit-tmpl-id').value = tmpl.id;
    $('tmpl-vehicle-type').value = tmpl.vehicleType;
    $('tmpl-item-name').value = tmpl.itemName;
    $('tmpl-interval-km').value = tmpl.intervalKm;
    $('tmpl-note').value = tmpl.note || '';
  } else {
    $('add-maint-template-title').textContent = '新增保養項目';
    $('edit-tmpl-id').value = '';
    $('tmpl-vehicle-type').value = activeMaintTemplateType;
    $('tmpl-item-name').value = '';
    $('tmpl-interval-km').value = '';
    $('tmpl-note').value = '';
  }
  openModal('add-maint-template-modal');
}

async function saveMaintTemplate() {
  const id = $('edit-tmpl-id').value;
  const vehicleType = $('tmpl-vehicle-type').value;
  const itemName = $('tmpl-item-name').value.trim();
  const intervalKm = parseInt($('tmpl-interval-km').value);
  const note = $('tmpl-note').value.trim();
  if (!itemName) { showToast('請填寫項目名稱', 'error'); return; }
  if (!intervalKm || intervalKm <= 0) { showToast('請填寫間隔公里數', 'error'); return; }
  if (id) {
    await updateMaintenanceTemplate({ id: parseInt(id), vehicleType, itemName, intervalKm, note });
    showToast('✅ 保養項目已更新', 'success');
  } else {
    await addMaintenanceTemplate({ vehicleType, itemName, intervalKm, note });
    showToast('✅ 保養項目已新增', 'success');
  }
  maintenanceTemplates = await getAllMaintenanceTemplates();
  activeMaintTemplateType = vehicleType;
  closeModal('add-maint-template-modal', () => renderMaintTemplatesList());
}

async function confirmDeleteMaintTemplate(tmpl) {
  if (!confirm(`確定要刪除「${tmpl.itemName}」保養項目？`)) return;
  await deleteMaintenanceTemplate(tmpl.id);
  maintenanceTemplates = await getAllMaintenanceTemplates();
  showToast('🗑️ 保養項目已刪除', 'info');
  renderMaintTemplatesList();
}

// ── Swipe-to-Close ─────────────────────────────────
function attachSwipeClose(modalId) {
  const modal = $(modalId);
  if (!modal) return;
  let startX = 0, startY = 0, tracking = false;

  modal.addEventListener('touchstart', (e) => {
    if (swipeCooldown) return;
    const touch = e.touches[0];
    if (touch.clientX > SWIPE_EDGE_THRESHOLD) return;
    startX = touch.clientX; startY = touch.clientY;
    tracking = true;
    modal.style.transition = 'none';
  }, { passive: true });

  modal.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (dx <= 0) { tracking = false; modal.style.transition = ''; return; }
    if (Math.abs(dx) > Math.abs(dy) * SWIPE_MOVE_RATIO) {
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
    if (dx > SWIPE_CLOSE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * SWIPE_HORIZONTAL_RATIO) {
      swipeCooldown = true;
      modal.style.transform = 'translateX(105%)';
      setTimeout(() => {
        closeModal(modalId);
        modal.style.transform = '';
        setTimeout(() => { swipeCooldown = false; }, SWIPE_COOLDOWN_MS);
      }, 280);
    } else {
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
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) checkForUpdate();
      });
    });
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
}

// ── Utilities ─────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const isLight = localStorage.getItem('theme') !== 'dark';
  if (isLight) document.body.classList.add('light-mode');
  applyTheme();

  await loadData();
  navigate('dashboard');

  // Fetch CPC prices in background
  fetchCPCPrices();

  // Bottom nav
  ['dashboard', 'history', 'vehicles', 'settings'].forEach(page => {
    const btn = $(`nav-${page}`);
    if (btn) btn.addEventListener('click', () => navigate(page));
  });
  $('nav-add').addEventListener('click', () => openAddModal(null, 'fuel'));

  // Theme
  $('theme-toggle-btn').addEventListener('click', toggleTheme);
  $('settings-theme-btn').addEventListener('click', toggleTheme);
  $('settings-theme-toggle').addEventListener('click', toggleTheme);

  // Add modal
  document.querySelectorAll('.type-tab').forEach(btn => {
    btn.addEventListener('click', () => setAddType(btn.dataset.type));
  });
  $('add-vehicle-select').addEventListener('change', () => { updateFuelEstimate(); renderMaintChips(); });
  $('add-odometer').addEventListener('input', updateFuelEstimate);
  $('add-liters').addEventListener('input', updateFuelEstimate);
  $('add-fuel-cost').addEventListener('input', updateFuelEstimate);
  $('add-fuel-grade').addEventListener('change', () => { updateFuelPriceBadge(); updateFuelEstimate(); });
  $('add-submit-btn').addEventListener('click', submitAddRecord);
  $('add-modal-back').addEventListener('click', () => closeModal('add-modal'));

  // Edit record modal
  $('edit-record-modal-back').addEventListener('click', () => closeModal('edit-record-modal'));
  $('save-edit-record-btn').addEventListener('click', saveEditRecord);

  // Vehicle detail modal
  $('detail-modal-back').addEventListener('click', () => closeModal('vehicle-detail-modal'));
  document.querySelectorAll('.detail-tab').forEach(btn => {
    btn.addEventListener('click', () => { detailTab = btn.dataset.tab; renderVehicleDetail(); });
  });

  // Vehicles page
  $('add-vehicle-btn').addEventListener('click', openAddVehicleModal);
  $('add-vehicle-modal-back').addEventListener('click', () => closeModal('add-vehicle-modal'));
  $('save-vehicle-btn').addEventListener('click', saveNewVehicle);
  $('edit-vehicle-modal-back').addEventListener('click', () => closeModal('edit-vehicle-modal'));
  $('save-edit-vehicle-btn').addEventListener('click', saveEditVehicle);

  // Settings
  $('export-btn').addEventListener('click', exportJSON);
  $('import-btn').addEventListener('click', importJSON);
  $('import-file-input').addEventListener('change', handleImportFile);
  $('gdrive-login-btn').addEventListener('click', googleLogin);
  $('gdrive-logout-btn').addEventListener('click', googleLogout);
  $('gdrive-upload-btn').addEventListener('click', uploadToDrive);
  $('gdrive-show-backups-btn').addEventListener('click', () => { listDriveBackups(); openModal('backup-list-modal'); });
  $('backup-list-modal-back').addEventListener('click', () => closeModal('backup-list-modal'));
  $('clear-data-btn').addEventListener('click', handleClearAllData);
  $('open-maint-templates-btn').addEventListener('click', openMaintTemplatesModal);
  $('maint-templates-modal-back').addEventListener('click', () => closeModal('maint-templates-modal'));
  $('add-maint-template-btn').addEventListener('click', () => openAddMaintTemplateModal(null));
  $('add-maint-template-modal-back').addEventListener('click', () => closeModal('add-maint-template-modal'));
  $('save-maint-template-btn').addEventListener('click', saveMaintTemplate);
  document.querySelectorAll('.maint-type-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeMaintTemplateType = btn.dataset.vtype;
      document.querySelectorAll('.maint-type-tab').forEach(b => b.classList.toggle('active', b.dataset.vtype === activeMaintTemplateType));
      renderMaintTemplatesList();
    });
  });

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

  // Swipe-to-close for all modals
  ['add-modal', 'edit-record-modal', 'vehicle-detail-modal', 'add-vehicle-modal', 'edit-vehicle-modal',
   'backup-list-modal', 'maint-templates-modal', 'add-maint-template-modal'].forEach(id => attachSwipeClose(id));

  registerSW();
  setTimeout(checkForUpdate, 3000);

  if (window.google && localStorage.getItem('gdrive_client_id')) initGIS();
  window.addEventListener('load', () => {
    if (window.google && localStorage.getItem('gdrive_client_id')) initGIS();
  });
});
