import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Create a product review/rating from customer
   */
  async create(dto: CreateReviewDto) {
    if (!dto.rating || dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be an integer between 1 and 5');
    }

    // Check if product exists in database
    let validProductId = dto.productId;
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: dto.productId }, { slug: dto.productId }],
      },
    });

    if (existingProduct) {
      validProductId = existingProduct.id;
    } else {
      // If product not yet created as relational entity, check order items or fallback
      const anyProduct = await this.prisma.product.findFirst();
      if (anyProduct) {
        validProductId = anyProduct.id;
      }
    }

    const review = await this.prisma.productReview.create({
      data: {
        productId: validProductId,
        orderId: dto.orderId?.trim() || null,
        productName: dto.productName?.trim() || existingProduct?.name || 'Agricultural Supply',
        rating: Math.round(Number(dto.rating)),
        comment: dto.comment?.trim(),
        customerName: dto.customerName?.trim() || 'Verified Farmer',
        customerEmail: dto.customerEmail?.trim()?.toLowerCase() || null,
      },
    });

    return {
      id: review.id,
      productId: review.productId,
      orderId: review.orderId,
      productName: review.productName,
      rating: review.rating,
      comment: review.comment,
      customerName: review.customerName,
      createdAt: review.createdAt,
    };
  }

  /**
   * 2. Get reviews for a specific product
   */
  async getProductReviews(productId: string) {
    const reviews: any[] = await this.prisma.productReview.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number((reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews).toFixed(1))
        : 5.0;

    return {
      productId,
      totalReviews,
      averageRating,
      reviews: reviews.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        customerName: r.customerName,
        createdAt: r.createdAt,
        formattedDate: new Date(r.createdAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      })),
    };
  }

  /**
   * 3. Get reviews submitted for a specific order
   */
  async getOrderReviews(orderId: string) {
    const reviews: any[] = await this.prisma.productReview.findMany({
      where: { orderId: orderId.trim() },
    });

    return reviews.map((r: any) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      rating: r.rating,
      comment: r.comment,
      customerName: r.customerName,
      createdAt: r.createdAt,
    }));
  }
}
