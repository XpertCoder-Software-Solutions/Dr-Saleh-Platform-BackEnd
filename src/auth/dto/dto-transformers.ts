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

export const normalizeReferralCode = ({
  value,
}: TransformFnParams): unknown => {
  const rawValue: unknown = value;

  return typeof rawValue === 'string'
    ? rawValue.trim().toUpperCase()
    : rawValue;
};
