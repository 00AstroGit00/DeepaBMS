# State Machines

---

## 1. Room Lifecycle

```
                    ┌──────────────────────────────┐
                    │                              │
                    ▼                              │
              ┌──────────┐   check_out    ┌───────────┐
       ┌─────│  VACANT   │───────────────→│  CLEANING  │
       │     └──────────┘                 └───────────┘
       │           │                            │
       │           │ check_in                   │ set_status('vacant')
       │           ▼                            │
       │     ┌──────────┐                       │
       └─────│ OCCUPIED │←──────────────────────┘
             └──────────┘
```

| Transition | From | To | Permission | Validation | Rollback |
|-----------|------|----|-----------|------------|----------|
| check_in | VACANT | OCCUPIED | reception, manager | Guest details required, room rate set | Check-out reverts to vacant |
| check_out | OCCUPIED | CLEANING | reception, manager | Stay duration computed, bill paid | Re-check-in (complex, manual) |
| set_status('vacant') | CLEANING | VACANT | housekeeping, manager | Cleaning confirmed | Mark as cleaning again |
| set_status('cleaning') | OCCUPIED | CLEANING | reception, manager | Room must be vacated | Manual override only |
| maintenance (future) | Any | MAINTENANCE | manager | Reason required | Maintenance complete → VACANT |

---

## 2. Inventory Item Lifecycle

```
                         ┌──────────────┐
                         │   ACTIVE      │
                         └──────┬───────┘
                                │
                    ┌───────────┼───────────────┐
                    │           │               │
                    ▼           ▼               ▼
              ┌─────────┐ ┌─────────┐   ┌───────────┐
              │ STOCK_IN │ │ STOCK_OUT│  │ WASTAGE   │
              └─────────┘ └─────────┘   └───────────┘
                    │           │               │
                    └───────────┼───────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │   ACTIVE      │
                         └──────┬───────┘
                                │
                          set discontinued
                                │
                                ▼
                         ┌──────────────┐
                         │ DISCONTINUED  │
                         └──────────────┘
```

| Transition | From | To | Permission | Validation | Rollback |
|-----------|------|----|-----------|------------|----------|
| stock_in | ACTIVE | ACTIVE | fnb, manager | qty > 0 | Reverse stock_in |
| stock_out | ACTIVE | ACTIVE | fnb, manager | qty ≤ stock, qty > 0 | Reverse stock_out |
| wastage | ACTIVE | ACTIVE | fnb, manager | qty ≤ stock, qty > 0, reason required | Cannot undo (consumed) |
| discontinue | ACTIVE | DISCONTINUED | owner, manager | Stock = 0 | Re-activate |

---

## 3. Liquor Bottle Lifecycle

```
                         ┌──────────────┐
                         │ FULL BOTTLES  │
                         └──────┬───────┘
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                  │
              ▼                 ▼                  ▼
      ┌────────────┐   ┌────────────┐   ┌──────────────┐
      │ BOTTLE SOLD │   │ BOTTLE     │   │ BOTTLE       │
      │ (full qty)  │   │ OPENED     │   │ PURCHASED    │
      └────────────┘   │ (loose_ml)  │   └──────────────┘
                       └────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ PEG SOLD     │
                       │ (loose_ml--)  │
                       └──────┬───────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
             ┌──────────┐      ┌──────────────┐
             │ AUDIT    │      │ LOOSE_ML = 0 │
             │ CHECK    │      └──────────────┘
             └──────────┘
```

| Transition | From | To | Permission | Validation | Rollback |
|-----------|------|----|-----------|------------|----------|
| purchase | Any | +full_bottles | manager, barstaff | cost_bottle logged | Reverse purchase |
| bottle_sold | full_bottles | full_bottles - 1 | barstaff | full_bottles > 0 | Return bottle (refund) |
| bottle_opened | full_bottles | full_bottles - 1, loose_ml + size_ml | barstaff | full_bottles > 0 | — |
| peg_sold | loose_ml | loose_ml - 60 | barstaff | loose_ml ≥ 60 | Reverse peg (complex) |
| audit | Any | Same | manager, owner, auditor | Physical count verified | Manual correction |

---

## 4. Leave Request Lifecycle

