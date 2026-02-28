# 環境變數設定指南（Pinecone、MiniMax、AWS）

本專案有三個環境需要設定：**MiniMax**（embedding）、**Pinecone**（向量庫）、**AWS**（Lambda 部署）。下面依序說明如何取得每個值，以及**要填在哪裡**。

---

## 一、哪裡填寫環境變數（總覽）

| 使用情境 | 檔案／位置 | 說明 |
|----------|------------|------|
| **本機跑 Jasper（Lambda 邏輯）** | `lambda/jasper/.env` | 自己建立，可從 `lambda/jasper/.env.example` 複製後改值 |
| **AWS Lambda** | Lambda 主控台 → 函數 → 設定 → 環境變數 | 在 AWS 網頁上新增「金鑰 / 值」 |
| **Next.js 前端 + 樹狀 API（LangChain）** | `platform/.env.local` | 已有；用於 LLM，與 Jasper 無關 |

**重要**：`lambda/jasper/.env` 和 `platform/.env.local` 都已被 `.gitignore` 忽略，**不要**把金鑰 commit 進 Git。

---

## 二、MiniMax 設定

### 2.1 用途
Jasper 用 MiniMax 的 **embedding API** 把文件片段轉成向量，再存進 Pinecone。

### 2.2 取得 API Key 與 Group ID

1. **註冊／登入**
   - 打開：<https://platform.minimax.io>  
   - 註冊或登入帳號。

2. **建立 API Key**
   - 進入 **設定 (Settings)** 或 **API Keys**。
   - 點「建立 API Key」或「Create API Key」。
   - 複製產生的 Key（通常以 `sk-` 開頭），**只會顯示一次**，請妥善保存。

3. **取得 Group ID**
   - 在 MiniMax 主控台找 **「基本資訊」/「Basic Information」** 或 **「群組」/「Group」**。
   - **Group ID** 多為約 19 位數字，例如：`1234567890123456789`。
   - 若找不到，可查看官方文件：<https://platform.minimax.io/docs> 或 API 說明裡的「認證」章節。

4. **確認 embedding 維度**
   - 目前使用模型為 **embo-01**。
   - 維度請查 MiniMax 文件（常見為 **1536**）；之後 Pinecone 的 `PINECONE_DIM` 必須與此一致。

### 2.3 要填的變數與放哪裡

| 變數 | 必填 | 說明 | 本機放哪裡 | Lambda 放哪裡 |
|------|------|------|------------|----------------|
| `MINIMAX_API_KEY` | ✅ | 上面複製的 API Key | `lambda/jasper/.env` | Lambda 環境變數 |
| `MINIMAX_GROUP_ID` | ✅ | 上面查到的 Group ID | `lambda/jasper/.env` | Lambda 環境變數 |
| `MINIMAX_EMBED_MODEL` | 否 | 預設 `embo-01` | 同上 | 同上 |
| `MINIMAX_EMBED_BATCH_SIZE` | 否 | 每批送幾筆文字，預設 32 | 同上 | 同上 |

**本機範例**（`lambda/jasper/.env`）：

```bash
MINIMAX_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
MINIMAX_GROUP_ID=1234567890123456789
```

---

## 三、Pinecone 設定

### 3.1 用途
Jasper 把 MiniMax 產生的向量 **upsert 到 Pinecone**，之後可做語意搜尋（RAG 等）。

### 3.2 取得 API Key 與建立 Index

1. **註冊／登入**
   - 打開：<https://app.pinecone.io>  
   - 註冊或登入。

2. **取得 API Key**
   - 登入後在 **API Keys** 或 **Dashboard** 可看到 API Key。
   - 複製並保存（可能顯示為「Key」或「API Key」）。

3. **選擇 / 建立 Index（可選）**
   - **方式 A（建議）**：不事先建 Index，讓 Lambda 第一次執行時依 `PINECONE_INDEX_NAME`、`PINECONE_DIM`、region 自動建立（程式裡已實作）。
   - **方式 B**：在 Pinecone 主控台手動建立 Index：
     - Name：例如 `child_online_safety_docs`（與 `PINECONE_INDEX_NAME` 一致）。
     - Dimension：**必須與 MiniMax 維度相同**（如 1536）。
     - Metric：**cosine**。
     - 若選 Serverless：Cloud 選 **AWS**，Region 選你要的（如 `us-east-1`）。

4. **Region（AWS 主機）**
   - Pinecone 建立 Index 時可選 **Cloud: AWS** 與 **Region**（如 `us-east-1`）。
   - 之後 Lambda 的 `PINECONE_ENVIRONMENT` / `PINECONE_REGION` 用來「建立 index 時」指定 region；若 index 已存在，只要名稱與維度正確即可。

### 3.3 要填的變數與放哪裡

| 變數 | 必填 | 說明 | 本機放哪裡 | Lambda 放哪裡 |
|------|------|------|------------|----------------|
| `PINECONE_API_KEY` | ✅ | Pinecone API Key | `lambda/jasper/.env` | Lambda 環境變數 |
| `PINECONE_INDEX_NAME` | 否 | Index 名稱，預設 `child_online_safety_docs` | 同上 | 同上 |
| `PINECONE_ENVIRONMENT` 或 `PINECONE_REGION` | 否 | 建立 serverless index 時的 AWS region，如 `us-east-1` | 同上 | 同上 |
| `PINECONE_DIM` | 建議設 | 向量維度，**必須與 MiniMax（如 embo-01）一致**，常見 1536 | 同上 | 同上 |

**本機範例**（`lambda/jasper/.env`）：

```bash
PINECONE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PINECONE_INDEX_NAME=child_online_safety_docs
PINECONE_ENVIRONMENT=us-east-1
PINECONE_DIM=1536
```

