/**
 * Stage 2 – Jasper: types for chunk + embed + Pinecone.
 */

/** Raw document as loaded from event or raw_documents/*.json */
export interface RawDocument {
  doc_id: string;
  title?: string;
  url?: string;
  text: string;
  source_type?: string;
}

/** Chunk after splitting (before embedding). */
export interface Chunk {
  id: string;
  doc_id: string;
  chunk_index: number;
  text: string;
  metadata: {
    title?: string;
    url?: string;
    source_type?: string;
    section?: string;
    [key: string]: string | undefined;
  };
}

/** Chunk with embedding, ready for Pinecone upsert. */
export interface EmbeddedChunk {
  id: string;
  text: string;
  embedding: number[];
  metadata: {
    doc_id: string;
    chunk_index: number;
    title?: string;
    url?: string;
    source_type?: string;
    section?: string;
    [key: string]: string | number | undefined;
  };
}

/** Ingest event: either raw documents or crawler format. */
export interface IngestEvent {
  documents?: RawDocument[];
  /** Crawler format from platform (userQueryProcess.tsx): flatten Results to RawDocument[]. */
  "User Query"?: string;
  "Relevant Topics"?: string[];
  Results?: Record<string, Record<string, CrawlerResultItem[] | CrawlerResultSingle>>;
}

/** One item in Results[Topic][Question] array (userQueryProcess / Exa search). */
export interface CrawlerResultItem {
  url?: string;
  title?: string;
  highlight?: string;
  image?: string;
}

/** Single object variant (e.g. queryResultJsonExample: Source, Title, Content). */
export interface CrawlerResultSingle {
  Source?: string;
  Title?: string;
  Content?: string;
}

/** Ingest success response. */
export interface IngestResponse {
  statusCode: number;
  body: string;
}
