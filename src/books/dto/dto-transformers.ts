import { BookFormatType } from '@prisma/client';
import type { TransformFnParams } from 'class-transformer';
export {
  toOptionalNumber,
  trimString,
} from '../../common/utils/dto-transformers';

export const toOptionalBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return value;
};

export const toBookFormatType = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim().toUpperCase();

  if (normalizedValue === 'PHYSICAL') {
    return BookFormatType.Physical;
  }

  if (normalizedValue === 'DIGITAL') {
    return BookFormatType.Digital;
  }

  if (normalizedValue === 'AUDIO') {
    return BookFormatType.Audio;
  }

  return value;
};