---

## 四、AWS 設定（部署 Lambda）

### 4.1 用途
把 Jasper（chunk + embed + upsert）部署成 **AWS Lambda**，由你或其它服務觸發（例如 API Gateway、排程、S3 事件等）。

### 4.2 事前準備

1. **AWS 帳號**
   - 若沒有：<https://aws.amazon.com> 註冊。

2. **IAM 權限**
   - 用來建立／管理 Lambda 的使用者或角色，需要至少：
     - `lambda:CreateFunction`, `lambda:UpdateFunctionCode`, `lambda:UpdateFunctionConfiguration`, `lambda:InvokeFunction`
     - 若用主控台建立，通常用有「Lambda 全權限」或「管理員」權限的帳號即可。
   - Lambda **執行角色**只需要：
     - 能寫 **CloudWatch Logs**（打 log）；
     - **不需要**額外存取 S3、DynamoDB 等，除非你日後自己加。

### 4.3 建立 Lambda 函數（主控台）

1. 登入 **AWS Console** → 選區域（例如 **us-east-1**）。
2. 搜尋 **Lambda** → 進入 Lambda 服務。
3. **建立函數**：
   - 選擇「從頭撰寫」。
   - **函數名稱**：例如 `jasper-ingest`。
   - **執行階段**：**Node.js 18.x** 或 **Node.js 20.x**。
   - **架構**：x86_64 即可。
   - **執行角色**：建立新角色（預設會給基本 Lambda + CloudWatch 權限）。
4. 建立後，進入該函數。

### 4.4 上傳程式碼

1. **打包**（在本機專案目錄）：
   ```bash
   cd lambda/jasper
   npm install --production
   npm run build
   ```
2. 把 **整個 `lambda/jasper` 目錄** 打成 zip（需包含 `dist/`、`node_modules/`、`package.json`），或只 zip `dist/` + `node_modules/`。
3. 在 Lambda 主控台：
   - **程式碼** → **上傳自** → 「.zip 檔案」→ 選剛打的 zip。

### 4.5 設定 Handler 與環境變數

1. **Handler**
   - **設定** → **一般設定** → **編輯**：
   - **處理常式**填：`dist/handler.handler`  
     （表示執行 `dist/handler.js` 的 `handler` 匯出函數）。

2. **環境變數**（**設定** → **環境變數** → **編輯**）  
   把下面全部加為「金鑰 / 值」：

   | 金鑰 | 值（範例，請改成你的） |
   |------|------------------------|
   | `MINIMAX_API_KEY` | 你的 MiniMax API Key |
   | `MINIMAX_GROUP_ID` | 你的 MiniMax Group ID |
   | `PINECONE_API_KEY` | 你的 Pinecone API Key |
   | `PINECONE_INDEX_NAME` | `child_online_safety_docs`（或自訂） |
   | `PINECONE_ENVIRONMENT` | `us-east-1`（與 Pinecone index region 一致） |
   | `PINECONE_DIM` | `1536`（與 MiniMax 維度一致） |

3. **逾時與記憶體（建議）**
   - **設定** → **一般設定** → **編輯**：
   - **逾時**：至少 **1 分鐘**（文件多時可調到 3–5 分鐘）。
   - **記憶體**：256 MB 或 512 MB 即可。

### 4.6 測試 Lambda

- 在 Lambda 主控台 **測試** 頁籤，建立測試事件，Body 例如：
  ```json
  {
    "documents": [
      {
        "doc_id": "test-1",
        "title": "Test Doc",
        "url": "https://example.com",
        "text": "一段至少幾十個字的測試內容，用來產生 chunk 與 embedding..."
      }
    ]
  }
  ```
- 執行測試，確認回傳 `statusCode: 200` 且 `chunks_upserted` > 0；到 Pinecone 主控台可看到該 index 的向量數量增加。

---

## 五、檔案位置總整理（「放哪裡」對照）

```
HTE/
├── platform/
│   └── .env.local          ← Next.js + LangChain（樹狀 API）用，與 Jasper 無關
│
└── lambda/
    └── jasper/
        ├── .env            ← 本機跑 Jasper 時用（你從 .env.example 複製後自己建）
        ├── .env.example    ← 範本，不要填真實金鑰，可 commit
        └── ...
```

- **本機跑 Jasper**：複製 `lambda/jasper/.env.example` 為 `lambda/jasper/.env`，把 MiniMax、Pinecone 的值填進去。
- **AWS Lambda**：在 Lambda 主控台「環境變數」裡新增上表所有金鑰與值，**不要**把金鑰寫進程式碼或 zip 裡的檔案。
- **Next.js（platform）**：沿用現有 `platform/.env.local` 做 LLM 即可，Jasper 不用改這裡。

---

## 六、檢查清單（依序做）

- [ ] MiniMax：已註冊、已建立 API Key、已查到 Group ID。
- [ ] Pinecone：已註冊、已複製 API Key；決定要用自動建 index 還是手動建（及 region）。
- [ ] 本機：已建立 `lambda/jasper/.env`，並填好 `MINIMAX_*` 與 `PINECONE_*`。
- [ ] 本機測試：在 `lambda/jasper` 執行 `npm run run:local -- path/to/raw_documents` 或 stdin 測試，無錯誤且 Pinecone 有資料。
- [ ] AWS：已建立 Lambda、Handler 設為 `dist/handler.handler`、環境變數已填、逾時／記憶體已調。
- [ ] Lambda 測試：用測試事件觸發，回傳 200 且 Pinecone 向量數有增加。

完成以上步驟後，Jasper 的 Pinecone、MiniMax、AWS 環境就都設定完成，並清楚知道每個變數要放在哪裡。
