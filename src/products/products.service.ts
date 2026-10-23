import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service.js';
import { ProductStatus, Role } from '../generated/prisma/enums.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateProductStatusDto } from './dto/update-product-status.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import {
  ProductMetricsResponseDto,
  ProductMetricCardDto,
} from './dto/product-metrics.dto.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * 1. Create a new Agriculture Product.
   * Uploads up to 4 images to Cloudinary, auto-generates slug and SKU if omitted,
   * and associates with the authenticated Admin or Vendor.
   */
  async createProduct(
    user: AuthenticatedUser,
    dto: CreateProductDto,
    files?: Express.Multer.File[],
  ) {
    // Check permissions and resolve vendor profile safely (handles vendorProfile.id, user.id, and empty/unassigned)
    const vendorId = await this.resolveVendorIdForProduct(user, dto.vendorId);

    // Handle Cloudinary Image Uploads (Max 4 images)
    let uploadedUrls: string[] = [];
    if (files && files.length > 0) {
      if (files.length > 4) {
        throw new BadRequestException('A product can have a maximum of 4 images.');
      }
      uploadedUrls = await this.cloudinaryService.uploadMultipleImages(
        files,
        'agro/products',
        4,
      );
    }

    // Combine any pre-existing URLs with newly uploaded Cloudinary URLs
    const initialImages = Array.isArray(dto.images) ? dto.images : [];
    const allImages = [...initialImages, ...uploadedUrls].slice(0, 4);

    // Auto-generate unique slug
    const baseSlug = (dto.slug || dto.name)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const slug = await this.generateUniqueSlug(baseSlug);

    // Auto-generate SKU if not provided
    const sku = dto.sku?.trim().toUpperCase() || this.generateSku(dto.category, dto.name);

    const thumbnail = dto.thumbnail || allImages[0] || null;

    const product = await this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        slug,
        sku,
        category: dto.category.trim(),
        price: Number(dto.price),
        compareAtPrice: dto.compareAtPrice !== undefined ? Number(dto.compareAtPrice) : null,
        deliveryCharge: dto.deliveryCharge !== undefined ? Number(dto.deliveryCharge) : 0,
        stock: dto.stock !== undefined ? Number(dto.stock) : 0,
        status: dto.status || ProductStatus.ACTIVE,
        summary: dto.summary?.trim() || null,
        description: dto.description?.trim() || null,
        highlights: Array.isArray(dto.highlights) ? dto.highlights : [],
        badges: Array.isArray(dto.badges) ? dto.badges : [],
        images: allImages,
        thumbnail,
        specifications: dto.specifications ?? undefined,
        vendorId,
        createdById: user.id,
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            logo: true,
            category: true,
            city: true,
            country: true,
          },
        },
      },
    });

    return product;
  }

  /**
   * 2. List Products with search, filtering, and sorting.
   * - When authenticated as Admin: returns total products across all vendors (with creator details).
   * - When authenticated as Vendor: strictly scoped to only their own products.
   * - When unauthenticated/Customer: returns catalog products (with optional vendorId filter).
   */
  async findAllProducts(
    query: QueryProductDto,
    user?: AuthenticatedUser | null,
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    // 1. Role-aware filtering:
    if (user?.role === Role.VENDOR) {
      const vendorProfile = await this.prisma.vendorProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (vendorProfile?.id) {
        where.OR = [{ vendorId: vendorProfile.id }, { createdById: user.id }];
      } else {
        where.createdById = user.id;
      }
    } else if (query.vendorId?.trim()) {
      const trimmedVendorId = query.vendorId.trim();
      const profile = await this.prisma.vendorProfile.findFirst({
        where: {
          OR: [{ id: trimmedVendorId }, { userId: trimmedVendorId }],
        },
        select: { id: true },
      });

      where.vendorId = profile ? profile.id : trimmedVendorId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.category?.trim()) {
      where.category = {
        equals: query.category.trim(),
        mode: 'insensitive',
      };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) {
        where.price.gte = Number(query.minPrice);
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = Number(query.maxPrice);
      }
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      const searchConditions = [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
        { summary: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const sortField = query.sortBy || 'createdAt';
    const sortDirection = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const include: any = {
      vendor: {
        select: {
          id: true,
          businessName: true,
          logo: true,
          category: true,
        },
      },
    };

    if (user?.role === Role.ADMIN) {
      include.createdBy = {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      };
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortDirection },
        include,
      }),
    ]);

    return {
      products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Helper for admin products list
   */
  async findAdminProducts(user: AuthenticatedUser, query: QueryProductDto) {
    return this.findAllProducts(query, user);
  }

  /**
   * Helper for vendor products list
   */
  async findVendorProducts(user: AuthenticatedUser, query: QueryProductDto) {
    return this.findAllProducts(query, user);
  }

  /**
   * 3. Get single product by ID or Slug.
   */
  async findOneProduct(identifier: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            logo: true,
            shortDescription: true,
            businessEmail: true,
            businessPhone: true,
            category: true,
            city: true,
            country: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product not found with identifier: ${identifier}`);
    }

    return product;
  }

  /**
   * 4. Retrieve Product Metrics for Admin (entire platform or filtered by specific vendor).
   */
  async getAdminProductMetrics(
    user: AuthenticatedUser,
    vendorId?: string,
  ): Promise<ProductMetricsResponseDto> {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can access admin product metrics',
      );
    }

    const where: any = {};
    if (vendorId) {
      where.vendorId = vendorId;
    }

    return this.calculateProductMetrics(where);
  }

  /**
   * 5. Retrieve Product Metrics for the Logged-in Vendor (only products owned by this vendor).
   */
  async getVendorProductMetrics(
    user: AuthenticatedUser,
  ): Promise<ProductMetricsResponseDto> {
    if (user.role !== Role.VENDOR && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only vendors can access vendor product metrics',
      );
    }

    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    const where: any = vendorProfile?.id
      ? {
          OR: [{ vendorId: vendorProfile.id }, { createdById: user.id }],
        }
      : { createdById: user.id };

    return this.calculateProductMetrics(where);
  }

  /**
   * Universal product metrics calculator supporting filters and trend analysis.
   */
  async calculateProductMetrics(
    where: any = {},
  ): Promise<ProductMetricsResponseDto> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalProducts,
      activeInStock,
      outOfStock,
      suspended,
      lowStock,
      totalBefore30d,
      thisMonthCount,
    ] = await Promise.all([
      // Total products
      this.prisma.product.count({ where }),

      // Active & in stock (status = ACTIVE and stock > 0)
      this.prisma.product.count({
        where: {
          ...where,
          status: ProductStatus.ACTIVE,
          stock: { gt: 0 },
        },
      }),

      // Out of stock (status = OUT_OF_STOCK or stock <= 0)
      this.prisma.product.count({
        where: {
          ...where,
          OR: [
            { status: ProductStatus.OUT_OF_STOCK },
            { stock: { lte: 0 } },
          ],
        },
      }),

      // Suspended
      this.prisma.product.count({
        where: {
          ...where,
          status: ProductStatus.SUSPENDED,
        },
      }),

      // Low stock (stock between 1 and 10 and ACTIVE)
      this.prisma.product.count({
        where: {
          ...where,
          status: ProductStatus.ACTIVE,
          stock: { gt: 0, lte: 10 },
        },
      }),

      // Total products existing before 30 days ago (baseline for monthly growth)
      this.prisma.product.count({
        where: {
          ...where,
          createdAt: { lt: thirtyDaysAgo },
        },
      }),

      // Created in the last 30 days
      this.prisma.product.count({
        where: {
          ...where,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    // Calculate month-over-month growth percentage
    let percentage = 0;
    let changeText = '+0% from last month';
    let isPositive = true;

    if (totalBefore30d === 0) {
      if (totalProducts === 0) {
        percentage = 0;
        changeText = '+0% from last month';
        isPositive = true;
      } else {
        percentage = 100;
        changeText =
          totalProducts === 1
            ? '+1 new this month'
            : `+${totalProducts} new this month`;
        isPositive = true;
      }
    } else {
      const diff = ((totalProducts - totalBefore30d) / totalBefore30d) * 100;
      percentage = Number(diff.toFixed(1));
      isPositive = diff >= 0;
      const sign = diff >= 0 ? '+' : '';
      changeText = `${sign}${percentage}% from last month`;
    }

    // Direct UI Cards format matching the exact design:
    // Card 1: Total Products (Value: 24, Subtitle: "+12% from last month")
    // Card 2: Active & In Stock (Value: 20, Subtitle: "Available on customer store")
    // Card 3: Out of Stock (Value: 3, Subtitle: "Needs inventory restock")
    // Card 4: Suspended (Value: 1, Subtitle: "Moderated or compliance hold")
    const cards: ProductMetricCardDto[] = [
      {
        id: 'total-products',
        title: 'Total Products',
        label: 'Total Products',
        value: totalProducts,
        formattedValue: totalProducts.toLocaleString(),
        change: `${percentage >= 0 ? '+' : ''}${percentage}%`,
        changeText,
        subtitle: changeText,
        isPositive,
        icon: 'package',
      },
      {
        id: 'active-in-stock',
        title: 'Active & In Stock',
        label: 'Active & In Stock',
        value: activeInStock,
        formattedValue: activeInStock.toLocaleString(),
        subtitle: 'Available on customer store',
        isPositive: true,
        icon: 'check-circle',
      },
      {
        id: 'out-of-stock',
        title: 'Out of Stock',
        label: 'Out of Stock',
        value: outOfStock,
        formattedValue: outOfStock.toLocaleString(),
        subtitle: 'Needs inventory restock',
        isPositive: false,
        icon: 'alert-circle',
      },
      {
        id: 'suspended',
        title: 'Suspended',
        label: 'Suspended',
        value: suspended,
        formattedValue: suspended.toLocaleString(),
        subtitle: 'Moderated or compliance hold',
        isPositive: false,
        icon: 'slash',
      },
    ];

    return {
      totalProducts,
      activeInStock,
      outOfStock,
      suspended,
      cards,
      byStatus: {
        active: activeInStock,
        outOfStock,
        suspended,
      },
      byStock: {
        inStock: activeInStock,
        lowStock,
        outOfStock,
      },
      growth: {
        percentage,
        changeText,
        isPositive,
        thisMonth: thisMonthCount,
        lastMonth: totalBefore30d,
      },
    };
  }

  /**
   * 6. Update Product Details.
   */
  async updateProduct(
    id: string,
    user: AuthenticatedUser,
    dto: UpdateProductDto,
    files?: Express.Multer.File[],
  ) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Role check: Vendor can only edit their own products
    await this.verifyOwnership(user, existing);

    let allImages = existing.images;

    // Handle new Cloudinary uploads if provided
    if (files && files.length > 0) {
      const remainingSlots = 4;
      const uploadedUrls = await this.cloudinaryService.uploadMultipleImages(
        files,
        'agro/products',
        remainingSlots,
      );

      // If user provided a new base images array, use it; otherwise append
      const baseImages = Array.isArray(dto.images) ? dto.images : existing.images;
      allImages = [...baseImages, ...uploadedUrls].slice(0, 4);
    } else if (dto.images !== undefined) {
      allImages = Array.isArray(dto.images) ? dto.images.slice(0, 4) : [];
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        sku: dto.sku !== undefined ? dto.sku.trim().toUpperCase() : undefined,
        category: dto.category !== undefined ? dto.category.trim() : undefined,
        price: dto.price !== undefined ? Number(dto.price) : undefined,
        compareAtPrice:
          dto.compareAtPrice !== undefined ? Number(dto.compareAtPrice) : undefined,
        deliveryCharge:
          dto.deliveryCharge !== undefined ? Number(dto.deliveryCharge) : undefined,
        stock: dto.stock !== undefined ? Number(dto.stock) : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
        summary: dto.summary !== undefined ? dto.summary.trim() : undefined,
        description:
          dto.description !== undefined ? dto.description.trim() : undefined,
        highlights: dto.highlights !== undefined ? dto.highlights : undefined,
        badges: dto.badges !== undefined ? dto.badges : undefined,
        images: allImages,
        thumbnail: dto.thumbnail || allImages[0] || existing.thumbnail,
        specifications:
          dto.specifications !== undefined ? dto.specifications : undefined,
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            logo: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * 5. Patch Product Status (ACTIVE, SUSPENDED, OUT_OF_STOCK).
   */
  async updateProductStatus(
    id: string,
    user: AuthenticatedUser,
    dto: UpdateProductStatusDto,
  ) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.verifyOwnership(user, existing);

    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: dto.status },
      select: {
        id: true,
        name: true,
        sku: true,
        status: true,
        stock: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  /**
   * 6. Delete a Product.
   */
  async deleteProduct(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.verifyOwnership(user, existing);

    await this.prisma.product.delete({
      where: { id },
    });

    return {
      message: 'Product deleted successfully',
      id,
    };
  }

  /**
   * Helper: verify ownership permissions (Admin can edit any, Vendor only their own).
   */
  private async verifyOwnership(
    user: AuthenticatedUser,
    product: { createdById: string; vendorId: string | null },
  ) {
    if (user.role === Role.ADMIN) return;

    if (user.role === Role.VENDOR) {
      const vendorProfile = await this.prisma.vendorProfile.findUnique({
        where: { userId: user.id },
      });

      if (
        product.createdById !== user.id &&
        (!vendorProfile || product.vendorId !== vendorProfile.id)
      ) {
        throw new ForbiddenException(
          'You do not have permission to modify this product.',
        );
      }
      return;
    }

    throw new ForbiddenException('Access denied');
  }

  /**
   * Helper: Generate unique slug with suffix collision resolution.
   */
  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let count = 1;

    while (true) {
      const existing = await this.prisma.product.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing) break;

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      slug = `${baseSlug}-${randomSuffix}`;
      count++;
      if (count > 10) {
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    return slug;
  }

  /**
   * Helper: Generate SKU from Category and Name.
   */
  private generateSku(category: string, name: string): string {
    const catCode = category
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 3)
      .toUpperCase();
    const nameCode = name
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 5)
      .toUpperCase();
    const random = Math.floor(100 + Math.random() * 900);
    return `AGRO-${catCode || 'GEN'}-${nameCode || 'ITEM'}-${random}`;
  }

  /**
   * Helper: Resolves and validates vendor ID safely.
   * Handles:
   * - Automatic inference for VENDOR role
   * - Accepts both VendorProfile.id and User.id for ADMIN role
   * - Converts empty strings, "null", "undefined", or whitespace to null
   * - Throws clear, readable 400 Bad Request if an invalid vendor ID is provided
   */
  private async resolveVendorIdForProduct(
    user: AuthenticatedUser,
    inputVendorId?: string,
  ): Promise<string | null> {
    if (user.role === Role.VENDOR) {
      const vendorProfile = await this.prisma.vendorProfile.findUnique({
        where: { userId: user.id },
      });

      if (!vendorProfile) {
        throw new ForbiddenException(
          'Vendor profile not found. Please complete vendor registration.',
        );
      }

      if (vendorProfile.status !== 'APPROVED') {
        throw new ForbiddenException(
          `Your vendor account is currently ${vendorProfile.status}. Only APPROVED vendors can publish products.`,
        );
      }

      return vendorProfile.id;
    }

    if (user.role === Role.ADMIN) {
      if (!inputVendorId) return null;

      const trimmed = inputVendorId.trim();
      if (
        !trimmed ||
        trimmed === '' ||
        trimmed === 'null' ||
        trimmed === 'undefined' ||
        trimmed === 'none'
      ) {
        return null;
      }

      // Check if provided ID is directly a VendorProfile.id OR a User.id of a vendor
      const profile = await this.prisma.vendorProfile.findFirst({
        where: {
          OR: [{ id: trimmed }, { userId: trimmed }],
        },
        select: { id: true, businessName: true },
      });

      if (profile) {
        return profile.id;
      }

      throw new BadRequestException(
        `Invalid vendorId '${trimmed}'. No registered vendor profile matches this ID. Please select a valid vendor from the dropdown or leave it blank for marketplace direct products.`,
      );
    }

    throw new ForbiddenException('Only Admins and Vendors can create products');
  }

  /**
   * 7. Get Latest Collection products for customer homepage.
   * Retrieves products ordered by latest creation date.
   */
  async findLatestProducts(limit = 6) {
    const take = Math.max(1, Math.min(24, Number(limit) || 6));
    const products = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take,
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            logo: true,
            category: true,
            city: true,
          },
        },
      },
    });

    return products;
  }

  /**
   * 8. Search / List Vendors for Admin Product Creation Autocomplete
   */
  async searchVendorsForAdmin(search = '') {
    const query = (search || '').trim();
    const where: any = {};

    if (query) {
      where.OR = [
        { businessName: { contains: query, mode: 'insensitive' } },
        { contactPerson: { contains: query, mode: 'insensitive' } },
        { businessEmail: { contains: query, mode: 'insensitive' } },
        { id: { contains: query, mode: 'insensitive' } },
      ];
    }

    const vendors = await this.prisma.vendorProfile.findMany({
      where,
      select: {
        id: true,
        businessName: true,
        logo: true,
        contactPerson: true,
        businessEmail: true,
        category: true,
        city: true,
        status: true,
      },
      take: 25,
      orderBy: { businessName: 'asc' },
    });

    return vendors;
  }
}
