import mongoose from 'mongoose';
import { AppError } from './app-error.js';

export function assertValidObjectId(id: string | string[], name = 'id'): void {
  const value = Array.isArray(id) ? id[0] : id;
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(400, `invalid_${name}`, `Invalid ${name} format.`);
  }
}
