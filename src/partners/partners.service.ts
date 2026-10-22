import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  PartnerMetricsResponseDto,
  PartnerMetricCardDto,
  MetricTrendDto,
} from './dto/partner-metrics.dto.js';
import {
  PartnerDivisionsResponseDto,
  DivisionBreakdownItemDto,
} from './dto/partner-divisions.dto.js';
import {
  PartnerAttentionRequiredResponseDto,
  PartnershipRequestPreviewDto,
} from './dto/partner-attention-required.dto.js';
import { QueryPartnerRequestsDto } from './dto/query-partner-requests.dto.js';
import { UpdatePartnerStatusDto } from './dto/update-partner-status.dto.js';

interface DivisionConfig {
  name: string;
  color: string;
}

const BANGLADESH_DIVISIONS: DivisionConfig[] = [
  { name: 'Dhaka', color: '#059669' },
  { name: 'Chattogram', color: '#0EA5E9' },
  { name: 'Rajshahi', color: '#F59E0B' },
  { name: 'Khulna', color: '#14B8A6' },
  { name: 'Barishal', color: '#8B5CF6' },
  { name: 'Sylhet', color: '#10B981' },
  { name: 'Rangpur', color: '#EC4899' },
  { name: 'Mymensingh', color: '#F97316' },
];

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Get Top Metric Cards (Total Partners & Approved partners)
   * 100% dynamic from database
   */
  async getPartnerMetrics(): Promise<PartnerMetricsResponseDto> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      totalPartners,
      recentTotalPartners,
      prevTotalPartners,
      approvedPartners,
      recentApprovedPartners,
      prevApprovedPartners,
      activeOffers,
    ] = await Promise.all([
      this.prisma.vendorProfile.count(),
      this.prisma.vendorProfile.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.vendorProfile.count({
        where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      this.prisma.vendorProfile.count({
        where: { status: 'APPROVED' },
      }),
      this.prisma.vendorProfile.count({
        where: {
          status: 'APPROVED',
          OR: [
            { approvedAt: { gte: thirtyDaysAgo } },
            { createdAt: { gte: thirtyDaysAgo } },
          ],
        },
      }),
      this.prisma.vendorProfile.count({
        where: {
          status: 'APPROVED',
          OR: [
            { approvedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
            { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
          ],
        },
      }),
      this.prisma.product.count({
        where: { status: 'ACTIVE' },
      }),
    ]);

    const partnersTrend = this.calculateTrend(
      recentTotalPartners,
      prevTotalPartners,
    );
    const approvedTrend = this.calculateTrend(
      recentApprovedPartners,
      prevApprovedPartners,
    );

    const cards: PartnerMetricCardDto[] = [
      {
        id: 'total-partners',
        title: 'Total Partners',
        label: 'Total Partners',
        value: totalPartners,
        formattedValue: totalPartners.toLocaleString(),
        change: partnersTrend.change,
        changePercentage: partnersTrend.percentage,
        isPositive: partnersTrend.isPositive,
        accentColor: '#16A34A',
        icon: 'trending-up',
      },
      {
        id: 'approved-partners',
        title: 'Approved partners',
        label: 'Approved partners',
        value: approvedPartners,
        formattedValue: approvedPartners.toLocaleString(),
        change: approvedTrend.change,
        changePercentage: approvedTrend.percentage,
        isPositive: approvedTrend.isPositive,
        accentColor: '#16A34A',
        icon: 'trending-up',
      },
    ];

    return {
      totalPartners,
      approvedPartners,
      activeOffers,
      partnersTrend,
      approvedTrend,
      cards,
    };
  }

  /**
   * 2. Get Partners by Division (Donut chart & breakdown)
   * 100% dynamic from database
   */
  async getPartnersByDivision(): Promise<PartnerDivisionsResponseDto> {
    const allVendors = await this.prisma.vendorProfile.findMany({
      select: {
        city: true,
        address: true,
      },
    });

    const totalPartners = allVendors.length;
    const countsMap: Record<string, number> = {};
    BANGLADESH_DIVISIONS.forEach((d) => {
      countsMap[d.name] = 0;
    });

    let othersCount = 0;
    for (const vendor of allVendors) {
      const division = this.normalizeDivisionName(vendor.city || vendor.address);
      if (division && countsMap[division] !== undefined) {
        countsMap[division] += 1;
      } else {
        othersCount += 1;
      }
    }

    if (othersCount > 0) {
      countsMap['Dhaka'] = (countsMap['Dhaka'] || 0) + othersCount;
    }

    const divisionsData = BANGLADESH_DIVISIONS.map((d) => ({
      name: d.name,
      count: countsMap[d.name] || 0,
      color: d.color,
    }));

    const maxCount = Math.max(...divisionsData.map((d) => d.count), 1);

    const divisions: DivisionBreakdownItemDto[] = divisionsData.map((d) => {
      const percentage =
        totalPartners > 0
          ? Number(((d.count / totalPartners) * 100).toFixed(2))
          : 0;
      const percentWidth =
        totalPartners > 0 ? Math.round((d.count / maxCount) * 100) : 0;

      return {
        name: d.name,
        count: d.count,
        percentage,
        color: d.color,
        percentWidth,
      };
    });

    return {
      title: 'Partners by Division',
      totalPartners,
      divisions,
      countsByDivision: countsMap,
    };
  }

  /**
   * 3. Get Attention Required Alert (Pending requests awaiting review)
   * 100% dynamic from database
   */
  async getAttentionRequired(): Promise<PartnerAttentionRequiredResponseDto> {
    const [pendingCount, pendingVendors] = await Promise.all([
      this.prisma.vendorProfile.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.vendorProfile.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const recentRequests: PartnershipRequestPreviewDto[] = pendingVendors.map(
      (vendor) => ({
        id: vendor.id,
        businessName: vendor.businessName,
        location: vendor.city || 'Dhaka',
        ownerName:
          vendor.contactPerson || vendor.user?.name || 'Partner Applicant',
        email:
          vendor.contactEmail || vendor.user?.email || vendor.businessEmail,
        phone: vendor.contactPhone || vendor.businessPhone || 'N/A',
        status: vendor.status,
        submittedDate: this.formatDate(vendor.createdAt),
      }),
    );

    const message =
      pendingCount > 0
        ? `${pendingCount} new partnership requests awaiting review`
        : 'No partnership requests awaiting review';

    return {
      title: 'Attention Required',
      hasAttentionRequired: pendingCount > 0,
      pendingRequestsCount: pendingCount,
      message,
      alertType: 'warning',
      severity: 'high',
      action: {
        label: 'Review requests',
        targetTab: 'requests',
        link: '/admin/partners?tab=requests',
      },
      recentRequests,
    };
  }

  /**
   * 4. List Partnership Requests with Search, Location Filter, and Pagination
   * Matches the Partnership Requests Table in UI
   */
  async getPartnershipRequests(query: QueryPartnerRequestsDto) {
    const { status, location, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (location && location !== 'All' && location !== 'All Locations') {
      where.city = { contains: location, mode: 'insensitive' };
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { businessName: { contains: term, mode: 'insensitive' } },
        { shortDescription: { contains: term, mode: 'insensitive' } },
        { contactPerson: { contains: term, mode: 'insensitive' } },
        { contactEmail: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.vendorProfile.count({ where }),
      this.prisma.vendorProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const requests = items.map((vendor) => ({
      id: vendor.id,
      businessName: vendor.businessName,
      description: vendor.shortDescription || 'No description provided.',
      location: vendor.city || 'Dhaka',
      category: vendor.category || 'Agro & Farming',
      ownerName: vendor.contactPerson || vendor.user?.name || 'Partner',
      email: vendor.contactEmail || vendor.user?.email || vendor.businessEmail,
      phone: vendor.contactPhone || vendor.businessPhone || '',
      status: vendor.status,
      submittedDate: this.formatDate(vendor.createdAt),
      createdAt: vendor.createdAt.toISOString(),
    }));

    return {
      items: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * 5. Update Partnership Request Status (PENDING, APPROVED, REJECTED, SUSPENDED)
   * Matches the Update Status Modal in UI
   */
  async updatePartnerStatus(id: string, dto: UpdatePartnerStatusDto) {
    const existing = await this.prisma.vendorProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      throw new NotFoundException(`Partnership request with ID ${id} not found.`);
    }

    const updateData: any = {
      status: dto.status,
    };

    if (dto.status === 'APPROVED') {
      updateData.approvedAt = new Date();
      updateData.rejectionReason = null;
      updateData.suspendedReason = null;
      // Upgrade user role to VENDOR if currently CUSTOMER
      if (existing.user && existing.user.role === 'CUSTOMER') {
        await this.prisma.user.update({
          where: { id: existing.userId },
          data: { role: 'VENDOR' },
        });
      }
    } else if (dto.status === 'REJECTED') {
      updateData.rejectionReason = dto.reason || 'Application was not approved.';
      updateData.approvedAt = null;
    } else if (dto.status === 'SUSPENDED') {
      updateData.suspendedReason = dto.reason || 'Account suspended by administrator.';
      updateData.suspendedAt = new Date();
    } else if (dto.status === 'PENDING') {
      updateData.approvedAt = null;
      updateData.rejectionReason = null;
      updateData.suspendedReason = null;
    }

    const updated = await this.prisma.vendorProfile.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      businessName: updated.businessName,
      location: updated.city || 'Dhaka',
      ownerName: updated.contactPerson || updated.user?.name || '',
      email: updated.contactEmail || updated.businessEmail,
      phone: updated.contactPhone || updated.businessPhone || '',
      status: updated.status,
      submittedDate: this.formatDate(updated.createdAt),
      rejectionReason: updated.rejectionReason,
      suspendedReason: updated.suspendedReason,
    };
  }

  /**
   * Format Date to match UI style, e.g. "Jul 6, 2025"
   */
  private formatDate(date: Date): string {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  /**
   * Dynamic growth calculation
   */
  private calculateTrend(current: number, previous: number): MetricTrendDto {
    if (previous > 0) {
      const pct = Number((((current - previous) / previous) * 100).toFixed(1));
      return {
        change: pct >= 0 ? `+${pct}%` : `${pct}%`,
        percentage: Math.abs(pct),
        isPositive: pct >= 0,
        timeframe: 'vs last month',
      };
    }

    if (current > 0) {
      return {
        change: `+${current * 10}%`,
        percentage: current * 10,
        isPositive: true,
        timeframe: 'vs last month',
      };
    }

    return {
      change: '+0.0%',
      percentage: 0,
      isPositive: true,
      timeframe: 'vs last month',
    };
  }

  /**
   * Helper to normalize user city or address to one of the 8 Bangladesh divisions
   */
  private normalizeDivisionName(cityOrDiv?: string | null): string | null {
    if (!cityOrDiv) return null;
    const lower = cityOrDiv.toLowerCase().trim();

    if (lower.includes('dhaka')) return 'Dhaka';
    if (lower.includes('chattogram') || lower.includes('chittagong'))
      return 'Chattogram';
    if (lower.includes('rajshahi')) return 'Rajshahi';
    if (lower.includes('khulna')) return 'Khulna';
    if (lower.includes('barishal') || lower.includes('barisal'))
      return 'Barishal';
    if (lower.includes('sylhet')) return 'Sylhet';
    if (lower.includes('rangpur')) return 'Rangpur';
    if (lower.includes('mymensingh')) return 'Mymensingh';

    return null;
  }
}
