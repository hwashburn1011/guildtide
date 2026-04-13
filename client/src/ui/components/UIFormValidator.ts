/**
 * Utility class for form field validation.
 * validate({field, rules}) where rules = {required, minLength, maxLength, pattern, custom}.
 * Returns {valid, message}.
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  custom?: (value: string) => string | null;
}

export interface ValidationRequest {
  field: string;
  value: string;
  rules: ValidationRule;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
}

export class UIFormValidator {
  /**
   * Validate a single field against its rules.
   */
  static validate(request: ValidationRequest): ValidationResult {
    const { field, value, rules } = request;

    if (rules.required && (!value || value.trim().length === 0)) {
      return { valid: false, message: `${field} is required` };
    }

    if (rules.minLength !== undefined && value.length < rules.minLength) {
      return { valid: false, message: `${field} must be at least ${rules.minLength} characters` };
    }

    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      return { valid: false, message: `${field} must be at most ${rules.maxLength} characters` };
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return { valid: false, message: rules.patternMessage ?? `${field} format is invalid` };
    }

    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        return { valid: false, message: customError };
      }
    }

    return { valid: true, message: '' };
  }

  /**
   * Validate multiple fields at once.
   * Returns an array of results, one per request.
   */
  static validateAll(requests: ValidationRequest[]): ValidationResult[] {
    return requests.map((r) => UIFormValidator.validate(r));
  }

  /**
   * Validate multiple fields and return true only if all pass.
   */
  static isAllValid(requests: ValidationRequest[]): boolean {
    return requests.every((r) => UIFormValidator.validate(r).valid);
  }
}
