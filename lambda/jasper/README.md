# Stage 2 – Jasper: Chunk + Embed + Build Vector DB

**本機／腳本**：chunk raw docs → embed（Hugging Face）→ upsert（Pinecone 雲端）。無需 AWS Lambda。

## 環境設定（必讀）

**逐步設定請看：[ENV_STEPS.md](./ENV_STEPS.md)**；完整說明：[SETUP.md](./SETUP.md)。

- 在 `lambda/jasper/` 建立 `.env`（從 `.env.example` 複製後填值）即可本機執行。
- **Pinecone**：使用官方雲端服務，只需 **API Key**，**不需設定 host / URL**。

## Tools

- **Chunking**: Recursive character splitter (~500–800 tokens, 10–20% overlap), preserves section boundaries.
- **Embedding**: Hugging Face featureExtraction (e.g. `sentence-transformers/all-MiniLM-L6-v2`, dim 384).
- **Vector DB**: Pinecone（雲端託管，只需 API Key），cosine metric。

## Event shape

```json
{
  "documents": [
    {
      "doc_id": "1234",
      "title": "Example",
      "url": "https://example.com",
      "text": "Full cleaned text...",
      "source_type": "web"
    }
  ]
}
```

## Crawler 資料格式（給爬蟲隊友）

**請給負責爬資料的隊友看：[CRAWLER_CONTRACT.md](./CRAWLER_CONTRACT.md)**  
裡面寫明每筆文件必須有 `doc_id`、`text`，以及可選的 `title`、`url`、`source_type`。格式一致才能正確 chunk 並寫入 Pinecone。

## 驗證與 E2E 測試

- **只驗證格式**（不需 API key）：  
  `npm run validate:crawler -- ./raw_documents`  
  或指定單一 JSON 檔／目錄。
- **完整流程**（chunk → Hugging Face embed → Pinecone upsert）：  
  請先在 `lambda/jasper/.env` 填好 `HF_TOKEN`、`PINECONE_API_KEY` 等（可從 `.env.example` 複製再填），然後執行：  
  `npm run test:e2e -- ./raw_documents`  
  若出現認證錯誤，請到 [Hugging Face 設定](https://huggingface.co/settings/tokens) 檢查 Token 權限並更新 `.env`。

## Environment variables (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `HF_TOKEN` or `HUGGINGFACE_TOKEN` | Yes | Hugging Face access token (hf.co/settings/tokens) |
| `HF_EMBED_MODEL` | No | Embedding model (default: `sentence-transformers/all-MiniLM-L6-v2`, dim 384) |
| `HF_EMBED_BATCH_SIZE` | No | Batch size for embedding (default: 32) |
| `PINECONE_API_KEY` | Yes | Pinecone API key（雲端服務，**不需 host**） |
| `PINECONE_INDEX_NAME` | No | Index name (default: `hugging-face-v1`) |
| `PINECONE_ENVIRONMENT` or `PINECONE_REGION` | No | 建立 index 時用的 region（如 `us-east-1`） |
| `PINECONE_DIM` | No | Embedding dimension; **must match model** (e.g. `384` for MiniLM-L6-v2) |

## Build & run

```bash
cd lambda/jasper
npm install
npm run build
```

## Run locally

```bash
# 從 raw_documents 目錄跑完整流程（chunk → embed → Pinecone upsert）
npm run run:local -- ./raw_documents

# 只測 embedding（不寫入 Pinecone）
npm run run:embed-only

# 檢索測試：用問題查 Pinecone，印出 topK 筆與 context 字串（給 LLM 用）
npm run run:query
npx tsx src/run-query.ts "你的問題"   # 自訂問題
```

**從 Pinecone 檢索並送給 LLM**：見 [RAG_RETRIEVAL_GUIDE.md](./RAG_RETRIEVAL_GUIDE.md)。

或用程式呼叫 ingest：

```bash
echo '{"documents":[{"doc_id":"1","title":"Test","url":"https://a.com","text":"Your long document text here..."}]}' | node -e "
const { handler } = await import('./dist/handler.js');
const event = JSON.parse(await require('fs').promises.readFile(0, 'utf-8'));
const res = await handler(event);
console.log(JSON.stringify(res, null, 2));
"
```

## Chunk output shape (in-memory)

Each chunk before embedding:

```json
{
  "id": "1234_chunk_0",
  "doc_id": "1234",
  "chunk_index": 0,
  "text": "First 500–800 tokens of the document...",
  "metadata": {
    "title": "Understanding Online Safety for Children",
    "url": "https://example.com/safety",
    "source_type": "web"
  }
}
```

After embedding, vectors are upserted to Pinecone with `id`, `values` (embedding), and the same metadata (doc_id, chunk_index, title, url, source_type).

## Loading raw_documents/*.json

For batch runs, read all `raw_documents/*.json` and pass as `event.documents`. Or use `npm run run:local -- ./raw_documents`. Example (Node):

```js
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { handler } from './dist/handler.js';

const dir = './raw_documents';
const files = (await readdir(dir)).filter(f => f.endsWith('.json'));
const documents = await Promise.all(
  files.map(f => readFile(join(dir, f), 'utf-8').then(JSON.parse))
);
await handler({ documents });
```
