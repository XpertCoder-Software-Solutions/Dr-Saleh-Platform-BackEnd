import type { TransformFnParams } from 'class-transformer';

export const trimString = ({ value }: TransformFnParams): unknown => {
  return typeof value === 'string' ? value.trim() : value;
};

export const trimOptionalString = ({ value }: TransformFnParams): unknown => {
  const trimmedValue = trimString({ value } as TransformFnParams);

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
