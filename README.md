# 🪵 智慧衣櫥 Pocket Wardrobe

純前端的虛擬試穿與穿搭管理 SPA。所有資料只儲存在瀏覽器 IndexedDB，不上傳任何伺服器。整體視覺以**木質衣櫥**為主題（walnut + cream），呈現一個有溫度的隨身衣櫥。

🌐 **線上 Demo**：<https://oomao.github.io/pocket_wardrobe/>

---

## ✨ 功能總覽

四個主要區塊（左側導航）：

| 區塊 | 用途 |
|---|---|
| 🪵 **衣櫥** | 上傳、瀏覽、刪除衣物；分類篩選 |
| 🎨 **搭配** | 三種試穿方式的入口頁（模特兒 / AI / 平拍） |
| 📔 **收藏** | 儲存的穿搭與造型，分頁瀏覽 |
| ⚙️ **設定** | 分類管理、虛擬人物 / 真實照片、AI 設定 |

---

## 🪵 衣櫥（/）

- 卡片式網格瀏覽（hover 浮起、邊角自動圓潤、衣物圖片置中）
- 分類頁籤切換（上衣 / 外套 / 下著 / 連身 / 鞋子 / 配件，可在設定新增）
- 點擊衣物 → 詳細彈窗（含建立時間 + 刪除）

### ➕ 新增衣物（/add）

三步式流程：

1. **拍照 / 上傳**：原生相機 (capture) 或從相簿 / 檔案選擇
2. **AI 去背 + 編輯**：
   - 自動 AI 去背（使用 `@imgly/background-removal`，首次下載 ~24MB WASM 模型）
   - 自動裁切透明邊緣（`cropTransparent`）讓衣物緊貼 bbox
   - 橡皮擦微調（destination-out 合成 + Undo 堆疊 max 20）
   - 雙指 / Ctrl+滾輪縮放、單指平移
   - **「還原服飾原色」** 兩個選項：
     - ✨ AI 還原原色（Puter.js → Google Gemini Nano Banana）→ 商品圖等級重繪
     - 🎨 自動調色（純前端 canvas）→ Gray-world 白平衡 + 對比 / 飽和度微調
3. **標對齊點**：依分類拖兩個錨點（左肩 / 右肩、左腰 / 右腰、左鞋 / 右鞋）。配件跳過。
4. **命名 + 分類 + 儲存**

---

## 🎨 搭配 Hub（/compose）

入口頁，介紹三種搭配模式。

### 🪞 模特兒試穿（/tryon）

- 6 種畫布背景可選（攝影棚白 / 米色 / 柔粉 / 冷霧灰 / 沙漠米 / 透明格紋）
- 畫布外框：「試衣間鏡框」風格（雙層陰影 + 內高光 + 木紋邊）
- **底圖兩種模式**：
  - 預設模特兒（卡通服飾店模特兒 SVG，奶油色光滑表面 + 底座）
  - 我的照片（從設定上傳，自動 AI 去背 + 裁切）
- **智慧對齊（Plan B）**：
  - 預設模特兒：使用 SVG 內建肩 / 腰 / 腳座標
  - 個人照片：使用 MediaPipe Pose Landmarker（lazy load ~5MB）偵測身體 33 點
  - 衣物的 anchors + 身體關鍵點 → affine 變換（旋轉 + 縮放 + 平移），**衣服自動穿到身體對應位置**
- **自動圖層順序**：鞋 → 下著 → 上衣 → 外套 → 配件，無需手動調整
- 視覺精緻化：衣物軟陰影、淡入動畫、選取手把更精細
- 儲存穿搭 → 進收藏

### ✨ AI 真實試穿（/ai-tryon）

兩個 AI 提供者可選：

