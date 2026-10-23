import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@ApiTags('Expert Overview')
@Controller('expert/overview')
export class ExpertOverviewController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. GET /expert/overview/metrics - Live metrics for Expert Overview
   */
  @Get('metrics')
  @ResponseMessage('Expert overview metrics retrieved successfully')
  @ApiOperation({
    summary: 'Get expert overview metrics',
    description: 'Returns real-time consultation counts and soil testing statistics from database.',
  })
  async getOverviewMetrics() {
    const [
      totalConsultations,
      waitingConsultations,
      resolvedConsultations,
      totalSoilTests,
      pendingSoilTests,
      completedSoilTests,
    ] = await Promise.all([
      this.prisma.consultationTicket.count(),
      this.prisma.consultationTicket.count({ where: { status: 'Waiting for Reply' } }),
      this.prisma.consultationTicket.count({ where: { status: 'Resolved' } }),
      this.prisma.soilTestRequest.count(),
      this.prisma.soilTestRequest.count({ where: { status: { not: 'Completed' } } }),
      this.prisma.soilTestRequest.count({ where: { status: 'Completed' } }),
    ]);

    return {
      totalConsultations,
      waitingConsultations,
      resolvedConsultations,
      totalSoilTests,
      pendingSoilTests,
      completedSoilTests,
    };
  }

  /**
   * 2. GET /expert/overview/recent-consultations - Latest 6 farmer consultations
   */
  @Get('recent-consultations')
  @ResponseMessage('Recent consultations retrieved successfully')
  @ApiOperation({
    summary: 'Get recent 6 farmer consultations',
    description: 'Fetches the latest 6 farmer consultations ordered by creation date.',
  })
  async getRecentConsultations() {
    const tickets = await this.prisma.consultationTicket.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ticketNumber: true,
        farmerName: true,
        farmerEmail: true,
        farmerPhone: true,
        subject: true,
        category: true,
        crop: true,
        priority: true,
        status: true,
        assignedExpertName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return tickets.map((t) => ({
      ...t,
      createdAtFormatted: new Date(t.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    }));
  }

  /**
   * 3. GET /expert/overview/recent-soil-tests - Latest 6 farmland soil test bookings
   */
  @Get('recent-soil-tests')
  @ResponseMessage('Recent soil tests retrieved successfully')
  @ApiOperation({
    summary: 'Get recent 6 farmland soil test bookings',
    description: 'Fetches the latest 6 soil test bookings ordered by creation date.',
  })
  async getRecentSoilTests() {
    const tests = await this.prisma.soilTestRequest.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
    });

    return tests.map((t) => ({
      id: t.requestNumber || t.id,
      requestNumber: t.requestNumber,
      farmerName: t.farmerName,
      phone: t.phone,
      email: t.email,
      district: t.district,
      upazila: t.upazila,
      villagePlot: t.villagePlot,
      landArea: t.landArea,
      targetCrop: t.targetCrop,
      packageId: t.packageId,
      packageName: t.packageName,
      amount: t.amount,
      pickupMethod: t.pickupMethod,
      paymentMethod: t.paymentMethod,
      paymentStatus: t.paymentStatus,
      status: t.status,
      requestDate: t.requestDate
        ? new Date(t.requestDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '',
      completedDate: t.completedDate
        ? new Date(t.completedDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : undefined,
      labReport: t.labReport,
      createdAt: t.createdAt,
    }));
  }
}
