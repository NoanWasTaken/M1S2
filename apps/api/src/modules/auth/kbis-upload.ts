import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../../utils/app-error.js';
import { ensureKbisDir, KBIS_DIR, KBIS_MAX_BYTES } from '../../utils/kbis-storage.js';

ensureKbisDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureKbisDir();
    cb(null, KBIS_DIR);
  },
  filename: (_req, _file, cb) => {
    cb(null, `${crypto.randomUUID()}.pdf`);
  },
});

function pdfFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfName = file.originalname.toLowerCase().endsWith('.pdf');
  if (!isPdfMime || !isPdfName) {
    cb(new AppError(400, 'invalid_file_type', 'Only PDF files are allowed.'));
    return;
  }
  cb(null, true);
}

export const kbisUpload = multer({
  storage,
  limits: { fileSize: KBIS_MAX_BYTES, files: 1 },
  fileFilter: pdfFileFilter,
}).single('kbis');

export function handleKbisUploadErrors(
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(400, 'file_too_large', 'KBIS file must be 10MB or less.'));
      return;
    }
    next(new AppError(400, 'upload_error', err.message));
    return;
  }
  if (err instanceof AppError) {
    next(err);
    return;
  }
  next(err);
}

export function assertPdfMagic(filePath: string): void {
  const resolved = path.resolve(filePath);
  const fd = fs.openSync(resolved, 'r');
  try {
    const buf = Buffer.alloc(5);
    fs.readSync(fd, buf, 0, 5, 0);
    if (buf.toString('utf8') !== '%PDF-') {
      fs.unlinkSync(resolved);
      throw new AppError(400, 'invalid_file_type', 'Only PDF files are allowed.');
    }
  } finally {
    fs.closeSync(fd);
  }
}
