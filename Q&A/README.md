# Q&A Knowledge Base

Search and trivia use **`knowledge.json`** plus any **PDF-derived JSON** files in this folder. Entries include **`id`** and **`origin`** for quick access and traceability.

## PDFs as JSON (original written format)

To keep PDFs as JSON in **original written format** (not just Q&A):

1. Put your `.pdf` files in this folder.
2. Run **`cd api && npm run scrape-pdfs`**
3. For each PDF you get a **`<basename>.json`** with:
   - **`content`** – full scraped text (newlines preserved)
   - **`contentBlocks`** – paragraphs and headings in document order
   - **`qa`** – extracted Q/A pairs
   - **`origin`** – source PDF filename

These JSON files are **not deleted**. The knowledge base loads them automatically: search and trivia use both `knowledge.json` and every PDF-derived JSON. Search results show content in original format (headings and paragraphs) when available.

## Adding content

**Option A – Edit `knowledge.json` directly**

- **documents**: `{ "id": "doc-N", "origin": "source name", "title": "...", "content": "..." }`
- **qa**: `{ "id": "qa-N", "origin": "source name", "q": "Question?", "a": "Answer." }`
- Use unique `id`s (e.g. `doc-3`, `qa-13`) and set `origin` to whatever you want (e.g. `"seed"`, `"manual"`, or a filename).

**Option B – Ingest from files, then remove originals**

1. Put `.md`, `.txt`, or `.pdf` files in this folder.
2. From the project root: **`cd api && npm run ingest-qa`**
3. The script:
   - Reads existing `knowledge.json`
   - For each file: extracts text (PDFs are scraped with `pdf-parse`), parses **Q:** / **A:** (or Question: / Answer:) pairs into **qa**, and adds full text as a **document**
   - Writes updated `knowledge.json` with new `id`s and **origin** = filename
   - **Deletes** the ingested files

After ingest, all data is in `knowledge.json` and references its **origin** (the original filename).
