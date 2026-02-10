# Snake AI Frontend

這是貪吃蛇多人模式的網頁前端，使用 Vue 3、Vite 與 TailwindCSS 開發。
前端透過 `server.js` 代理 WebSocket (`/ws`) 連到後端遊戲伺服器。

## 事前準備

請確保您的電腦已安裝 [Node.js](https://nodejs.org/) (建議使用 v18 或以上版本)。

## 安裝

在專案目錄下執行以下指令以安裝相依套件：

```bash
npm install
```

## 執行專案

由於本專案依賴後端 WebSocket 伺服器 (Azure)，包含了 `server.js` 作為代理伺服器。建議使用**正式模式**啟動以確保遊戲連線功能正常。

### 1. 正式模式（推薦）

此模式會建置前端檔案並啟動 Express 伺服器，將 `/ws` 請求正確轉發至遊戲後端。

```bash
# 建置專案
npm run build

# 啟動伺服器
npm run start
```

伺服器啟動後，請在瀏覽器開啟：[http://localhost:3000](http://localhost:3000)

### 2. 連接本機後端（開發用）

若您在本地執行了 Python 後端 (`127.0.0.1:8765`)，請加上 `--local` 參數啟動代理伺服器：

```bash
# 建置專案
npm run build

# 連接本機後端
node server.js --local
```

### 3. 開發模式 (僅前端)

此模式啟動 Vite 開發伺服器，支援熱重載 (HMR)。

```bash
npm run dev
```

> **注意**：開發模式下若未配置代理，可能無法連接至遊戲 WebSocket 伺服器。若需完整功能測試，請使用正式模式。

## 目前功能（2026-02）

- 線上房間顯示：使用目前畫面上的蛇數量作為在線玩家數。
- 中途加入已開局房間：會顯示目前對局畫面（支援 `join_ok + snapshot` 與後續 `delta` 補齊）。
- AI 名稱與顏色：
  - 第二隻 AI 會顯示為 `AI2`。
  - `AI` / `AI2` 使用可區分配色。
- 提示訊息（Toast）：
  - 加入等待中房間：顯示「約等待 5 秒」提示（黃色）。
  - 房間已滿、遊戲進行中：顯示黃色提示。
  - 玩家死亡：顯示紅色提示與死亡原因。
  - 人類全滅且進入 AI 對戰展示時：顯示黃色提示，且該時刻不再彈出人類死亡紅色提示。
- 結算顯示：
  - 遊戲結束會在地圖上方顯示黃色排名小窗（含 AI / AI2）。
  - 排名以分數高到低排序。
- 結束後操作：
  - `CONTINUE ONLINE` 會留在同房間重新連線，不需按兩次。
  - `PLAY LOCAL` 會切回本地模式。

## 狀態重置策略

- `disconnect()` 會統一重置線上狀態：`snakes`、`food`、`players`、`myId`、`roomId`、`status`、`mapSize`、`onlineScore`。
- Controller 會在重連、切換模式、離開頁面時主動清除 toast，避免跨局殘留。

## 專案結構

- **src/**: 前端 Vue 程式碼
- **server.js**: Express 伺服器（靜態檔案 + WebSocket 代理）
- **vite.config.js**: Vite 設定
