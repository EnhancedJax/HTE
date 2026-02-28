# 給 Crawler 隊友：送給 Jasper 的資料格式

Jasper 支援兩種輸入格式，**任一種**都可以直接使用。

---

## 格式一：Platform 現有格式（userQueryProcess.tsx / Exa 結果）

你現在在 `platform/app/webscrapingPortal/userQueryProcess.tsx` 產出的結構，Jasper **已支援**，不需改欄位名稱：

- 外層：`"User Query"`（可選）、`"Relevant Topics"`（陣列）、`"Results"`（必填）
- `Results`：`Results[Topic][Question]` = **陣列**，每個元素為 `{ url?, title?, highlight?, image? }`
- Jasper 會把每個元素轉成一份文件：`text` = `highlight`（或 `title`），`url`、`title` 進 metadata

若某處是**單一物件** `{ Source, Title, Content }`（如 queryResultJsonExample.json），Jasper 也會認：`text` = `Content`，`url` = `Source`，`title` = `Title`。

**你只要維持目前 userQueryProcess 的輸出格式即可。**

---

## 格式二：扁平文件列表（可選）

若你想直接送「已扁平化」的文件列表，可用以下格式。

**一個 JSON 檔 = 一份「文件」**，或 **多份文件組成一個陣列** 送進同一個 payload。

### 單一文件（若存成 `raw_documents/*.json`，每檔一筆）

每份 JSON 必須是**一個物件**，且包含下列欄位：

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `doc_id` | string | ✅ | 文件唯一 ID（英文/數字建議，例如 `1234` 或 `safety-guide-01`） |
| `text` | string | ✅ | 清洗後的**全文**，Jasper 會依此做 chunk |
| `title` | string | 否 | 文件標題，會進 chunk metadata |
| `url` | string | 否 | 來源 URL，會進 chunk metadata |
| `source_type` | string | 否 | 例如 `web`、`pdf`，預設 `web` |

### 範例（單一文件，存成一份 JSON）

```json
{
  "doc_id": "safety-001",
  "title": "Understanding Online Safety for Children",
  "url": "https://example.com/safety",
  "text": "這裡放清洗後的完整內文，可以很長。Jasper 會自動切成約 500–800 token 的區塊並保留約 10–20% 重疊。請勿在這裡放 HTML，只要純文字。",
  "source_type": "web"
}
```

### 若一次送多份文件（例如呼叫 API 或腳本）

Payload 形狀：

```json
{
  "documents": [
    {
      "doc_id": "safety-001",
      "title": "Understanding Online Safety for Children",
      "url": "https://example.com/safety",
      "text": "全文內容...",
      "source_type": "web"
    },
    {
      "doc_id": "safety-002",
      "title": "Another Doc",
      "url": "https://example.com/other",
      "text": "另一份文件的全文...",
      "source_type": "web"
    }
  ]
}
```

---

## 注意事項（給 Crawler）

1. **`doc_id`** 與 **`text`** 一定要有；`text` 不能是空字串，否則該筆不會產生任何 chunk。
2. **`text`** 請先清洗成**純文字**（不要 HTML、不要多餘換行/空白），Jasper 只做 chunk，不做清洗。
3. 每份文件單獨存成 `raw_documents/*.json` 時，**一個檔案 = 一個物件**（不要外層 `documents` 陣列）。  
   Jasper 本機跑法會讀目錄內所有 `.json`，每個檔案用 `JSON.parse` 得到一筆 `RawDocument`。
4. **不要**用 `platform/app/webscrapingPortal/queryResultJsonExample.json` 那種格式（那是給前端查詢結果用的）。Jasper 只認上面這種 `doc_id` + `text` + 可選 metadata 的格式。

---

## 對接方式

- **本機 / 腳本**：把多個符合上述格式的 JSON 放進 `lambda/jasper/raw_documents/`，在 `lambda/jasper` 執行：  
  `npm run run:local -- ./raw_documents`
- **API / 腳本**：傳入 `{ "documents": [ ... ] }`，陣列裡每個元素都是上面格式的物件。

如有欄位名稱或型別不確定，以 `lambda/jasper/src/types.ts` 裡的 `RawDocument` 為準。
