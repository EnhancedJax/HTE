# 環境變數設定指南（Pinecone、Hugging Face）

本專案需設定：**Hugging Face**（embedding）、**Pinecone**（向量庫）。Jasper 以本機／腳本執行，無需 AWS Lambda。

---

## 一、哪裡填寫環境變數（總覽）

| 使用情境 | 檔案／位置 | 說明 |
|----------|------------|------|
| **本機跑 Jasper** | `lambda/jasper/.env` | 自己建立，可從 `lambda/jasper/.env.example` 複製後改值 |
| **Next.js 前端 + 樹狀 API（LangChain）** | `platform/.env.local` | 已有；用於 LLM，與 Jasper 無關 |

**重要**：`lambda/jasper/.env` 和 `platform/.env.local` 都已被 `.gitignore` 忽略，**不要**把金鑰 commit 進 Git。

---

## 二、Hugging Face 設定

### 2.1 用途
Jasper 用 Hugging Face 的 **featureExtraction（embedding）API** 把文件片段轉成向量，再存進 Pinecone。

### 2.2 取得 Access Token

1. **註冊／登入**
   - 打開：<https://huggingface.co/join>  
   - 註冊或登入帳號。

2. **建立 Access Token**
   - 進入：<https://huggingface.co/settings/tokens>
   - 點「New token」，選擇權限（至少需 **Read**；若用 Inference API 建議勾選對應權限）。
   - 複製產生的 Token（以 `hf_` 開頭），請妥善保存。

3. **確認 embedding 維度**
   - 預設模型為 **sentence-transformers/all-MiniLM-L6-v2**，維度 **384**。
   - 若換成其他模型（如 `thenlper/gte-small`），請查該模型說明；Pinecone 的 `PINECONE_DIM` 必須與模型維度一致。

### 2.3 要填的變數與放哪裡

| 變數 | 必填 | 說明 | 放哪裡 |
|------|------|------|--------|
| `HF_TOKEN` 或 `HUGGINGFACE_TOKEN` | ✅ | 上面複製的 Access Token | `lambda/jasper/.env` |
| `HF_EMBED_MODEL` | 否 | 預設 `sentence-transformers/all-MiniLM-L6-v2` | 同上 |
| `HF_EMBED_BATCH_SIZE` | 否 | 每批送幾筆文字，預設 32 | 同上 |

**本機範例**（`lambda/jasper/.env`）：

```bash
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 三、Pinecone 設定

### 3.1 Pinecone 是託管服務（不需要你自己「部署到 AWS」）

**Pinecone 是雲端託管服務**，由 Pinecone 公司營運，**你不需要、也無法**把 Pinecone 的程式部署到你的 AWS 帳號。

- 你做的事只有：到 [Pinecone 官網](https://www.pinecone.io/) 註冊、取得 **API Key**，然後在 Pinecone 主控台或透過 API **建立 Index**。
- 建立 Index 時，你可以選擇 **Cloud: AWS** 與 **Region**（例如 `us-east-1`）。意思是：**這個 Index 的資料由 Pinecone 放在 AWS 上代管**，但主機與維運都是 Pinecone 負責，不是你在 AWS 裡自己開機器或部署 Pinecone。
- Jasper 在本機或腳本執行，透過網路呼叫 **Pinecone 雲端 API** 把向量寫進 Index；**不需設定 Pinecone host / URL**，只需 API Key。

總結：

| 項目 | 誰部署／誰管 | 你在哪裡操作 |
|------|----------------|----------------|
| **Pinecone（向量庫）** | Pinecone 託管；你選 AWS + Region | [app.pinecone.io](https://app.pinecone.io) 註冊、建 Index、拿 API Key |

所以 SETUP 裡的步驟**已經包含**「讓 Pinecone Index 跑在 AWS 上」：在建立 Index 時選 **Cloud: AWS** 與 Region 即可；不需要額外「把 Pinecone 部署到 AWS」的步驟。

### 3.2 用途（在本專案裡）
Jasper 把 Hugging Face 產生的向量 **upsert 到 Pinecone**，之後可做語意搜尋（RAG 等）。

### 3.3 取得 API Key 與建立 Index

1. **註冊／登入**
   - 打開：<https://app.pinecone.io>  
   - 註冊或登入。

2. **取得 API Key**
   - 登入後在 **API Keys** 或 **Dashboard** 可看到 API Key。
   - 複製並保存（可能顯示為「Key」或「API Key」）。

3. **選擇 / 建立 Index（可選）**
   - **方式 A（建議）**：不事先建 Index，讓 Jasper 第一次執行時依 `PINECONE_INDEX_NAME`、`PINECONE_DIM`、region 自動建立（程式裡已實作）。
   - **方式 B**：在 Pinecone 主控台手動建立 Index：
     - Name：例如 `child_online_safety_docs`（與 `PINECONE_INDEX_NAME` 一致）。
     - Dimension：**必須與 embedding 模型維度相同**（如 384 for MiniLM-L6-v2）。
     - Metric：**cosine**。
     - 若選 Serverless：Cloud 選 **AWS**，Region 選你要的（如 `us-east-1`）。

4. **Region（AWS 主機）**
   - Pinecone 建立 Index 時可選 **Cloud: AWS** 與 **Region**（如 `us-east-1`）。
   - `PINECONE_ENVIRONMENT` / `PINECONE_REGION` 用來「建立 index 時」指定 region；若 index 已存在，只要名稱與維度正確即可。**Pinecone 為雲端服務，不需設定 host。**

### 3.4 要填的變數與放哪裡

| 變數 | 必填 | 說明 | 放哪裡 |
|------|------|------|--------|
| `PINECONE_API_KEY` | ✅ | Pinecone API Key（雲端服務，**不需 host**） | `lambda/jasper/.env` |
| `PINECONE_INDEX_NAME` | 否 | Index 名稱，預設 `child_online_safety_docs` | 同上 |
| `PINECONE_ENVIRONMENT` 或 `PINECONE_REGION` | 否 | 建立 serverless index 時的 region，如 `us-east-1` | 同上 |
| `PINECONE_DIM` | 建議設 | 向量維度，**必須與 embedding 模型一致**（如 384 for MiniLM-L6-v2） | 同上 |

**本機範例**（`lambda/jasper/.env`）：

```bash
PINECONE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PINECONE_INDEX_NAME=child_online_safety_docs
PINECONE_ENVIRONMENT=us-east-1
PINECONE_DIM=384
```

---

## 四、檔案位置總整理（「放哪裡」對照）

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

- **本機跑 Jasper**：複製 `lambda/jasper/.env.example` 為 `lambda/jasper/.env`，把 Hugging Face、Pinecone 的值填進去。
- **Next.js（platform）**：沿用現有 `platform/.env.local` 做 LLM 即可，Jasper 不用改這裡。

---

## 五、檢查清單（依序做）

- [ ] Hugging Face：已註冊、已建立 Access Token。
- [ ] Pinecone：已註冊、已複製 API Key（**不需設定 host**）；決定要用自動建 index 還是手動建（及 region）。
- [ ] 本機：已建立 `lambda/jasper/.env`，並填好 `HF_TOKEN` 與 `PINECONE_*`。
- [ ] 本機測試：在 `lambda/jasper` 執行 `npm run run:local -- path/to/raw_documents` 或 `npm run run:embed-only`，無錯誤且（若有用 Pinecone）向量有寫入。

完成以上步驟後，Jasper 的 Pinecone、Hugging Face 環境就都設定完成。