```
          ┌──────────┐
          │  PENDING  │
          └────┬─────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
 ┌──────────┐   ┌──────────┐
 │ APPROVED  │   │ REJECTED  │
 └────┬─────┘   └──────────┘
      │
      ▼
 ┌──────────┐
 │ CONSUMED  │ (leave auto-deducted from balance)
 └──────────┘
```

| Transition | From | To | Permission | Validation | Rollback |
|-----------|------|----|-----------|------------|----------|
| request | New | PENDING | employee (self) | Days > 0, no overlap with existing approved leaves, balance sufficient | Withdraw (set to CANCELLED) |
| approve | PENDING | APPROVED | manager, owner | Reason reviewed, balance check | Reject overrides approval |
| reject | PENDING | REJECTED | manager, owner | Reason for rejection logged | Re-open as pending |

---

## 5. Sales Order Lifecycle

```
           ┌──────────┐
           │  CREATED  │
           └────┬─────┘
                │
       ┌────────┴────────┐
       │                 │
       ▼                 ▼
 ┌──────────┐    ┌──────────┐
 │  ACTIVE   │    │  VOIDED   │ (future)
 └────┬─────┘    └──────────┘
      │
      ▼
 ┌──────────┐
 │ ARCHIVED  │ (age-based)
 └──────────┘
```

| Transition | From | To | Permission | Validation | Rollback |
|-----------|------|----|-----------|------------|----------|
| create | New | CREATED | cashier, manager, fnb, barstaff | total ≥ 0, dept valid | Void (reverse entries) |
| void | CREATED | VOIDED | manager, owner | Reason required, time limit (24h) | Cannot un-void |

---

## 6. Sync Session Lifecycle

```
           ┌──────────────┐
           │  INITIATED    │
           └──────┬───────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
  ┌───────────┐     ┌───────────┐
  │ COMPLETED  │     │  FAILED    │
  └─────┬─────┘     └─────┬─────┘
        │                 │
        │                 │ (retry)
        ▼                 │
  ┌───────────┐           │
  │  IDLE      │◄─────────┘
  └───────────┘
```

| Transition | From | To | Permission | Validation | Rollback |
|-----------|------|----|-----------|------------|----------|
| initiate | IDLE | INITIATED | Any authenticated user | Server reachable, JWT valid | Abort → IDLE |
| complete | INITIATED | COMPLETED | Sync engine | Merged state valid, no conflicts | Restore from backup file |
| fail | INITIATED | FAILED | Sync engine | — | Retry with exponential backoff |
| retry | FAILED | INITIATED | Sync engine | Backoff period elapsed | Escalate after N failures |

---

## 7. Audit Event Lifecycle

```
           ┌──────────┐
           │  CREATED  │ (immutable)
           └──────────┘
                │
                ▼
           ┌──────────┐
           │ ARCHIVED  │ (age-based, 90-day retention for display, permanent in DB)
           └──────────┘
```

| Transition | From | To | Permission | Validation | Rollback |
|-----------|------|----|-----------|------------|----------|
| create | New | CREATED | System | Action required | N/A (immutable) |
| archive | CREATED | ARCHIVED | System | Age > 90 days | Re-index (if needed) |

---

## 8. Employee Lifecycle

```
          ┌──────────┐
          │  HIRED    │
          └────┬─────┘
               │
               ▼
          ┌──────────┐
          │  ACTIVE   │
          └────┬─────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
  ┌──────────┐   ┌──────────┐
  │ ON LEAVE  │   │INACTIVE   │
  └────┬─────┘   └──────────┘
       │
       └─────────┘ (return → ACTIVE)
```

| Transition | From | To | Permission | Validation | Rollback |
|-----------|------|----|-----------|------------|----------|
| hire | New | ACTIVE | owner, manager | Fields required: name, role, salary, phone | Deactivate → INACTIVE |
| update | ACTIVE | ACTIVE | owner, manager | Salary ≥ 0, phone valid | Revert fields |
| terminate | ACTIVE | INACTIVE | owner | Severance processed (future), dues cleared | Re-hire (new record) |
| go_on_leave | ACTIVE | ON_LEAVE | manager | Leave approved in system | Return from leave |
| return | ON_LEAVE | ACTIVE | manager, system | Leave period ended | Mark absent |
