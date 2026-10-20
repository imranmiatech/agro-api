import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

export function createLogoStorage(subfolder: string = 'logos') {
  return diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = `./uploads/${subfolder}`;
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      cb(null, `${subfolder}-${uniqueSuffix}${ext}`);
    },
  });
}

export function imageFileFilter(req: any, file: Express.Multer.File, cb: any) {
  if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|svg\+xml)$/i)) {
    return cb(
      new BadRequestException(
        'Only image files (jpg, jpeg, png, webp, svg) are allowed!',
      ),
      false,
    );
  }
  cb(null, true);
}
