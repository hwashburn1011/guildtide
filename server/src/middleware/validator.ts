// ---------------------------------------------------------------------------
// Input validation middleware — lightweight schema validator
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Schema definition types
// ---------------------------------------------------------------------------

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email';

interface FieldSchema {
  type: FieldType;
  required?: boolean;
  min?: number;        // min length (string) or min value (number)
  max?: number;        // max length (string) or max value (number)
  pattern?: RegExp;
  enum?: readonly string[];
  items?: FieldSchema; // for arrays
  properties?: Record<string, FieldSchema>; // for objects
}

export type ValidationSchema = Record<string, FieldSchema>;

interface ValidationError {
  field: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Validation logic
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(
  fieldName: string,
  value: unknown,
  schema: FieldSchema,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required check
  if (value === undefined || value === null) {
    if (schema.required) {
      errors.push({ field: fieldName, message: `${fieldName} is required` });
    }
    return errors;
  }

  // Type check
  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push({ field: fieldName, message: `${fieldName} must be a string` });
        return errors;
      }
      if (schema.min !== undefined && value.length < schema.min) {
        errors.push({ field: fieldName, message: `${fieldName} must be at least ${schema.min} characters` });
      }
      if (schema.max !== undefined && value.length > schema.max) {
        errors.push({ field: fieldName, message: `${fieldName} must be at most ${schema.max} characters` });
      }
      if (schema.pattern && !schema.pattern.test(value)) {
        errors.push({ field: fieldName, message: `${fieldName} has invalid format` });
      }
      if (schema.enum && !schema.enum.includes(value)) {
        errors.push({ field: fieldName, message: `${fieldName} must be one of: ${schema.enum.join(', ')}` });
      }
      break;

    case 'email':
      if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
        errors.push({ field: fieldName, message: `${fieldName} must be a valid email address` });
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push({ field: fieldName, message: `${fieldName} must be a number` });
        return errors;
      }
      if (schema.min !== undefined && value < schema.min) {
        errors.push({ field: fieldName, message: `${fieldName} must be at least ${schema.min}` });
      }
      if (schema.max !== undefined && value > schema.max) {
        errors.push({ field: fieldName, message: `${fieldName} must be at most ${schema.max}` });
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push({ field: fieldName, message: `${fieldName} must be a boolean` });
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        errors.push({ field: fieldName, message: `${fieldName} must be an array` });
        return errors;
      }
      if (schema.min !== undefined && value.length < schema.min) {
        errors.push({ field: fieldName, message: `${fieldName} must have at least ${schema.min} items` });
      }
      if (schema.max !== undefined && value.length > schema.max) {
        errors.push({ field: fieldName, message: `${fieldName} must have at most ${schema.max} items` });
      }
      if (schema.items) {
        for (let i = 0; i < value.length; i++) {
          errors.push(...validateField(`${fieldName}[${i}]`, value[i], schema.items));
        }
      }
      break;

    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push({ field: fieldName, message: `${fieldName} must be an object` });
        return errors;
      }
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          errors.push(...validateField(`${fieldName}.${key}`, (value as any)[key], propSchema));
        }
      }
      break;
  }

  return errors;
}

function validate(
  data: Record<string, unknown>,
  schema: ValidationSchema,
  rejectUnknown: boolean = false,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate defined fields
  for (const [field, fieldSchema] of Object.entries(schema)) {
    errors.push(...validateField(field, data[field], fieldSchema));
  }

  // Reject unknown fields if requested (T-1684)
  if (rejectUnknown) {
    const knownFields = new Set(Object.keys(schema));
    for (const key of Object.keys(data)) {
      if (!knownFields.has(key)) {
        errors.push({ field: key, message: `Unknown field: ${key}` });
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Validate request body against a schema.
 * @param schema - Field definitions
 * @param rejectUnknown - If true, reject fields not in the schema
 */
export function validateBody(schema: ValidationSchema, rejectUnknown: boolean = false) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors = validate(req.body ?? {}, schema, rejectUnknown);
    if (errors.length > 0) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Request validation failed',
        details: errors,
      });
      return;
    }
    next();
  };
}

/**
 * Validate query parameters.
 */
export function validateQuery(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Coerce query values from strings
    const coerced: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(req.query)) {
      const fieldSchema = schema[key];
      if (fieldSchema?.type === 'number' && typeof value === 'string') {
        coerced[key] = Number(value);
      } else if (fieldSchema?.type === 'boolean' && typeof value === 'string') {
        coerced[key] = value === 'true';
      } else {
        coerced[key] = value;
      }
    }

    const errors = validate(coerced, schema);
    if (errors.length > 0) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Query parameter validation failed',
        details: errors,
      });
      return;
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// Common validation schemas
// ---------------------------------------------------------------------------

export const commonSchemas = {
  login: {
    email: { type: 'email' as const, required: true },
    password: { type: 'string' as const, required: true, min: 8, max: 128 },
  },
  register: {
    email: { type: 'email' as const, required: true },
    username: { type: 'string' as const, required: true, min: 3, max: 30, pattern: /^[a-zA-Z0-9_-]+$/ },
    password: { type: 'string' as const, required: true, min: 8, max: 128 },
  },
  guildName: {
    name: { type: 'string' as const, required: true, min: 3, max: 30 },
  },
  pagination: {
    page: { type: 'number' as const, min: 1 },
    limit: { type: 'number' as const, min: 1, max: 100 },
  },
};
