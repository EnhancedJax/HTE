# Step-by-Step: Hugging Face + Pinecone 環境設定

使用 **embedding 模型**：[sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)（輸出維度 **384**）。

---

## Part 1：Hugging Face（Embedding）

### Step 1.1 註冊／登入
- 開啟：<https://huggingface.co/join>
- 註冊或登入帳號。

### Step 1.2 建立 Access Token
1. 開啟：<https://huggingface.co/settings/tokens>
2. 點 **「New token」**（若用 **Fine-grained** token 較佳）
3. 名稱自訂（例如 `jasper-embed`）
4. 權限至少勾選：
   - **Read**（讀取模型）
   - **Make calls to Inference Providers**（才能呼叫 embedding API，否則會 403）
5. 點 **「Generate token」**
6. **複製 Token**（以 `hf_` 開頭）並妥善保存（只顯示一次）

### Step 1.3 確認模型與維度
- 模型：`sentence-transformers/all-MiniLM-L6-v2`
- 維度：**384**（之後 Pinecone Index 的 dimension 必須是 384）

### Step 1.4 要設的環境變數（Hugging Face）

| 變數 | 必填 | 值（本例） |
|------|------|------------|
| `HF_TOKEN` | ✅ | 你在 Step 1.2 複製的 Token（如 `hf_xxxx...`） |
| `HF_EMBED_MODEL` | 否 | `sentence-transformers/all-MiniLM-L6-v2`（專案預設已是此值） |
| `HF_EMBED_BATCH_SIZE` | 否 | `32`（預設） |

---

## Part 2：Pinecone（向量庫）

**Pinecone 為雲端託管服務，只需 API Key，不需設定 host / URL。**

### Step 2.1 註冊／登入
- 開啟：<https://app.pinecone.io>
- 註冊或登入。

### Step 2.2 取得 API Key
1. 登入後到 **API Keys** 或 **Dashboard**
2. 複製 **API Key** 並保存

### Step 2.3 建立 Index（可選）
- **方式 A（建議）**：不手動建 Index，讓 Jasper 第一次執行時依環境變數自動建立。
- **方式 B（手動建立）**：
  1. Pinecone 主控台 → **Create Index**
  2. **Name**：`child_online_safety_docs`（或與 `PINECONE_INDEX_NAME` 一致）
  3. **Dimension**：**384**（必須與 all-MiniLM-L6-v2 一致）
  4. **Metric**：**cosine**
  5. 若用 Serverless：Cloud 選 **AWS**，Region 選 **us-east-1**（或與 `PINECONE_ENVIRONMENT` 一致）

### Step 2.4 要設的環境變數（Pinecone）

| 變數 | 必填 | 值（本例） |
|------|------|------------|
| `PINECONE_API_KEY` | ✅ | 你在 Step 2.2 複製的 API Key |
| `PINECONE_INDEX_NAME` | 否 | `child_online_safety_docs` |
| `PINECONE_ENVIRONMENT` | 否 | `us-east-1` |
| `PINECONE_DIM` | 建議 | **384**（與 all-MiniLM-L6-v2 維度一致） |

---

## Part 3：填進 `.env`（本機）

在 `lambda/jasper/` 目錄：

1. 複製範例：`cp .env.example .env`
2. 編輯 `.env`，填上你的值：

```bash
# Hugging Face（必填）
HF_TOKEN=hf_你的Token

# 使用 all-MiniLM-L6-v2 時可省略，預設已是此模型
HF_EMBED_MODEL=sentence-transformers/all-MiniLM-L6-v2
HF_EMBED_BATCH_SIZE=32

# Pinecone（必填）
PINECONE_API_KEY=你的Pinecone_API_Key

# 與 all-MiniLM-L6-v2 維度一致
PINECONE_INDEX_NAME=child_online_safety_docs
PINECONE_ENVIRONMENT=us-east-1
PINECONE_DIM=384
```

---

## 檢查清單

- [ ] Hugging Face：已取得 Access Token，並寫入 `HF_TOKEN`
- [ ] Pinecone：已取得 API Key，並寫入 `PINECONE_API_KEY`（不需 host）
- [ ] `PINECONE_DIM=384`（與 all-MiniLM-L6-v2 一致）
- [ ] 本機：已建立 `lambda/jasper/.env` 並填好上述變數

完成後可執行：

```bash
cd lambda/jasper
npm run run:embed-only    # 只測 embedding（不寫 Pinecone）
npm run test:e2e          # 完整：embed + 寫入 Pinecone
```
