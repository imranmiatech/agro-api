import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContentStatus } from '../generated/prisma/enums.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';
import { QueryArticleDto } from './dto/query-article.dto.js';
import { UpdateArticleStatusDto } from './dto/update-article-status.dto.js';

export interface FormattedArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  content: string;
  coverImage?: string;
  readTime: string;
  author: {
    name: string;
    role?: string;
    avatar?: string;
  };
  status: 'Published' | 'Draft' | 'Archived';
  rawStatus: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
  lastUpdated: string;
}

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to normalize input status string to Prisma ContentStatus
   */
  private normalizeStatus(status?: string): ContentStatus {
    if (!status) return ContentStatus.DRAFT;
    const upper = status.trim().toUpperCase();
    if (upper === 'PUBLISHED') return ContentStatus.PUBLISHED;
    if (upper === 'ARCHIVED') return ContentStatus.ARCHIVED;
    return ContentStatus.DRAFT;
  }

  /**
   * Helper to format raw database Article model to clean API presentation
   */
  public formatArticle(article: any): FormattedArticle {
    let formattedStatus: 'Published' | 'Draft' | 'Archived' = 'Draft';
    if (article.status === ContentStatus.PUBLISHED) {
      formattedStatus = 'Published';
    } else if (article.status === ContentStatus.ARCHIVED) {
      formattedStatus = 'Archived';
    }

    const lastUpdated = article.updatedAt
      ? new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(new Date(article.updatedAt))
      : 'Recently';

    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      category: article.category,
      description: article.description || '',
      content: article.content || '',
      coverImage: article.coverImage || undefined,
      readTime: article.readTime || '5 min read',
      author: {
        name: article.authorName,
        role: article.authorRole || undefined,
        avatar: article.authorAvatar || undefined,
      },
      status: formattedStatus,
      rawStatus: article.status,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      lastUpdated,
    };
  }

  /**
   * Generate slug and ensure uniqueness in database
   */
  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'article';

    let uniqueSlug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.article.findUnique({
        where: { slug: uniqueSlug },
        select: { id: true },
      });

      if (!existing || (excludeId && existing.id === excludeId)) {
        return uniqueSlug;
      }

      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Calculate read time from content word count
   */
  private calculateReadTime(content: string): string {
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 180));
    return `${minutes} min read`;
  }

  /**
   * GET /content - List articles purely from the database with search, filter, and pagination
   */
  async findAll(query: QueryArticleDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Dynamic search filter across database columns
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { authorName: { contains: term, mode: 'insensitive' } },
      ];
    }

    // Dynamic category filter
    if (query.category && query.category.trim() && query.category !== 'All' && query.category !== 'All Categories') {
      where.category = { equals: query.category.trim(), mode: 'insensitive' };
    }

    // Dynamic status filter
    if (query.status && query.status.trim() && query.status !== 'All' && query.status !== 'ALL') {
      const targetStatus = this.normalizeStatus(query.status);
      where.status = targetStatus;
    }

    // Direct database query using Prisma (selecting only list fields for fast response)
    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          description: true,
          coverImage: true,
          readTime: true,
          authorName: true,
          authorRole: true,
          authorAvatar: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.article.count({ where }),
    ]);

    const formatted = articles.map((art) => this.formatArticle(art));

    return {
      data: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * GET /content/:id - Get single article directly from the database by ID or slug
   */
  async findOne(idOrSlug: string): Promise<FormattedArticle> {
    let article = await this.prisma.article.findUnique({
      where: { id: idOrSlug },
    });

    if (!article) {
      article = await this.prisma.article.findUnique({
        where: { slug: idOrSlug },
      });
    }

    // Support numeric index lookup (e.g. /blog/1, /blog/2)
    if (!article && !isNaN(Number(idOrSlug))) {
      const index = Math.max(0, parseInt(idOrSlug, 10) - 1);
      const articles = await this.prisma.article.findMany({
        where: { status: ContentStatus.PUBLISHED },
        orderBy: { createdAt: 'desc' },
        skip: index,
        take: 1,
      });
      if (articles.length > 0) {
        article = articles[0];
      } else {
        // Fallback to latest published article, or any latest article
        const fallback = await this.prisma.article.findFirst({
          where: { status: ContentStatus.PUBLISHED },
          orderBy: { createdAt: 'desc' },
        });
        if (fallback) {
          article = fallback;
        } else {
          article = await this.prisma.article.findFirst({
            orderBy: { createdAt: 'desc' },
          });
        }
      }
    }

    if (!article) {
      throw new NotFoundException(`Article with identifier '${idOrSlug}' not found.`);
    }

    return this.formatArticle(article);
  }

  /**
   * POST /content - Create a new article directly in the database
   */
  async create(dto: CreateArticleDto): Promise<FormattedArticle> {
    if (!dto.title || !dto.title.trim()) {
      throw new BadRequestException('Article title is required.');
    }
    if (!dto.category || !dto.category.trim()) {
      throw new BadRequestException('Article category is required.');
    }
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('Article content is required.');
    }

    const slug = await this.generateUniqueSlug(dto.title);
    const readTime = dto.readTime?.trim() || this.calculateReadTime(dto.content);
    const status = this.normalizeStatus(dto.status);

    const created = await this.prisma.article.create({
      data: {
        title: dto.title.trim(),
        slug,
        category: dto.category.trim(),
        description: dto.description?.trim() || null,
        content: dto.content.trim(),
        coverImage: dto.coverImage?.trim() || null,
        readTime,
        authorName: dto.authorName?.trim() || 'KrishiKunjo Contributor',
        authorRole: dto.authorRole?.trim() || 'Agronomy Specialist',
        authorAvatar: dto.authorAvatar?.trim() || null,
        status,
      },
    });

    return this.formatArticle(created);
  }

  /**
   * PATCH /content/:id - Edit / update an existing article directly in the database
   */
  async update(id: string, dto: UpdateArticleDto): Promise<FormattedArticle> {
    const existing = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Article with ID '${id}' not found.`);
    }

    let slug = existing.slug;
    if (dto.title && dto.title.trim() && dto.title.trim() !== existing.title) {
      slug = await this.generateUniqueSlug(dto.title, id);
    }

    const readTime =
      dto.readTime?.trim() ||
      (dto.content ? this.calculateReadTime(dto.content) : existing.readTime);

    const dataToUpdate: any = {};
    if (dto.title !== undefined) dataToUpdate.title = dto.title.trim();
    if (slug !== existing.slug) dataToUpdate.slug = slug;
    if (dto.category !== undefined) dataToUpdate.category = dto.category.trim();
    if (dto.description !== undefined) dataToUpdate.description = dto.description.trim() || null;
    if (dto.content !== undefined) dataToUpdate.content = dto.content.trim();
    if (dto.coverImage !== undefined) dataToUpdate.coverImage = dto.coverImage.trim() || null;
    if (readTime) dataToUpdate.readTime = readTime;
    if (dto.authorName !== undefined) dataToUpdate.authorName = dto.authorName.trim();
    if (dto.authorRole !== undefined) dataToUpdate.authorRole = dto.authorRole.trim() || null;
    if (dto.authorAvatar !== undefined) dataToUpdate.authorAvatar = dto.authorAvatar.trim() || null;
    if (dto.status !== undefined) dataToUpdate.status = this.normalizeStatus(dto.status);

    const updated = await this.prisma.article.update({
      where: { id },
      data: dataToUpdate,
    });

    return this.formatArticle(updated);
  }

  /**
   * PATCH /content/:id/status - Update publication status directly in the database
   */
  async updateStatus(id: string, dto: UpdateArticleStatusDto): Promise<FormattedArticle> {
    const existing = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Article with ID '${id}' not found.`);
    }

    const newStatus = this.normalizeStatus(dto.status);

    const updated = await this.prisma.article.update({
      where: { id },
      data: { status: newStatus },
    });

    return this.formatArticle(updated);
  }

  /**
   * DELETE /content/:id - Delete an article permanently from the database
   */
  async remove(id: string): Promise<{ success: boolean; message: string; id: string }> {
    const existing = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Article with ID '${id}' not found.`);
    }

    await this.prisma.article.delete({
      where: { id },
    });

    return {
      success: true,
      message: `Article '${existing.title}' deleted successfully.`,
      id,
    };
  }
}
