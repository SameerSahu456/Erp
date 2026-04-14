# Phase 3: CRM Module

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the CRM module with 9 pages: Dashboard, Leads (Kanban+List), Deals, Accounts, Contacts, Sales Orders, Quotes, Invoices, Notification Center. Mock data via local JSON. This serves as the production-ready reference module.

**Architecture:** Module lives in `src/modules/crm/`. Each page is a standalone component. Shared CRM types in `src/modules/crm/types.ts`. Mock data in `src/modules/crm/data/`. Routes registered in main router with lazy loading.

**Tech Stack:** React 19, TypeScript, Shadcn UI, @dnd-kit (KanbanBoard), existing common components

---

## Task 1: CRM Types and Mock Data

**Files:**
- Create: `src/modules/crm/types.ts`
- Create: `src/modules/crm/data/leads.ts`
- Create: `src/modules/crm/data/deals.ts`
- Create: `src/modules/crm/data/accounts.ts`
- Create: `src/modules/crm/data/contacts.ts`
- Create: `src/modules/crm/data/sales-orders.ts`
- Create: `src/modules/crm/data/quotes.ts`
- Create: `src/modules/crm/data/invoices.ts`
- Create: `src/modules/crm/data/notifications.ts`

### Types (types.ts)
Define TypeScript interfaces for: Lead, Deal, Account, Contact, SalesOrder, Quote, Invoice, CrmNotification. Each with id, name/title, status, dates, amounts, owner, etc. Keep realistic field names matching a real CRM API.

### Mock Data
Each data file exports an array of 10-15 realistic records. Use Indian business names (Tata, Reliance, Infosys, Wipro, HCL, etc.) and realistic amounts in INR/USD. Lead stages: New, Contacted, Qualified, Proposal, Negotiation, Won, Lost. Deal stages: Discovery, Proposal, Negotiation, Closed Won, Closed Lost.

---

## Task 2: CRM Dashboard

**Files:**
- Create: `src/modules/crm/pages/CrmDashboard.tsx`

### Features:
- StatsRow: 4 KPIs (Total Leads, Active Deals, Revenue This Month, Conversion Rate)
- Pipeline chart area (placeholder card with "Sales Pipeline" title — actual Recharts chart later)
- Recent activity Timeline (5 entries from mock data)
- Top deals table (BusinessMetricsTable with 1 tab showing top 5 deals by value)

---

## Task 3: Leads Page (Kanban + List)

**Files:**
- Create: `src/modules/crm/pages/LeadsPage.tsx`

### Features:
- Toggle between Kanban and List view (using Shadcn Toggle Group: grid/list icons)
- **Kanban view:** KanbanBoard with columns for each lead stage (New, Contacted, Qualified, Proposal, Negotiation, Won, Lost). Each card shows: lead name, company, value, owner avatar, status badge.
- **List view:** BusinessMetricsTable with columns (Name, Company, Stage, Value, Owner, Last Contact, Created Date). Red cell on "Lost" stage rows.
- "Add Lead" button at top

---

## Task 4: Deals Page

**Files:**
- Create: `src/modules/crm/pages/DealsPage.tsx`

### Features:
- Similar to Leads but for deals
- KanbanBoard with deal stages (Discovery, Proposal, Negotiation, Closed Won, Closed Lost)
- Cards show: deal name, account, value, probability %, close date
- List view toggle with BusinessMetricsTable
- Red cell on "Closed Lost" and low probability (<30%)

---

## Task 5: Accounts, Contacts, Sales Orders, Quotes Pages

**Files:**
- Create: `src/modules/crm/pages/AccountsPage.tsx`
- Create: `src/modules/crm/pages/ContactsPage.tsx`
- Create: `src/modules/crm/pages/SalesOrdersPage.tsx`
- Create: `src/modules/crm/pages/QuotesPage.tsx`

### All follow the same pattern:
- Page header with title + "Add" button
- BusinessMetricsTable with relevant columns
- cellFormatter for status coloring (red cell on cancelled/rejected/overdue)
- EmptyState when no data matches filters

### Specific columns:
- **Accounts:** Name, Industry, Type, Revenue, Owner, Status, City
- **Contacts:** Name, Email, Phone, Account, Title, Last Contact
- **Sales Orders:** SO Number, Account, Total, Status (Draft/Confirmed/Shipped/Delivered/Cancelled), Date
- **Quotes:** Quote Number, Account, Total, Status (Draft/Sent/Accepted/Rejected/Expired), Valid Until

---

## Task 6: Invoice Preview Page

**Files:**
- Create: `src/modules/crm/pages/InvoicesPage.tsx`

### Features:
- List of invoices using BusinessMetricsTable (Invoice #, Account, Amount, Status, Due Date, Paid Date)
- Red cell on overdue invoices
- Click row opens a professional invoice preview (in a Dialog or as a detail view):
  - Company header with "comprinttech" logo
  - Invoice number, date, due date
  - Bill To / Ship To addresses
  - Line items table (Item, Description, Qty, Rate, Amount)
  - Subtotal, Tax (GST 18%), Total
  - Payment status badge
  - Print-ready styling

---

## Task 7: Notification Center

**Files:**
- Create: `src/modules/crm/pages/NotificationCenter.tsx`

### Features:
- Full page view of all notifications
- Filter tabs: All, Leads, Deals, Orders, System
- Each notification: icon, title, description, timestamp, read/unread indicator
- Mark as read / Mark all as read actions
- EmptyState when filtered list is empty

---

## Task 8: CRM Routes and Registration

**Files:**
- Create: `src/modules/crm/routes.tsx`
- Modify: `src/app/router.tsx`

### Features:
- Define all CRM routes with lazy loading
- Register under `/crm/*` in the main router
- Routes: /crm (dashboard), /crm/leads, /crm/deals, /crm/accounts, /crm/contacts, /crm/sales-orders, /crm/quotes, /crm/invoices, /crm/notifications
