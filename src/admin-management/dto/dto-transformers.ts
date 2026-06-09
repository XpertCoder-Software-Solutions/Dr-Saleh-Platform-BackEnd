import type { TransformFnParams } from 'class-transformer';

export const trimString = ({ value }: TransformFnParams): unknown => {
  const rawValue: unknown = value;

  return typeof rawValue === 'string' ? rawValue.trim() : rawValue;
};

export const normalizeEmail = ({ value }: TransformFnParams): unknown => {
  const rawValue: unknown = value;

  return typeof rawValue === 'string'
    ? rawValue.trim().toLowerCase()
    : rawValue;
};

export const trimOptionalString = ({ value }: TransformFnParams): unknown => {
  const rawValue = trimString({ value } as TransformFnParams);

  return rawValue === '' ? undefined : rawValue;
};

export const toOptionalBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (value === null) {
    return null;
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
