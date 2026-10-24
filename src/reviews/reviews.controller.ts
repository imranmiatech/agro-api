import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Submit a product rating & review
   * POST /api/v1/reviews
   */
  @Post()
  async createReview(@Body() dto: CreateReviewDto) {
    const data = await this.reviewsService.create(dto);
    return {
      success: true,
      message: 'Product review submitted successfully',
      data,
    };
  }

  /**
   * Get reviews for a product
   * GET /api/v1/reviews/product/:productId
   */
  @Get('product/:productId')
  async getProductReviews(@Param('productId') productId: string) {
    const data = await this.reviewsService.getProductReviews(productId);
    return {
      success: true,
      data,
    };
  }

  /**
   * Get reviews for an order
   * GET /api/v1/reviews/order/:orderId
   */
  @Get('order/:orderId')
  async getOrderReviews(@Param('orderId') orderId: string) {
    const data = await this.reviewsService.getOrderReviews(orderId);
    return {
      success: true,
      data,
    };
  }
}
