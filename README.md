# 🚗 油耗紀錄 PWA

> 汽機車油耗與保養紀錄 Progressive Web App

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-green)](https://lihe-source.github.io/PWA-Fuel-Record/)

## ✨ 功能特色

- 🚗 多車輛管理（汽車 / 機車）
- ⛽ 油耗記錄與自動計算 km/L
- 🔧 保養記錄與里程提醒
- 📱 本機 JSON 備份與還原
- ☁️ Google Drive 雲端備份
- 📶 離線支援（PWA Service Worker）
- 🌙 Dark / Light 主題切換
- 🔄 自動版本更新偵測

## 🚀 使用方式

開啟網址後，點擊瀏覽器的「新增至主畫面」即可安裝為 PWA。

**線上版本**：https://lihe-source.github.io/PWA-Fuel-Record/

## 📋 版本記錄

### V1_1 (1.1.0)
- 新增車輛管理頁面
- 儀表板展開式車輛卡片
- 次頁面左滑返回手勢
- Google Drive 備份指定資料夾（ID: 1LqlXKg8BBthb5Iyijf6eQliXNETaDXP1）
- 備份頁改為設定頁，保留近 5 筆雲端備份
- 清除資料按鈕（危險區域）
- 歷史記錄排序（由新到舊 / 由舊到新）
- 歷史記錄列表獨立滾動

### V1_0 (1.0.0)
- 初始版本
- 基礎油耗與保養記錄功能
- IndexedDB 本機儲存
- PWA 離線支援
- 本機 JSON 備份還原
- Google Drive 備份整合

## 🛠️ 技術棧

- HTML5 + CSS3 + Vanilla JavaScript
- IndexedDB（本機資料儲存）
- Service Worker（離線快取）
- Google Identity Services + Drive API v3
- GitHub Pages + GitHub Actions

## 📁 檔案結構

```
PWA-Fuel-Record/
├── index.html      # 主頁面
├── style.css       # 全域樣式
├── app.js          # 主程式邏輯
├── db.js           # IndexedDB 封裝
├── sw.js           # Service Worker
├── manifest.json   # PWA 設定
├── icon.svg        # App 圖示
├── version.json    # 版本資訊
└── .github/
    └── workflows/
        └── deploy.yml
```
