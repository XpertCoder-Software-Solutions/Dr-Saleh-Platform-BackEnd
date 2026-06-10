import { ConsultationGender } from '@prisma/client';
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

export const toConsultationGender = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'male') {
    return ConsultationGender.Male;
  }

  if (normalizedValue === 'female') {
    return ConsultationGender.Female;
  }

  return value;
};
