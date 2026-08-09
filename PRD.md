# Product Requirements Document (PRD): VillageRoots

**Project:** Infinite Spatial Knowledge Graph for Village Heritage
**Document Status:** V3.0 (Updated Phasing & OCR Integration)

---

## 1. Executive Summary & Product Vision

**Vision:** To create a boundless, interactive, and intelligent knowledge graph that captures the living history, social fabric, and micro-geography of a village.
**Objective:** Replace static archives and rigid maps with an infinite 2D spatial workspace. Users can navigate familial, historical, and geographical connections, build rich Notion-like documents for every node, seamlessly embed external context, and ultimately use AI to scan handwritten archives and chat with the village’s collective memory.

## 2. Target Audience

* **Locals & Elders:** Primary sources of oral history and holders of physical, handwritten archives.
* **Diaspora & Descendants:** Users tracing their heritage who want to visually explore the interconnected web of their ancestors.
* **Historians & Researchers:** Users leveraging AI link prediction, OCR data ingestion, and spatial clustering to study demographic shifts and land ownership.

---

## 3. Product Ontology (The Data Model)

The system is built on a semantic network of Nodes (Entities) and Edges (Relationships).

### Nodes (Entities)

| Entity Type     | Description                            | Key Properties                                          |
| --------------- | -------------------------------------- | ------------------------------------------------------- |
| **Person**      | Individuals (living or deceased).      | `id`, `name`, `birthYear`, `deathYear`, `audioStoryUrl` |
| **Family**      | Grouping nodes for specific lineages.  | `id`, `name`, `origin`                                  |
| **Toponym**     | Micro-local place names (*τοπωνύμια*). | `id`, `name`, `description`                             |
| **Landmark**    | Churches, sights, ruins, bridges.      | `id`, `name`, `type`, `buildYear`                       |
| **Path / Road** | Routes connecting places.              | `id`, `name`, `surfaceType`                             |
| **Event**       | Temporal occurrences acting as hubs.   | `id`, `title`, `date`, `description`                    |

### Edges (Relationships)

* **Social:** `CHILD_OF`, `MARRIED_TO`, `SIBLING_OF`, `BELONGS_TO_CLAN`
* **Geographic:** `OWNS_LAND_AT`, `LIVED_AT`, `FARMED_AT`
* **Historical:** `BAPTIZED_AT`, `BURIED_AT`, `BUILT_BY`, `PARTICIPATED_IN`

---

## 4. The Infinite Spatial Canvas (Core UX)

The traditional geographic map is replaced by a boundless, physics-driven 2D spatial workspace.

* **Multiscale Navigation (Zoom & Pan):**
* *Macro View:* High-level clusters formed by the physics engine (e.g., dense clusters representing large families).
* *Micro View:* Clusters dissolve into individual nodes, revealing specific names and localized connections.


* **Fluid Interactions:** Users can freely drag nodes, organize their layout, and map manual connections by dragging a link from one node to another.

---

## 5. Notion-Like Node Architecture (Sidepanel)

Nodes are not just data points; they are rich, living documents accessed seamlessly from the canvas.

* **The Paper Sidepanel:** Double-clicking or creating a node slides out a sleek, full-height sidepanel on the right. This behaves exactly like a Notion or Dropbox Paper document.
* **Rich Text & Markdown:** Users can write biographies, list bullet points, and format text using standard markdown commands (`#`, `**`, etc.) directly in the node's body.
* **Inline External Embeds:** Seamless integration of external context. By simply pasting a Google Maps URL or a Wikipedia link into the document, the editor automatically converts it into a rich, interactive inline embed widget.

---

## 6. Crowdsourcing & AI-Assisted Data Entry

Data ingestion scales from manual inputs to highly automated AI extraction.

* **Manual Node & Edge Creation:** Users can quickly create nodes from the canvas and draw relationships via a simple dropdown of verbs (e.g., *"Owned land at"*).
* **OCR / AI-Assisted Form Prefilling:** To digitize the village's physical history (old church registries, handwritten property deeds, census notebooks), users can upload photos of documents. The system uses Optical Character Recognition (OCR) and LLMs to:
* Read the handwritten Greek/historical text.
* Extract entities (Names, Dates, Toponyms).
* Automatically pre-fill the node creation and connection forms, ready for user review and submission.



---

## 7. AI & Graph Intelligence

The platform leverages the graph database and Large Language Models (LLMs) to act as a research assistant.

* **Chat with the Graph (GraphRAG):** A conversational interface powered by Retrieval-Augmented Generation. Users ask natural language questions (e.g., *"Who owned the old mill before 1950?"*). The AI traverses the graph to generate an answer and visually highlights the exact path of nodes on the canvas.
* **Linkage Prediction:** Machine learning algorithms analyze graph patterns to suggest unmapped relationships. These appear as glowing, dashed lines on the canvas, prompting the user to verify (e.g., *"System suggests: Maria is the sister of Yiannis (85% probability). Verify?"*).

---

## 8. Privacy, GDPR & Moderation

* **Living vs. Deceased Data:** Deceased individuals are public historical records. Living individuals are private by default (showing only a first name or "Private Node") unless the user claims their node and opts into public sharing.
* **Moderation Queue:** All user-submitted nodes, edges, OCR-extracted data, and media enter a `pending_review` state. Village administrators must approve them before they populate the global public graph.

---

## 9. Technical Architecture

* **Frontend UI:** `React.js` utilizing `react-force-graph` (WebGL) for the infinite 2D canvas. The sidepanel uses a rich-text editor framework like `ProseMirror` or `TipTap` for the Notion-like experience.
* **Backend API:** `Python` (FastAPI).
* **Database:** `Neo4j` for native graph storage, vector search, and executing complex traversal queries.
* **AI/OCR Layer:** Integration with Vision models (e.g., Gemini Pro Vision, GPT-4o) for handwriting OCR and LangChain/LlamaIndex for GraphRAG.

---

## 10. Rollout Strategy & Phasing

The product will be developed and released in four distinct, sequential phases to ensure stability and user adoption:

**Phase 1: The Infinite Canvas & Core Editor**

* Launch the infinite 2D canvas with pan/zoom physics.
* Enable manual creation of nodes and connection mapping.
* Deploy the Notion/Paper-like sidepanel for markdown text support when viewing or creating a node.
* Implement basic user moderation queue.

**Phase 2: External Context & Rich Media**

* Implement the inline linking/embedding engine in the sidepanel editor.
* Support for automatic expansion of Google Maps and Wikipedia URLs into interactive widgets within the node document.

**Phase 3: Digitizing the Physical Archive**

* Launch the OCR/AI-assisted document scanner.
* Enable users to upload photos of handwritten documents.
* Implement the AI pipeline to extract entities and pre-fill the graph creation forms for rapid data ingestion.

**Phase 4: The Intelligent Graph**

* Deploy the GraphRAG chat interface, allowing users to query the graph using natural language.
* Activate machine learning Linkage Prediction (visualized as dashed, suggested edges on the canvas).