import { validateValue, ValidationRule } from '../src/middleware/validate';

describe('Validation Engine', () => {
  describe('string type', () => {
    const rule: ValidationRule = {
      field: 'name',
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 100,
    };

    it('accepts valid string', () => {
      expect(validateValue('John', rule)).toBeNull();
    });

    it('rejects missing required field', () => {
      const err = validateValue(undefined, rule);
      expect(err?.reason).toBe('required');
    });

    it('rejects non-string', () => {
      const err = validateValue(123, rule);
      expect(err?.reason).toBe('type');
    });

    it('rejects too short', () => {
      const err = validateValue('A', rule);
      expect(err?.reason).toBe('minLength');
    });

    it('rejects too long', () => {
      const err = validateValue('A'.repeat(101), rule);
      expect(err?.reason).toBe('maxLength');
    });
  });

  describe('number type', () => {
    const rule: ValidationRule = {
      field: 'amount',
      type: 'number',
      required: true,
      min: 0,
      max: 1000,
    };

    it('accepts valid number', () => {
      expect(validateValue(500, rule)).toBeNull();
    });

    it('rejects NaN', () => {
      const err = validateValue(NaN, rule);
      expect(err?.reason).toBe('type');
    });

    it('rejects negative number', () => {
      const err = validateValue(-1, rule);
      expect(err?.reason).toBe('min');
    });

    it('rejects overflow', () => {
      const err = validateValue(1001, rule);
      expect(err?.reason).toBe('max');
    });
  });

  describe('integer type', () => {
    const rule: ValidationRule = {
      field: 'count',
      type: 'integer',
      required: true,
    };

    it('accepts integer', () => {
      expect(validateValue(42, rule)).toBeNull();
    });

    it('rejects float', () => {
      const err = validateValue(42.5, rule);
      expect(err?.reason).toBe('type');
    });
  });

  describe('date type', () => {
    const rule: ValidationRule = {
      field: 'date',
      type: 'date',
      required: true,
    };

    it('accepts valid date string YYYY-MM-DD', () => {
      expect(validateValue('2026-07-13', rule)).toBeNull();
    });

    it('rejects invalid format', () => {
      const err = validateValue('13-07-2026', rule);
      expect(err?.reason).toBe('format');
    });

    it('rejects non-existent date', () => {
      const err = validateValue('2026-02-30', rule);
      expect(err?.reason).toBe('invalid');
    });
  });

  describe('enum type', () => {
    const rule: ValidationRule = {
      field: 'dept',
      type: 'enum',
      required: true,
      enumValues: ['restaurant', 'bar', 'rooms'] as const,
    };

    it('accepts valid enum value', () => {
      expect(validateValue('bar', rule)).toBeNull();
    });

    it('rejects invalid enum value', () => {
      const err = validateValue('kitchen', rule);
      expect(err?.reason).toBe('enum');
    });
  });

  describe('percentage type', () => {
    const rule: ValidationRule = {
      field: 'rate',
      type: 'percentage',
      required: true,
    };

    it('accepts valid percentage', () => {
      expect(validateValue(18, rule)).toBeNull();
    });

    it('rejects negative percentage', () => {
      const err = validateValue(-5, rule);
      expect(err?.reason).toBe('range');
    });

    it('rejects >100 percentage', () => {
      const err = validateValue(101, rule);
      expect(err?.reason).toBe('range');
    });
  });

  describe('currency type', () => {
    const rule: ValidationRule = {
      field: 'amount',
      type: 'currency',
      required: true,
      min: 0,
      max: 10000,
    };

    it('accepts valid currency', () => {
      expect(validateValue(1500.5, rule)).toBeNull();
    });

    it('rejects negative', () => {
      const err = validateValue(-100, rule);
      expect(err?.reason).toBe('min');
    });
  });

  describe('uuid type', () => {
    const rule: ValidationRule = { field: 'id', type: 'uuid', required: true };

    it('accepts valid ID', () => {
      expect(validateValue('sale-abc123', rule)).toBeNull();
    });

    it('rejects empty string', () => {
      const err = validateValue('', rule);
      expect(err?.reason).toBe('format');
    });
  });

  describe('optional field', () => {
    const rule: ValidationRule = {
      field: 'note',
      type: 'string',
      required: false,
    };

    it('accepts undefined optional field', () => {
      expect(validateValue(undefined, rule)).toBeNull();
    });

    it('still validates type when present', () => {
      const err = validateValue(123, rule);
      expect(err?.reason).toBe('type');
    });
  });

  describe('mass assignment protection', () => {
    const { stripUnknown, validate } = require('../src/middleware/validate');

    it('strips unknown fields from body', () => {
      const schema = {
        fields: [{ field: 'name', type: 'string', required: true }],
        allowUnknown: false,
      };
      const body = { name: 'John', isAdmin: true, secret: 'hack' };
      const req = { body };
      const res = { status: () => ({ json: () => {} }) };

      // The validate middleware strips unknown and calls next if valid
      // We test the strip function directly
      const stripped = stripUnknown(body, schema);
      expect(stripped).toEqual({ name: 'John' });
      expect(stripped.isAdmin).toBeUndefined();
    });
  });
});
