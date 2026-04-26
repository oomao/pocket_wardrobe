# 智慧衣櫥 Pocket Wardrobe

純前端虛擬試穿平台：上傳衣物照片 → AI 自動去背 → 手動橡皮擦微調 → 在虛擬人物上自由搭配 → 儲存穿搭紀錄。所有資料儲存在瀏覽器 IndexedDB，無需後端。

🌐 線上 Demo：https://oomao.github.io/pocket_wardrobe/

## 技術棧

- React 18 + TypeScript + Vite
- Tailwind CSS
- Fabric.js（試穿畫布）
- @imgly/background-removal（瀏覽器端 AI 去背）
- localforage（IndexedDB 封裝）

## 本機開發

```bash
npm install
npm run dev
```

## 建置與預覽

```bash
npm run build
npm run preview
```

## 部署

push 到 `main` 後，GitHub Actions 會自動 build 並發佈至 GitHub Pages。

需要先到 repo Settings → Pages → Source 選擇 **GitHub Actions**。

## 模組概要

| 模組 | 說明 |
|---|---|
| 設定/分類 | 預設六大分類，可自訂新增/刪除 |
| 虛擬人物 | 男/女基礎圖形，身高/體重比例可調 |
| 新增衣物 | 上傳 → AI 去背 → 橡皮擦微調 → 命名/分類 → 入庫 |
| 衣櫥展示 | 網格瀏覽，分類篩選，刪除 |
| 試穿室 | Fabric.js 拖曳/縮放/旋轉，圖層上下移 |
| 穿搭紀錄 | 儲存搭配，一鍵還原至原位置與尺寸 |
