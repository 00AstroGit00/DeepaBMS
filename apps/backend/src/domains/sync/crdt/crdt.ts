export class VectorClock {
  private clock: Map<string, number>;

  constructor(clock?: Record<string, number> | Map<string, number>) {
    this.clock = new Map();
    if (clock) {
      const entries = clock instanceof Map ? clock.entries() : Object.entries(clock);
      for (const [replicaId, seq] of entries) {
        this.clock.set(replicaId, seq);
      }
    }
  }

  get(replicaId: string): number {
    return this.clock.get(replicaId) || 0;
  }

  set(replicaId: string, seq: number): void {
    this.clock.set(replicaId, seq);
  }

  increment(replicaId: string): void {
    this.set(replicaId, this.get(replicaId) + 1);
  }

  merge(other: VectorClock): void {
    for (const replicaId of other.keys()) {
      const current = this.get(replicaId);
      const incoming = other.get(replicaId);
      if (incoming > current) {
        this.set(replicaId, incoming);
      }
    }
  }

  keys(): string[] {
    return Array.from(this.clock.keys());
  }

  compare(other: VectorClock): 'concurrent' | 'equal' | 'greater' | 'less' {
    let greater = false;
    let less = false;

    const allReplicas = new Set([...this.keys(), ...other.keys()]);
    for (const replicaId of allReplicas) {
      const seq1 = this.get(replicaId);
      const seq2 = other.get(replicaId);
      if (seq1 > seq2) {
        greater = true;
      } else if (seq1 < seq2) {
        less = true;
      }
    }

    if (greater && less) {
      return 'concurrent';
    }
    if (greater) {
      return 'greater';
    }
    if (less) {
      return 'less';
    }
    return 'equal';
  }

  toJSON(): Record<string, number> {
    const obj: Record<string, number> = {};
    for (const [replicaId, seq] of this.clock.entries()) {
      obj[replicaId] = seq;
    }
    return obj;
  }

  static fromJSON(json: Record<string, number> | string | undefined): VectorClock {
    if (!json) return new VectorClock();
    if (typeof json === 'string') {
      try {
        return new VectorClock(JSON.parse(json));
      } catch {
        return new VectorClock();
      }
    }
    return new VectorClock(json);
  }
}

export interface LWWValue<T> {
  value: T;
  timestamp: number;
  vectorClock: Record<string, number>;
}

export class LWWRegisterMap<T = any> {
  private registers: Map<string, LWWValue<T>>;

  constructor(registers?: Record<string, LWWValue<T>>) {
    this.registers = new Map();
    if (registers) {
      for (const [key, val] of Object.entries(registers)) {
        this.registers.set(key, val);
      }
    }
  }

  get(key: string): T | undefined {
    return this.registers.get(key)?.value;
  }

  set(key: string, value: T, vectorClock: VectorClock, timestamp = Date.now()): void {
    this.registers.set(key, {
      value,
      timestamp,
      vectorClock: vectorClock.toJSON(),
    });
  }

  merge(other: LWWRegisterMap<T>): void {
    for (const key of other.keys()) {
      const current = this.registers.get(key);
      const incoming = other.getRegister(key)!;

      if (!current) {
        this.registers.set(key, incoming);
        continue;
      }

      const clock1 = VectorClock.fromJSON(current.vectorClock);
      const clock2 = VectorClock.fromJSON(incoming.vectorClock);
      const cmp = clock1.compare(clock2);

      if (cmp === 'less') {
        this.registers.set(key, incoming);
      } else if (cmp === 'concurrent') {
        // Tie-breaker: physical timestamp comparison
        if (incoming.timestamp > current.timestamp) {
          this.registers.set(key, incoming);
        } else if (incoming.timestamp === current.timestamp) {
          // Tie-breaker: lexical value ordering
          if (JSON.stringify(incoming.value) > JSON.stringify(current.value)) {
            this.registers.set(key, incoming);
          }
        }
      }
    }
  }

  keys(): string[] {
    return Array.from(this.registers.keys());
  }

  getRegister(key: string): LWWValue<T> | undefined {
    return this.registers.get(key);
  }

  toJSON(): Record<string, LWWValue<T>> {
    const obj: Record<string, LWWValue<T>> = {};
    for (const [key, reg] of this.registers.entries()) {
      obj[key] = reg;
    }
    return obj;
  }

  toValueObject(): Record<string, T> {
    const obj: Record<string, T> = {};
    for (const [key, reg] of this.registers.entries()) {
      obj[key] = reg.value;
    }
    return obj;
  }

  static fromJSON(json: Record<string, LWWValue<any>> | string | undefined): LWWRegisterMap {
    if (!json) return new LWWRegisterMap();
    if (typeof json === 'string') {
      try {
        return new LWWRegisterMap(JSON.parse(json));
      } catch {
        return new LWWRegisterMap();
      }
    }
    return new LWWRegisterMap(json);
  }
}

export class PNCounter {
  private p: Map<string, number>;
  private n: Map<string, number>;

  constructor(p?: Record<string, number>, n?: Record<string, number>) {
    this.p = new Map();
    this.n = new Map();

    if (p) {
      for (const [repId, val] of Object.entries(p)) this.p.set(repId, val);
    }
    if (n) {
      for (const [repId, val] of Object.entries(n)) this.n.set(repId, val);
    }
  }

  value(): number {
    let sumP = 0;
    let sumN = 0;
    for (const val of this.p.values()) sumP += val;
    for (const val of this.n.values()) sumN += val;
    return sumP - sumN;
  }

  increment(replicaId: string, val = 1): void {
    if (val < 0) {
      this.decrement(replicaId, -val);
      return;
    }
    const current = this.p.get(replicaId) || 0;
    this.p.set(replicaId, current + val);
  }

  decrement(replicaId: string, val = 1): void {
    if (val < 0) {
      this.increment(replicaId, -val);
      return;
    }
    const current = this.n.get(replicaId) || 0;
    this.n.set(replicaId, current + val);
  }

  merge(other: PNCounter): void {
    const allReplicas = new Set([...this.p.keys(), ...this.n.keys(), ...other.p.keys(), ...other.n.keys()]);
    for (const replicaId of allReplicas) {
      const p1 = this.p.get(replicaId) || 0;
      const p2 = other.p.get(replicaId) || 0;
      this.p.set(replicaId, Math.max(p1, p2));

      const n1 = this.n.get(replicaId) || 0;
      const n2 = other.n.get(replicaId) || 0;
      this.n.set(replicaId, Math.max(n1, n2));
    }
  }

  toJSON(): { p: Record<string, number>; n: Record<string, number> } {
    const pObj: Record<string, number> = {};
    const nObj: Record<string, number> = {};
    for (const [repId, val] of this.p.entries()) pObj[repId] = val;
    for (const [repId, val] of this.n.entries()) nObj[repId] = val;
    return { p: pObj, n: nObj };
  }

  static fromJSON(json: { p: Record<string, number>; n: Record<string, number> } | string | undefined): PNCounter {
    if (!json) return new PNCounter();
    if (typeof json === 'string') {
      try {
        const parsed = JSON.parse(json);
        return new PNCounter(parsed.p, parsed.n);
      } catch {
        return new PNCounter();
      }
    }
    return new PNCounter(json.p, json.n);
  }
}
