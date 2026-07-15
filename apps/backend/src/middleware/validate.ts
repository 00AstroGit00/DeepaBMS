import { Request, Response, NextFunction } from 'express';

// ── Error format ────────────────────────────────────────────────────
export interface ValidationFieldError {
  field: string;
  reason: string;
  message: string;
  suggestion?: string;
}

export interface ValidationErrorResponse {
  error: {
    code: string;
    message: string;
    correlationId: string;
    timestamp: string;
    fields: ValidationFieldError[];
  };
}

let correlationCounter = 0;

function correlationId(): string {
  correlationCounter += 1;
  return `vld-${Date.now().toString(36)}-${correlationCounter}`;
}

export function validationErrorResponse(
  fields: ValidationFieldError[],
): ValidationErrorResponse {
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      correlationId: correlationId(),
      timestamp: new Date().toISOString(),
      fields,
    },
  };
}

// ── Rule types ──────────────────────────────────────────────────────
export type RuleType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'integer'
  | 'array'
  | 'object'
  | 'date'
  | 'uuid'
  | 'enum'
  | 'currency'
  | 'percentage'
  | 'any';

export interface ValidationRule {
  field: string;
  type: RuleType;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enumValues?: readonly string[];
  message?: string;
  strip?: boolean; // strip unknown fields (mass assignment protection)
}

export interface SchemaDefinition {
  fields: ValidationRule[];
  allowUnknown?: boolean; // default false — strip unknown fields
  strip?: boolean; // strip unknown fields from body after validation
}

// ── Validation engine ───────────────────────────────────────────────
const UUID_RE = /^[a-z0-9][a-z0-9_-]{2,63}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_RE = /^-?\d+(\.\d{1,2})?$/;

export function validateValue(
  value: unknown,
  rule: ValidationRule,
): ValidationFieldError | null {
  const {
    field,
    type,
    required,
    min,
    max,
    minLength,
    maxLength,
    pattern,
    enumValues,
    message,
  } = rule;

  // Handle undefined / null
  if (value === undefined || value === null) {
    if (required) {
      return {
        field,
        reason: 'required',
        message: message || `${field} is required`,
        suggestion: `Provide a value for ${field}`,
      };
    }
    return null; // optional field, absent is fine
  }

  // Type checking
  switch (type) {
    case 'string': {
      if (typeof value !== 'string') {
        return {
          field,
          reason: 'type',
          message: message || `${field} must be a string`,
          suggestion: `Provide a string value for ${field}`,
        };
      }
      if (minLength !== undefined && (value as string).length < minLength) {
        return {
          field,
          reason: 'minLength',
          message:
            message || `${field} must be at least ${minLength} characters`,
          suggestion: `Provide at least ${minLength} characters`,
        };
      }
      if (maxLength !== undefined && (value as string).length > maxLength) {
        return {
          field,
          reason: 'maxLength',
          message:
            message || `${field} must be at most ${maxLength} characters`,
          suggestion: `Provide at most ${maxLength} characters`,
        };
      }
      if (pattern && !pattern.test(value as string)) {
        return {
          field,
          reason: 'pattern',
          message: message || `${field} has an invalid format`,
          suggestion: `Check the format of ${field}`,
        };
      }
      break;
    }
    case 'number':
    case 'currency': {
      if (
        type === 'currency' &&
        typeof value === 'number' &&
        !CURRENCY_RE.test(String(value))
      ) {
        return {
          field,
          reason: 'format',
          message:
            message ||
            `${field} must be a valid currency amount (up to 2 decimal places)`,
          suggestion: `Provide a valid currency value`,
        };
      }
      if (typeof value !== 'number' || isNaN(value as number)) {
        return {
          field,
          reason: 'type',
          message: message || `${field} must be a number`,
          suggestion: `Provide a numeric value for ${field}`,
        };
      }
      if (min !== undefined && (value as number) < min) {
        return {
          field,
          reason: 'min',
          message: message || `${field} must be at least ${min}`,
          suggestion: `Provide a value >= ${min}`,
        };
      }
      if (max !== undefined && (value as number) > max) {
        return {
          field,
          reason: 'max',
          message: message || `${field} must be at most ${max}`,
          suggestion: `Provide a value <= ${max}`,
        };
      }
      break;
    }
    case 'integer': {
      if (!Number.isInteger(value)) {
        return {
          field,
          reason: 'type',
          message: message || `${field} must be an integer`,
          suggestion: `Provide an integer value for ${field}`,
        };
      }
      if (min !== undefined && (value as number) < min) {
        return {
          field,
          reason: 'min',
          message: message || `${field} must be at least ${min}`,
          suggestion: `Provide a value >= ${min}`,
        };
      }
      if (max !== undefined && (value as number) > max) {
        return {
          field,
          reason: 'max',
          message: message || `${field} must be at most ${max}`,
          suggestion: `Provide a value <= ${max}`,
        };
      }
      break;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        return {
          field,
          reason: 'type',
          message: message || `${field} must be a boolean`,
          suggestion: `Provide true or false for ${field}`,
        };
      }
      break;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        return {
          field,
          reason: 'type',
          message: message || `${field} must be an array`,
          suggestion: `Provide an array for ${field}`,
        };
      }
      if (min !== undefined && (value as any[]).length < min) {
        return {
          field,
          reason: 'min',
          message: message || `${field} must have at least ${min} items`,
          suggestion: `Provide at least ${min} items`,
        };
      }
      if (max !== undefined && (value as any[]).length > max) {
        return {
          field,
          reason: 'max',
          message: message || `${field} must have at most ${max} items`,
          suggestion: `Provide at most ${max} items`,
        };
      }
      break;
    }
    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {
          field,
          reason: 'type',
          message: message || `${field} must be an object`,
          suggestion: `Provide an object for ${field}`,
        };
      }
      break;
    }
    case 'date': {
      if (typeof value !== 'string' || !DATE_RE.test(value as string)) {
        return {
          field,
          reason: 'format',
          message: message || `${field} must be a valid date (YYYY-MM-DD)`,
          suggestion: `Provide a date in YYYY-MM-DD format`,
        };
      }
      const parts = (value as string).split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      if (
        isNaN(d.getTime()) ||
        d.getUTCFullYear() !== year ||
        d.getUTCMonth() !== month ||
        d.getUTCDate() !== day
      ) {
        return {
          field,
          reason: 'invalid',
          message: message || `${field} is not a valid calendar date`,
          suggestion: `Provide a real calendar date`,
        };
      }
      break;
    }
    case 'uuid': {
      if (typeof value !== 'string' || !UUID_RE.test(value as string)) {
        return {
          field,
          reason: 'format',
          message: message || `${field} must be a valid identifier`,
          suggestion: `Provide a valid unique ID`,
        };
      }
      break;
    }
    case 'enum': {
      if (!enumValues || !enumValues.includes(value as string)) {
        return {
          field,
          reason: 'enum',
          message:
            message ||
            `${field} must be one of: ${(enumValues || []).join(', ')}`,
          suggestion: `Choose from: ${(enumValues || []).join(', ')}`,
        };
      }
      break;
    }
    case 'percentage': {
      if (typeof value !== 'number' || isNaN(value as number)) {
        return {
          field,
          reason: 'type',
          message: message || `${field} must be a number`,
          suggestion: `Provide a numeric percentage`,
        };
      }
      if ((value as number) < 0 || (value as number) > 100) {
        return {
          field,
          reason: 'range',
          message: message || `${field} must be between 0 and 100`,
          suggestion: `Provide a value between 0 and 100`,
        };
      }
      break;
    }
    case 'any': {
      break; // any value accepted
    }
  }

  return null;
}

