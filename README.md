# 🪵 智慧衣櫥 Pocket Wardrobe

純前端的虛擬試穿與穿搭管理 SPA。所有資料只儲存在瀏覽器 IndexedDB，不上傳任何伺服器。
整體視覺以**木質衣櫥**為主題（walnut + cream），呈現一個有溫度的隨身衣櫥。

🌐 **線上 Demo**：<https://oomao.github.io/pocket_wardrobe/>

---

## ✨ 功能總覽

側邊欄五個主要區塊：

| 區塊 | 用途 |
|---|---|
| 🪵 **衣櫥** | 木紋抽屜分類顯示、卡片式網格、進階篩選（季節 / 場合 / 風格）|
| 🎨 **搭配** | 入口頁，4 種搭配模式：模特兒 / AI / 平拍 / 隨機抽搭 |
| 📔 **收藏** | 已儲存的搭配，分頁瀏覽（模特兒穿搭 / 平拍造型）|
| 📊 **數據** | 統計圖表 + 穿搭日曆 |
| ⚙️ **設定** | 分類、虛擬人物 / 個人照片、ZIP 備份還原 |

---

## 🪵 衣櫥（/）

- **木紋抽屜分類**（7 格）：全部 / 上衣 / 外套 / 下著 / 連身 / 鞋子 / 配件，附 emoji icon + 件數，hover 浮起、active 有 walnut outline
- 卡片式衣物網格：色票圓點、穿著次數 badge、hover 浮起
- 進階篩選：季節（春/夏/秋/冬）+ 場合（日常/上班/運動/約會/正式/居家）+ 風格（簡約/運動/中性/韓系/日系/歐美/復古/藝術），可任意交集
- 詳細彈窗：色票、品牌、季節 / 場合 / 風格、價格、購買日、**穿著次數**、**平均單次成本**、備註
- 衣櫥空時顯示歡迎引導頁

### ➕ 新增衣物（/add）

可選的多步驟編輯：

1. **拍照 / 上傳**（原生相機 capture 或從相簿）
2. **編輯**（去背 / 還原 / 微調全部都是「可選」按鈕，不再強制執行）
   - 🪄 AI 去背 — `@imgly/background-removal`（首次下載 ~24MB WASM 模型）
   - ✨ **AI 還原原色** dropdown：
     - 🍌 Google Nano Banana via Puter.js
     - 🤗 Qwen-Image-Edit (HF Space)
     - 🤗 FLUX.1 Kontext-Dev (HF Space)
   - 🎨 自動調色（純前端 canvas，white-patch WB + 對比 / 飽和度微調）
   - 橡皮擦微調（destination-out + 20-step undo stack）
   - 雙指縮放、Ctrl+滾輪、單指平移；**縮放以指標為焦點**（不是固定左上角）
   - AI 還原後**自動再去背一次 + 裁透明邊**，編輯器仍是透明背景
3. **標對齊點**（依分類拖兩個錨點：左/右肩、左/右腰、左/右鞋；配件跳過）
4. **命名 + 屬性**（名稱、分類、**主色（自動偵測）**、品牌、季節、場合、風格、價格 NTD、購買日、備註）

---

## 🎨 搭配 Hub（/compose）

入口頁，介紹 4 種搭配模式。

### 🪞 模特兒試穿（/tryon）

- 6 種畫布背景（攝影棚白 / 米色 / 柔粉 / 冷霧灰 / 沙漠米 / 透明格紋）
- 畫布外框：**試衣間鏡框**樣式（雙層陰影 + 內高光 + 木紋邊）
- **底圖兩種模式**：
  - 預設模特兒（服飾店風 SVG mannequin，奶油色 + 底座 + 中軸桿）
  - 我的照片（從設定上傳，自動 AI 去背 + 透明邊裁切）
- **智慧對齊**：
  - 預設模特兒 → SVG 內建肩 / 腰 / 腳座標
  - 個人照片 → MediaPipe Pose Landmarker（lazy load ~5MB）偵測 33 點
  - 衣物 anchors + 身體關鍵點 → affine 變換（旋轉 + 縮放 + 平移）
- **自動圖層順序**（鞋 < 下著 < 上衣 < 外套 < 配件）
- 衣物軟陰影、淡入動畫、選取手把更精細

### ✨ AI 真實試穿（/ai-tryon）

兩個 provider 可切換：

- **🤗 HuggingFace 開源 Space（推薦、預設）**：免費、可從多個模型挑選
- **🍌 Puter Nano Banana**（每日有額度，當作備援）

