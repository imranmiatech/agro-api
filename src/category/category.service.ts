import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Create a new Category.
   * Uploads category image to Cloudinary if a file is uploaded,
   * generates slug if not provided, and saves to database.
   */
  async create(dto: CreateCategoryDto, file?: Express.Multer.File) {
    const trimmedName = dto.name.trim();

    // Check if category name already exists
    const existing = await this.prisma.category.findUnique({
      where: { name: trimmedName },
    });
    if (existing) {
      throw new ConflictException(`Category "${trimmedName}" already exists.`);
    }

    // Auto-generate slug
    const slug = (
      dto.slug?.trim() ||
      trimmedName
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    );

    // Check slug collision
    const existingSlug = await this.prisma.category.findUnique({
      where: { slug },
    });
    const finalSlug = existingSlug ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

    // Handle image upload
    let imageUrl: string | null = null;
    if (file) {
      imageUrl = await this.cloudinaryService.uploadImage(file, 'agro/categories');
    } else if (typeof dto.image === 'string' && dto.image.trim()) {
      imageUrl = dto.image.trim();
    }

    const category = await this.prisma.category.create({
      data: {
        name: trimmedName,
        slug: finalSlug,
        image: imageUrl,
        description: dto.description?.trim() || null,
      },
    });

    return {
      ...category,
      totalProducts: 0,
    };
  }

  /**
   * Get all categories with real dynamic total product counts.
   */
  async findAll(includeCount = true) {
    const categories = await this.prisma.category.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (!includeCount) {
      return categories.map((c) => ({ ...c, totalProducts: 0 }));
    }

    // Calculate real dynamic product counts grouped by category name
    const groupedCounts = await this.prisma.product.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    const countMap = new Map<string, number>();
    groupedCounts.forEach((item) => {
      if (item.category) {
        countMap.set(item.category.toLowerCase().trim(), item._count.id);
      }
    });

    return categories.map((cat) => ({
      ...cat,
      totalProducts: countMap.get(cat.name.toLowerCase().trim()) || 0,
    }));
  }

  /**
   * Get single category with totalProducts.
   */
  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }

    const productCount = await this.prisma.product.count({
      where: { category: category.name },
    });

    return {
      ...category,
      totalProducts: productCount,
    };
  }

  /**
   * Delete category by ID.
   */
  async remove(id: string) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { id, name: existing.name };
  }
}