// ── Mass assignment protection ──────────────────────────────────────
export function stripUnknown(
  data: Record<string, unknown>,
  schema: SchemaDefinition,
): Record<string, unknown> {
  const allowed = new Set(schema.fields.map((r) => r.field));
  const cleaned: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (allowed.has(key)) {
      cleaned[key] = data[key];
    }
  }
  return cleaned;
}

// ── Middleware factory ───────────────────────────────────────────────
export function validate(schema: SchemaDefinition) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const body = req.body || {};
    const errors: ValidationFieldError[] = [];

    // Validate each rule
    for (const rule of schema.fields) {
      const err = validateValue(body[rule.field], rule);
      if (err) errors.push(err);
    }

    // Strip unknown fields (mass assignment protection)
    if (!schema.allowUnknown) {
      req.body = stripUnknown(body, schema);
    }

    if (errors.length > 0) {
      res.status(400).json(validationErrorResponse(errors));
      return;
    }

    next();
  };
}

// ── Inline body validation helper (for sync endpoint) ───────────────
export function validateBody(
  body: unknown,
  label: string,
): { ok: true } | { ok: false; response: ValidationErrorResponse } {
  if (body === undefined || body === null) {
    return {
      ok: false,
      response: validationErrorResponse([
        {
          field: label,
          reason: 'required',
          message: `${label} is required`,
          suggestion: `Provide ${label} in request body`,
        },
      ]),
    };
  }
  return { ok: true };
}

// ── Schema definitions ──────────────────────────────────────────────
export const DEPARTMENTS = [
  'restaurant',
  'bar',
  'rooms',
  'takeaway',
  'online',
] as const;
export const PAYMENT_MODES = [
  'cash',
  'card',
  'upi',
  'credit',
  'online',
] as const;

export const LOGIN_SCHEMA: SchemaDefinition = {
  fields: [
    {
      field: 'pin',
      type: 'string',
      required: true,
      minLength: 4,
      maxLength: 10,
      message: 'PIN must be 4-10 characters',
    },
  ],
  allowUnknown: false,
};

export const CREATE_SALE_SCHEMA: SchemaDefinition = {
  fields: [
    { field: 'id', type: 'uuid', required: true },
    { field: 'date', type: 'date', required: true },
    { field: 'dept', type: 'enum', required: true, enumValues: DEPARTMENTS },
    {
      field: 'description',
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 500,
    },
    {
      field: 'amount',
      type: 'currency',
      required: true,
      min: 0,
      max: 9_999_999,
    },
    { field: 'gstRate', type: 'percentage', required: true },
    {
      field: 'gstAmount',
      type: 'currency',
      required: true,
      min: 0,
      max: 9_999_999,
    },
    {
      field: 'total',
      type: 'currency',
      required: true,
      min: 0,
      max: 99_999_999,
    },
    { field: 'mode', type: 'enum', required: true, enumValues: PAYMENT_MODES },
    { field: 'billNo', type: 'string', required: false, maxLength: 50 },
  ],
  allowUnknown: false,
};

export const SYNC_COLLECTIONS = [
  'users',
  'auditLog',
  'sales',
  'txns',
  'bankMoves',
  'bankStatements',
  'rooms',
  'stays',
  'inventory',
  'stockMoves',
  'liquor',
  'liquorAudits',
  'credits',
  'employees',
  'leaves',
  'announcements',
  'banks',
  'settings',
] as const;

export const SYNC_SCHEMA: SchemaDefinition = {
  fields: [
    {
      field: 'state',
      type: 'object',
      required: true,
      message: 'Sync state object is required',
    },
  ],
  allowUnknown: true, // sync state has many sub-objects validated at runtime
};