#### 模型選單（實測 2026-04 狀態）

| 模型 | 狀態 | 備註 |
|---|---|---|
| 🌟 **OOTDiffusion**（預設）| ✅ 匿名可用、2.3 秒喚醒 | AAAI 2024，6.3k★ |
| **IDM-VTON** | ✅ 匿名可用、自動 masking | 經典 SOTA |
| Qwen-Image-Edit 2511 | ⚠️ 需 HF Token（ZeroGPU） | 盲測勝過 Gemini 2.5 |
| FLUX.1 Kontext-Dev | ⚠️ 需 HF Token（ZeroGPU） | Black Forest Labs |

每個 Space 在程式碼中宣告自己的 `buildPayload()`，呼叫時直接送對的參數名稱（不再瞎猜）。
若 HF 連線逾時 / 失敗，60 秒會跳明確錯誤 + 解法建議（不會再卡 5 分鐘）。

設定 modal 頂端有醒目的 **HF Token 欄位**（解釋為什麼需要、附 [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) 連結，token 只存 localStorage）。

### 🪡 平拍造型（/style）

無模特兒的 flat-lay 搭配（像 Pinterest Shuffles）：
- 6 種背景
- 衣物**依分類自動分區**（上衣放上方、下著放中間、鞋子配件放下方）
- 自由拖曳 / 縮放 / 旋轉 / 層級
- 儲存時自動截 canvas 快照（含背景）→ 收藏卡片顯示真實預覽

### 🎲 隨機抽搭（/shuffle）

- 季節限定篩選（全部 / 春 / 夏 / 秋 / 冬）
- 一鍵抽 4 格（上 / 下 / 鞋 / 配件），30% 機率改抽連身
- 每格獨立「重抽這格」
- 結果可直接「存成造型」或「拿這組去試穿」

---

## 📔 收藏（/library）

兩個分頁，整合舊的 outfits 和 styles：

| 分頁 | 內容 |
|---|---|
| 🪞 **模特兒穿搭** | 模特兒試穿儲存的穿搭，2×2 mini-collage 預覽 |
| 🪡 **平拍造型** | 平拍造型儲存的 look，真實 canvas snapshot 預覽 |

每張卡：浮起動效、件數 badge、毛玻璃刪除鈕、深色「一鍵還原 / 開啟編輯」CTA。

---

## 📊 數據（/insights）

兩個分頁：

### 📊 統計圖表
- 4 個 KPI：總衣物 / 儲存搭配 / 總穿搭次數 / 總花費（NTD）
- 分類分布條形圖
- **顏色分布**（紅 / 橙黃 / 綠 / 藍 / 紫粉 / 黑灰 / 白米 / 其他，依 HSL 自動分桶）
- 最常穿 Top 5
- **最划算排行**（cost-per-wear，由低到高）
- 從未穿過清單（前 12 件）

### 🗓 穿搭日曆
- 月曆視圖，可換月份
- 每天 cell 顯示當日第一件衣物縮圖 + 多件的 +N 標記
- 點任一天 → 下方展開當天所有穿著紀錄
- **儲存試穿 / 造型時自動寫入今天的 WearLog**（含日期、衣物 IDs、所屬 outfit / style ID）

---

## ⚙️ 設定（/settings）

### 📁 分類管理
- 預設 6 類；可新增、可刪除（該分類下還有衣物會擋）

### 💾 備份 / 還原
- ⬇ **匯出 ZIP**：所有衣物 / 穿搭 / 造型 / 紀錄 / 個人照打包成單一 zip 檔
  - 結構：`wardrobe.json` + `images/clothes/<id>.png` + `images/styles/<id>.jpg` + `images/profile.png`
  - 解壓後可直接看內容
- ⬆ **匯入 ZIP**：上傳 zip 還原（會先確認覆蓋）
- 純前端、零上傳；可丟到 Google Drive / iCloud / Dropbox 當雲端備份

### 🧍 虛擬人物 / 個人照片
- **底圖樣式**：預設模特兒 vs 我的照片
- **預設模特兒**：性別（男 / 女）、身高（140–200 cm）、體重（35–120 kg）— slider + 數字輸入
- **個人照片**：
  - 拍照 / 從相簿選
  - 拍照建議卡（✅ 適合 / ❌ 避免，各 5 條）
  - 自動 AI 去背選項（預設開）
  - 上傳後自動裁切透明邊
  - 進度條 + 模型下載提示

---

