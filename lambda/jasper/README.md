# Stage 2 – Jasper: Chunk + Embed + Build Vector DB

JavaScript/TypeScript Lambda: **chunk** raw docs → **embed** with MiniMax → **upsert** into Pinecone (AWS serverless).

## 環境設定（必讀）

**詳細步驟與「每個變數放哪裡」請看：[SETUP.md](./SETUP.md)**  
包含：MiniMax（API Key、Group ID）、Pinecone（API Key、Index、Region）、AWS Lambda（建立、環境變數、Handler）。

- **本機跑 Jasper**：在 `lambda/jasper/` 建立 `.env`（可從 `.env.example` 複製後填值）。
- **部署到 Lambda**：在 AWS Lambda 主控台 → 設定 → 環境變數 裡新增所有金鑰與值。

## Tools

- **Chunking**: Recursive character splitter (~500–800 tokens, 10–20% overlap), preserves section boundaries.
- **Embedding**: MiniMax embedding API (`embo-01`, type `db` for storage).
- **Vector DB**: Pinecone (AWS host), cosine metric, serverless index.

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

## Environment variables (Lambda console or `.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MINIMAX_API_KEY` | Yes | MiniMax API key |
| `MINIMAX_GROUP_ID` | Yes | MiniMax Group ID (account console) |
| `PINECONE_API_KEY` | Yes | Pinecone API key |
| `PINECONE_INDEX_NAME` | No | Index name (default: `child_online_safety_docs`) |
| `PINECONE_ENVIRONMENT` or `PINECONE_REGION` | No | AWS region (default: `us-east-1`) |
| `PINECONE_DIM` | No | Embedding dimension; **must match MiniMax** (e.g. `1536` for embo-01) |
| `MINIMAX_EMBED_BATCH_SIZE` | No | Batch size for embedding (default: 32) |

## Build & deploy

```bash
cd lambda/jasper
npm install
npm run build
```

Zip `dist/` and `node_modules/` (and `package.json`) for Lambda, or use your preferred IaC (Serverless Framework, SAM, CDK). Handler: `dist/handler.handler`.

## Run locally (Node)

Set env vars, then:

```bash
# Invoke with event from stdin
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

For local or batch runs, read all `raw_documents/*.json` and pass as `event.documents`. Example (Node):

```js
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const dir = './raw_documents';
const files = (await readdir(dir)).filter(f => f.endsWith('.json'));
const documents = await Promise.all(
  files.map(f => readFile(join(dir, f), 'utf-8').then(JSON.parse))
);
await handler({ documents });
```
