# RENTR
### by Comprint Tech Solutions

# Product Requirements Document — Enhanced
## Rentr Management System (RMS)
### Version 2.0 | April 2026
### CONFIDENTIAL

---

| Parameter | Details |
|-----------|---------|
| Document Owner | Comprint Tech Solutions |
| Product | Rentr Management System (RMS) |
| PRD Version | 2.0 — Enhanced with Section Summaries, Analytics & RBAC |
| Based On | PRD v1.3 + BRD v2.0 + 5-Year Strategic Growth Plan |
| Target Users | Internal Ops, Channel Partners, Direct Customers, End Customers, Support, Leadership |
| Build Timeline | 4-week parallel sprint + 2-week stabilization |
| Dev Team | 5–8 full-stack developers + Claude AI |
| Hosting | Self-hosted on Comprint servers |
| Budget Envelope | ₹2 Crore (12–18 months) |

---

# Table of Contents

1. [Introduction & Product Vision](#1-introduction--product-vision)
2. [System Architecture & Boundaries](#2-system-architecture--boundaries)
3. [User Personas, Roles & Permissions (RBAC Master)](#3-user-personas-roles--permissions)
4. [Module 1: Asset Lifecycle Management & UID System](#module-1-asset-lifecycle-management--uid-system)
5. [Module 2: Contract Management & Digital Signing](#module-2-contract-management--digital-signing)
6. [Module 3: Rental Billing & Payment Tracking](#module-3-rental-billing--payment-tracking)
7. [Module 4: Returns Management & IMS Integration](#module-4-returns-management--ims-integration)
8. [Module 5: Data Wipe Certificate Tracking](#module-5-data-wipe-certificate-tracking)
9. [Module 6: Support, Warranty & Advance Replacements](#module-6-support-warranty--advance-replacements)
10. [Module 7: Customer & Partner Portal](#module-7-customer--partner-portal)
11. [Module 8: Analytics, Margin Intelligence & Dashboards](#module-8-analytics-margin-intelligence--dashboards)
12. [Module 9: CRM Integration (Quote-to-Contract)](#module-9-crm-integration)
13. [Non-Functional Requirements](#non-functional-requirements)
14. [Core Data Model](#core-data-model)
15. [Build Plan & Sprint Timeline](#build-plan--sprint-timeline)

---

# 1. Introduction & Product Vision

## Section Summary
RMS is the single most important technology investment in Rentr's 5-year plan to scale from ₹150 Crore to ₹2,000 Crore in deployed assets. It replaces the current Tally + Excel + WhatsApp operating model with an integrated digital platform managing the full IT asset rental lifecycle. RMS operates as the central orchestration layer integrating with CRM, Tally, IMS, and DocuSign — it does not replace these specialized systems but connects them into a unified workflow.

## Strategic Context
- India's IT rental/leasing market: ₹80,000–1,00,000 Crore, growing 18–22% CAGR
- Enterprise IT spending crossing $176 billion by 2026
- DaaS growing 26–39% CAGR globally
- Market deeply fragmented — no dominant tech-led platform player
- Rentr's structural advantages: full lifecycle ownership, 14+ OEM brands, NBFC residual assets, 50,000 sq ft refurbishment facility

## Current Pain Points & RMS Solutions

| Pain Point | Business Impact | RMS Solution |
|-----------|----------------|-------------|
| 1-week delay between return and invoice stop | 3–5% revenue locked in disputes | Instant auto-stop on IMS GRN receipt |
| No per-asset profitability visibility | Cannot optimize fleet/pricing | Real-time margin calculation by asset/category/customer |
| Excel-based asset tracking | Incomplete, disconnected | 100% UID-tracked with full lifecycle event log |
| 60-day collection cycle | Working capital pressure | Automated reminders, aging dashboards, target 45 days |
| Manual contract management | No standard structure/signatures | Master agreement + annexure model with DocuSign |
| WhatsApp/email coordination | No audit trail, no SLA tracking | System-driven workflows with full audit logging |
| No advance replacement tracking | Asset confusion after swaps | Full lifecycle: ticket → replacement → UID swap → contract update |
| Zero self-service | Ops team bottleneck | Portal with contracts, assets, billing, support, returns |

## Section Analytics & KPIs

| Metric | Current Baseline | Target | Timeline |
|--------|-----------------|--------|----------|
| Revenue in disputes | 3–5% | < 1% | 3 months |
| Invoice stop delay | ~7 days | Instant (GRN) | At launch |
| Collection cycle (DSO) | 60 days | 45 days | 6 months |
| Asset tracking coverage | Partial (Excel) | 100% UID-tracked | 2 months |
| Per-asset margin visibility | None | Real-time | At launch |
| Self-service rate | 0% | 70%+ via portal | 3 months |
| Digital signatures | 0% | 100% DocuSign | At launch |
| Advance replacement tracking | Untracked | 100% with UID swap | At launch |

---

# 2. System Architecture & Boundaries

## Section Summary
RMS is API-first — every capability exposed as a REST endpoint. The customer portal, partner portal, internal dashboard, and future mobile apps all consume the same backend services. RMS owns contracts, asset lifecycle, billing data generation, return initiation, support, portals, and analytics. It integrates with CRM (inbound quotes), Tally (bidirectional billing/payments), IMS (bidirectional returns/GRN), and DocuSign (bidirectional signing).

## System Ownership Map

| System | Owns | Sends to RMS | Receives from RMS |
|--------|------|-------------|-------------------|
| Custom CRM | Leads, quotes, pipeline | Accepted quote data via API | Contract status, inventory availability |
| **RMS** | **Contracts, asset lifecycle, billing data, returns initiation, support, portals, analytics** | — | — |
| Tally | Invoicing, payments, accounting, GST | Payment status via API | Invoice data, credit notes, damage charges via API |
| IMS (existing) | Physical receipt, GRN, damage assessment | GRN + damage data via API | Return requests via API |
| DocuSign/Adobe Sign | Signing workflow, validation | Signed status + PDFs via webhook | Contract docs for signing via API |

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React.js + TypeScript + Tailwind CSS | Component-based, responsive, TypeScript type safety |
| Backend | Node.js (Express/Fastify) + TypeScript | Same language as frontend; async I/O; Claude-optimized |
| Database | PostgreSQL + Prisma ORM | Relational + JSON; type-safe queries; auto-migrations |
| Authentication | JWT + bcrypt + 2FA (TOTP) | Self-hosted compatible; no third-party dependency |
| File Storage | Local FS + NAS/SAN | Self-hosted; organized by UID and entity |
| Scanning | Browser QR + USB barcode scanner | Warehouse tablets + dedicated scanners |
| PDF Generation | Puppeteer / jsPDF | Contracts, reports, damage documentation |
| Email | Nodemailer + SMTP | Direct integration; no third-party service |
| Task Queue | Bull (Redis) or pg-boss | Async: billing, notifications, Tally sync |
| E-Signature | DocuSign / Adobe Sign SDK | Webhook-based status updates; enterprise-grade |

## Integration Specifications

### 2.3.1 CRM Integration (Inbound)
- **Endpoint:** `POST /api/v1/quotes/inbound`
- **Payload:** Customer/partner details, asset requirements, pricing, tenure, special terms
- **RMS Action:** Validates payload, creates draft master agreement + draft annexure, notifies ops
- **Response:** 201 Created with RMS quote reference ID

### 2.3.2 Tally Integration (Bidirectional)
- **Outbound (RMS → Tally):** Billing data per contract per cycle — asset-wise line items with UID, description, rate, period, pro-rata days, GST 18%, credit notes, damage charges, security deposits
- **Inbound (Tally → RMS):** Payment receipts — invoice ref, amount, date, mode, transaction ref
- **Sync:** Billing push on cycle date; payment pull every 4 hours or on webhook
- **Reconciliation:** Daily automated report flagging mismatches

### 2.3.3 IMS Integration (Bidirectional)
- **Outbound (RMS → IMS):** Return request with asset UIDs, contract ref, expected quantities, pickup/drop details
- **Inbound (IMS → RMS):** GRN callback with GRN number, receipt date, UIDs, per-asset damage grade (A–E), photos, condition notes
- **Critical Rule:** On GRN receipt, billing stops immediately with pro-rated credit
- **Fallback:** Manual GRN entry if IMS API unavailable, flagged for reconciliation

### 2.3.4 DocuSign / Adobe Sign Integration
- **Outbound:** RMS generates contract PDF, sends via DocuSign API with signer details and order
- **Inbound:** Webhook callback on each signing event updates contract status
- **Critical Rule:** No asset dispatch without signed annexure under active master agreement

## Section Analytics & KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response time (all integrations) | < 3 seconds (PRD) / < 500ms (BRD) | 95th percentile |
| Tally sync lag | < 24 hours | Time from billing run to Tally invoice |
| IMS GRN processing time | < 5 minutes | GRN received to billing auto-stop |
| DocuSign webhook processing | < 1 minute | Webhook received to status update |
| Daily reconciliation mismatches | < 0.5% | Tally vs RMS billing data |
| Integration uptime | 99.5% | Monthly availability per integration |
| Failed API calls (retried) | < 1% | Per integration per day |

---

# 3. User Personas, Roles & Permissions

## Section Summary
RMS serves six distinct user groups with strict data isolation between tenants. The RBAC model enforces module-level and action-level permissions. Channel partners and direct customers see ONLY their own data (zero cross-tenant visibility). Internal users see all data, optionally filtered by assigned region/category. End customers (via channel partners) get limited read-only access. Every data access event is audit-logged.

## 3.1 User Personas

| Persona | Scale | Primary Tasks | Device | Access Level |
|---------|-------|--------------|--------|-------------|
| **Internal Ops Team** | 5 → 20 Y1 | Asset lifecycle, contracts, billing, returns, advance replacements | Desktop + tablets | Full read/write all modules |
| **Channel Partners** | 200 → 300 Y1 | Self-service: contracts, assets, returns, billing, support, certificates | Desktop / laptop | Own data only |
| **Direct Customers** | Growing | Identical to partner portal (direct-customer flag) | Desktop / laptop | Own data only |
| **Support & Service** | Subset of ops | Tickets, warranty, advance replacements, SLA monitoring, damage charges | Desktop + mobile | R/W support; R/O contracts |
| **Leadership** | Founder, COO, FC | Dashboards, margin analysis, KPI monitoring | Desktop | Full read; admin config |
| **End Customers (via Partner)** | IT teams at partner enterprises | Asset view, support tickets, cert status | Desktop / mobile | Read-only; no billing/contracts |

## 3.2 RBAC Master Matrix

**Legend:** ✓ = Full Access | Own = Own org data only | Read = Read-only | ✗ = No access

| Role | Assets | Contracts | Billing | Returns | Support | Analytics | Certs | Users/Config |
|------|--------|-----------|---------|---------|---------|-----------|-------|-------------|
| **Admin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Ops Manager** | ✓ | ✓ | ✓ | ✓ | ✓ | Read | ✓ | ✗ |
| **Service Manager** | Read | Read | Read | ✓ | ✓ | Read | ✓ | ✗ |
| **Finance** | Read | Read | ✓ | Read | Read | Read | ✓ | ✗ |
| **Partner Admin** | Own | Own | Own | Own | Own | ✗ | Own | Own (org users) |
| **Partner Finance** | ✗ | Own | Own | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Partner IT** | Own | Own | ✗ | Own | Own | ✗ | ✗ | ✗ |
| **Customer Admin** | Own | Own | Own | Own | Own | ✗ | Own | Own (org users) |
| **Customer Finance** | ✗ | Own | Own | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Customer IT** | Own | Own | ✗ | Own | Own | ✗ | ✗ | ✗ |
| **End Customer** | Read (own) | ✗ | ✗ | ✗ | Own (raise) | ✗ | Read (own) | ✗ |

## 3.3 Data Isolation Rules
- **Channel Partners:** See ONLY their own contracts, assets, billing, support tickets. Zero cross-partner visibility.
- **Direct Customers:** See ONLY their own data. Data model treats them as partner entities with a `direct-customer` flag.
- **End Customers (via Partner):** Limited read-only — deployed assets (UIDs, specs), raise support tickets, view data wipe certificate status. No billing or contract visibility.
- **Internal Users:** See all data, filtered by assigned region/category where applicable.
- **Audit Logging:** Every data access event captured with user ID, timestamp, entity accessed.

## Section Analytics & KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Active internal users | 20 by Y1 | Monthly active users |
| Active partner portal users | 300 by Y1 | Monthly active logins |
| Self-service adoption rate | 70%+ | Transactions via portal vs ops-assisted |
| Cross-tenant data leak incidents | 0 | Security audit quarterly |
| RBAC policy violations | 0 | Audit log review monthly |
| 2FA enrollment rate (admin/finance) | 100% | Compliance dashboard |
| Average session duration | Tracked | Per role, per module |

---

# Module 1: Asset Lifecycle Management & UID System

## Section Summary
Every asset Rentr deploys gets a unique identifier (UID) in format `RENTR-[CATEGORY]-[YEAR]-[SERIAL]`. The asset master record tracks identity, acquisition, financials, location, lifecycle events, condition, warranty, and data wipe status. A state machine governs all status transitions with full audit trail. The system launches with migration of 10,000 existing assets from Excel, targeting < 2% error rate. Physical barcode/QR labels are affixed to every asset before dispatch.

## UID System Specification

| Specification | Details |
|--------------|---------|
| Format | `RENTR-[CATEGORY]-[YEAR]-[SERIAL]` |
| Examples | RENTR-SVR-2026-00001 (Server), RENTR-LP-2026-00342 (Laptop), RENTR-GPU-2026-00015 (GPU Server) |
| Physical Label | Barcode + QR code label affixed to every asset before dispatch |
| Scanning | USB barcode scanner (warehouse) + smartphone camera (field) |
| Category Codes | SVR, STR, NW, LP, DT, WS, GPU, AV, CP, MB |
| Uniqueness | System-enforced globally unique; no manual UID entry |
| Generation | Auto-generated on registration; bulk generation for migration |

## Asset Master Record

| Field Group | Fields |
|------------|--------|
| Identity | UID, OEM, model, OEM serial number, full specs (CPU, RAM, storage, GPU, display, ports) |
| Acquisition | Source (New / NBFC Residual / Refurbished), cost, date, vendor, PO reference |
| Financial | Depreciation (WDV 40% p.a.), current book value, insurance, lifetime revenue, lifetime costs |
| Location & Status | Status (state machine), location (warehouse/client/transit/repair), contract ref, partner/customer, site address |
| Lifecycle Events | Chronological log of every state change with timestamp, user, notes |
| Condition | Latest grade (A–E from IMS), photos, damage notes, charge history |
| Warranty | Status (Active/Expired/Void), expiry date, extended warranty, claim history |
| Data Wipe | Certificate status (Not Requested/Requested/Issued/Delivered), reference, date |
| Advance Replacement History | All swaps: original UID, replacement UID, ticket ref, dates |

## Asset Status State Machine

| From State | To State | Trigger |
|-----------|----------|---------|
| In Warehouse | Staged | Asset assigned to signed annexure |
| Staged | In Transit (Outbound) | Asset dispatched with logistics |
| In Transit (Outbound) | Deployed | Delivery confirmation (scan or manual) |
| Deployed | Return Initiated | Return request created |
| Return Initiated | Return In Transit | Pickup confirmed or self-drop scheduled |
| Return In Transit | Received (GRN) | IMS sends GRN → **BILLING STOPS AUTOMATICALLY** |
| Received (GRN) | In Warehouse | Assessment complete; asset available |
| Deployed | In Repair | Support ticket: fault requiring repair |
| In Repair | Deployed | Repair complete; asset operational |
| In Repair | In Warehouse | Repaired; returned to inventory (if advance replaced) |
| Deployed | Advance Replaced | Replacement dispatched; original pending return |
| Advance Replaced | In Repair | Faulty asset received back |
| Any State | Retired / Scrapped | Asset written off |

> **Critical Rule:** On GRN receipt, RMS immediately stops billing with pro-rated credit calculated to the day.

## Data Migration: 10,000 Existing Assets

1. Export current Excel/Sheets data (serial numbers, OEM, model, specs, customer, partner, contracts)
2. Validation, cleansing, duplicate resolution, naming standardization
3. Bulk UID generation by category and assignment to imported records
4. Print barcode/QR labels for distribution to partners and customer sites
5. Records created as `Deployed` status linked to imported contracts
6. Validation report: target < 2% error rate
7. Physical labeling via partner/site visits over subsequent weeks

## RBAC for Module 1: Assets

| Action | Admin | Ops Mgr | Service Mgr | Finance | Partner Admin | Partner Finance | Partner IT | Customer Admin | Customer Finance | Customer IT | End Customer |
|--------|-------|---------|-------------|---------|--------------|----------------|-----------|---------------|-----------------|------------|-------------|
| View all assets | ✓ | ✓ | ✓ (read) | ✓ (read) | — | — | — | — | — | — | — |
| View own org assets | — | — | — | — | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ (read) |
| Create/register asset | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Edit asset details | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Change asset status | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Bulk operations | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View lifecycle events | ✓ | ✓ | ✓ (read) | ✓ (read) | ✓ (own) | ✗ | ✓ (own) | ✓ (own) | ✗ | ✓ (own) | ✗ |
| Search/filter assets | ✓ | ✓ | ✓ | ✓ | ✓ (own) | ✗ | ✓ (own) | ✓ (own) | ✗ | ✓ (own) | ✓ (own) |
| Export asset data | ✓ | ✓ | ✓ | ✓ | ✓ (own) | ✗ | ✗ | ✓ (own) | ✗ | ✗ | ✗ |
| Print labels | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Retire/scrap asset | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Run data migration | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

## Section Analytics & KPIs

| Analytic/Report | Description | Audience |
|----------------|-------------|----------|
| **Total Asset Count** | Total assets by status (Deployed, In Warehouse, In Transit, In Repair, Retired) | Ops, Leadership |
| **Asset Utilization Rate** | % of total assets currently deployed vs idle | Leadership, Ops |
| **Assets by Category** | Breakdown by SVR, LP, DT, GPU, etc. | Ops, Leadership |
| **Assets by OEM** | Distribution across HP, Dell, Lenovo, etc. | Procurement, Leadership |
| **Fleet Age Distribution** | Assets by acquisition year/age bucket | Leadership, Finance |
| **Depreciation Summary** | Total book value, depreciation trend by category | Finance, Leadership |
| **Migration Success Rate** | % of migrated assets with zero errors | Ops, Admin |
| **Idle Asset Report** | Assets in warehouse > 30/60/90 days without deployment | Ops, Leadership |
| **Asset Condition Distribution** | Assets by damage grade (A–E) | Ops, Service |
| **Warranty Expiry Pipeline** | Assets with warranty expiring in 30/60/90 days | Support, Ops |
| **Asset Lifecycle Duration** | Average time in each state (deployed, in-repair, idle) | Ops, Leadership |
| **Scan Compliance** | % of dispatches with barcode scan events | Ops, Admin |
| **Top 10 Most-Repaired Assets** | UIDs with highest support ticket count | Service, Leadership |

---

# Module 2: Contract Management & Digital Signing

## Section Summary
Rentr uses a master agreement + annexure model. The master agreement covers general T&Cs and is signed once at relationship start. Asset annexures are created for each batch of assets deployed — each must be digitally signed via DocuSign before any asset dispatch is allowed (hard block). The system tracks every contract event (additions, returns, replacements, charges, amendments, renewals, terminations) as action items providing a complete audit trail visible to both Rentr and the customer/partner.

## Master Agreement Specification

| Field | Description |
|-------|-------------|
| Agreement ID | Auto-generated: `RENTR-MA-[YEAR]-[SERIAL]` |
| Customer Type | Channel Partner or Direct Customer |
| Customer/Partner | Billing counterparty |
| End Customer | Enterprise where assets deployed (partner deals) |
| General Terms | Payment terms, billing cycle, damage criteria (A–E), dispute process, termination notice, data wiping |
| Security Deposit | 10–15% of asset value for SMEs/startups; enterprise/government exempted on credit assessment |
| Support Terms | SLA levels: Critical 4hr, High 8hr, Medium 24hr, Low 48hr; advance replacement eligibility |
| Auto-Renewal | Default yes with 90-day notice for termination |
| Signature Status | Draft → Sent for Signing → Partially Signed → Fully Signed → Active → Terminated |
| Digital Signature | Via DocuSign/Adobe Sign; both parties must sign for activation |

## Annexure Types

| Document | Contents | Signing |
|----------|----------|---------|
| Master Agreement | General T&Cs, payment terms, liability, dispute resolution, damage framework | Signed once at relationship start via DocuSign |
| Asset Annexure (Addition) | Asset list (UIDs, specs, rates), deployment site, tenure, billing cycle, support inclusion | Signed before dispatch; each addition is a separate annexure |
| Return Annexure | Returned assets (UIDs), condition grades, damage charges, deposit adjustment, data wipe request | Signed by both parties to acknowledge returns and charges |
| Advance Replacement Annexure | Faulty UID, replacement UID, swap date, expected faulty return date, ticket reference | Signed to formalize UID swap on contract |

## Contract Action Items

| Action Type | Trigger | Details Logged |
|------------|---------|---------------|
| Asset Addition | New annexure signed | Annexure ref, asset UIDs, effective date |
| Asset Return | Return request initiated | Asset UIDs, return request ID, reason |
| Advance Replacement | Support ticket triggers swap | Original UID, replacement UID, ticket ref |
| UID Swap | Replacement completed | Old UID out, new UID in, ticket cross-ref |
| Damage Charge | Service manager enters charge | Asset UID, grade, amount, GRN ref, photos |
| Amendment | Terms changed mid-contract | Changed field, old/new values, approved by |
| Renewal | Contract renewed | New end date, rate changes, new annexure |
| Termination | Contract ended | Date, reason, outstanding obligations |
| Data Wipe Certificate | Certificate issued | Asset UID, certificate ref, issue date |

## Digital Signature Workflow

1. Ops finalizes contract/annexure in RMS and clicks **Send for Signing**
2. RMS generates PDF, sends to DocuSign API with signer details and order
3. DocuSign sends signing invitation to each signer via email
4. Webhook updates RMS status (Partially Signed → Fully Signed)
5. Signed PDF stored against contract record; status moves to Active
6. Assets on signed annexure become eligible for warehouse dispatch

> **HARD BLOCK:** No assets may be dispatched unless on a signed annexure under an active master agreement. Warehouse dispatch scan is blocked with error if condition not met.

## RBAC for Module 2: Contracts

| Action | Admin | Ops Mgr | Service Mgr | Finance | Partner Admin | Partner Finance | Partner IT | Customer Admin | Customer Finance | Customer IT | End Customer |
|--------|-------|---------|-------------|---------|--------------|----------------|-----------|---------------|-----------------|------------|-------------|
| View all contracts | ✓ | ✓ | ✓ (read) | ✓ (read) | — | — | — | — | — | — | — |
| View own org contracts | — | — | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Create master agreement | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Create annexure | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Send for signing | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Sign contract (counterparty) | — | — | — | — | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Amend contract terms | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Terminate contract | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Renew contract | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View action items | ✓ | ✓ | ✓ (read) | ✓ (read) | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | ✗ |
| Download signed PDFs | ✓ | ✓ | ✓ | ✓ | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | ✗ |
| View contract audit trail | ✓ | ✓ | ✓ (read) | ✓ (read) | ✓ (own) | ✗ | ✗ | ✓ (own) | ✗ | ✗ | ✗ |

## Section Analytics & KPIs

| Analytic/Report | Description | Audience |
|----------------|-------------|----------|
| **Total Active Contracts** | Count of active master agreements and annexures | Leadership, Ops |
| **Contracts by Status** | Draft, Pending Signature, Active, Expiring, Expired, Terminated | Ops, Leadership |
| **Contract Value (AUM)** | Total asset value under management across active contracts | Leadership, Finance |
| **Average Contract Tenure** | Mean duration of active contracts | Leadership |
| **Contracts Expiring (30/60/90 days)** | Pipeline of upcoming renewals/terminations | Ops, Leadership |
| **Signature Turnaround Time** | Average time from "Sent for Signing" to "Fully Signed" | Ops |
| **Contracts by Customer Type** | Channel Partner vs Direct Customer split | Leadership |
| **Revenue per Contract** | Monthly/annual rental revenue per contract | Finance, Leadership |
| **Action Items per Contract** | Additions, returns, replacements, charges — frequency analysis | Ops |
| **Amendment Frequency** | How often terms are changed mid-contract | Leadership, Ops |
| **Auto-Renewal Rate** | % of contracts auto-renewed vs terminated | Leadership |
| **Unsigned Annexure Aging** | Annexures pending signature > 3/7/14 days | Ops |
| **Top 10 Contracts by Asset Count** | Largest deployments | Leadership, Ops |

---

# Module 3: Rental Billing & Payment Tracking

## Section Summary
RMS does NOT generate invoices — Tally handles invoicing and accounting. RMS calculates WHAT to bill and pushes billing data to Tally. It tracks payment status pulled from Tally for dashboards and portals. The billing engine handles pro-rata calculations for mid-cycle additions/removals, auto-stops billing on IMS GRN, includes damage charges entered by service managers, manages security deposits, and generates credit notes. Automated reminders are sent at Day 7, 15, 30, and 45 for overdue payments.

## Billing Data Generation (RMS → Tally)

- On billing cycle date, RMS generates billing data per active contract: contract ref, partner/customer GSTIN, asset-wise line items (UID, rate, period, pro-rata days), GST 18%, totals
- **Pro-rata:** Mid-cycle additions = supplementary data (from signed annexure date); mid-cycle removals (GRN) = credit data to the day
- **Auto-stop on IMS GRN:** Billing stops immediately; pro-rated credit in next push
- **Damage charges:** Service manager entries included as separate line items
- **Security deposits:** Amounts, forfeitures, refunds as separate line items
- **Credit notes:** Adjustments generated in RMS, pushed to Tally

## Tally API Endpoints

| Endpoint | Direction | Trigger | Payload |
|----------|-----------|---------|---------|
| Push Invoice Data | RMS → Tally | Billing run | Customer, line items (UID, rate, period, GST), totals |
| Push Credit Note | RMS → Tally | On creation | Invoice ref, adjustment items, reason, amount |
| Push Damage Charge | RMS → Tally | Service manager entry | Customer, asset UID, description, amount, GST |
| Pull Payment Status | Tally → RMS | Daily poll or webhook | Invoice ref, status, payment date, amount, mode, balance |
| Pull Aging Data | Tally → RMS | Scheduled | Customer, outstanding, aging buckets (0–30/31–60/61–90/90+) |

## Payment Status Tracking (Tally → RMS)

- **Internal status:** Unpaid, Partially Paid, Paid, Overdue
- **Aging analysis:** 0–30 / 31–60 / 61–90 / 90+ days
- **Payment scoring:** Per customer/partner
- **Automated reminders:** Day 7, 15, 30, 45
- **Escalation workflow** for overdue accounts

## Billing Portal Features

| Feature | Available To |
|---------|-------------|
| View billing schedule (upcoming) | Partners, Customers, Ops |
| View invoice history | Partners, Customers, Ops, Leadership |
| View payment history | Partners, Customers, Ops, Leadership |
| View outstanding balance and aging | Partners, Customers, Ops, Leadership |
| View damage charges with evidence | Partners, Customers, Ops, Service Managers |
| View security deposit balance | Partners, Customers, Ops |
| Download invoice PDFs | Partners, Customers |

## RBAC for Module 3: Billing

| Action | Admin | Ops Mgr | Service Mgr | Finance | Partner Admin | Partner Finance | Partner IT | Customer Admin | Customer Finance | Customer IT | End Customer |
|--------|-------|---------|-------------|---------|--------------|----------------|-----------|---------------|-----------------|------------|-------------|
| View all billing data | ✓ | ✓ | ✓ (read) | ✓ | — | — | — | — | — | — | — |
| View own org billing | — | — | — | — | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ |
| Trigger billing run | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Generate credit notes | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Enter damage charges | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Manage security deposits | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View payment status | ✓ | ✓ | ✓ (read) | ✓ | ✓ (own) | ✓ (own) | ✗ | ✓ (own) | ✓ (own) | ✗ | ✗ |
| View aging analysis | ✓ | ✓ | ✗ | ✓ | ✓ (own) | ✓ (own) | ✗ | ✓ (own) | ✓ (own) | ✗ | ✗ |
| Configure reminders | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Download invoice PDFs | ✓ | ✓ | ✗ | ✓ | ✓ (own) | ✓ (own) | ✗ | ✓ (own) | ✓ (own) | ✗ | ✗ |
| Push data to Tally | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View reconciliation report | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

## Section Analytics & KPIs

| Analytic/Report | Description | Audience |
|----------------|-------------|----------|
| **Annual Recurring Revenue (ARR)** | Total annualized rental billing | Leadership |
| **Monthly Billing Volume** | Total billing amount per month (trend) | Finance, Leadership |
| **Days Sales Outstanding (DSO)** | Average collection period | Finance, Leadership |
| **Aging Analysis** | Outstanding by bucket: 0–30, 31–60, 61–90, 90+ days | Finance, Ops, Leadership |
| **Revenue by Partner/Customer** | Top 10/20 revenue contributors | Leadership, Finance |
| **Revenue by Category** | Billing split by asset category (Server, Laptop, etc.) | Leadership |
| **Pro-rata Adjustments** | Volume and value of mid-cycle additions/removals | Finance |
| **Credit Notes Issued** | Count and value of credits per period | Finance |
| **Damage Charges Collected** | Total damage charge revenue per period | Finance, Service |
| **Security Deposit Balance** | Total deposits held, forfeitures, refunds | Finance |
| **Payment Collection Rate** | % of billed amount collected within terms | Finance, Leadership |
| **Overdue Accounts** | Customers/partners with balances > 30/60/90 days | Finance, Ops |
| **Billing Disputes** | Count, value, resolution time of disputed invoices | Finance, Leadership |
| **Tally Reconciliation Mismatches** | Daily mismatch count and value | Finance |
| **Billing Auto-Stop Effectiveness** | Time from GRN to billing stop (target: instant) | Ops, Finance |
| **GST Summary** | GST collected, filed, pending per period | Finance |

---

# Module 4: Returns Management & IMS Integration

## Section Summary
RMS initiates and orchestrates returns; external IMS handles physical receipt, GRN creation, and condition assessment. When a return is initiated (by partner/customer via portal or ops), RMS validates assets on the contract and sends the return request to IMS. On GRN receipt from IMS, billing auto-stops immediately. Damage data flows back for service manager review and charge entry. Partial returns keep billing running for unreturned assets. Contract-end reconciliation requires both-party acknowledgment before close.

## Return Request Workflow

| Step | Actor | System Action | Data |
|------|-------|--------------|------|
| 1. Initiate | Partner/Customer/Ops | Creates Return Request: asset UIDs, contract ref, reason, preferred date, data wipe cert request | Return ID |
| 2. Validate | System (auto) | Validates assets on contract | Contract check |
| 3. Send to IMS | System (auto) | Pushes return request via REST API | Return ID, UIDs, contract ref, quantities |
| 4. Await GRN | System (listening) | Status: Pending GRN; ops dashboard shows outstanding returns | — |
| 5. Receive GRN | System (auto) | IMS sends: GRN number, date, UIDs received, damage grades/photos | GRN data |
| 6. Billing Stop | System (auto) | Per-UID billing stops immediately; pro-rated credit calculated | Billing stop date = GRN timestamp |
| 7. Log Damage | System (auto) | Damage data stored against asset UIDs; visible in portal | Grade, photos, notes |
| 8. Damage Charges | Service Manager | Reviews data, determines charges, enters in RMS per UID | Charge description, amount, justification |
| 9. Notify | System (auto) | Email: return confirmed, condition summary, charges applied | Notification |
| 10. Update Contract | System (auto) | Action item logged; assets marked inactive on annexure | Contract update |
| 11. Return Annexure | System | Generated → sent for digital signature | Returned UIDs, grades, charges, deposit adjustments |

## Damage Grades (from IMS)

| Grade | Definition | Impact |
|-------|-----------|--------|
| A — Excellent | Original condition, normal wear | No charges |
| B — Good | Minor cosmetic wear, fully functional | No charges |
| C — Fair | Moderate cosmetic or minor functional issue | Charges may apply |
| D — Damaged | Significant physical or functional failure | Charges will apply |
| E — Beyond Repair | Irreparable, missing components | Replacement charges |

## Missing & Partial Returns

- **Partial returns:** Billing continues for unreturned assets; request marked partial
- **Missing assets:** If GRN omits a claimed UID, flagged as Missing Asset; billing continues. Customer must provide dispatch proof.
- **Contract-end reconciliation:** Report listing all assets, return status, grades, charges. Signed return annexure required to close.

## RBAC for Module 4: Returns

| Action | Admin | Ops Mgr | Service Mgr | Finance | Partner Admin | Partner Finance | Partner IT | Customer Admin | Customer Finance | Customer IT | End Customer |
|--------|-------|---------|-------------|---------|--------------|----------------|-----------|---------------|-----------------|------------|-------------|
| View all returns | ✓ | ✓ | ✓ | ✓ (read) | — | — | — | — | — | — | — |
| View own org returns | — | — | — | — | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Initiate return request | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Cancel return request | ✓ | ✓ | ✗ | ✗ | ✓ (own, pre-GRN) | ✗ | ✗ | ✓ (own, pre-GRN) | ✗ | ✗ | ✗ |
| Process GRN callback | System | System | System | System | — | — | — | — | — | — | — |
| Enter damage charges | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View damage reports/photos | ✓ | ✓ | ✓ | ✓ | ✓ (own) | ✗ | ✓ (own) | ✓ (own) | ✗ | ✓ (own) | ✗ |
| Dispute damage charges | ✗ | ✗ | ✗ | ✗ | ✓ (own) | ✗ | ✗ | ✓ (own) | ✗ | ✗ | ✗ |
| Generate return annexure | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Manual GRN entry (fallback) | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View reconciliation report | ✓ | ✓ | ✓ | ✓ | ✓ (own) | ✗ | ✗ | ✓ (own) | ✗ | ✗ | ✗ |

## Section Analytics & KPIs

| Analytic/Report | Description | Audience |
|----------------|-------------|----------|
| **Returns Volume** | Total return requests per period (trend) | Ops, Leadership |
| **Returns by Status** | Pending, In Transit, GRN Received, Completed, Partial | Ops |
| **Average Return Processing Time** | Days from initiation to GRN received | Ops, Leadership |
| **Billing Auto-Stop Latency** | Time from GRN to billing stop (target: instant) | Ops, Finance |
| **Damage Grade Distribution** | Returns by grade A through E | Service, Ops |
| **Damage Charge Pipeline** | Pending assessments, entered charges, disputed charges | Service, Finance |
| **Partial Return Rate** | % of returns with unreturned assets | Ops, Leadership |
| **Missing Asset Count** | Assets claimed returned but not in GRN | Ops, Finance |
| **Return Rate by Partner/Customer** | Return frequency per partner (churn signal) | Leadership |
| **Damage Dispute Rate** | % of damage charges disputed | Service, Leadership |
| **Dispute Resolution Time** | Average time to resolve damage disputes (SLA: 30 days) | Service |
| **Pending GRN Aging** | Returns awaiting GRN > 3/7/14 days | Ops |
| **Contract Close Backlog** | Contracts pending final reconciliation sign-off | Ops, Finance |

---

# Module 5: Data Wipe Certificate Tracking

## Section Summary
Customers returning assets may request blanco certificates confirming data wiping. The wiping and certificate generation happen outside RMS (external team). RMS tracks only the request lifecycle: Requested → In Progress → Issued → Delivered. The certificate PDF is uploaded to RMS by ops and made available for download in the partner/customer portal.

## Certificate Lifecycle

| Step | Actor | RMS Action |
|------|-------|-----------|
| 1. Request | Customer/partner | Certificate flag set on return; status → Requested |
| 2. Ops Visibility | Ops team | Dashboard shows pending requests with aging |
| 3. Wiping | External team | Outside RMS |
| 4. Certificate Generated | External team | Outside RMS |
| 5. Logged in RMS | Ops team | Uploads ref number, date, PDF; status → Issued |
| 6. Notified | System (auto) | Email: certificate available for download |
| 7. Downloaded | Customer/partner | PDF available in portal; status → Delivered |

## Certificate Statuses

| Status | Description |
|--------|------------|
| Not Requested | Default — customer did not request |
| Requested | Flagged during return initiation |
| In Progress | Wiping underway (manual status update) |
| Issued | Certificate PDF uploaded to RMS, linked to asset UID |
| Delivered | Shared with customer via portal/email; downloadable |

## RBAC for Module 5: Certificates

| Action | Admin | Ops Mgr | Service Mgr | Finance | Partner Admin | Partner Finance | Partner IT | Customer Admin | Customer Finance | Customer IT | End Customer |
|--------|-------|---------|-------------|---------|--------------|----------------|-----------|---------------|-----------------|------------|-------------|
| View all cert requests | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| View own org certs | — | — | — | — | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ (read) |
| Request certificate | ✓ | ✓ | ✗ | ✗ | ✓ (during return) | ✗ | ✗ | ✓ (during return) | ✗ | ✗ | ✗ |
| Update cert status | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Upload cert PDF | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Download cert PDF | ✓ | ✓ | ✓ | ✓ | ✓ (own) | ✗ | ✗ | ✓ (own) | ✗ | ✗ | ✓ (own) |

## Section Analytics & KPIs

| Analytic/Report | Description | Audience |
|----------------|-------------|----------|
| **Certificates by Status** | Count per status: Requested, In Progress, Issued, Delivered | Ops, Service |
| **Certificate Request Volume** | Requests per period (trend) | Ops |
| **Average Fulfillment Time** | Days from Requested to Issued | Ops, Leadership |
| **Pending Certificate Aging** | Requests > 7/14/30 days without issuance | Ops |
| **Certificate Delivery Rate** | % of issued certs downloaded by customer | Ops |
| **Certificates by Partner/Customer** | Which customers request certs most frequently | Ops, Leadership |

---

# Module 6: Support, Warranty & Advance Replacements

## Section Summary
Full support ticket lifecycle from creation to closure. Tickets are raised against specific asset UIDs and auto-populate asset details, contract info, and support inclusion status. SLA tracking with auto-escalation at 75%/90% thresholds. When a fault cannot be quickly resolved, advance replacement ships a replacement immediately — the faulty device is collected later. This is tracked across ticket, contract (as action item with signed annexure), and both asset UIDs' lifecycle history. Per-asset warranty tracking with proactive alerts before expiry. Damage charges are manually entered by service managers (NOT auto-calculated) with full justification visible in portal.

## Support Ticket Specification

| Feature | Specification |
|---------|--------------|
| Creation | Against specific asset UIDs; auto-populates asset details, contract, support inclusion |
| Categories | Hardware Failure, Software Issue, Performance Degradation, Physical Damage, Preventive Maintenance, Upgrade Request, General Inquiry |
| Priority | Critical (4hr SLA), High (8hr), Medium (24hr), Low (48hr) |
| Assignment | Auto-assigned by category/location/availability; manual reassignment with audit |
| SLA Tracking | Auto timer; escalation at 75%/90%; breach logged for reporting |
| Resolution | Diagnose → Action (remote/on-site/part/advance replacement) → Resolve → Confirm → Close |
| History | Complete per-asset: technician notes, parts, time, resolution |
| Asset Status | Asset marked "In Repair" when fault reported. Remains on contract, billing continues. |

## Advance Replacement Workflow

| Step | Actor | System Action |
|------|-------|--------------|
| 1. Fault Reported | Customer/Partner | Ticket against faulty UID-A |
| 2. Authorized | Service Manager | Decision logged; checks inventory for compatible replacement |
| 3. Assigned | Ops Team | Replacement UID-B selected; records link original, replacement, ticket, contract |
| 4. Annexure Generated | System | Advance Replacement Annexure: UID-A/UID-B, swap date, return timeline; sent for signing |
| 5. Dispatched | Warehouse | UID-B scanned + dispatched |
| 6. Deployed | Delivery confirmed | UID-B → Deployed; UID-A status → Advance Replaced |
| 7. UID Swap | System (auto) | Action item: old UID swapped out, new UID in. Billing continues same rate. |
| 8. Faulty Returned | Customer | Standard return/IMS flow for UID-A; no billing stop (billing on replacement) |
| 9. Assessed | IMS | GRN + damage assessment for UID-A; service manager determines charges |
| 10. Ticket Closed | Support Team | Full lifecycle documented |

> **Contract Integrity Rule:** After advance replacement, the contract reflects the replacement UID. All future billing, returns, and support reference the replacement. Original UID lifecycle continues independently. Every advance replacement is visible in THREE places: (1) the support ticket, (2) the contract as action item with signed annexure, (3) both asset UIDs in their lifecycle history.

## Warranty Management

- Per-asset: status (Active/Expired/Void), expiry date, extended warranty, claim history
- Proactive alerts at 30/60/90 days before warranty expiry
- Hardware ticket checks warranty; suggests OEM claim vs. Rentr repair vs. advance replacement
- Claim tracking: reference, status, resolution, OEM replacement

## Damage Charge Entry

- Service manager sees: asset UID, IMS condition grade, damage photos, notes, contract terms
- Manually enters: charge description, amount, justification notes. **NOT auto-calculated.**
- Charges logged as contract action item, visible in portal, pushed to Tally
- Customer can view photos and justification in portal
- Dispute triggers 30-day resolution SLA

## RBAC for Module 6: Support

| Action | Admin | Ops Mgr | Service Mgr | Finance | Partner Admin | Partner Finance | Partner IT | Customer Admin | Customer Finance | Customer IT | End Customer |
|--------|-------|---------|-------------|---------|--------------|----------------|-----------|---------------|-----------------|------------|-------------|
| View all tickets | ✓ | ✓ | ✓ | ✓ (read) | — | — | — | — | — | — | — |
| View own org tickets | — | — | — | — | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ (own raised) |
| Raise support ticket | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ |
| Assign/reassign ticket | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Update ticket status | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Close ticket | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Initiate advance replacement | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Select replacement asset | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Enter damage charges | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View warranty info | ✓ | ✓ | ✓ | ✓ (read) | ✓ (own) | ✗ | ✓ (own) | ✓ (own) | ✗ | ✓ (own) | ✗ |
| Manage warranty claims | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View SLA metrics | ✓ | ✓ | ✓ | ✗ | ✓ (own) | ✗ | ✓ (own) | ✓ (own) | ✗ | ✓ (own) | ✗ |
| Configure SLA rules | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

## Section Analytics & KPIs

| Analytic/Report | Description | Audience |
|----------------|-------------|----------|
| **Open Tickets by Priority** | Critical/High/Medium/Low breakdown | Support Lead, Ops |
| **SLA Compliance Rate** | % of tickets resolved within SLA by priority | Support Lead, Leadership |
| **Average Resolution Time** | By category, priority, and team | Support Lead |
| **SLA Breach Count** | Tickets that exceeded SLA per period | Support Lead, Leadership |
| **Ticket Volume Trend** | Tickets created per week/month (trend) | Leadership |
| **Tickets by Category** | Hardware failure vs software vs damage vs maintenance | Support Lead |
| **Advance Replacement Count** | Replacements initiated per period | Support Lead, Ops |
| **Advance Replacement Turnaround** | Average time from authorization to deployment | Support Lead |
| **Faulty Asset Return Rate** | % of replaced assets collected back within SLA | Ops, Support |
| **In-Repair Asset Count** | Currently in-repair, average repair duration | Ops, Support |
| **Warranty Expiry Pipeline** | Assets with warranty expiring in 30/60/90 days | Support, Ops |
| **OEM Warranty Claims** | Claims filed, approved, rejected, pending | Support, Finance |
| **Damage Charge Volume** | Total charges entered per period, avg charge amount | Service, Finance |
| **Dispute Rate** | % of damage charges disputed | Service, Leadership |
| **Repeat Failure Rate** | Assets with multiple tickets (reliability indicator) | Support, Leadership |
| **Top 10 Problematic Assets** | UIDs with most tickets | Support, Ops |
| **Technician Workload** | Tickets per technician, resolution rate | Support Lead |

---

# Module 7: Customer & Partner Portal

## Section Summary
Unified self-service portal for channel partners, direct customers, and end customers (limited view). Same codebase, data scoped by organization. Target: 70%+ interactions self-served within 3 months. Covers dashboard, inventory browser, order tracking, contract center, return management, billing & payments, support tickets, asset register, data wipe certificates, document center, and notifications. Digital onboarding includes KYC upload, credit limit assignment, RBAC provisioning, and master agreement signing.

## Portal Features

| Feature | Partner Admin | Partner Finance | Partner IT | Customer Admin | Customer Finance | Customer IT | End Customer |
|---------|--------------|----------------|-----------|---------------|-----------------|------------|-------------|
| **Dashboard** (contracts, assets, returns, billing, activity) | ✓ | ✓ (billing focus) | ✓ (assets focus) | ✓ | ✓ (billing focus) | ✓ (assets focus) | ✓ (limited) |
| **Inventory Browser** (Rentr stock availability) | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ |
| **Order Tracking** (confirmation → staging → dispatch → deploy) | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ |
| **Contract Center** (MA + annexures, status, PDFs, action items) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Return Management** (initiate, track, view results + photos) | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ |
| **Billing & Payments** (schedule, invoices, payments, aging, PDFs) | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ |
| **Damage Reports** (IMS assessments, photos, charges, dispute) | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ |
| **Support Tickets** (raise, track, SLA, technician notes, replacements) | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ (raise + track) |
| **Asset Register** (deployed UIDs, specs, dates, condition, status) | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ (read) |
| **Data Wipe Certificates** (request, track, download) | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ (read) |
| **Document Center** (signed contracts, receipts, reports, certs) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Notifications** (signing, returns, charges, payments, certs, tickets) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Onboarding Flow

1. Digital KYC: GST registration, PAN, bank details upload
2. Credit limit assignment
3. Partner tier (Silver/Gold/Platinum) for future program
4. Portal access provisioning with RBAC (Admin, Finance, IT roles per org)
5. Welcome walkthrough with contextual tooltips
6. Self-service password reset and 2FA enrollment
7. Master agreement sent for digital signature as part of onboarding

## RBAC for Module 7: Portal Administration

| Action | Admin | Ops Mgr | Service Mgr | Finance | Partner Admin | Partner Finance | Partner IT | Customer Admin | Customer Finance | Customer IT | End Customer |
|--------|-------|---------|-------------|---------|--------------|----------------|-----------|---------------|-----------------|------------|-------------|
| Onboard new partner/customer | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Approve KYC | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Set credit limit | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Manage own org users | — | — | — | — | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Add/remove org user roles | — | — | — | — | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| View partner/customer list | ✓ | ✓ | ✓ (read) | ✓ (read) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Edit partner/customer details | ✓ | ✓ | ✗ | ✗ | ✓ (own) | ✗ | ✗ | ✓ (own) | ✗ | ✗ | ✗ |
| Provision end customer access | ✓ | ✓ | ✗ | ✗ | ✓ (own end-customers) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Reset user password | ✓ | ✗ | ✗ | ✗ | ✓ (own org) | ✗ | ✗ | ✓ (own org) | ✗ | ✗ | ✗ |
| Configure notification preferences | ✓ | ✓ | ✓ | ✓ | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) |

## Section Analytics & KPIs

| Analytic/Report | Description | Audience |
|----------------|-------------|----------|
| **Portal Adoption Rate** | % of partners/customers with active portal logins | Leadership, Ops |
| **Monthly Active Users** | Unique logins per month by role type | Leadership |
| **Self-Service Rate** | % of transactions via portal vs ops-assisted | Leadership |
| **Most Used Features** | Feature usage frequency (contracts, billing, returns, support) | Product, Ops |
| **Onboarding Funnel** | KYC submitted → approved → first login → first transaction | Ops, Leadership |
| **Average Onboarding Time** | Days from KYC submission to first transaction | Ops |
| **Portal Response Time** | Page load < 2s at 95th percentile | Engineering |
| **End Customer Portal Adoption** | % of partner end-customers with active access | Ops, Leadership |
| **Notification Engagement** | Email open rate, in-portal notification clicks | Product |
| **User Role Distribution** | Admin vs Finance vs IT roles across all orgs | Admin |

---

# Module 8: Analytics, Margin Intelligence & Dashboards

## Section Summary
The analytics engine provides real-time per-asset margin calculation aggregating data from Tally (revenue), support tickets (costs), IMS (damage), and internal allocations. Six specialized dashboards serve different audiences. All dashboards support date-range filtering, drill-down, and export to Excel/PDF. Scheduled reports (daily/weekly/monthly) can be emailed automatically. A custom report builder lets users select dimensions and metrics for ad hoc analysis. GST reporting output is compatible with filing requirements.

## Per-Asset Margin Formula

> **Lifetime Asset Margin** = Total Rental Revenue (from Tally) − (Acquisition Cost − Depreciated Book Value) − Support/Maintenance Costs − Insurance − Logistics − Refurbishment − Damage Write-offs − Warehousing Allocated

Revenue from billing engine. Costs tracked per UID. Depreciation: 40% WDV. Payments from Tally for realized revenue.

## Dashboard Specifications

| Dashboard | Audience | Key Metrics |
|-----------|----------|-------------|
| **Executive** | Founder, COO | AUM, ARR, utilization %, margin %, DSO, dispute rate, trends |
| **Financial** | Finance Controller | Revenue by partner/customer, aging (from Tally), collections, deposits, damage charges, GST |
| **Fleet** | Ops Manager | Assets by status/category/OEM, condition grades, idle count, upcoming returns, in-repair |
| **Margin** | Leadership | Margin by asset/category/partner/customer; most/least profitable; pricing insights |
| **Partner/Customer** | Channel Manager | Revenue per partner, volume, return rates, damage frequency, payment score |
| **Support** | Support Lead | Open tickets by priority, SLA compliance, resolution time, advance replacements, warranty pipeline |
| **Returns** | Service Manager | Pending assessments, damage charge pipeline, certificate status, disputes |

## Reporting Capabilities

- Date-range filtering, drill-down, export to Excel/PDF on all dashboards
- Scheduled reports (daily/weekly/monthly) via email to configurable recipients
- Custom report builder: select dimensions and metrics for ad hoc analysis
- Contract action item reports: filterable audit log across all contracts
- GST reporting output compatible with filing requirements

## RBAC for Module 8: Analytics

| Action | Admin | Ops Mgr | Service Mgr | Finance | Partner Admin | Partner Finance | Partner IT | Customer Admin | Customer Finance | Customer IT | End Customer |
|--------|-------|---------|-------------|---------|--------------|----------------|-----------|---------------|-----------------|------------|-------------|
| View Executive Dashboard | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View Financial Dashboard | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View Fleet Dashboard | ✓ | ✓ | ✓ (read) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View Margin Dashboard | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View Partner Dashboard | ✓ | ✓ | ✗ | ✓ (read) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View Support Dashboard | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View Returns Dashboard | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Build custom reports | ✓ | ✓ | ✓ (own modules) | ✓ (billing) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Schedule automated reports | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Export data (Excel/PDF) | ✓ | ✓ | ✓ (own modules) | ✓ | ✓ (own) | ✓ (own billing) | ✗ | ✓ (own) | ✓ (own billing) | ✗ | ✗ |
| View GST reports | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

## Section Analytics — Master KPI List

### Executive KPIs
| KPI | Formula/Source | Frequency |
|-----|---------------|-----------|
| Assets Under Management (AUM) | Sum of book value of all deployed assets | Real-time |
| Annual Recurring Revenue (ARR) | Annualized billing from all active contracts | Real-time |
| Fleet Utilization Rate | Deployed assets / Total assets × 100 | Daily |
| Overall Margin % | (Revenue − All Costs) / Revenue × 100 | Monthly |
| Days Sales Outstanding (DSO) | Average collection period from Tally | Weekly |
| Dispute Rate | Disputed billing / Total billing × 100 | Monthly |
| Self-Service Rate | Portal transactions / Total transactions × 100 | Monthly |
| Digital Contract Coverage | Contracts with DocuSign / Total contracts × 100 | Monthly |

### Operational KPIs
| KPI | Formula/Source | Frequency |
|-----|---------------|-----------|
| Scan Compliance | Dispatches with scan / Total dispatches × 100 | Daily |
| Return Processing Time | Avg days from return initiation to GRN | Weekly |
| Billing Auto-Stop Accuracy | GRN events with instant billing stop / Total GRN × 100 | Daily |
| Advance Replacement SLA | % completed within agreed turnaround | Weekly |
| Idle Asset Duration | Avg days in warehouse without deployment | Weekly |
| Tally Sync Success Rate | Successful syncs / Total syncs × 100 | Daily |

### Financial KPIs
| KPI | Formula/Source | Frequency |
|-----|---------------|-----------|
| Collection Rate | Payments received / Billing amount × 100 | Monthly |
| Aging Distribution | Outstanding by 0–30/31–60/61–90/90+ buckets | Weekly |
| Credit Note Ratio | Credit notes / Total billing × 100 | Monthly |
| Security Deposit Coverage | Total deposits / Total AUM × 100 | Monthly |
| Damage Charge Recovery | Damage charges collected / Total damage charges | Monthly |
| Revenue per Asset | Total revenue / Total deployed assets | Monthly |
| GST Compliance | Filed GST / Billed GST × 100 | Monthly |

---

# Module 9: CRM Integration (Quote-to-Contract)

## Section Summary
Quotation management happens in the custom-built CRM. When a quote is accepted, CRM pushes data to RMS via REST API, which creates the contract (master agreement if first for customer + asset annexure) and initiates the DocuSign signing flow. The API is designed generically so the CRM can be replaced without RMS changes.

## CRM API Endpoints

| Endpoint | Direction | Payload | RMS Action |
|----------|-----------|---------|-----------|
| `POST /api/v1/contracts/from-quote` | CRM → RMS | Customer type/details, asset configs, rates, tenure, billing cycle, terms | Creates contract; generates MA (if first) + annexure; sends for signing |
| `GET /api/v1/inventory/availability` | CRM → RMS | Category, OEM, model, specs filters | Returns available inventory count + lead times |
| `POST callback to CRM` | RMS → CRM | Contract ID, status | CRM updates deal status |

## RBAC for Module 9: CRM Integration

| Action | Admin | Ops Mgr | Service Mgr | Finance | Partner Admin | Partner Finance | Partner IT | Customer Admin | Customer Finance | Customer IT | End Customer |
|--------|-------|---------|-------------|---------|--------------|----------------|-----------|---------------|-----------------|------------|-------------|
| Configure CRM integration | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View inbound quotes | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Process quote to contract | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View integration logs | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

## Section Analytics & KPIs

| Analytic/Report | Description | Audience |
|----------------|-------------|----------|
| **Quotes Received** | Total inbound quotes per period | Ops, Leadership |
| **Quote-to-Contract Conversion** | % of quotes that become active contracts | Leadership |
| **Average Conversion Time** | Days from quote received to contract signed | Ops, Leadership |
| **Quote Value Pipeline** | Total value of pending/processing quotes | Leadership |
| **API Success Rate** | % of successful CRM API calls | Engineering |
| **Integration Error Rate** | Failed/rejected payloads per period | Engineering, Ops |

---

# Non-Functional Requirements

## Section Summary
Covers performance targets, security architecture, and scalability requirements. Performance targets include < 2s page load, < 1s search, < 500ms barcode scan processing. Security enforces RBAC at module+action level, mandatory 2FA for admin/finance, AES-256 encryption at rest, TLS 1.2+ in transit, and immutable audit logging with 7-year retention. Self-hosted on Comprint infrastructure with 99.5% uptime target.

## Performance

| Requirement | Target | Measurement |
|------------|--------|-------------|
| Page load time | < 2 seconds | 95th percentile under normal load |
| Search response | < 1 second | Full-text across entire asset database |
| Barcode scan processing | < 500ms | Scan event to status update |
| Concurrent users | 200+ | Without degradation |
| Report generation (100K assets) | < 30 seconds | Complex analytical queries |
| API response (integrations) | < 3 seconds / < 500ms | All integration endpoints |
| Dashboard refresh | < 5 seconds | Aggregate metrics |
| Billing generation | 500+ lines in 5 minutes | Per billing run |

## Security

- **RBAC:** 11 roles (as defined in Section 3) with configurable permissions at module and action level
- **Data isolation:** Enforced at database query level (not just UI) — row-level security
- **Authentication:** Strong passwords (12+ chars) + mandatory 2FA (TOTP) for admin/finance roles; 30-min session timeout
- **Audit logging:** Immutable — every CUD operation with user, timestamp, old/new values; 7-year retention
- **Encryption:** AES-256 at rest, TLS 1.2+ in transit
- **API security:** Key-based auth + rate limiting per integration partner
- **Application security:** Server-side validation; protection against SQL injection, XSS, CSRF
- **Contract security:** Signed PDFs stored with tamper detection

## Scalability & Infrastructure

- Self-hosted on Comprint infrastructure; horizontal scaling for app layer
- Database: 10,000 at launch scaling to 100,000+ without architectural changes
- File storage: multi-TB with archival strategy
- Backup: daily (30-day retention), weekly (1-year), point-in-time recovery
- Uptime target: 99.5% monthly
- Monitoring and alerting from day 1

## Section Analytics & KPIs

| Metric | Target | Frequency |
|--------|--------|-----------|
| Page load time (P95) | < 2 seconds | Continuous |
| API response time (P95) | < 500ms | Continuous |
| System uptime | 99.5% | Monthly |
| Failed login attempts | Tracked, alert on anomaly | Real-time |
| 2FA enrollment compliance | 100% admin/finance | Monthly |
| Audit log completeness | 100% CUD operations logged | Daily |
| Backup success rate | 100% | Daily |
| Security vulnerabilities | 0 critical/high | Quarterly audit |
| Cross-tenant data access | 0 incidents | Quarterly audit |

---

# Core Data Model

## Section Summary
18 primary entities capturing the complete rental lifecycle. Every entity is audit-logged with user, timestamp, and old/new values.

| Entity | Key Fields | Relationships |
|--------|-----------|--------------|
| Asset | UID, OEM, model, serial_no, category, specs, cost, book_value, status, grade, warehouse_id | Has: Contract Lines, Events, Tickets, Conditions, Charges |
| Master Agreement | agreement_id, customer_type, customer_id, terms, billing_cycle, deposit_%, signature_status | Has: Annexures, Action Items; belongs to Partner/Customer |
| Annexure | annexure_id, agreement_id, type, asset_list, tenure, sites, signature_status | Has: Contract Lines; belongs to Agreement |
| Contract Line | line_id, annexure_id, asset_uid, rate, start, end, status | Links Annexure to Asset |
| Action Item | action_id, agreement_id, type, details, timestamp, user_id | Belongs to Agreement |
| Partner/Customer | entity_id, type, company, GSTIN, PAN, credit_limit, tier, KYC_status | Has: Agreements, Users |
| End Customer | customer_id, company, GSTIN, sites, industry, partner_ref | Referenced by partner Agreements |
| Billing Schedule | schedule_id, agreement_id, cycle, next_date, line_items | Pushed to Tally |
| Payment Record | payment_id, tally_ref, amount, date, mode, txn_ref | Pulled from Tally |
| Return Request | return_id, agreement_id, asset_uids, reason, status, IMS_ref | Sent to IMS; triggers GRN |
| GRN Record | grn_id, return_id, ims_grn_no, date, assets, damage_data | From IMS; triggers billing stop |
| Damage Charge | charge_id, asset_uid, grn_id, grade, amount, entered_by | By Service Manager → Tally |
| Support Ticket | ticket_id, asset_uid, agreement_id, category, priority, status, SLA, assigned_to | Belongs to Asset + Agreement |
| Advance Replacement | replacement_id, ticket_id, original_uid, replacement_uid, annexure_id, status, dates | Links 2 Assets via Ticket |
| Data Wipe Cert | cert_id, asset_uid, return_id, status, ref, date | Belongs to Asset |
| Lifecycle Event | event_id, asset_uid, type, from/to status, timestamp, user_id | Belongs to Asset (immutable) |
| Warehouse | warehouse_id, name, city, capacity | Has Assets |
| User | user_id, name, email, role, tenant_type, tenant_id, permissions, 2fa | Belongs to Org |

---

# Build Plan & Sprint Timeline

## Section Summary
2-day pre-sprint architecture sprint followed by 4-week parallel build across 4 tracks (A–D) with 5–8 developers. Weeks 5–6 are stabilization: parallel run alongside existing Tally/Excel, bug fixes from UAT, performance optimization, and rollout with training.

## Pre-Sprint (2 Days)
Finalize DB schema, API conventions, integration contracts (CRM/Tally/IMS/DocuSign), auth framework, component patterns, and dev environment on self-hosted infrastructure.

## 4-Week Parallel Sprint

| Week | Track A (2 devs) | Track B (2 devs) | Track C (1–2 devs) | Track D (1–2 devs) |
|------|-----------------|-----------------|-------------------|-------------------|
| **Wk 1** | DB schema + API scaffold; Asset CRUD + UID + barcode; State machine + events | Contract engine: MA + annexure; DocuSign integration; Action items | Returns: request flow; IMS API (outbound+inbound); billing auto-stop | Auth + RBAC (all roles); Infra; CI/CD; API gateway |
| **Wk 2** | Billing data engine; Tally push/pull APIs; Pro-rata + damage charges | Advance replacement: ticket-to-swap; UID swap on contract; Annexure flow | Support tickets; In Repair status; SLA tracking; Warranty module | Partner portal: dashboard, inventory, contracts, returns, docs |
| **Wk 3** | Analytics: margin calc, all dashboards (exec, financial, fleet, margin, support, returns) | CRM API; Data wipe cert tracking; Notification engine (email/SMS/portal) | Direct customer portal; End customer portal; All portal notifications | Billing/payment views; Report builder; Scheduled reports |
| **Wk 4** | Dashboard polish; GST reporting; Report exports; Production migration | Integration testing: CRM + Tally + IMS + DocuSign E2E | Data migration: 10K assets + contracts + partners import + validation | UAT with 2–3 pilots; Bug fixes; Security audit; Go-live prep |

## Post-Sprint Stabilization (Weeks 5–6)
- Parallel run alongside existing Tally/Excel for 2 weeks
- Bug fixes from UAT and pilot feedback
- Performance optimization under production load
- Expand from pilot to full partner/customer rollout with training
- Documentation: internal user guide, partner portal guide, customer portal guide

---

# RBAC Implementation Summary

## Role Definitions

| # | Role | Scope | Description |
|---|------|-------|-------------|
| 1 | **Admin** | Global | Full access to all modules, all actions, all data. System configuration, user management, integration setup. |
| 2 | **Ops Manager** | Global | Full operational access: assets, contracts, billing, returns, support. Read-only analytics. No system config. |
| 3 | **Service Manager** | Global | Full access to returns, support, damage charges, certs. Read-only on assets, contracts, billing, analytics. |
| 4 | **Finance** | Global | Full access to billing, payments, deposits. Read-only on assets, contracts, returns, support, analytics. |
| 5 | **Partner Admin** | Own org | Full access to own org data across assets, contracts, billing, returns, support, certs. Manages org users. |
| 6 | **Partner Finance** | Own org | Own org contracts (read) and billing only. No access to assets, returns, support, analytics. |
| 7 | **Partner IT** | Own org | Own org assets, contracts (read), returns, support. No access to billing or analytics. |
| 8 | **Customer Admin** | Own org | Same as Partner Admin but for direct customer organizations. |
| 9 | **Customer Finance** | Own org | Same as Partner Finance but for direct customer organizations. |
| 10 | **Customer IT** | Own org | Same as Partner IT but for direct customer organizations. |
| 11 | **End Customer** | Read-only (own) | Limited read-only: view deployed assets, raise support tickets, view cert status. No billing/contract access. |

## Data Isolation Enforcement

```
┌─────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                        │
│                                                         │
│  Every query filtered by:                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │  IF internal_user:                               │    │
│  │    → All data (optional region/category filter)  │    │
│  │  IF partner/customer_user:                       │    │
│  │    → WHERE tenant_id = user.tenant_id            │    │
│  │  IF end_customer:                                │    │
│  │    → WHERE tenant_id = user.tenant_id            │    │
│  │      AND module IN (assets_read, support, certs) │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Row-level security enforced at ORM/query level         │
│  NOT just UI hiding                                     │
│  Audit log: every access event                          │
└─────────────────────────────────────────────────────────┘
```

## Authentication Requirements by Role

| Role | Password | 2FA | Session Timeout | IP Restriction |
|------|----------|-----|----------------|---------------|
| Admin | 12+ chars | Mandatory (TOTP) | 30 min | Optional |
| Ops Manager | 12+ chars | Recommended | 30 min | No |
| Service Manager | 12+ chars | Recommended | 30 min | No |
| Finance | 12+ chars | Mandatory (TOTP) | 30 min | Optional |
| Partner Admin | 10+ chars | Recommended | 60 min | No |
| Partner Finance | 10+ chars | Mandatory (TOTP) | 60 min | No |
| Partner IT | 10+ chars | Optional | 60 min | No |
| Customer Admin | 10+ chars | Recommended | 60 min | No |
| Customer Finance | 10+ chars | Mandatory (TOTP) | 60 min | No |
| Customer IT | 10+ chars | Optional | 60 min | No |
| End Customer | 8+ chars | Optional | 60 min | No |

---

# Document Approvals

PRD v2.0 Enhanced requires sign-off before development begins.

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Founder / CEO, Comprint Tech Solutions | | | |
| COO, Rentr (or interim ops lead) | | | |
| Head of Technology | | | |
| Finance Controller | | | |
| IMS System Owner | | | |
| CRM System Owner | | | |

---

**End of Document**
**RENTR Management System — PRD v2.0 Enhanced**
