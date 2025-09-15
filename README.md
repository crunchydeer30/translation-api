### Translation API

Backend service for a hybrid Machine Translation + Human-in-the-Loop platform (inspired by Unbabel). It orchestrates translation orders end‑to‑end: segmentation and anonymization of source content, machine translation with subsequent human editing with, and quality reviews. 

This API is meant to pluggable by design amd integrate cleanly into existing ticketing/helpdesk/CRM system (e.g., Zendesk, Freshdesk, Jira Service Management).

Built as a coursework/learning project to practice complex and robust real‑world backend architectural patterns.

— Part of a two‑service system: this NestJS API and a Python FastAPI anonymizer service.

### Learning goals
- Domain‑Driven Design
- Event‑driven flows with CQRS and messaging
- Building complex business workflows (order lifecycle, editorial queues, QA)
- External system integrations (DeepL MT, anonymizer, email)
- Queues and fault tolerance: retries/backoff for resilience under failure

### What it does
- Accepts translation orders in multiple formats: plain text, HTML, XLIFF
- Anonymizes PII before MT and deanonymizes during reconstruction (AI‑assisted: hybrid rule‑based + ML NER via Microsoft Presidio with pretrained spaCy models)
- Uses DeepL for machine translation with tag handling and batching
- Human‑in‑the‑loop editing with validation and two editorial tiers
- Periodic performance reviews by senior editors as part of QA
- Role‑based access for customers, editors, and staff
- Designed for integration with existing systems (e.g., Zendesk, Freshdesk, Jira Service Management) and works great with email pipelines

### Processing flow
1) Customer submits a translation order (plain text/HTML/XLIFF)
2) Content is segmented and anonymized; segments are queued for processing
3) DeepL translates anonymized segments; jobs use retries/backoff for fault tolerance
4) Editors pick tasks, provide edits on anonymized content with validation
5) Reconstruction restores formatting and sensitive tokens; result is delivered
6) Quality assurance: senior editors run periodic performance reviews that affect editor qualification and access to editorial work
