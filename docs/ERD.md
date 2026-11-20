# ERD — DKI IT Service Desk

```mermaid
erDiagram
 PLANTS ||--o{ PROFILES : assigns
 DEPARTMENTS ||--o{ PROFILES : groups
 PROFILES ||--o{ TICKETS : reports
 PROFILES ||--o{ TICKETS : assigned
 PLANTS ||--o{ TICKETS : receives
 TICKET_CATEGORIES ||--o{ TICKETS : classifies
 TICKETS ||--o{ TICKET_COMMENTS : has
 TICKETS ||--o{ TICKET_HISTORY : tracks
 PROFILES ||--o{ TICKET_COMMENTS : writes
 CHECKLIST_TEMPLATES ||--o{ CHECKLIST_ITEMS : defines
 CHECKLIST_ITEMS ||--o{ CHECKLIST_ITEM_PLANTS : applies
 PLANTS ||--o{ CHECKLIST_ITEM_PLANTS : scope
 CHECKLIST_TEMPLATES ||--o{ DAILY_CHECK_SESSIONS : uses
 PLANTS ||--o{ DAILY_CHECK_SESSIONS : checked_at
 PROFILES ||--o{ DAILY_CHECK_SESSIONS : checker
 DAILY_CHECK_SESSIONS ||--o{ DAILY_CHECK_RESULTS : contains
 CHECKLIST_ITEMS ||--o{ DAILY_CHECK_RESULTS : evaluated
 TICKETS ||--o{ DAILY_CHECK_RESULTS : optional_link
```

## Entitas
- `plants`, `departments`, `profiles`
- `ticket_categories`, `tickets`, `ticket_comments`, `ticket_history`
- `checklist_templates`, `checklist_items`, `checklist_item_plants`
- `daily_check_sessions`, `daily_check_results`

Tidak ada tabel evidence karena checksheet tidak membutuhkan upload bukti.