- **Google Gemini Nano Banana**（推薦）：擬真度最高，需自行申請 [Google AI Studio API key](https://aistudio.google.com/apikey)（注意：2026/3 起需付費，$0.039/張）
- **HuggingFace 開源 Space**（CatVTON / Kolors-VTON / IDM-VTON）：免費，但較慢（30–120 秒）且會排隊

第一次使用會跳同意視窗（資料會傳給第三方）。結果可下載或重試。

### 🪡 平拍造型（/style）

無模特兒的 flat-lay 搭配（像 Pinterest Shuffles）：

- 可選 6 種背景
- 衣物**依分類自動分區**（上衣放上方、下著放中間、鞋子放下方）— 第一眼就像紙娃娃排版
- 自由拖曳、縮放、旋轉、層級
- **儲存時截 canvas 快照**（含背景）→ 收藏卡片顯示真實預覽圖

---

## 📔 收藏（/library）

兩個分頁：

| 分頁 | 內容 |
|---|---|
| 🪞 **模特兒穿搭** | 模特兒試穿儲存的穿搭，2×2 衣物拼貼預覽 |
| 🪡 **平拍造型** | 平拍造型儲存的 look，真實 canvas snapshot 預覽 |

每張卡：浮起動效、件數 badge、毛玻璃刪除鈕、深色「一鍵還原」CTA。

---

## ⚙️ 設定（/settings）

### 分類管理
- 預設 6 類；可新增、可刪除（該分類下還有衣物會擋）

### 虛擬人物 / 個人照片
- **底圖樣式**：預設模特兒 vs 我的照片
- **預設模特兒**：性別（男 / 女）、身高（140–200 cm）、體重（35–120 kg）— slider + 數字輸入
- **個人照片**：
  - 拍照 / 從相簿選
  - **拍照建議卡**（✅ 適合 / ❌ 避免，各 5 條）
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
| 試穿畫布 | Fabric.js v6 |
| AI 去背 | `@imgly/background-removal`（瀏覽器 WASM，~24MB 模型）|
| 身體姿勢偵測 | `@mediapipe/tasks-vision` Pose Landmarker（lazy load ~5MB）|
| AI 試穿 (1) | Google Gemini 2.5 Flash Image via `@google/genai` SDK |
| AI 試穿 (2) | HuggingFace Spaces via `@gradio/client` |
| AI 還原原色 | Puter.js（前端代理 Google Nano Banana，免費）|
| PWA | `vite-plugin-pwa` + Workbox（installable + offline shell）|
| 部署 | GitHub Actions → GitHub Pages |

---

## 🗂 專案結構

```
pocket_wardrobe/
├── public/
│   ├── icon.svg              # PWA icon
│   └── avatars/              # 預設男 / 女模特兒 SVG
├── src/
│   ├── main.tsx              # 入口 + 註冊 SW + initDB
│   ├── App.tsx               # HashRouter
│   ├── index.css             # Tailwind base + 木質元件樣式
│   ├── types/index.ts        # 全部資料模型 + 常數
│   ├── services/
│   │   ├── storage.ts        # IndexedDB CRUD（clothing / outfit / style / profile）
│   │   ├── imageProcessing.ts# 去背 + 裁透明邊 + dataURL helpers
│   │   ├── editorCanvas.ts   # 橡皮擦編輯器（plain canvas + undo）
│   │   ├── canvasController.ts # 試穿 / 平拍畫布控制（Fabric）
│   │   ├── poseDetection.ts  # MediaPipe pose lazy wrapper + cache
│   │   ├── aiTryOn.ts        # HF Space 虛擬試穿
│   │   ├── geminiTryOn.ts    # Google Gemini API 試穿
│   │   └── aiCleanup.ts      # AI 還原原色（Puter）+ 純 canvas 調色
│   ├── context/
│   │   └── WardrobeContext.tsx
│   ├── components/
│   │   ├── Layout.tsx        # 木質側邊欄 + 4 項導航 + mobile drawer
│   │   ├── ClothingGrid.tsx
│   │   ├── CategoryTabs.tsx
│   │   ├── AvatarPreview.tsx
│   │   └── AnchorPicker.tsx  # 拖兩錨點到衣物的元件
│   └── pages/
│       ├── WardrobePage.tsx       # 衣櫥
│       ├── AddClothingPage.tsx    # 新增衣物（去背 → 編輯 → 錨點 → 儲存）
│       ├── ComposePage.tsx        # 搭配 Hub
│       ├── TryOnPage.tsx          # 模特兒試穿
│       ├── AITryOnPage.tsx        # AI 試穿（Gemini / HF）
│       ├── StyleComposerPage.tsx  # 平拍造型
│       ├── LibraryPage.tsx        # 收藏（穿搭 + 造型 tabs）
│       └── SettingsPage.tsx       # 設定
├── .github/workflows/deploy.yml
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── index.html
```

---

## 🚀 本機開發

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # 產出 dist/
npm run preview      # 在 :4173 預覽 build
```

---

## 🔑 AI 試穿設定

**Google Gemini**（[免費 key 申請](https://aistudio.google.com/apikey)；2026/3 起需設定計費，每張 $0.039）：
1. 到 AI Studio 建立 API key
2. 進 ✨ AI 試穿 → 右上 ⚙️ AI 設定 → 貼 key → 儲存

**HuggingFace Space**：零設定，預設用 `Kwai-Kolors/Kolors-Virtual-Try-On`，可在設定改換。

**Puter.js（AI 還原原色）**：完全免費。第一次按 ✨ AI 還原原色按鈕時會跳 Puter 註冊視窗（30 秒），之後永遠免費無限制。

---

## 📋 開發歷程（commit 階段）

| 階段 | commit | 內容 |
|---|---|---|
| 1 | `5249955` | Plan C 起步：HF Space VTON via @gradio/client + 進階設定 modal |
| 2 | `e98c308` | AI 試穿 + 雙指縮放 |
| 3 | `a7349b0` | 修左右肩反向 + 自動裁透明邊 |
| 4 | `5249955` | 加入 Google Gemini Nano Banana provider |
| 5 | `1b5b4da` | 試穿視覺精緻化（軟陰影 / 淡入 / 自動圖層）|
| 6 | `000d488` | 6 種畫布背景 + 衣物大卡片 + 拍立得穿搭卡 |
| 7 | `a87eb47` | 平拍造型功能（無模特兒 flat-lay）|
| 8 | `0f6eefe` | AI 還原原色（Puter.js）+ 純前端自動調色 |
| 9 | 本次 | **完整木質風 UI 改版 + 收斂導航至 4 項 + Compose Hub + Library 整合** |

---

## ⚠️ 已知限制

- 衣物資料以 Base64 存進 IndexedDB，量大時占空間（一件約 200–500KB）
- AI 去背首次下載 ~24MB WASM 模型，較慢的網路要等 30–60 秒
- MediaPipe Pose 也要下載 ~5MB 模型（首次進入試穿室且使用個人照片時）
- Gemini 免費 tier 已於 2026/1 取消，現需付費（$0.039/張）
- HF Space 是公共資源，可能排隊或暫時下線
- AI 試穿一次只能套一件衣服（模型輸入限制）

---

## 📜 授權

Personal project，未指定授權。資料完全儲存於使用者瀏覽器，不蒐集任何個資。
