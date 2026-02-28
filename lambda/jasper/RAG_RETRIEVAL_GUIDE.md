# RAG 檢索與送給 LLM 指引（給下一位開發者）

本專案已具備：**文件 → Chunk → Embed（Hugging Face）→ 寫入 Pinecone**。此文件說明如何**從 Pinecone 檢索**，並把結果當成 context **送給 LLM** 完成 RAG。

---

## 一、流程總覽

```
使用者問題 (query)
       ↓
  embedQuery(query)  ← 同一個 Hugging Face 模型 (all-MiniLM-L6-v2)
       ↓
  Pinecone queryByVector(embedding, topK)
       ↓
  得到多筆 RetrievedMatch { id, score, text, title, url, doc_id, ... }
       ↓
  組合成 context 字串
       ↓
  LLM( system + context + query )  → 回答
```

---

## 二、從 Pinecone 檢索資料

### 2.1 環境

與 ingest 相同：`lambda/jasper/.env` 需有 `HF_TOKEN`、`PINECONE_API_KEY`，以及與 embedding 維度一致的 `PINECONE_DIM`（例如 384）。

### 2.2 程式用法

專案內已提供：

- **`retrieve(query, { topK })`**：把使用者的問題 embed 後向 Pinecone 查詢，回傳最相關的幾筆 chunk。
- **`buildContextFromMatches(matches)`**：把多筆檢索結果組成一串文字，方便塞進 LLM prompt。

```typescript
import { retrieve, buildContextFromMatches } from "./retrieve.js";

// 1) 檢索
const query = "How can parents keep children safe online?";
const matches = await retrieve(query, { topK: 5 });

// 2) 每筆內容在 matches[].text，另有 title, url, doc_id, score 等
for (const m of matches) {
  console.log(m.score, m.title, m.text?.slice(0, 100));
}

// 3) 組成一整段 context 給 LLM
const context = buildContextFromMatches(matches);
```

### 2.3 指令列測試

**先確保 Pinecone 已有資料**：若尚未跑過 ingest，請先執行 `npm run run:local -- ./raw_documents` 或 `npm run test:e2e -- ./raw_documents`，建立 index 並寫入向量後再檢索。

在 `lambda/jasper` 目錄：

```bash
# 預設問題
npm run run:query

# 自訂問題與筆數
npx tsx src/run-query.ts "What is child online safety?"
npx tsx src/run-query.ts "How to set parental controls?" --topK=10
```

會印出：檢索到的 JSON，以及「給 LLM 用的 context 字串」。

---

## 三、把檢索結果送給 LLM

### 3.1 概念

1. 用上面的 `retrieve` 取得 `matches`。
2. 用 `buildContextFromMatches(matches)` 得到 `context`。
3. 組一個 prompt，例如：`system`（角色/規則）+ `context`（檢索到的內容）+ `query`（使用者問題）。
4. 呼叫你們現有的 LLM（例如 platform 的 DeepSeek、MiniMax 等），把這段 prompt 送進去，取得回覆。

### 3.2 Prompt 範例

```text
你是一個兒童網路安全助手。請僅根據以下「參考資料」回答使用者問題；若資料中沒有相關內容，請說明無法從資料中找到答案。

【參考資料】
{context}

【使用者問題】
{query}
```

把 `{context}` 換成 `buildContextFromMatches(matches)` 的結果，`{query}` 換成使用者輸入。

### 3.3 在 platform 裡接起來（示意）

若 LLM 在 Next.js（例如 `platform/app/webscrapingPortal/`）裡：

1. 在 API route 或 server action 裡：
   - 收到使用者 `query`。
   - 呼叫 Jasper 的 `retrieve(query, { topK: 5 })`（需在 server 端呼叫，因為會用到 `HF_TOKEN`、`PINECONE_API_KEY`）。
   - `buildContextFromMatches(matches)` 得到 `context`。
   - 組好 prompt，再呼叫既有 LLM（如 DeepSeek / MiniMax）。
2. 或把「檢索」做成一支獨立 API（例如 `POST /api/rag/retrieve`），前端或其它服務先呼叫檢索 API 拿到 `context`，再自己呼叫 LLM。

**注意**：`retrieve` 依賴 Node 環境與 `.env`（HF、Pinecone），請在 **server 端**（API route、getServerSideProps、server action 等）執行，不要在前端瀏覽器呼叫。

---

## 四、檔案對照

| 檔案 | 用途 |
|------|------|
| `src/embed.ts` | `embedQuery(query)`：把一句話轉成 384 維向量 |
| `src/pinecone.ts` | `queryByVector(vector, { topK })`：用向量查 Pinecone，回傳 matches（含 metadata 的 text） |
| `src/retrieve.ts` | `retrieve(query, { topK })`、`buildContextFromMatches(matches)`：檢索 + 組 context |
| `src/run-query.ts` | 指令列測試檢索 |

---

## 五、若檢索結果沒有 `text`

目前 upsert 時已把 chunk 的 **text** 寫進 Pinecone 的 metadata，所以查回來會有 `match.text`。

若你的 index 是很早以前建的（當時沒存 text），檢索仍會回傳 `id`、`score`，但 `text` 會是 `undefined`。解法：**重新跑一次 ingest**，把文件再 chunk + embed + upsert 一次，之後檢索就會有 `text`。

```bash
cd lambda/jasper
npm run run:local -- ./raw_documents
# 或
npm run test:e2e -- ./raw_documents
```

---

## 六、摘要給下一位

1. **檢索**：在 `lambda/jasper` 用 `retrieve(query, { topK })`，需要 `HF_TOKEN`、`PINECONE_API_KEY`。
2. **組 context**：`buildContextFromMatches(matches)`。
3. **送 LLM**：用「參考資料 + 使用者問題」組 prompt，呼叫你們現有的 LLM；檢索請在 server 端做，不要在前端呼叫。

這樣就可以完成「從 Pinecone 檢索 → 把結果送給 LLM」的 RAG 流程。

---

## 七、回傳給前端（Platform API）

專案已在 **platform** 提供 RAG API，前端可直接呼叫並取得檢索結果（與 context），再自行送給 LLM 或直接顯示。

### 7.1 API 端點

- **POST /api/rag**  
  Body: `{ "query": "使用者問題", "topK": 5 }`（topK 可選，預設 5，最大 20）  
  回傳: `{ query, topK, matches, context }`

- **GET /api/rag?q=問題&topK=5**  
  同上，方便瀏覽器或 curl 測試。

### 7.2 回傳格式（可直接給前端用）

```json
{
  "query": "How can parents keep children safe online?",
  "topK": 5,
  "matches": [
    { "id": "...", "score": 0.69, "text": "...", "title": "...", "url": "...", "doc_id": "..." }
  ],
  "context": "1. [Title] ...\n\n2. [Title] ..."
}
```

- **matches**：可顯示為「相關片段」列表（title、text、url）。
- **context**：已組好的字串，可放進 LLM prompt 當參考資料。

### 7.3 Platform 環境變數

在 **platform** 目錄的 `.env.local` 設定（與 lambda/jasper 相同即可）：

- `HF_TOKEN` 或 `HUGGINGFACE_TOKEN`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME=hugging-face-v1`（可選，預設即為此）

設定後重啟 `npm run dev`，前端即可用 `fetch('/api/rag', { method: 'POST', body: JSON.stringify({ query }) })` 取得上述 JSON。
