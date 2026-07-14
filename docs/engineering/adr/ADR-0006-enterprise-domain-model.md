> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# ADR-0006: Enterprise Domain Model

## Status
Accepted (2026-07-13).

## Context
The application had grown organically with types, reducers, and routes organized by convenience rather than domain boundaries. As P3 business features (payroll, GST, excise, purchasing) approach, a shared domain language and consistent architectural pattern are needed to prevent fragmentation.

Without an explicit domain model:
- New features duplicate business rules
- Transaction boundaries are unclear
- Testing gaps go unnoticed
- Onboarding new developers is slow

## Decision
Create a complete enterprise domain model for DeepaBMS, documented as the architectural source of truth for all future module development.

### Architectural Principles

| Principle | Description |
|-----------|-------------|
| **Domain-Driven** | Every module maps to a business domain (not a technical layer) |
| **Aggregate Boundaries** | Each aggregate root defines a consistency boundary |
| **Event-Driven** | State changes publish events; side effects are event-driven |
| **Repository Abstraction** | Persistence behind interfaces; business logic never sees SQL |
| **Offline-First** | Local state is authoritative; server is the merge base |
| **Last-Writer-Wins** | Conflict resolution by timestamp (acceptable for SMB scale) |
| **Idempotency** | Every operation can be safely retried |
| **Audit Trail** | Every state change is recorded; immutability where practical |

### Domain Boundaries
13 aggregates identified across 4 tiers:

| Tier | Domains | Characteristic |
|------|---------|---------------|
| Core Operations | Restaurant, Bar, Hotel, Kitchen, POS | Revenue-generating, real-time |
| Back Office | Inventory, Purchasing, Credits, Banking | Support operations, batch-oriented |
| HR & Compliance | Employees, Payroll, GST, Excise | Periodic, regulatory |
| Infrastructure | Auth, Configuration, Sync, Audit | Cross-cutting, foundational |

### Aggregate Strategy
- **Small aggregates**: Sales, DayBook, Audit (single entity) — simple CRUD
- **Medium aggregates**: Hotel, Inventory, Liquor, Banking, Credit (entity + child FK) — coordinated writes
- **Large aggregate**: Employee (entity + 5 sub-entities) — largest consistency boundary
- No aggregate spans more than one table family (no distributed joins across aggregates)

### Event Strategy
- **Gen 1 (current)**: Synchronous dispatch via reducer — immediate consistency within aggregate
- **Gen 2 (near-term)**: In-process event bus — eventual consistency across aggregates
- **Gen 3 (future)**: Message queue (Kafka/RabbitMQ) — reliable delivery, replay, multi-process

### Repository Strategy
- Every aggregate root has a repository interface
- Read operations return domain types; never raw rows
- Reporting/queries are separated from write commands
- Cross-aggregate reads (reports) use dedicated read-model repositories

## Architecture

### Layer Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│                 React Native Screens + Components             │
├─────────────────────────────────────────────────────────────┤
│                     APPLICATION LAYER                         │
│                State Management (reducers + dispatch)          │
├─────────────────────────────────────────────────────────────┤
│                     DOMAIN LAYER                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │Aggregates│  │ Services │  │ Events   │  │ Repositories  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────┬───────┘  │
├────────────────────────────────────────────────────┼─────────┤
│                  INFRASTRUCTURE LAYER               │         │
│               ┌────────────────────────┐           │         │
│               │  AsyncStorage / SQLite  │◄──────────┘         │
│               │  Express REST API       │                    │
│               │  File System (sync)     │                    │
│               └────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Repository Contract Pattern
```typescript
// Every domain follows this interface pattern
interface I<Name>Repository {
  // Reads
  findById(id: string): Promise<Entity | null>;
  findAll(options?: QueryOptions): Promise<Entity[]>;
  
  // Writes
  create(dto: CreateDto): Promise<Entity>;
  update(id: string, changes: Partial<Entity>): Promise<Entity>;
  
  // Domain-specific
  <domainMethod>(...args): Promise<Result>;
}
```

## Trade-offs

### Pros
- **Shared vocabulary**: Developer, owner, and compliance auditor refer to same entities
- **Future-proof**: 13 aggregates + 12 services cover 90%+ of expected P3-P5 features
- **Testing clarity**: Every aggregate boundary is a testing boundary
- **Migration path**: Gen 1→Gen 2→Gen 3 event model is explicitly scoped
- **Compliance-ready**: Excise and GST entities documented before features are built

### Cons
- **Overhead for simple features**: Announcements and small entities follow full modeling process
- **Rigid during P3**: Early P3 features may reveal missing entities, requiring ADR amendments
- **Repository contract adoption**: Existing code uses direct SQL in route handlers — migration requires discipline
- **No code generation**: Contracts are documented but not enforceable by TypeScript compiler (interfaces exist in docs, not code)

## Migration Path
1. P3-1: Implement Inventory Domain Engine following repository contract pattern
2. P3-2: Implement Payroll domain using the defined Employee aggregate
3. P3-3: GST calculator service + GSTR-1 export
4. P3-4: Kerala Excise domain + compliance reporting
5. P3-5: Refactor existing route handlers to use repository pattern
6. P3-6: Implement Gen 2 event bus

## Rollback
Revert to pre-P3-0 state by removing `docs/engineering/domain-model/` directory. No code changes were made during this milestone — only documentation.

## Future Evolution
- **Gen 3 event bus**: When multi-instance deployment is needed (PostgreSQL + horizontal scaling)
- **CQRS**: If reporting queries become bottleneck, separate read/write models
- **Microservices**: Once aggregates are well-bounded, extract high-traffic domains (Sales, Sync) into separate services
- **CRDTs**: If multi-device conflict resolution becomes problematic, migrate from LWW to CRDT-based sync
