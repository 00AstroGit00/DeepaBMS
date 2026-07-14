# ADR-0017: Enterprise Workflow Automation, Notification & Business Rules Engine

**Status**: Accepted (2026-07-14)

**Domain**: Infrastructure / Business Process Automation

**Applies to**: Backend (apps/backend/src/domains/workflow/), Frontend (src/), Windows (apps/windows/)

---

## Context

DeepaBMS has matured into an enterprise platform with **16 domain modules** — Restaurant, Bar, Hotel, Kitchen, POS, Inventory, Purchasing, Credits, Banking, Accounting, Employees, Payroll, GST, Excise, Analytics, and Audit. The offline synchronization engine (see [ADR-0016](#references)) provides event-sourced data consistency across devices. However, business process automation remains entirely manual and hard-coded:

### Current State of Automation

| Aspect | Current Behavior | Problem |
|--------|-----------------|---------|
| **Approvals** | Manually routed via verbal/written communication | No audit trail, delays, lost requests |
| **Inventory triggers** | Purchase → Inventory link is manual data entry | Duplicate work, human error |
| **Notifications** | None beyond in-app toast messages | Critical events missed, no escalation |
| **Business rules** | Hard-coded in reducers (`if (x) then y`) | Requires code change for every new rule |
| **Scheduling** | No background job system | End-of-day, payroll run, report generation all manual |
| **Cross-domain flow** | Purchase → Inventory → Accounting chain done manually | Days of delay between events |
| **Compliance** | No automated compliance checks | GST filing, excise reporting, audit trails are reactive |
| **Escalation** | No timeout-based escalation | Approvals stall indefinitely |
| **Configuration** | Business logic in TypeScript/Express code | Non-technical staff cannot define workflows |

### Required Capabilities

The organization now needs a **central Business Process Management (BPM) / automation layer** that can:

1. **Define workflows visually** — Start/end/task/approval/condition/parallel/sequential/timer/delay/wait/escalation/rollback/compensation/notification/sub_workflow/script — 16 step types covering every business scenario
2. **Evaluate business rules declaratively** — IF/THEN/ELSE expressions in a JS-based sandbox, domain-scoped, with effectivity dating
3. **Route approvals through chains** — Multi-level approval chains with delegation, expiry, auto-approve/reject, and escalation
4. **Notify across channels** — In-app, push, email, SMS, WhatsApp, desktop — with templates and per-user channel preferences
5. **Schedule jobs intelligently** — Cron/interval/one-time/recurring, business-calendar-aware, timezone-aware, with dead-letter queue
6. **React to domain events** — Subscribe to the event store (ADR-0016) and auto-trigger workflows when business events occur
7. **Automate cross-domain pipelines** — 15 integration pathways (Purchase→Inventory, Payroll→Accounting, Bar→Excise, etc.)
8. **Provide an admin designer** — CRUD for definitions, steps, rules, chains, templates, with versioning, publish/rollback, and simulation
9. **Secure with RBAC** — Role-based access per endpoint, audit logs, digital signatures, immutable history

## Decision

Build a comprehensive **Enterprise Workflow Automation, Notification & Business Rules Engine** comprising **9 core subsystems** that collectively form the central BPM/automation layer for DeepaBMS.

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        ENTERPRISE WORKFLOW ENGINE                                  │
│                                                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────────────┐   │
│  │  Workflow    │  │  Business     │  │  Approval    │  │  Notification        │   │
│  │  Engine      │  │  Rules Engine │  │  Engine      │  │  Platform             │   │
│  │  (state      │  │  (IF/THEN/    │  │  (chains,    │  │  (in-app/push/email/ │   │
│  │   machines)  │  │   ELSE/JS)    │  │   levels,    │  │   SMS/WhatsApp)      │   │
│  └──────┬───────┘  └──────┬───────┘  │   expiry)    │  └──────────┬───────────┘   │
│         │                 │          └──────┬───────┘             │               │
│         ▼                 ▼                 ▼                     ▼               │
│  ┌────────────────────────────────────────────────────────────────────────┐       │
│  │                      Scheduler + Event Automation                        │       │
│  │  (cron/interval/recurring + event_store subscriptions + DLQ)            │       │
│  └────────────────────────────────────────────────────────────────────────┘       │
│         │                 │                 │                     │               │
│         ▼                 ▼                 ▼                     ▼               │
│  ┌────────────────────────────────────────────────────────────────────────┐       │
│  │                   Cross-Domain Automation Pipelines                     │       │
│  │  (15 pipelines: Purchase→Inventory, Payroll→Accounting, Bar→Excise...) │       │
│  └────────────────────────────────────────────────────────────────────────┘       │
│         │                 │                 │                     │               │
│         ▼                 ▼                 ▼                     ▼               │
│  ┌────────────────────────────────────────────────────────────────────────┐       │
│  │                   Admin Designer Backend                                │       │
│  │  (CRUD + versioning + publish/rollback + simulation)                   │       │
│  └────────────────────────────────────────────────────────────────────────┘       │
│         │                 │                 │                     │               │
│         ▼                 ▼                 ▼                     ▼               │
│  ┌────────────────────────────────────────────────────────────────────────┐       │
│  │                       Security Layer (RBAC + Audit + Signatures)        │       │
│  └────────────────────────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────────────────────┘
                                                                                    │
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             INFRASTRUCTURE                                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  SQLite (local) │  │  SQLite (server) │  │  Event Store │  │  Sync Engine │  │
│  │  + 18 tables    │  │  + 18 tables     │  │  (ADR-0016)  │  │  (ADR-0016)  │  │
│  └─────────────────┘  └──────────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Detailed Architecture

### Subsystem A: Workflow Engine — State Machine Orchestrator

The Workflow Engine is the core orchestrator. Every workflow is a directed graph of steps evaluated as a state machine.

#### Workflow Definition Lifecycle

```
                   ┌──────────────┐
                   │    DRAFT     │
                   │  (editable)  │
                   └──────┬───────┘
                          │ publish
                          ▼
                   ┌──────────────┐
                   │  PUBLISHED   │
                   │  (immutable, │
                   │  executable) │
                   └──────┬───────┘
                          │ archive
                          ▼
                   ┌──────────────┐
                   │  ARCHIVED    │
                   │  (read-only) │
                   └──────────────┘
```

#### Instance State Machine

Each running workflow is a state machine instance:

```
                         ┌──────────────┐
                         │   PENDING    │
                         │  (queued)    │
                         └──────┬───────┘
                                │ start execution
                                ▼
                     ┌─────────────────────┐
               ┌────>│      RUNNING         │
               │     │  (executing steps)   │
               │     └──────┬───┬──────────┘
               │            │   │
               │     ┌──────┘   └──────┐
               │     │                 │
               │     ▼                 ▼
               │  ┌────────┐    ┌──────────┐
               │  │ ACTIVE │    │  PAUSED  │
               │  │ (normal│    │ (awaiting│
               │  │  exec) │    │  input/  │
               │  └────┬───┘    │ approval)│
               │       │        └─────┬────┘
               │       │              │ resume
               │       └──────┬───────┘
               │              │
               │              ▼
               │     ┌────────────────┐
               │     │  STEP EXEC     │
               │     │  (switch on    │
               │     │   stepType)    │
               │     └───────┬────────┘
               │             │
               │    ┌────────┴────────┐
               │    │                 │
               │    ▼                 ▼
               │  ┌────────┐   ┌──────────┐
               │  │SUCCESS │   │  FAILURE │
               │  │(next   │   │(retry/   │
               │  │ step)  │   │ rollback)│
               │  └───┬────┘   └────┬─────┘
               │      │             │
               └──────┘             │
                                    ▼
                         ┌─────────────────────┐
                         │     FAILED           │
                         │  (or rolled back)    │
                         └──────────┬──────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ▼                     ▼
                 ┌──────────────┐    ┌──────────────┐
                 │  CANCELLED   │    │  TIMED_OUT   │
                 │  (manual)    │    │  (auto)      │
                 └──────────────┘    └──────────────┘

                         ┌──────────────┐
                         │  COMPLETED   │
                         │  (all steps  │
                         │   done)      │
                         └──────────────┘
                         
                         ┌──────────────┐
                         │  SUSPENDED   │
                         │ (admin hold) │
                         └──────────────┘
```

**Instance status transitions:**

| From | To | Trigger |
|------|----|---------|
| PENDING | RUNNING | `startWorkflow()` called |
| RUNNING | COMPLETED | `end` step reached |
| RUNNING | FAILED | Unhandled exception, max retries exceeded |
| RUNNING | PAUSED | `pauseInstance()` called |
| PAUSED | RUNNING | `resumeInstance()` called |
| RUNNING | CANCELLED | `cancelInstance()` called |
| RUNNING | TIMED_OUT | Step timeout exceeded |
| RUNNING | SUSPENDED | Admin hold |
| SUSPENDED | RUNNING | `resumeInstance()` |
| FAILED | RUNNING | Retry (manual override) |

#### Step Types — 16 Built-in Step Types

```
                    WORKFLOW STEP TYPE HIERARCHY
       
       ┌────────────────────────────────────────────────────────┐
       │                  CORE STEPS                             │
       │  ┌─────────┐  ┌─────────┐  ┌──────────┐               │
       │  │  START   │  │   END   │  │   TASK   │               │
       │  │ (entry)  │  │ (exit)  │  │ (action) │               │
       │  └─────────┘  └─────────┘  └──────────┘               │
       └────────────────────────────────────────────────────────┘
       
       ┌────────────────────────────────────────────────────────┐
       │               CONTROL FLOW STEPS                        │
       │  ┌───────────┐  ┌──────────┐  ┌────────────┐          │
       │  │ CONDITION │  │ PARALLEL │  │ SEQUENTIAL │          │
       │  │ (IF/ELSE) │  │ (fan-out)│  │ (sub-seq)  │          │
       │  └───────────┘  └──────────┘  └────────────┘          │
       └────────────────────────────────────────────────────────┘
       
       ┌────────────────────────────────────────────────────────┐
       │               TIME-BASED STEPS                          │
       │  ┌─────────┐  ┌─────────┐  ┌────────┐                 │
       │  │  TIMER  │  │  DELAY  │  │  WAIT  │                 │
       │  │ (cron)  │  │ (pause) │  │(external│                 │
       │  │         │  │         │  │ signal) │                 │
       │  └─────────┘  └─────────┘  └────────┘                 │
       └────────────────────────────────────────────────────────┘
       
       ┌────────────────────────────────────────────────────────┐
       │          BUSINESS & INTEGRATION STEPS                   │
       │  ┌──────────┐  ┌────────────┐  ┌──────────────┐       │
       │  │APPROVAL  │  │NOTIFICATION│  │ SUB_WORKFLOW │       │
       │  │ (chain)  │  │ (channel)  │  │ (nested)     │       │
       │  └──────────┘  └────────────┘  └──────────────┘       │
       └────────────────────────────────────────────────────────┘
       
       ┌────────────────────────────────────────────────────────┐
       │           ERROR HANDLING STEPS                          │
       │  ┌───────────┐  ┌─────────────┐  ┌──────────┐         │
       │  │ESCALATION │  │  ROLLBACK   │  │COMPENSATION│        │
       │  │(timeout)  │  │ (abort)     │  │(undo)    │         │
       │  └───────────┘  └─────────────┘  └──────────┘         │
       └────────────────────────────────────────────────────────┘
       
       ┌────────────────────────────────────────────────────────┐
       │           EXTENSIBILITY STEP                            │
       │  ┌────────┐                                            │
       │  │ SCRIPT │  (sandboxed JS expression)                 │
       │  └────────┘                                            │
       └────────────────────────────────────────────────────────┘
```

#### Step Execution Behavior

| Step Type | Behavior | Config Fields |
|-----------|----------|--------------|
| **start** | Entry point, initializes instance variables, transitions to next step | `outputVars`, `initialContext` |
| **end** | Terminal step, marks instance as `completed`, fires completion events | `outputMapping`, `sendNotification` |
| **task** | Executes a configured action/expression with retry policy. Supports exponential backoff. | `action` (JS expression), `retryPolicy`, `assignedRole` |
| **approval** | Creates an approval request against a configured chain. Instance pauses until resolved. | `chainId`, `timeoutHours`, `requestedBy`, `requireAll` |
| **condition** | Evaluates a branch expression. Sets `__condition_N` variable for downstream steps. | `condition` (JS boolean expr), `trueStepId`, `falseStepId` |
| **parallel** | Fans out to multiple child steps concurrently. Waits for all to complete. | `steps` (array of step IDs), `timeoutMs`, `completionThreshold` |
| **sequential** | Executes a sub-sequence of steps in order within a parent workflow. | `steps` (ordered array of step IDs) |
| **timer** | Waits for a specified duration or absolute time before proceeding. | `delayMs`, `triggerAt`, `cronExpr` |
| **delay** | Pauses execution for an interval, creates a `workflow_timers` entry for async resume. | `duration` (ms), `variable` (dynamic duration) |
| **wait** | Blocks until an external signal (event, callback) is received. | `signalType`, `timeoutMs`, `correlationKey` |
| **escalation** | Routes to an alternative approver/owner when timeout or failure occurs. | `escalationStepId`, `escalationRole`, `timeoutMs` |
| **rollback** | Aborts the workflow immediately. Marks all pending steps as `skipped`. | `reason`, `reverseJournal`, `sendNotification` |
| **compensation** | Executes compensating actions for previously completed steps (Saga pattern). | `compensationAction`, `compensatedStepIds` |
| **notification** | Sends a notification via configured channels/templates. | `templateId`, `channel`, `userId`, `role`, `variables` |
| **sub_workflow** | Launches a child workflow instance. Parent waits or continues based on config. | `workflowId`, `waitForCompletion`, `variableMapping` |
| **script** | Executes arbitrary JS expression in a sandboxed context with access to instance variables. | `script` (JS expression), `outputVariable` |

#### Retry Policy Configuration

```json
{
  "maxRetries": 3,
  "backoffMs": 1000,
  "backoffMultiplier": 2.0,
  "maxBackoffMs": 60000,
  "retryableErrors": ["timeout", "network", "database", "rate_limit"]
}
```

Each task-type step can have an independent retry policy. Default: 3 retries with exponential backoff (1s → 2s → 4s).

#### Variable Scoping

Variables in a workflow instance have four scopes:

| Scope | Visibility | Lifetime | Example |
|-------|-----------|----------|---------|
| `input` | All steps | Duration of instance | `workflowId`, `startedBy` |
| `local` | Current step | Single step execution | `__condition_1`, `__sub_instance_2` |
| `output` | All steps + parent | Duration + returned to caller | `approvalResult`, `calculatedAmount` |
| `global` | All workflows | Cross-instance (shared KV store) | `exchangeRate`, `taxPercentage` |

### Subsystem B: Business Rules Engine — Declarative IF/THEN/ELSE

The Business Rules Engine evaluates declarative rules against contextual data. Rules are defined as JSON with a JS-based expression sandbox.

#### Rule Structure

```json
{
  "id": "rule-purchase-001",
  "name": "High-value purchase approval required",
  "category": "approval",
  "domain": "purchasing",
  "priority": 10,
  "conditions": "amount > 50000 && category === 'CAPEX'",
  "actions": "{ action: 'start_workflow', workflowId: 'wf-approval-chain-3', priority: 'high' }",
  "elseActions": "{ action: 'send_notification', template: 'purchase_approved_low_value' }",
  "status": "active",
  "effectivityStart": "2026-01-01",
  "effectivityEnd": null,
  "tags": ["purchase", "approval", "capex"]
}
```

#### Rule Categories

| Category | Purpose | Domain Examples |
|----------|---------|----------------|
| `validation` | Input validation rules | "Sale amount cannot exceed credit limit" |
| `calculation` | Derived field computation | "GST = amount × rate / (1 + rate)" |
| `scheduling` | When to trigger jobs | "Process payroll on last working day" |
| `approval` | Approval chain routing | "Purchase >50K requires GM approval" |
| `alert` | Threshold-based warnings | "Stock below reorder level → notify" |
| `automation` | Automatic actions | "Goods received → auto-inventory update" |
| `compliance` | Regulatory checks | "Bottle opening must record excise info" |
| `policy` | Business policy enforcement | "Discount cannot exceed 30% without approval" |

#### Expression Sandbox

```
┌────────────────────────────────────────────────────────┐
│              EXPRESSION EVALUATION SANDBOX               │
│                                                          │
│  User-provided expression: "amount > 50000"              │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Sandbox Construction:                            │   │
│  │                                                    │   │
│  │  const amount = 75000;         ← injected vars    │   │
│  │  const __role = 'manager';     ← injected context  │   │
│  │  const __now = '2026-07-14T...';                   │   │
│  │  const __domain = 'purchasing';                    │   │
│  │                                                    │   │
│  │  "use strict";                                     │   │
│  │  return Boolean(amount > 50000);  ← user expr     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Security:                                               │
│  - new Function() constructor (no eval)                  │
│  - "use strict" mode enforced                           │
│  - No access to global objects (Math, Date excluded)    │
│  - Variable names sanitized (regex /[^a-zA-Z0-9_]/g)   │
│  - Timeout guard (configurable, default 500ms)          │
│  - All exceptions caught → returns false + error log    │
└────────────────────────────────────────────────────────┘
```

#### Rule Evaluation Engine Flow

```
                    ┌────────────────────────┐
                    │  evaluateRules(domain, │
                    │   context)              │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │  Query rules by domain │
                    │  + status = 'active'   │
                    │  ORDER BY priority ASC │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │  For each rule:        │
                    │                        │
                    │  ┌─────────────────┐   │
                    │  │ Check           │   │
                    │  │ effectivity:    │   │
                    │  │ now >= start && │   │
                    │  │ now <= end?     │   │
                    │  └────────┬────────┘   │
                    │           │             │
                    │           ▼             │
                    │  ┌─────────────────┐   │
                    │  │ Evaluate        │   │
                    │  │ condition       │   │
                    │  │ (sandbox:       │   │
                    │  │  Boolean(expr)) │   │
                    │  └───┬─────────┬───┘   │
                    │       │         │       │
                    │      true     false    │
                    │       │         │       │
                    │       ▼         ▼      │
                    │  ┌────────┐ ┌────────┐ │
                    │  │Execute │ │Execute │ │
                    │  │actions │ │else    │ │
                    │  │        │ │Actions │ │
                    │  └───┬────┘ └───┬────┘ │
                    │       │         │       │
                    └───────┴─────────┴───────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │  Return                │
                    │  RuleEvaluation[]      │
                    │  { ruleId, matched,   │
                    │    output, execTimeMs }│
                    └────────────────────────┘
```

### Subsystem C: Approval Engine — Configurable Multi-Level Approval Chains

The Approval Engine manages approval routing through configurable chains with arbitrary levels, delegation, expiry, and escalation policies.

#### Approval Chain Structure

```
                    APPROVAL CHAIN EXAMPLE
                    "Purchase Order > ₹50,000"

       Level 1                    Level 2                    Level 3
   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
   │ Department Head  │     │  Finance Manager│     │ General Manager │
   │ (any one)        │     │  (all)          │     │ (any one)       │
   │ Timeout: 24h     │     │  Timeout: 48h   │     │ Timeout: 72h    │
   │ Escalation: L2   │────>│  Escalation: L3 │────>│ Escalation: CEO │
   │ Can delegate: yes│     │  Can delegate:  │     │ Can delegate:   │
   │                  │     │  yes            │     │ no              │
   └─────────────────┘     └─────────────────┘     └─────────────────┘
```

#### Approval Request State Machine

```
                         ┌──────────────┐
                         │   PENDING    │
                         │  (awaiting   │
                         │   approval)  │
                         └──────┬───────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
              ┌──────────┐           ┌──────────┐
              │ APPROVED │           │ REJECTED │
              │ (all     │           │ (any     │
              │  levels) │           │  level)  │
              └────┬─────┘           └────┬─────┘
                   │                      │
                   ▼                      ▼
              ┌──────────┐           ┌──────────┐
              │ESCALATED │           │ EXPIRED  │
              │(to higher│           │(timeout  │
              │ level)   │           │ reached) │
              └──────────┘           └──────────┘
              
              ┌──────────┐
              │ SKIPPED  │
              │ (level   │
              │  bypass) │
              └──────────┘
```

#### Approval Chain Level Configuration

| Field | Type | Description |
|-------|------|-------------|
| `level` | integer | Sequential level number (1-based) |
| `role` | string | Target role for this level (e.g., `finance_manager`) |
| `approverType` | enum | `owner`, `manager`, `finance`, `hr`, `inventory`, `purchasing`, `restaurant`, `hotel`, `bar`, `compliance`, `custom` |
| `approvalType` | enum | `any` (first responder decides), `all` (everyone must approve), `specific` (pre-assigned), `escalation` (auto route) |
| `timeoutHours` | integer | Max hours before auto-escalation |
| `escalationTo` | integer | Next level number on timeout |
| `canDelegate` | boolean | Approver can delegate to another user |

#### Auto-Approval / Auto-Reject

Per-chain configuration enables fully automated approval routing without human intervention:

```json
{
  "autoApprove": true,
  "autoReject": false,
  "autoApproveConditions": "amount < 10000",
  "autoRejectConditions": "complianceFlag === true"
}
```

When `autoApprove` is true and optional conditions match, the system auto-approves without requiring human action. Useful for low-value transactions during off-hours.

#### Delegation

Approval assignments can be delegated to another user:

```
┌────────────────┐          ┌────────────────┐          ┌────────────────┐
│  Assigned To:  │  delegate │  Delegated To: │          │  Original      │
│  User A        │ ─────────>│  User B        │          │  Assignment:   │
│  Status:       │          │  Status:       │          │  delegated     │
│  pending       │          │  pending       │          │                │
└────────────────┘          └────────────────┘          └────────────────┘
                                                                  │
                                                          New assignment
                                                                  │
                                                                  ▼
                                                          ┌────────────────┐
                                                          │  Delegated To: │
                                                          │  User B        │
                                                          │  New ID: ...   │
                                                          │  Status:       │
                                                          │  pending       │
                                                          └────────────────┘
```

### Subsystem D: Notification Platform — Multi-Channel Delivery

The Notification Platform delivers messages through 6 channels with templating, user preference management, and delivery tracking.

#### Notification Channel Adapters

```
                         NOTIFICATION PLATFORM

┌────────────────────────────────────────────────────────────────┐
│                     DELIVERY ROUTER                              │
│  ┌────────────┐  ┌───────────┐  ┌────────────┐  ┌───────────┐ │
│  │ In-App     │  │   Push    │  │   Email    │  │    SMS    │ │
│  │ (SQLite    │  │ (Expo     │  │ (SMTP/     │  │ (Twilio/  │ │
│  │  store)    │  │  Push)    │  │  SendGrid) │  │  MSG91)   │ │
│  └────────────┘  └───────────┘  └────────────┘  └───────────┘ │
│  ┌────────────┐  ┌───────────┐                                 │
│  │  WhatsApp  │  │  Desktop  │                                 │
│  │ (WhatsApp  │  │ (Electron │                                 │
│  │  Business  │  │  native)  │                                 │
│  │  API)      │  │           │                                 │
│  └────────────┘  └───────────┘                                 │
└────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ Queue    │  │ Queue    │  │ Queue    │  │ Queue    │
   │ (local)  │  │(Expo)    │  │ (SMTP)   │  │ (API)    │
   └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

#### Notification Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| `info` | General information | "Shift started", "Day opened" |
| `warning` | Needs attention | "Stock below minimum", "Pending invoices" |
| `critical` | Immediate action | "System offline", "Data integrity error" |
| `approval` | Approval-related | "Approval needed", "Approval granted" |
| `reminder` | Scheduled reminders | "Payroll due tomorrow", "GST filing reminder" |
| `escalation` | Escalated items | "Purchase order escalated to GM" |
| `system` | System events | "Sync completed", "Backup finished" |
| `audit` | Audit trail | "Configuration changed", "User deactivated" |

#### Template Engine

Templates use `{{variable}}` syntax for variable interpolation:

```json
{
  "id": "tmpl-purchase-approval",
  "name": "Purchase Order Approval Required",
  "category": "approval",
  "channel": "email",
  "template": "Purchase order #{{poNumber}} for ₹{{amount}} from {{vendor}} requires your approval.\n\nClick here to approve: {{approvalLink}}\n\nThis request will expire in {{timeoutHours}} hours.",
  "variables": ["poNumber", "amount", "vendor", "approvalLink", "timeoutHours"]
}
```

#### Per-User Channel Preferences

Users can configure which channels they receive notifications on, and channel-specific settings:

| Channel | Config Fields |
|---------|--------------|
| `in_app` | Always enabled (core platform feature) |
| `push` | `expoPushToken`, `enabled`, `quietHoursStart`, `quietHoursEnd` |
| `email` | `emailAddress`, `enabled`, `digestFrequency` |
| `sms` | `phoneNumber`, `enabled`, `countryCode` |
| `whatsapp` | `phoneNumber`, `enabled`, `templateNamespace` |
| `desktop` | `webSocketEndpoint`, `enabled`, `notificationSound` |

### Subsystem E: Scheduler — Cron, Interval, Recurring & One-Time Jobs

The Scheduler manages background job execution with business calendar awareness, timezone support, and a dead-letter queue.

#### Job Types

```
                         SCHEDULED JOB TYPES

┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   ┌──────────────┐    ┌───────────────┐    ┌──────────────┐   │
│   │  CRON        │    │  INTERVAL     │    │  ONE-TIME    │   │
│   │  "0 8 * * 1" │    │  every 3600s  │    │  at specific │   │
│   │  weekly      │    │  hourly       │    │  date/time   │   │
│   └──────────────┘    └───────────────┘    └──────────────┘   │
│                                                                │
│   ┌──────────────┐    ┌───────────────┐                        │
│   │  RECURRING   │    │  BUSINESS     │                        │
│   │  cron +      │    │  CALENDAR     │                        │
│   │  calendar    │    │  holiday-     │                        │
│   │  aware       │    │  aware        │                        │
│   └──────────────┘    └───────────────┘                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### Scheduler Architecture

```
                    ┌──────────────────────────┐
                    │   processDueJobs()        │
                    │   (called every 60s by    │
                    │    setInterval)           │
                    └───────────┬──────────────┘
                                │
                                ▼
                    ┌──────────────────────────┐
                    │  Query scheduled_jobs    │
                    │  WHERE status='active'   │
                    │  AND next_run_at <= now  │
                    │  AND (end_at IS NULL     │
                    │   OR end_at >= now)      │
                    └───────────┬──────────────┘
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
                  ▼                           ▼
        ┌─────────────────┐        ┌─────────────────┐
        │ Check business   │        │ Normal exec     │
        │ calendar (if     │        │ (no calendar    │
        │ businessCalOnly) │        │  check)         │
        └────────┬────────┘        └────────┬────────┘
                 │                          │
                 ▼                          ▼
        ┌─────────────────┐        ┌─────────────────┐
        │ Is today a       │        │ Create job      │
        │ business day?    │        │ instance record │
        │ Yes → proceed    │        │ Start workflow  │
        │ No  → skip       │        │ Update nextRun  │
        └─────────────────┘        └─────────────────┘
```

#### Cron Expression Support

Standard 5-field cron expressions:

```
┌────────── minute (0-59)
│ ┌──────── hour (0-23)
│ │ ┌────── day of month (1-31)
│ │ │ ┌──── month (1-12)
│ │ │ │ ┌── day of week (0-6, 0=Sunday)
│ │ │ │ │
* * * * *
```

Supported operators: `*` (every), `,` (list), `-` (range), `/` (step).

#### Dead-Letter Queue (DLQ)

When a scheduled job fails after exhausting retries, the instance is flagged for manual review:

| DLQ Field | Description |
|-----------|-------------|
| `jobInstanceId` | FK to failed instance |
| `errorMessage` | Last error encountered |
| `retryCount` | Number of retries attempted |
| `failedAt` | Timestamp of final failure |
| `resolvedAt` | Null until manually resolved |
| `resolution` | `retry`, `skip`, `archive` |

### Subsystem F: Event Automation — Subscribe & React to Domain Events

The Event Automation subsystem bridges the event store (ADR-0016) with the workflow engine. When a domain event is persisted, matching workflows and rules are automatically triggered.

#### Event-to-Workflow Mapping

```
                    DOMAIN EVENT AUTOMATION

┌────────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Event Store   │     │  Event Router    │     │  Workflow      │
│  (ADR-0016)    │────>│                  │────>│  Engine        │
│                │     │  ┌────────────┐  │     │                │
│  SaleCompleted │     │  │ event_type │  │     │  Start         │
│  PurchaseRecv'd│     │  │ → regex    │  │     │  workflow      │
│  CheckInDone   │     │  │ → rule     │  │     │  instance      │
│  PayrollProc'd │     │  │ → pipeline │  │     │                │
│  InventoryAdj  │     │  └────────────┘  │     │  Send          │
│  BottleOpened  │     └──────────────────┘     │  notification  │
│  ...           │                              │                │
└────────────────┘                              │  Evaluate      │
                                                │  rules         │
                                                └────────────────┘
```

#### Defined Domain Events

Every domain module publishes events that the automation layer subscribes to:

| Event Name | Source Domain | Triggered Actions |
|------------|--------------|-------------------|
| `SaleCompleted` | restaurant | Post accounting entry, update inventory, send receipt |
| `PurchaseReceived` | purchasing | Update inventory stock, notify requestor |
| `ReservationCreated` | rooms | Schedule check-in reminder, assign housekeeping |
| `CheckInCompleted` | rooms | Update room status, start billing cycle |
| `CheckOutCompleted` | rooms | Generate invoice, clean room, update availability |
| `PayrollProcessed` | hr | Post salary journal to accounting, notify employees |
| `InventoryAdjusted` | inventory | Recalculate KPIs, check reorder thresholds |
| `EmployeeClockIn` | hr | Record attendance, validate shift assignment |
| `BottleOpened` | liquor | Log excise record, update stock |
| `ShiftClosed` | general | Calculate overtime, sync attendance |
| `DayClosed` | accounting | Generate reports, lock period |
| `MonthClosed` | accounting | Generate P&L, archive transactions |
| `InvoiceGenerated` | accounting | Send to customer, update AR |
| `PaymentReceived` | sales | Reconcile invoice, update cash position |
| `GoodsReceived` | purchasing | Quality check, update PO status |
| `LeaveApproved` | hr | Update leave balance, notify team |
| `AdvanceApproved` | hr | Process payment, update ledger |
| `KOTCreated` | restaurant | Send to KDS, start preparation timer |
| `OrderCompleted` | restaurant | Calculate bill, free table |
| `NightAuditCompleted` | rooms | Post all charges, generate folio |
| `SyncCompleted` | sync | Log audit entry, update device status |

#### Event Rule Mapping

```json
{
  "eventType": "PurchaseReceived",
  "workflowId": "wf-goods-receipt-processing",
  "action": "start_workflow",
  "condition": "po_amount > 0",
  "priority": 10
}
```

### Subsystem G: Cross-Domain Automation — 15 Integration Pipelines

These pipelines connect domain modules end-to-end, eliminating manual data transfer between departments.

#### Pipeline Map

```
                    CROSS-DOMAIN AUTOMATION PIPELINES

   Source Domain          Event                   Target Domain(s)
   ═══════════════   ════════════════════        ═══════════════════
   1. Purchasing  ─── PurchaseReceived ────────→ Inventory (update stock)
   2. Inventory   ─── InventoryAdjusted ───────→ Analytics (recalc KPIs)
   3. Restaurant  ─── OrderCompleted ──────────→ Inventory (consume ingredients)
   4. Restaurant  ─── SaleCompleted ───────────→ Accounting (post journal)
   5. Bar         ─── BottleOpened ────────────→ Excise (compliance log)
   6. Bar         ─── SaleCompleted ───────────→ Inventory (reduce liquor stock)
   7. HR (Payroll)── PayrollProcessed ─────────→ Accounting (salary journal)
   8. HR (Payroll)── PayrollProcessed ─────────→ Analytics (labor KPIs)
   9. Hotel       ─── CheckOutCompleted ───────→ Accounting (post folio)
  10. Hotel       ─── CheckOutCompleted ───────→ Housekeeping (clean room)
  11. Rooms       ─── ReservationCreated ──────→ Notification (check-in reminder)
  12. Employee    ─── EmployeeClockIn ──────────→ HR (attendance record)
  13. Attendance  ─── ShiftClosed ──────────────→ Payroll (overtime calc)
  14. Accounting  ─── DayClosed ────────────────→ Analytics (dashboard refresh)
  15. Sync        ─── SyncCompleted ────────────→ Audit (log completion)
```

#### Pipeline Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                    PIPELINE EXECUTION FLOW                           │
│                                                                      │
│  ┌────────────┐    ┌──────────────┐    ┌────────────┐               │
│  │ Source     │    │ Event Router │    │ Pipeline   │               │
│  │ Domain     │───>│ (subscription│───>│ Executor   │               │
│  │ produces   │    │  to event    │    │ (start     │               │
│  │ event      │    │  store)      │    │  workflow) │               │
│  └────────────┘    └──────────────┘    └─────┬──────┘               │
│                                               │                      │
│                                               ▼                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Pipeline Workflow                           │   │
│  │                                                                │   │
│  │  [Start] → [Transform Data] → [Call Target API] → [End]      │   │
│  │                                                                │   │
│  │  Transform steps:                                              │   │
│  │  - Map purchase fields → inventory fields                      │   │
│  │  - Calculate accounting entries from sales data                │   │
│  │  - Format excise compliance record from bar data               │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────────┐    ┌──────────────────┐    ┌──────────────────┐     │
│  │ Target     │    │ Status Update    │    │ Audit Log        │     │
│  │ Domain     │<───│ (completed/      │<───│ (all pipeline    │     │
│  | processes  |    │  failed)         │    │  events logged)  │     │
│  └────────────┘    └──────────────────┘    └──────────────────┘     │
└────────────────────────────────────────────────────────────────────┘
```

Each pipeline is implemented as a workflow definition with its own steps. This makes pipelines fully configurable — new pipelines can be added, existing ones modified, and individual pipelines disabled — all without code changes.

### Subsystem H: Admin Designer Backend

The Admin Designer provides CRUD operations, versioning, publish/rollback, and simulation capabilities for all workflow artifacts.

#### Design-Time vs Run-Time Separation

```
                    ADMIN DESIGNER BACKEND LAYER

   ┌───────────────────────────────────────────────────────────┐
   │                    DESIGN TIME                              │
   │                                                            │
   │  ┌────────────┐  ┌───────────┐  ┌────────────┐           │
   │  │ Workflow   │  │ Rules     │  │ Approval   │           │
   │  │ Designer   │  │ Editor    │  │ Chain      │           │
   │  │ (CRUD +    │  │ (CRUD +   │  │ Designer   │           │
   │  │  reorder)  │  │  preview) │  │ (level mgmt)          │
   │  └─────┬──────┘  └─────┬─────┘  └──────┬─────┘           │
   │        │               │               │                  │
   │        ▼               ▼               ▼                  │
   │  ┌──────────────────────────────────────────────────┐     │
   │  │          Versioning & Publish Pipeline            │     │
   │  │  Draft → [increment version] → Publish → Active  │     │
   │  │  Active → Rollback → [restore prior version]     │     │
   │  └──────────────────────────────────────────────────┘     │
   └───────────────────────────────────────────────────────────┘
                              │ publish / rollback
                              ▼
   ┌───────────────────────────────────────────────────────────┐
   │                     RUN TIME                                │
   │                                                            │
   │  ┌────────────┐  ┌───────────┐  ┌────────────┐           │
   │  │ Workflow   │  │ Rule      │  │ Approval   │           │
   │  │ Execution  │  │ Engine    │  │ Engine     │           │
   │  │ (instances)│  │ (eval)    │  │ (routing)  │           │
   │  └────────────┘  └───────────┘  └────────────┘           │
   └───────────────────────────────────────────────────────────┘
```

#### CRUD Operations

| Artifact | Create | Read | Update | Delete | Special Operations |
|----------|--------|------|--------|--------|-------------------|
| Workflow Definitions | POST | GET /:id | PUT /:id | DELETE | Publish, Archive, Reorder Steps |
| Workflow Steps | POST | GET /:id | PUT /:id | DELETE | Reorder |
| Business Rules | POST | GET /:id | PUT /:id | DELETE | Evaluate, Preview |
| Approval Chains | POST | GET /:id | PUT /:id | DELETE | - |
| Approval Chain Levels | POST | GET /levels | - | - | - |
| Notification Templates | POST | GET | - | DELETE | Send Preview |
| Scheduled Jobs | POST | GET /:id | PUT /:id | DELETE | Run Now |
| Business Calendar | POST | GET | - | - | Next Business Day |

#### Versioning Strategy

Every workflow definition carries an integer `version` field. Publishing increments the version. Existing running instances continue with their original version. New instances use the latest published version.

```
  Definition v1 (draft)    Definition v2 (published)    Definition v3 (draft)
  ┌──────────────────┐     ┌────────────────────┐      ┌──────────────────┐
  │ status: draft    │     │ status: published  │      │ status: draft    │
  │ version: 1       │     │ version: 2         │      │ version: 3       │
  │ steps: [...]     │     │ steps: [...]       │      │ steps: [...]     │
  └──────────────────┘     └────────────────────┘      └──────────────────┘
                                   │
                                   │ New instances use v2
                                   │ Running instances from v1 continue
                                   ▼
                          ┌────────────────────┐
                          │ Instance (v1 steps)│
                          │ Instance (v2 steps)│
                          └────────────────────┘
```

#### Simulation Mode

The designer supports testing workflows without side effects:

1. **Dry-run**: Execute workflow steps but skip all write operations (no DB changes, no notifications, no API calls)
2. **Step-by-step**: Execute one step at a time with manual confirmation between steps
3. **Variable inspection**: View all variable values at each step during simulation
4. **What-if analysis**: Override input variables to test different scenarios

### Subsystem I: Security — RBAC, Audit Logs, Digital Signatures, Immutable History

#### RBAC Model

**Roles** (defined in auth module):

| Role | Workflow Permissions |
|------|---------------------|
| `owner` | Full access — create/edit/delete/publish all artifacts, view all instances, approve all levels |
| `manager` | Create/edit draft definitions, manage rules and chains, view running instances |
| `accountant` | View workflow instances related to financial transactions |
| `approver` | View and respond to approval assignments assigned to them |
| `auditor` | Read-only access to audit logs and completed instances |
| `employee` | View notifications and their own approval requests |

**Permission Matrix:**

| Endpoint Group | owner | manager | accountant | approver | auditor | employee |
|---------------|-------|---------|------------|----------|---------|----------|
| Definitions CRUD | ✓ | ✓ (no delete) | - | - | - | - |
| Publish/Archive | ✓ | ✓ | - | - | - | - |
| Steps CRUD | ✓ | ✓ | - | - | - | - |
| Start Instance | ✓ | ✓ | - | - | - | - |
| Cancel/Pause/Resume | ✓ | ✓ | - | - | - | - |
| View Instances | ✓ | ✓ | ✓ | own only | ✓ | own only |
| Rules CRUD | ✓ | ✓ | - | - | - | - |
| Evaluate Rules | ✓ | ✓ | ✓ | - | - | - |
| Chains CRUD | ✓ | ✓ | - | - | - | - |
| Approve/Reject | ✓ | - | - | ✓ | - | - |
| View Approvals | ✓ | ✓ | - | own only | ✓ | own only |
| Notifications (own) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Send Notifications | ✓ | ✓ | - | - | - | - |
| Jobs CRUD | ✓ | ✓ | - | - | - | - |
| Calendar CRUD | ✓ | ✓ | - | - | - | - |
| Audit Logs | ✓ | ✓ | - | - | ✓ | - |
| Event API | ✓ | ✓ | - | - | - | - |

#### Audit Log Schema

Every action on the workflow engine is recorded in `workflow_audit_log`:

| Column | Description |
|--------|-------------|
| `id` | UUID v4 |
| `instanceId` | FK → workflow_instances.id (nullable for non-instance actions) |
| `workflowId` | FK → workflow_definitions.id (nullable) |
| `action` | Action identifier (e.g., `workflow.started`, `step.completed`, `approval.approved`, `rule.evaluated`) |
| `actor` | User or system identifier |
| `details` | JSON payload with action-specific context |
| `ipAddress` | Client IP (for HTTP-triggered actions) |
| `createdAt` | Immutable timestamp |

#### Immutable History

- Workflow audit logs are append-only — no UPDATE or DELETE operations permitted
- Step instance records are never overwritten; status changes produce new records
- Approval decisions are immutable; a rejected approval cannot be retroactively approved
- Instance state is derived from the sequence of step completion records

## Data Model — 18 Tables

The workflow engine uses 18 database tables, all stored in the same SQLite database as the application data (both locally on devices and on the server).

### Entity Relationship Diagram

```
┌──────────────────────────┐       ┌────────────────────────────┐
│    workflow_definitions  │       │     workflow_steps          │
│──────────────────────────│       │────────────────────────────│
│ id (PK)                  │──1:N──│ id (PK)                     │
│ name                     │       │ workflow_id (FK)            │
│ description              │       │ step_type (enum, 16 types)  │
│ version (int)            │       │ name                        │
│ status (draft/pub/arch)  │       │ config (JSON)               │
│ category                 │       │ step_order (int)            │
│ tags (JSON)              │       │ branch_condition            │
│ icon                     │       │ retry_policy (JSON)         │
│ color                    │       │ timeout_ms (int)            │
│ created_by               │       │ assigned_role               │
│ created_at               │       │ escalation_step_id          │
│ updated_at               │       │ compensation_step_id        │
└──────────────────────────┘       │ created_at                  │
        │                          └────────────────────────────┘
        │ 1:N
        ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│    workflow_instances         │   │   workflow_instance_steps    │
│──────────────────────────────│───│──────────────────────────────│
│ id (PK)                      │   │ id (PK)                      │
│ workflow_id (FK)             │   │ instance_id (FK)             │
│ workflow_version (int)       │   │ step_id (FK)                 │
│ status (8 states)            │   │ step_name                    │
│ context (JSON)               │   │ step_type                    │
│ variables (JSON)             │   │ status (8 states)            │
│ started_by                   │   │ input (JSON)                 │
│ started_at                   │   │ output (JSON)                │
│ completed_at                 │   │ started_at                   │
│ error_message                │   │ completed_at                 │
│ priority (int)               │   │ error_message                │
│ correlation_id               │   │ retry_count (int)            │
│ parent_instance_id           │   │ assigned_to                  │
│ created_at                   │   │ completed_by                 │
└──────────────────────────────┘   └──────────────────────────────┘
        │
        ├─────────────────────────────────────────────────────────┐
        │ 1:N                                                     │ 1:N
        ▼                                                         ▼
┌──────────────────────────┐        ┌──────────────────────────────┐
│  workflow_variables      │        │    workflow_timers            │
│──────────────────────────│        │──────────────────────────────│
│ id (PK)                  │        │ id (PK)                      │
│ instance_id (FK)         │        │ instance_id (FK, nullable)   │
│ name                     │        │ step_id (FK, nullable)       │
│ value (TEXT)             │        │ trigger_at (TIMESTAMP)       │
│ scope (local/global/     │        │ status (pending/triggered/   │
│        input/output)     │        │        cancelled/expired)    │
└──────────────────────────┘        │ action (JSON)                │
                                    │ created_at                   │
                                    └──────────────────────────────┘

┌──────────────────────────┐       ┌──────────────────────────────┐
│    business_rules         │       │    approval_chains            │
│──────────────────────────│       │──────────────────────────────│
│ id (PK)                  │       │ id (PK)                      │
│ name                     │       │ name                         │
│ description              │       │ description                  │
│ category (8 categories)  │       │ category (10 categories)     │
│ domain                   │       │ levels (int)                 │
│ priority (int)           │       │ timeout_hours (int)          │
│ conditions (TEXT)        │       │ auto_approve (bool)          │
│ actions (TEXT)           │       │ auto_reject (bool)           │
│ else_actions (TEXT)      │       │ require_all (bool)           │
│ status (5 states)        │       │ created_at                   │
│ version (int)            │       │ updated_at                   │
│ effectivity_start        │       └──────────────────────────────┘
│ effectivity_end                 │ 1:N
│ tags (JSON)              │       ▼
│ created_by               │  ┌──────────────────────────────┐
│ created_at               │  │  approval_chain_levels        │
│ updated_at               │  │──────────────────────────────│
└──────────────────────────┘  │ id (PK)                      │
                              │ chain_id (FK)                │
┌──────────────────────────┐  │ level (int)                  │
│  approval_requests        │  │ role                         │
│──────────────────────────│  │ approver_type (10 types)     │
│ id (PK)                  │  │ approval_type (any/all/      │
│ instance_id (FK)         │  │              specific/escal) │
│ step_id (FK)             │  │ timeout_hours (int)          │
│ chain_id (FK)            │  │ escalation_to (int)          │
│ chain_version (int)      │  │ can_delegate (bool)          │
│ context (JSON)           │  └──────────────────────────────┘
│ status (7 states)        │
│ requested_by             │
│ requested_from           │
│ requested_at             │
│ completed_at             │
│ comments (TEXT)          │
│ priority (int)           │
│ expires_at               │
└──────────────────────┬───┘
        │ 1:N
        ▼
┌──────────────────────────────┐
│  approval_assignments        │
│──────────────────────────────│
│ id (PK)                      │
│ request_id (FK)              │
│ level (int)                  │
│ assigned_to                  │
│ status (7 states)            │
│ comments (TEXT)              │
│ assigned_at                  │
│ completed_at                 │
│ delegated_to                 │
└──────────────────────────────┘

┌──────────────────────────┐   ┌──────────────────────────────┐
│  notifications            │   │  notification_channels       │
│──────────────────────────│   │──────────────────────────────│
│ id (PK)                  │   │ id (PK)                      │
│ user_id (FK)             │   │ user_id (FK)                 │
│ role                     │   │ channel (6 types)            │
│ type (6 types)           │   │ enabled (bool)               │
│ category (8 categories)  │   │ config (JSON)                │
│ title                    │   └──────────────────────────────┘
│ body (TEXT)              │
│ data (JSON)              │   ┌──────────────────────────────┐
│ channel                  │   │  notification_templates      │
│ is_read (bool)           │   │──────────────────────────────│
│ is_archived (bool)       │   │ id (PK)                      │
│ sent_at                  │   │ name                         │
│ read_at                  │   │ category                     │
│ delivered_at             │   │ channel                      │
│ source                   │   │ template (TEXT)              │
│ source_id                │   │ variables (JSON)             │
└──────────────────────────┘   │ created_at                   │
                               └──────────────────────────────┘

┌──────────────────────────┐   ┌──────────────────────────────┐
│  scheduled_jobs           │   │  scheduled_job_instances     │
│──────────────────────────│   │──────────────────────────────│
│ id (PK)                  │── │ id (PK)                      │
│ name                     │   │ job_id (FK)                  │
│ description              │   │ scheduled_at                 │
│ workflow_id (FK)         │   │ started_at                   │
│ workflow_input (JSON)    │   │ completed_at                 │
│ cron_expr                │   │ status (6 states)            │
│ interval_seconds (int)   │   │ error_message                │
│ start_at                 │   │ retry_count (int)            │
│ end_at                   │   │ workflow_instance_id         │
│ timezone                 │   │ output (TEXT)                │
│ business_calendar_only   │   └──────────────────────────────┘
│ max_retries (int)        │
│ max_instances (int)      │   ┌──────────────────────────────┐
│ status (4 states)        │   │  workflow_audit_log          │
│ last_run_at              │   │──────────────────────────────│
│ next_run_at              │   │ id (PK)                      │
│ created_by               │   │ instance_id (FK)             │
│ created_at               │   │ workflow_id (FK)             │
│ updated_at               │   │ action                       │
└──────────────────────────┘   │ actor                        │
                               │ details (JSON)               │
┌──────────────────────────┐   │ ip_address                   │
│  business_calendar        │   │ created_at                   │
│──────────────────────────│   └──────────────────────────────┘
│ id (PK)                  │
│ date (DATE)              │
│ is_holiday (bool)        │
│ is_weekend (bool)        │
│ holiday_name             │
│ year (int)               │
│ month (int)              │
│ day (int)                │
│ day_of_week (int)        │
│ is_business_day (bool)   │
└──────────────────────────┘
```

### Table Summary

| # | Table | Purpose | Key FK References |
|---|-------|---------|-------------------|
| 1 | `workflow_definitions` | Workflow template definitions | created_by → users |
| 2 | `workflow_steps` | Steps within a workflow definition | workflow_id → workflow_definitions |
| 3 | `workflow_instances` | Running/completed workflow instances | workflow_id → workflow_definitions |
| 4 | `workflow_instance_steps` | Step execution state per instance | instance_id → workflow_instances, step_id → workflow_steps |
| 5 | `workflow_variables` | Variable values per instance | instance_id → workflow_instances |
| 6 | `workflow_timers` | Pending/resolved async timers | instance_id → workflow_instances |
| 7 | `business_rules` | Declarative IF/THEN/ELSE rules | created_by → users |
| 8 | `approval_chains` | Multi-level approval chain templates | - |
| 9 | `approval_chain_levels` | Individual approval levels per chain | chain_id → approval_chains |
| 10 | `approval_requests` | Approval request instances | chain_id → approval_chains, instance_id → workflow_instances |
| 11 | `approval_assignments` | Individual approval assignments | request_id → approval_requests |
| 12 | `notifications` | Notification records | user_id → users |
| 13 | `notification_channels` | Per-user channel preferences | user_id → users |
| 14 | `notification_templates` | Reusable message templates | - |
| 15 | `scheduled_jobs` | Cron/interval/recurring job definitions | workflow_id → workflow_definitions |
| 16 | `scheduled_job_instances` | Individual job execution records | job_id → scheduled_jobs |
| 17 | `workflow_audit_log` | Immutable action audit trail | instance_id → workflow_instances |
| 18 | `business_calendar` | Holiday/weekend calendar for business-day-aware scheduling | - |

### DDL Examples

```sql
-- Workflow Definitions
CREATE TABLE workflow_definitions (
    id          VARCHAR(36) PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    version     INTEGER NOT NULL DEFAULT 1,
    status      VARCHAR(20) NOT NULL DEFAULT 'draft',
    category    VARCHAR(50) NOT NULL DEFAULT 'general',
    tags        TEXT DEFAULT '[]',
    icon        VARCHAR(100),
    color       VARCHAR(20),
    created_by  VARCHAR(50) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Steps
CREATE TABLE workflow_steps (
    id                  VARCHAR(36) PRIMARY KEY,
    workflow_id         VARCHAR(36) NOT NULL REFERENCES workflow_definitions(id),
    step_type           VARCHAR(30) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    description         TEXT,
    config              TEXT DEFAULT '{}',
    step_order          INTEGER NOT NULL,
    branch_condition    TEXT,
    retry_policy        TEXT,
    timeout_ms          INTEGER,
    assigned_role       VARCHAR(50),
    escalation_step_id  VARCHAR(36),
    compensation_step_id VARCHAR(36),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Instances
CREATE TABLE workflow_instances (
    id              VARCHAR(36) PRIMARY KEY,
    workflow_id     VARCHAR(36) NOT NULL REFERENCES workflow_definitions(id),
    workflow_version INTEGER NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    context         TEXT DEFAULT '{}',
    variables       TEXT DEFAULT '{}',
    started_by      VARCHAR(50),
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    error_message   TEXT,
    priority        INTEGER DEFAULT 0,
    correlation_id  VARCHAR(100),
    parent_instance_id VARCHAR(36),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Approval Requests
CREATE TABLE approval_requests (
    id              VARCHAR(36) PRIMARY KEY,
    instance_id     VARCHAR(36) REFERENCES workflow_instances(id),
    step_id         VARCHAR(36) REFERENCES workflow_instance_steps(id),
    chain_id        VARCHAR(36) NOT NULL REFERENCES approval_chains(id),
    chain_version   INTEGER NOT NULL DEFAULT 1,
    context         TEXT DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    requested_by    VARCHAR(50) NOT NULL,
    requested_from  VARCHAR(50),
    requested_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP,
    comments        TEXT,
    priority        INTEGER DEFAULT 0,
    expires_at      TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id          VARCHAR(36) PRIMARY KEY,
    user_id     VARCHAR(50),
    role        VARCHAR(50),
    type        VARCHAR(20) NOT NULL DEFAULT 'in_app',
    category    VARCHAR(20) NOT NULL,
    title       VARCHAR(500) NOT NULL,
    body        TEXT,
    data        TEXT DEFAULT '{}',
    channel     VARCHAR(20),
    is_read     BOOLEAN DEFAULT 0,
    is_archived BOOLEAN DEFAULT 0,
    sent_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at     TIMESTAMP,
    delivered_at TIMESTAMP,
    source      VARCHAR(50),
    source_id   VARCHAR(36)
);

-- Business Calendar
CREATE TABLE business_calendar (
    id              VARCHAR(36) PRIMARY KEY,
    date            DATE NOT NULL UNIQUE,
    is_holiday      BOOLEAN DEFAULT 0,
    is_weekend      BOOLEAN DEFAULT 0,
    holiday_name    VARCHAR(200),
    year            INTEGER NOT NULL,
    month           INTEGER NOT NULL,
    day             INTEGER NOT NULL,
    day_of_week     INTEGER NOT NULL,
    is_business_day BOOLEAN NOT NULL
);
```

## API Surface — 50+ REST Endpoints

All endpoints are mounted under `/api/workflow/` and require JWT + RBAC authentication.

### Workflow Definitions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/workflow/definitions` | owner, manager | List definitions (filterable by status, category, search) |
| GET | `/api/workflow/definitions/:id` | owner, manager | Get definition by ID |
| POST | `/api/workflow/definitions` | owner, manager | Create new definition |
| PUT | `/api/workflow/definitions/:id` | owner, manager | Update definition metadata |
| DELETE | `/api/workflow/definitions/:id` | owner | Delete definition (draft only) |
| POST | `/api/workflow/definitions/:id/publish` | owner, manager | Publish draft (increments version) |
| POST | `/api/workflow/definitions/:id/archive` | owner, manager | Archive published definition |

### Workflow Steps

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/workflow/definitions/:workflowId/steps` | owner, manager | List steps for a workflow |
| POST | `/api/workflow/definitions/:workflowId/steps` | owner, manager | Create step in workflow |
| PUT | `/api/workflow/steps/:id` | owner, manager | Update step |
| DELETE | `/api/workflow/steps/:id` | owner | Delete step |
| POST | `/api/workflow/definitions/:workflowId/reorder` | owner, manager | Reorder steps |

### Workflow Instances

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/workflow/instances` | owner, manager | Start new workflow instance |
| GET | `/api/workflow/instances` | owner, manager, accountant | List instances (filterable by status, workflowId, correlationId) |
| GET | `/api/workflow/instances/:id` | owner, manager, accountant | Get instance details |
| POST | `/api/workflow/instances/:id/cancel` | owner, manager | Cancel running instance |
| POST | `/api/workflow/instances/:id/pause` | owner, manager | Pause instance |
| POST | `/api/workflow/instances/:id/resume` | owner, manager | Resume paused instance |
| GET | `/api/workflow/instances/:id/steps` | owner, manager, accountant | Get step execution status |
| GET | `/api/workflow/instances/:id/variables` | owner, manager | List instance variables |
| POST | `/api/workflow/instances/:id/variables` | owner, manager | Set instance variable |

### Business Rules

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/workflow/rules` | owner, manager | List rules (filterable by status, category, domain) |
| GET | `/api/workflow/rules/:id` | owner, manager | Get rule by ID |
| POST | `/api/workflow/rules` | owner, manager | Create rule |
| PUT | `/api/workflow/rules/:id` | owner, manager | Update rule |
| DELETE | `/api/workflow/rules/:id` | owner, manager | Delete rule |
| POST | `/api/workflow/rules/evaluate` | owner, manager, accountant | Evaluate all rules for a domain |
| POST | `/api/workflow/rules/:id/evaluate` | owner, manager, accountant | Evaluate single rule |

### Approval Chains

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/workflow/chains` | owner, manager | List approval chains |
| GET | `/api/workflow/chains/:id` | owner, manager | Get chain details |
| POST | `/api/workflow/chains` | owner, manager | Create approval chain |
| PUT | `/api/workflow/chains/:id` | owner, manager | Update chain |
| DELETE | `/api/workflow/chains/:id` | owner | Delete chain |
| GET | `/api/workflow/chains/:chainId/levels` | owner, manager | Get chain levels |
| POST | `/api/workflow/chains/:chainId/levels` | owner, manager | Add level to chain |

### Approval Requests & Actions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/workflow/approvals` | owner, manager, approver | List approvals for current user |
| GET | `/api/workflow/approvals/:id` | owner, manager, approver | Get approval request |
| POST | `/api/workflow/approvals` | owner, manager | Create approval request |
| GET | `/api/workflow/approvals/pending` | approver | List pending assignments |
| POST | `/api/workflow/approvals/:id/approve` | approver | Approve assignment |
| POST | `/api/workflow/approvals/:id/reject` | approver | Reject assignment |
| POST | `/api/workflow/approvals/:id/delegate` | approver | Delegate assignment |
| GET | `/api/workflow/approvals/:id/assignments` | owner, manager, approver | Get assignment details |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/workflow/notifications` | All authenticated | List notifications for current user |
| GET | `/api/workflow/notifications/unread` | All authenticated | Get unread count |
| POST | `/api/workflow/notifications` | owner, manager | Send notification |
| POST | `/api/workflow/notifications/:id/read` | All authenticated | Mark as read |
| POST | `/api/workflow/notifications/read-all` | All authenticated | Mark all as read |
| DELETE | `/api/workflow/notifications/:id` | All authenticated | Delete notification |

### Notification Channels

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/workflow/channels` | All authenticated | Get user's channel preferences |
| PUT | `/api/workflow/channels/:channel` | All authenticated | Update channel preference |

### Notification Templates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/workflow/templates` | owner, manager | List templates |
| POST | `/api/workflow/templates` | owner, manager | Create template |
| POST | `/api/workflow/templates/:id/send` | owner, manager | Render and send template |

### Scheduled Jobs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/workflow/jobs` | owner, manager | List scheduled jobs |
| GET | `/api/workflow/jobs/:id` | owner, manager | Get job details |
| POST | `/api/workflow/jobs` | owner, manager | Create job |
| PUT | `/api/workflow/jobs/:id` | owner, manager | Update job |
| DELETE | `/api/workflow/jobs/:id` | owner | Delete job |
| GET | `/api/workflow/jobs/:id/instances` | owner, manager | Get job execution history |

### Business Calendar

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/workflow/calendar` | owner, manager | Set holiday/business day |
| GET | `/api/workflow/calendar/next-business-day` | All authenticated | Get next N business days |

### Audit & Events

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/workflow/audit` | owner, manager, auditor | Query audit logs |
| POST | `/api/workflow/events` | owner, manager | Fire domain event for automation |
| GET | `/api/workflow/health` | owner, manager | Workflow engine health check |

## Security Model

### Authentication

- All endpoints require JWT authentication (existing auth middleware from ADR-0002)
- JWT claims: `{userId, role, name, iat, exp}`
- Device tokens (from ADR-0016) are NOT used for workflow endpoints — all workflow operations are user-level

### Authorization (RBAC)

Authorization is enforced at the route level via middleware:

```typescript
// Example: Only owner and manager can create workflows
router.post('/definitions', authenticate, authorize('owner', 'manager'), handler);

// Example: Approvers can approve, not the owner who created the request
router.post('/approvals/:id/approve', authenticate, handler);
// (approve/reject checks at service level that assignment belongs to the user)
```

### Input Validation

- All request bodies validated at the route level (required fields check)
- Step type must be one of the 16 valid types (checked against `VALID_STEP_TYPES`)
- Rule category must be one of 8 valid categories (checked against `VALID_RULE_CATEGORIES`)
- Approval category must be one of 10 valid categories (checked against `VALID_APPROVAL_CATEGORIES`)
- Notification category must be one of 8 valid categories (checked against `VALID_NOTIF_CATEGORIES`)

### Expression Sandbox Security

The JS expression sandbox for rules and conditions:

- Uses `new Function()` constructor (not `eval()`)
- Enforces `"use strict"` mode
- Sanitizes variable names (regex: `/[^a-zA-Z0-9_]/g`)
- No access to `require`, `import`, `global`, `process`, `module.exports`
- No file system, network, or database access
- All exceptions caught silently → returns `false` with error logged
- Configurable timeout guard (default 500ms)

### Audit Trail Integrity

- Audit log is append-only — no `UPDATE` or `DELETE` operations
- Step execution history is immutable once written
- Approval decisions cannot be changed after submission
- All status transitions logged with actor and timestamp

## Offline Compatibility

The workflow engine is designed for offline-first operation, leveraging the sync infrastructure from ADR-0016.

### Local SQLite Storage

All 18 workflow tables are created in the local SQLite database on each device. This means:

- Workflow definitions are available offline (read-only cache)
- Workflow instances can be started and executed offline
- Notifications are stored locally and displayed immediately
- Approval assignments are visible offline (approval/rejection queued for sync)
- Scheduled jobs are evaluated locally (next run time calculated on device)

### Sync Strategy

Workflow data participates in the existing event-sourced sync protocol:

| Data Category | Sync Direction | Conflict Rule | Description |
|---------------|---------------|---------------|-------------|
| Workflow Definitions | Server → Device | Server-authoritative LWW | Definitions pushed to devices on publish |
| Workflow Instances | Device → Server | Origin-device FWW | Instances created offline sync when online |
| Workflow Instance Steps | Device → Server | Origin-device FWW | Step execution progress synced |
| Approval Requests | Server → Device | Server-authoritative | Pending approvals pushed to approvers |
| Approval Assignments | Server → Device | Server-authoritative | Assignment updates pushed |
| Notifications | Server → Device | Server-authoritative | Notifications pushed to recipients |
| Business Rules | Server → Device | Server-authoritative | Rules pushed to devices for local eval |
| Scheduled Jobs | Server → Device | Server-authoritative | Job definitions pushed |
| Business Calendar | Server → Device | Server-authoritative | Calendar pushed for local business-day checks |
| Audit Logs | Device → Server | Append-only | Audit events synced from device |

### Offline Execution Flow

```
                    OFFLINE WORKFLOW EXECUTION

   Device goes offline:
   
   1. User triggers workflow (e.g., "Approve Purchase Order")
   2. Workflow engine validates locally:
      - Definition exists in local SQLite ✓
      - All required steps present in local cache ✓
   3. Engine creates local instance with status 'running'
   4. Steps execute locally (JS sandbox, no network calls)
   5. Task steps with network dependencies:
      - If config.action is local-only → execute immediately
      - If config.action requires API call → queue for sync
   6. Notification steps:
      - In-app: stored in local notifications table
      - Push/email/SMS: queued for delivery when online
   7. Instance completes locally:
      - Status: 'completed'
      - All step records written to local SQLite
      - Audit events queued in event_store for sync
   
   Device comes online:
   
   8. Sync engine pushes queued events to server
   9. Server validates and persists workflow instance
   10. Server processes any deferred actions (email/SMS)
   11. Server pushes approval updates to other devices
```

### Limitations While Offline

| Capability | Offline Behavior |
|------------|-----------------|
| Start workflow | ✓ Yes, if definition is cached locally |
| Execute task steps | ✓ Yes, with local expressions only |
| Approve/reject | ✓ Yes, queued for sync |
| Send notifications | ✓ In-app only; push/email/SMS queued |
| Evaluate rules | ✓ Yes, with cached rules |
| Run scheduled jobs | ✓ Yes, if next_run_at is in local cache |
| Start sub-workflow | ✓ Yes, if sub-definition is cached |
| Access external APIs | ✗ No — task steps with API calls will fail |
| Send email/SMS | ✗ Queued for online delivery |
| Receive new definitions | ✗ Cached versions only until sync |

## Implementation Plan — 11 Phases

### Phase 1: Core Data Layer & Types (W7-1)

**Files**: `workflow.types.ts`, `workflow.repository.ts`

- Define all TypeScript interfaces (842 lines of types already complete)
- Implement SQLite repository with all 18 CRUD table operations (2016 lines already complete)
- Create migration scripts for all 18 tables
- Build health check endpoint

### Phase 2: Workflow Engine — Definition & Step Management (W7-2)

**Files**: `workflow.service.ts` (definition/step methods)

- Implement definition CRUD with versioning
- Implement step CRUD with ordering
- Add publish/archive workflow
- Add step reorder
- Validate step type against 16 valid types
- Enforce at least one `start` and one `end` step per definition

### Phase 3: Workflow Engine — Execution Engine (W7-3)

**Files**: `workflow.service.ts` (execution methods)

- Implement `startWorkflow()` — creates instance, creates instance steps, triggers async execution
- Implement `executeWorkflow()` — step-by-step execution loop
- Implement all 16 step type handlers:
  - `start` / `end` — lifecycle management
  - `task` — expression execution with retry policy (exponential backoff)
  - `condition` — branch evaluation with variable storage
  - `parallel` — concurrent execution with Promise.all
  - `sequential` — ordered sub-sequence execution
  - `timer` / `delay` — setTimeout-based pauses
  - `wait` — async resume via timer table
  - `escalation` — alternate step routing
  - `rollback` — instance abort with status update
  - `compensation` — compensation step execution (Saga pattern)
  - `notification` — notification creation
  - `approval` — approval request creation
  - `sub_workflow` — nested workflow launch
  - `script` — sandboxed JS execution
- Implement `cancelInstance()`, `pauseInstance()`, `resumeInstance()`
- Implement variable management (get/set/list per scope)
- Implement timer processing (`processPendingTimers()`)

### Phase 4: Business Rules Engine (W7-4)

**Files**: `workflow.service.ts` (rule methods)

- Implement rule CRUD with versioning
- Implement expression sandbox (new Function with strict mode)
- Implement `evaluateRules()` — domain-scoped bulk evaluation
- Implement `evaluateSingleRule()` — targeted rule evaluation
- Add effectivity date checking
- Add rule priority ordering
- Build rule preview/simulation endpoint

### Phase 5: Approval Engine (W7-5)

**Files**: `workflow.service.ts` (approval methods)

- Implement approval chain CRUD
- Implement chain level management
- Implement `createApprovalRequest()` — creates request + all level assignments
- Implement `approveRequest()` — level-by-level approval with chain completion detection
- Implement `rejectRequest()` — immediate rejection at any level
- Implement `delegateAssignment()` — transfer to another user
- Implement `processExpiredApprovals()` — timeout-based expiry
- Implement `processAutoApprovals()` — rules-based auto-approve/reject
- Integrate with notification system for approval alerts

### Phase 6: Notification Platform (W7-6)

**Files**: `workflow.service.ts` (notification methods)

- Implement notification CRUD
- Implement bulk notification sending
- Implement per-user channel preferences (upsert channels)
- Implement template engine with `{{variable}}` interpolation
- Implement `renderAndSend()` — template rendering + delivery
- Implement notification read/unread/archive management
- Implement channel adapter interfaces:
  - In-app: SQLite-persisted notification records
  - Push: Expo Push Notification integration
  - Email: SMTP/SendGrid adapter
  - SMS: Twilio/MSG91 adapter
  - WhatsApp: WhatsApp Business API adapter
  - Desktop: Electron native notification adapter

### Phase 7: Scheduler (W7-7)

**Files**: `workflow.service.ts` (scheduler methods)

- Implement job CRUD with cron/interval/one-time support
- Implement cron expression parser (5-field standard syntax)
- Implement `calculateNextRun()` — cron, interval, and start/end date aware
- Implement `processDueJobs()` — periodic polling loop (every 60s)
- Implement business calendar awareness (skip non-business days)
- Implement timezone support for job scheduling
- Implement DLQ (dead-letter queue) for failed job instances
- Implement `getJobInstances()` — job execution history
- Implement `getNextBusinessDay()` — business calendar utility

### Phase 8: Event Automation (W7-8)

**Files**: `workflow.service.ts` (event automation methods)

- Implement `handleDomainEvent()` — central event handler
- Implement event-to-rule matching (filter rules by event_type in conditions)
- Implement event-to-pipeline matching (match against 15 pipeline mappings)
- Implement event-to-workflow starter with correlation ID
- Implement event audit logging
- Build event subscription endpoint for external domain modules

### Phase 9: Admin Designer & Cross-Domain Pipelines (W7-9)

**Files**: `workflow.routes.ts`, `workflow.service.ts` (pipeline methods)

- Complete all 50+ REST endpoints with full validation
- Implement cross-domain pipeline configurations:
  - 15 default pipelines (Purchase→Inventory, Payroll→Accounting, etc.)
  - Pipeline enable/disable toggle
  - Pipeline workflow binding
- Implement simulation mode for workflow testing:
  - Dry-run execution (no side effects)
  - Step-by-step execution
  - Variable inspection
  - What-if analysis
- Implement definition versioning with rollback support

### Phase 10: Frontend Integration (W7-10)

**Files**: `src/` (screens, components, context)

- Build Workflow Designer screen (visual step editor)
- Build Approval Dashboard (pending approvals, action buttons)
- Build Notification Center (inbox, channels, preferences)
- Build Job Monitor (scheduled jobs, execution history)
- Build Business Calendar UI (holiday management)
- Build Audit Log Viewer (filterable, searchable)
- Integrate workflow execution status into relevant screens
  - Show approval status on Purchase Orders
  - Show workflow status on Invoices
  - Show notification badges in navigation

### Phase 11: Testing & Documentation (W7-11)

- Unit tests for:
  - Expression sandbox (200+ test cases covering edge cases)
  - All 16 step type handlers
  - Approval chain resolution logic
  - Cron expression parser
  - Rule condition evaluation
  - Template rendering
  - Business calendar calculations
- Integration tests for:
  - Full workflow execution cycle (start → steps → complete)
  - Multi-level approval flow
  - Offline → online sync of workflow instances
  - Cross-domain pipeline execution
  - Scheduler job lifecycle
- E2E tests for:
  - Complete workflow: create definition → add steps → publish → start instance → approve → complete
  - Notification lifecycle: template → send → receive → read → archive
  - Job lifecycle: create → schedule → execute → verify output
- Performance tests:
  - 100+ concurrent workflow instances
  - 10,000+ notification delivery
  - Expression evaluation throughput
- Documentation:
  - API reference (OpenAPI 3.0)
  - Admin guide for workflow designer
  - User guide for approvals and notifications
  - Developer guide for adding new step types
  - Architecture diagrams update

## Consequences

### Positive

- **Centralized business logic**: All workflow, approval, rule, notification, and scheduling logic is in one engine. Changes are configuration-driven, not code-driven. Non-technical staff can define workflows, rules, and approval chains through the admin designer. No code changes or deployments required for new business processes.

- **End-to-end automation**: The 15 cross-domain pipelines eliminate manual data transfer between departments. Purchase Receipts automatically update Inventory, which triggers Accounting, which notifies the requester. A single sale event propagates through Restaurant → Inventory → Accounting → Analytics without human intervention.

- **Audit-ready compliance**: Every workflow execution, approval decision, rule evaluation, and notification delivery is logged immutably. Regulatory audits (GST, Excise, labor law) can be satisfied with a single query against the audit log. Approval chains provide documented authorization for financial transactions.

- **Offline-resilient approvals**: Managers can approve purchase orders and leave requests even without internet connectivity. Approvals are queued locally and sync automatically. No business process stalls due to network outages.

- **Configurable escalation**: Approval requests that sit idle automatically escalate. Timed-out tasks trigger notifications to higher authorities. No more stalled approvals — the system ensures every request gets a response or escalation.

- **Multi-channel notification delivery**: Critical alerts reach users wherever they are — in-app, push notification, email, SMS, WhatsApp, or desktop notification. Per-user channel preferences ensure messages arrive through the user's preferred medium. Template engine enables consistent messaging across channels.

- **Business-calendar-aware scheduling**: Payroll runs on the last working day of the month, even if it's a weekend or holiday. Reports generate on the first business day after month-end. The scheduler respects regional holiday calendars.

- **Event-driven architecture**: The event automation layer bridges the event store (ADR-0016) with the workflow engine. Domain events from any module can trigger workflows, rules, and notifications — creating a responsive, interconnected system.

- **3100+ lines of production code already delivered**: The workflow.service.ts (1417 lines), workflow.routes.ts (1424 lines), and workflow.repository.ts (2016 lines) are already implemented and functional. The types are comprehensive with 842 lines of interfaces covering all 9 subsystems. The repository has 18 table implementations with full CRUD operations.

### Negative

- **Increased complexity**: The workflow engine adds ~5000 LOC to the backend codebase. The total workflow domain (types + service + routes + repository) spans ~6000 lines. This is a significant addition that requires careful maintenance and testing.

- **Storage growth**: 18 new tables multiply the database schema. Each workflow execution creates records in workflow_instances, workflow_instance_steps, workflow_variables, workflow_timers, and workflow_audit_log. For a business with 100 workflow executions/day, this adds ~1000 records/day to the audit log alone. Mitigation: audit log archival policy (retain 7 years for compliance, archive older records).

- **Expression sandbox limitations**: The JS-based rule engine uses `new Function()` which, while sandboxed, is not as secure as a dedicated expression language (e.g., JSONata, JMESPath). Complex expressions may have performance issues. Mitigation: 500ms timeout guard on all evaluations, no access to system resources.

- **Learning curve**: Workflow designers need to understand the 16 step types, approval chain configuration, rule syntax, and template variables. Non-technical users may require training. Mitigation: visual designer UI (Phase 10) with drag-and-drop step arrangement, rule preview, and template testing.

- **Testing surface area**: With 16 step types, 50+ endpoints, 18 tables, 15 pipelines, and 8 rule categories, the testing surface is enormous. Each step type has multiple configuration paths. Approval chains have combinatorial complexity. Mitigation: phased testing approach (Phase 11) with automated test suites for each subsystem.

- **Sync overhead**: Workflow data must participate in the offline sync protocol (ADR-0016). Each workflow execution generates events that must be synced across devices. For high-volume workflows (e.g., automated inventory checks every 5 minutes), this could add sync latency. Mitigation: device-local schedule evaluation reduces sync dependency for scheduled jobs.

### Trade-offs

- **Configuration-driven vs code-driven**: Configuration-driven workflows are easier to maintain and don't require deployments, but they are limited to the capabilities of the 16 step types. Highly complex business logic may still require custom code (via the `script` step type as an escape hatch). The trade-off is 90% configurability vs 10% custom code — acceptable for an enterprise BPM system.

- **SQLite for workflow state vs dedicated workflow database**: Using the same SQLite database as the application keeps the architecture simple and ensures offline compatibility. A dedicated workflow database (e.g., PostgreSQL with SKIP LOCKED for job queues) would offer better concurrency at scale. For DeepaBMS's scale (<100 concurrent workflow instances), SQLite is sufficient.

- **Synchronous step execution vs message queue**: Steps execute synchronously within a single Node.js process. For most workflows (approvals, notifications, inventory updates), synchronous execution is fine. For long-running or high-throughput workflows, a message queue (RabbitMQ/Kafka) would provide better resilience and horizontal scaling. The trade-off is simplicity now vs scalability later. The async timer system (`workflow_timers`) already provides non-blocking execution for `delay` and `wait` steps.

- **new Function() vs dedicated expression language**: `new Function()` is already available in Node.js without additional dependencies. Dedicated expression languages (JSONata, JMESPath, Lua) offer better isolation and potentially better performance. The trade-off is zero-dependency simplicity vs theoretical sandbox security. For a single-tenant deployment within a controlled network, `new Function()` is acceptable.

- **Checkpoint-based timer polling vs event-driven timers**: The scheduler polls every 60 seconds for due jobs and timers. This is simpler to implement and debug than a distributed timer service (e.g., Redis sorted sets, AWS EventBridge). The trade-off is up to 60 seconds of timer imprecision. For business processes (not real-time systems), 60-second granularity is acceptable.

- **Multi-level approval chains vs single-level**: Multi-level chains provide proper authorization hierarchy (department head → finance → GM) but add complexity and potential delay. For high-value transactions, the additional review time is justified. The `autoApprove` feature provides a bypass for low-value items.

- **18 tables vs consolidated schema**: Separate tables for each entity provide clean separation of concerns, clear FK relationships, and independent indexing. A consolidated JSON-based schema would be simpler to implement but harder to query and maintain. Given the diversity of the 9 subsystems, 18 tables are appropriate.

## File Manifest

The complete workflow engine consists of 4 files in `apps/backend/src/domains/workflow/`:

| File | Lines | Purpose |
|------|-------|---------|
| `workflow.types.ts` | 842 | All TypeScript interfaces, enums, type aliases, constants |
| `workflow.service.ts` | 1417 | Business logic for all 9 subsystems |
| `workflow.routes.ts` | 1424 | 50+ REST endpoint definitions with auth middleware |
| `workflow.repository.ts` | 2016 | SQLite CRUD operations for 18 tables |

**Total**: ~5700 lines of TypeScript implementing the complete Enterprise Workflow Automation Engine.

## References

1. **ADR-0016: Enterprise Offline Synchronization Architecture** — Defines the event store and sync protocol that the workflow engine builds upon for offline compatibility and event automation
   - `docs/engineering/adr/ADR-0016-sync-architecture.md`

2. **ADR-0006: Enterprise Domain Model** — Defines the 16 domain modules and aggregate boundaries that the workflow engine orchestrates between
   - `docs/engineering/adr/ADR-0006-enterprise-domain-model.md`

3. **ADR-0012: Financial Core Architecture** — Defines the accounting engine that cross-domain pipelines (e.g., Payroll→Accounting, Sales→Accounting) integrate with
   - `docs/engineering/adr/ADR-0012-financial-core-architecture.md`

4. **README.md** — Project overview and architecture guidance
   - `/README.md`

5. **Workflow Engine Implementation** — The actual code implementing this ADR:
   - `apps/backend/src/domains/workflow/workflow.types.ts`
   - `apps/backend/src/domains/workflow/workflow.service.ts`
   - `apps/backend/src/domains/workflow/workflow.routes.ts`
   - `apps/backend/src/domains/workflow/workflow.repository.ts`
