# Snake AI 前端專案

這是一個使用 Vue 3、Vite 和 TailwindCSS 構建的貪吃蛇 AI 前端應用程式。

## 事前準備

請確保您的電腦已安裝 [Node.js](https://nodejs.org/) (建議使用 v18 或以上版本)。

## 安裝

在專案目錄下執行以下指令以安裝相依套件：

```bash
npm install
```

## 執行專案

由於本專案依賴後端 WebSocket 伺服器 (Azure)，包含了 `server.js` 作為代理伺服器。建議使用**正式模式**啟動以確保遊戲連線功能正常。

### 1. 正式模式 (推薦)

此模式會建置前端檔案並啟動 Express 伺服器，將 `/ws` 請求正確轉發至遊戲後端。

```bash
# 建置專案
npm run build

# 啟動伺服器
npm run start
```

伺服器啟動後，請在瀏覽器開啟：[http://localhost:3000](http://localhost:3000)

### 2. 開發模式 (僅前端)

此模式啟動 Vite 開發伺服器，支援熱重載 (HMR)。

```bash
npm run dev
```

> **注意**：開發模式下若未配置代理，可能無法連接至遊戲 WebSocket 伺服器。若需完整功能測試，請使用正式模式。

## 專案結構

- **src/**: 前端 Vue 程式碼原始檔
- **server.js**: Express 伺服器 (負責靜態檔案託管與 WebSocket 代理)
- **vite.config.js**: Vite 設定檔