## 🛠 技術棧

| 層 | 技術 |
|---|---|
| 框架 | React 18 + TypeScript + Vite 5 |
| 樣式 | Tailwind CSS 3（自訂 walnut + cream + oak 木質調色盤）|
| 路由 | react-router-dom v6（HashRouter，適合 GH Pages 子路徑）|
| 本地資料庫 | localforage → IndexedDB |
| 試穿 / 平拍畫布 | Fabric.js v6 |
| AI 去背 | `@imgly/background-removal`（瀏覽器 WASM，~24MB 模型）|
| 身體姿勢偵測 | `@mediapipe/tasks-vision` Pose Landmarker（lazy load ~5MB）|
| AI 試穿 | HuggingFace Spaces via `@gradio/client`（OOTDiffusion / IDM-VTON / Qwen / FLUX）|
| AI 還原原色 | Puter.js（Nano Banana）+ Qwen / FLUX HF Space |
| ZIP 備份 | JSZip（純前端壓縮 / 解壓）|
| Polyfills | `buffer` + `globalThis.global` 對齊（讓 @gradio/client 可在瀏覽器跑）|
| PWA | `vite-plugin-pwa` + Workbox（installable + offline shell）|
| 測試 | Vitest 4 + happy-dom + fake-indexeddb（37 個 unit / mock test 全綠）|
| 部署 | GitHub Actions → GitHub Pages |

---

## 🗂 專案結構

```
pocket_wardrobe/
├── public/
│   ├── icon.svg                       # PWA icon
│   └── avatars/                       # 預設男 / 女模特兒 SVG
├── scripts/
│   └── probe-tryon.mjs                # 一次性 CLI probe，直打 HF Space 確認可用性
├── src/
│   ├── main.tsx                       # 入口 + Buffer polyfill + 註冊 SW + initDB
│   ├── App.tsx                        # HashRouter
│   ├── index.css                      # Tailwind base + 木質元件樣式（wood-shelf / wood-card）
│   ├── test-setup.ts                  # 注入 fake-indexeddb 給 vitest
│   ├── types/
│   │   ├── index.ts                   # 全部資料模型 + 常數（Clothing / Outfit / Style / WearLog…）
│   │   └── index.test.ts              # 20 cases 純函式測試
│   ├── services/
│   │   ├── storage.ts                 # IndexedDB CRUD
│   │   ├── storage.test.ts            # 10 cases CRUD 測試
│   │   ├── imageProcessing.ts         # 去背 + 裁透明邊 + 主色提取
│   │   ├── editorCanvas.ts            # 橡皮擦編輯器（plain canvas + undo）
│   │   ├── canvasController.ts        # 試穿 / 平拍畫布控制（Fabric）
│   │   ├── poseDetection.ts           # MediaPipe pose lazy wrapper + cache
│   │   ├── aiTryOn.ts                 # HF Space 虛擬試穿（每個 Space 自帶 buildPayload）
│   │   ├── aiTryOn.test.ts            # 6 cases mock 測試（token forwarding / timeout / error / 解析）
│   │   ├── geminiTryOn.ts             # （legacy）Google Gemini API direct
│   │   ├── puterTryOn.ts              # Puter Nano Banana 試穿
│   │   ├── aiCleanup.ts               # AI 還原原色（Puter + HF Space）
│   │   └── backup.ts                  # ZIP 匯出 / 匯入
│   │   └── backup.test.ts             # round-trip 測試
│   ├── context/
│   │   └── WardrobeContext.tsx
│   ├── components/
│   │   ├── Layout.tsx                 # 木質側邊欄 + 5 項導航 + mobile drawer
│   │   ├── ClothingGrid.tsx           # 衣物卡片（色票 + 穿著次數 badge）
│   │   ├── CategoryTabs.tsx
│   │   ├── AvatarPreview.tsx
│   │   └── AnchorPicker.tsx           # 拖兩錨點（controlled component，不再閃爍）
│   └── pages/
│       ├── WardrobePage.tsx           # 衣櫥（木紋抽屜 + 進階篩選）
│       ├── AddClothingPage.tsx        # 新增衣物（編輯 → 錨點 → 命名屬性 → 儲存）
│       ├── ComposePage.tsx            # 搭配 Hub（4 張卡）
│       ├── TryOnPage.tsx              # 模特兒試穿
│       ├── AITryOnPage.tsx            # AI 試穿（Provider toggle + 模型選單 + HF Token 欄位）
│       ├── StyleComposerPage.tsx      # 平拍造型
│       ├── ShufflePage.tsx            # 隨機抽搭
│       ├── LibraryPage.tsx            # 收藏（穿搭 + 造型 tabs）
│       ├── InsightsPage.tsx           # 數據（統計 + 日曆 tabs）
│       └── SettingsPage.tsx           # 設定（分類 + 備份 + 人物）
├── .github/workflows/deploy.yml
├── .claude/launch.json                # 給 Claude Preview MCP 啟動 dev server 用
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── index.html                         # 含 Puter.js script tag
```

