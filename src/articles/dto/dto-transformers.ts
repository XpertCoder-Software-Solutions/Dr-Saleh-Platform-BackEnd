import type { TransformFnParams } from 'class-transformer';

export const trimString = ({ value }: TransformFnParams): unknown => {
  const rawValue: unknown = value;

  return typeof rawValue === 'string' ? rawValue.trim() : rawValue;
};

export const trimOptionalString = ({ value }: TransformFnParams): unknown => {
  const rawValue = trimString({ value } as TransformFnParams);

  return rawValue === '' ? undefined : rawValue;
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

    if (['true', '1', 'yes'].includes(normalizedValue)) {
      return true;
    }

    if (['false', '0', 'no'].includes(normalizedValue)) {
      return false;
    }
  }

  return value;
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

  const values = normalizeArrayValue(value);

  return values.length === 0 ? undefined : values;
};

function normalizeArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeArrayValue(item));
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
