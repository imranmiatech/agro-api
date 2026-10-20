import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.CLOUD_API_KEY,
      api_secret: process.env.CLOUD_API_SECRET,
    });
  }

  /**
   * Uploads a single image buffer directly to Cloudinary.
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'agro/products',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(
              new BadRequestException(
                `Cloudinary upload failed: ${error?.message || 'Unknown error'}`,
              ),
            );
          }
          resolve(result.secure_url);
        },
      );

      const stream = Readable.from(file.buffer);
      stream.pipe(uploadStream);
    });
  }

  /**
   * Uploads multiple image buffers up to maxImages (default 4).
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'agro/products',
    maxImages: number = 4,
  ): Promise<string[]> {
    if (!files || files.length === 0) return [];
    if (files.length > maxImages) {
      throw new BadRequestException(
        `Maximum ${maxImages} images are allowed for a product. Received ${files.length}.`,
      );
    }

    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }
}