---

## 🚀 本機開發

```bash
npm install
npm run dev          # http://localhost:5173/pocket_wardrobe/
npm run build        # 產出 dist/
npm run preview      # 在 :4173 預覽 build
npm run typecheck    # tsc --noEmit
npm test             # vitest run（37 個測試）
npm run test:watch   # vitest 互動模式
```

### CLI 探針（驗證 HF Space 可用性）

```bash
node scripts/probe-tryon.mjs levihsu/OOTDiffusion
node scripts/probe-tryon.mjs yisol/IDM-VTON
```

直接用 `@gradio/client` 對 Space 打一次 1×1 像素 + 真實參數，確認：連線是否成功、API 是否暴露、參數格式是否被接受。

---

## 🔑 AI 設定指南

### AI 試穿（HF Space，推薦）

預設用 **OOTDiffusion** — 匿名可用、2.3 秒喚醒、無須登入。直接點開始即可。

如想試 Qwen / FLUX 這種「需 Token」級別的更高品質模型：
1. 註冊免費 [HF 帳號](https://huggingface.co/join)
2. 到 [Settings → Access Tokens](https://huggingface.co/settings/tokens) 建立 Read 權限的 token
3. AI 試穿頁右上「⚙️ 模型 chip」→ 頂端琥珀色面板貼上 token

Token 只存於你的瀏覽器 localStorage，不會傳給任何其他伺服器（除了你呼叫的 HF Space 本身）。

### AI 還原原色（編輯衣物時可選）

- **Puter Nano Banana**：免費，每日 ~10–20 次後會 rate-limit。首次需登入 Puter（30 秒）。
- **Qwen-Image-Edit / FLUX Kontext (HF Space)**：永久免費，但 Qwen / FLUX 在 ZeroGPU 上可能需要 HF token。

---

## 🧪 測試成果

最後一次完整測試：**37 / 37 通過**（vitest + happy-dom）

| 測試檔 | 案例數 | 範圍 |
|---|---:|---|
| `types/index.test.ts` | 20 | costPerWear / profileToScales / 預設錨點 / mannequin landmark / Z-order / placement box / 背景常數 |
| `services/storage.test.ts` | 10 | initDB / 衣物 CRUD / 穿著紀錄 / outfit / style / todayString |
| `services/aiTryOn.test.ts` | 6 | token 傳遞 / 匿名模式 / status callback / 錯誤包裝 / 60s timeout / 多種 response 解析 |
| `services/backup.test.ts` | 1 | ZIP export → import 完整 round-trip + MIME type 保留 |

並且透過 Claude Preview MCP 對 dev server 做端對端 walkthrough，確認 5 個主頁面 + 子頁面（含種了假資料的衣櫥）console **零錯誤**。

`scripts/probe-tryon.mjs` 真實打了 OOTDiffusion 與 IDM-VTON 的 Gradio API（匿名）：兩個都 2.3 秒喚醒、API 接受參數，僅因 1×1 像素無臉而報 IndexError（符合預期）。

---

## ⚠️ 已知限制

- 衣物資料以 Base64 存進 IndexedDB，量大時占空間（一件約 200–500KB）
- AI 去背首次下載 ~24MB WASM 模型，較慢的網路要等 30–60 秒
- MediaPipe Pose 也要下載 ~5MB 模型（首次進入試穿室且使用個人照片時）
- HF Space 是公共資源，OOTDiffusion / IDM-VTON 雖然匿名可用，但有共用佇列；尖峰時段或 Space 重啟可能要等
- **Qwen-Image-Edit / FLUX Kontext**（ZeroGPU）2026 起拒絕匿名請求，需 HF token；vanilla Gemini 直連從 2026/1 起也取消免費 tier
- AI 試穿一次只能套一件衣服（模型輸入限制）；多件搭配建議走「平拍造型」模式

---

## 📜 授權

Personal project，未指定授權。資料完全儲存於使用者瀏覽器，不蒐集任何個資。
