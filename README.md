# Snake AI Frontend

這是一個以 Vue + Vite 製作的貪吃蛇前端專案，包含本地遊玩與連線到 AI/多人 WebSocket 伺服器的模式。

## 功能簡介
- 本地模式（Local）：直接在瀏覽器內運行
- 線上模式（Online）：透過 WebSocket 連線到後端
- 操作方式：方向鍵或 WASD（空白鍵可提前連線）

## 環境需求
- Node.js (建議 LTS)
- npm

## 安裝
```bash
npm install
```

## 本機開發（Local）
```bash
npm run dev
```
啟動後打開終端機顯示的網址即可。

## 對外開發伺服器（Server / LAN）
```bash
npm run dev -- --host
```
此模式會把 Vite dev server 綁定到所有網卡，方便同網段的裝置存取。

如果要在啟動時直接指定 WebSocket 位址，可以這樣：
```bash
VITE_WS_URL=ws://localhost:8765 npm run dev -- --host
```

## WebSocket 伺服器設定（可更換 IP）
此專案的 WebSocket 連線位址使用 `VITE_WS_URL` 環境變數：
- 來源位置：`src/composables/useOnlineGame.js`
- 讀取方式：`import.meta.env.VITE_WS_URL`

### 設定方式（推薦）
在專案根目錄新增 `.env.local`，內容例如：
```bash
VITE_WS_URL=ws://127.0.0.1:8080
```
如果你的後端是 HTTPS，請改用 `wss://`。

### 常見狀況
- 若沒有設定 `VITE_WS_URL`，瀏覽器會嘗試連到 `undefined`，連線會失敗。
- 變更 `.env.local` 後，請重新啟動 dev server。

## 建置與預覽
```bash
npm run build
npm run preview
```
