import type { TransformFnParams } from 'class-transformer';

const TRUE_VALUES = new Set(['true', '1', 'yes']);
const FALSE_VALUES = new Set(['false', '0', 'no']);

export const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const normalizeEmail = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export const toUppercaseString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export const trimOptionalString = (params: TransformFnParams): unknown => {
  const trimmedValue = trimString(params);

  return trimmedValue === '' ? undefined : trimmedValue;
};

export const toOptionalBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (TRUE_VALUES.has(normalizedValue)) {
      return true;
    }

    if (FALSE_VALUES.has(normalizedValue)) {
      return false;
    }
  }

  return value;
};

export const toOptionalBooleanStrict = ({
  value,
}: TransformFnParams): unknown => {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return toOptionalBoolean({ value } as TransformFnParams);
};

export const toOptionalNumber = ({ value }: TransformFnParams): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
};

export const toOptionalStringArray = ({
  value,
}: TransformFnParams): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const values = normalizeStringArrayValue(value);

  return values.length === 0 ? undefined : values;
};

function normalizeStringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeStringArrayValue(item));
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmedValue = value.trim();

  if (trimmedValue === '') {
    return [];
  }

  if (trimmedValue.startsWith('[')) {
    try {
      const parsedValue: unknown = JSON.parse(trimmedValue);

      if (Array.isArray(parsedValue)) {
        return parsedValue
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      return [trimmedValue];
    }
  }

  if (trimmedValue.includes(',')) {
    return trimmedValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [trimmedValue];
}
