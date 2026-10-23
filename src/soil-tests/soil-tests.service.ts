import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { StripeService } from '../billing/stripe.service.js';
import { SoilPdfService } from './soil-pdf.service.js';

export type SoilTestStatus = 'Pending Pickup' | 'Sample Collected' | 'Lab Testing' | 'Completed';

export interface SoilParameter {
  name: string;
  unit: string;
  measuredValue: number | string;
  optimalRange: string;
  status: 'Optimal' | 'Moderate' | 'Deficient' | 'Excess';
}

export interface FertilizerDose {
  fertilizer: string;
  dosePerBigha: string;
  applicationStage: string;
  purpose: string;
}

export interface SoilLabReport {
  sampleId: string;
  reportDate: string;
  soilTexture: string;
  labTechnician: string;
  accreditation?: string;
  overallHealthScore: number;
  parameters: SoilParameter[];
  fertilizerPlan: FertilizerDose[];
  aiRecommendations: string[];
}

export interface SoilTestRequest {
  id: string;
  requestNumber: string;
  dbId?: string;
  farmerName: string;
  phone: string;
  email?: string;
  district: string;
  upazila: string;
  villagePlot: string;
  landArea: string;
  targetCrop: string;
  soilProblems?: string;
  packageId: string;
  packageName: string;
  amount: number;
  pickupMethod: string;
  paymentMethod: string;
  transactionId?: string;
  paymentStatus: 'Paid' | 'Pending Payment';
  status: SoilTestStatus;
  requestDate: string;
  completedDate?: string;
  labReport?: SoilLabReport;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class SoilTestsService {
  private readonly logger = new Logger(SoilTestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly stripeService: StripeService,
    private readonly soilPdfService: SoilPdfService,
  ) {}

  private formatRequest(r: any): SoilTestRequest {
    const formattedRequestDate = r.requestDate
      ? new Date(r.requestDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';

    const formattedCompletedDate = r.completedDate
      ? new Date(r.completedDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : undefined;

    return {
      id: r.requestNumber || r.id,
      requestNumber: r.requestNumber,
      dbId: r.id,
      farmerName: r.farmerName,
      phone: r.phone,
      email: r.email || undefined,
      district: r.district,
      upazila: r.upazila,
      villagePlot: r.villagePlot,
      landArea: r.landArea,
      targetCrop: r.targetCrop,
      soilProblems: r.soilProblems || undefined,
      packageId: r.packageId,
      packageName: r.packageName,
      amount: Number(r.amount),
      pickupMethod: r.pickupMethod,
      paymentMethod: r.paymentMethod,
      transactionId: r.transactionId || undefined,
      paymentStatus: (r.paymentStatus as 'Paid' | 'Pending Payment') || 'Paid',
      status: r.status as SoilTestStatus,
      requestDate: formattedRequestDate,
      completedDate: formattedCompletedDate,
      labReport: r.labReport as SoilLabReport | undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async findAll(): Promise<SoilTestRequest[]> {
    const records = await this.prisma.soilTestRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.formatRequest(r));
  }

  async findOne(idOrNumber: string): Promise<SoilTestRequest> {
    const found = await this.prisma.soilTestRequest.findFirst({
      where: {
        OR: [{ id: idOrNumber }, { requestNumber: idOrNumber }],
      },
    });

    if (!found) {
      throw new NotFoundException(`Soil test request ${idOrNumber} not found`);
    }

    return this.formatRequest(found);
  }

  async create(dto: any): Promise<SoilTestRequest> {
    const totalCount = await this.prisma.soilTestRequest.count();
    const generatedRequestNumber =
      dto.requestNumber ||
      dto.id ||
      `SL-2026-${(1001 + totalCount).toString().padStart(4, '0')}`;

    // Process Stripe Payment
    let cardPayload: any = undefined;
    if (dto.cardNumber && dto.cardExpiry && dto.cardCvc) {
      const [expMonthStr, expYearStr] = (dto.cardExpiry || '').split('/');
      cardPayload = {
        number: dto.cardNumber,
        expMonth: Number(expMonthStr) || 12,
        expYear: Number(expYearStr && expYearStr.length === 2 ? `20${expYearStr}` : expYearStr) || 2028,
        cvc: dto.cardCvc,
        name: dto.cardholderName || dto.farmerName,
      };
    }

    const paymentResult = await this.stripeService.processSoilTestPayment({
      amount: Number(dto.amount) || 950,
      packageName: dto.packageName || 'Standard Laboratory Soil Test',
      farmerName: dto.farmerName,
      email: dto.email,
      phone: dto.phone,
      card: cardPayload,
    });

    const created = await this.prisma.soilTestRequest.create({
      data: {
        requestNumber: generatedRequestNumber,
        farmerName: dto.farmerName,
        phone: dto.phone,
        email: dto.email || `${dto.farmerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`,
        district: dto.district || 'Bogura',
        upazila: dto.upazila || 'Sadar Upazila',
        villagePlot: dto.villagePlot || 'Plot #1',
        landArea: dto.landArea || '3 Bigha',
        targetCrop: dto.targetCrop || 'Seasonal Crops',
        soilProblems: dto.soilProblems || null,
        packageId: dto.packageId || 'pkg-standard',
        packageName: dto.packageName || 'Standard Laboratory Soil Test',
        amount: Number(dto.amount) || 950,
        pickupMethod: dto.pickupMethod || 'Courier Delivery',
        paymentMethod: 'Stripe',
        paymentStatus: 'Paid',
        transactionId: dto.transactionId || paymentResult.transactionId,
        stripePaymentId: paymentResult.stripePaymentId,
        status: 'Pending Pickup',
        requestDate: new Date(),
      },
    });

    this.logger.log(
      `Created soil test #${created.requestNumber} for ${created.farmerName} (Payment: ${created.transactionId})`,
    );

    // Send confirmation email asynchronously
    if (created.email) {
      this.mailService
        .sendSoilTestBookedEmail(
          created.email,
          created.farmerName,
          created.requestNumber,
          created.packageName,
          created.amount,
          created.district,
          created.upazila,
          created.transactionId || undefined,
        )
        .catch((err) => {
          this.logger.error(`Failed to send soil test booking email to ${created.email}:`, err);
        });
    }

    return this.formatRequest(created);
  }

  async updateStatus(idOrNumber: string, status: string): Promise<SoilTestRequest> {
    const existing = await this.prisma.soilTestRequest.findFirst({
      where: {
        OR: [{ id: idOrNumber }, { requestNumber: idOrNumber }],
      },
    });

    if (!existing) {
      throw new NotFoundException(`Soil test request ${idOrNumber} not found`);
    }

    const updated = await this.prisma.soilTestRequest.update({
      where: { id: existing.id },
      data: {
        status,
        ...(status === 'Completed' ? { completedDate: new Date() } : {}),
      },
    });

    this.logger.log(`Updated status of soil test #${existing.requestNumber} to ${status}`);
    return this.formatRequest(updated);
  }

  async publishReport(idOrNumber: string, reportData: any): Promise<SoilTestRequest> {
    const existing = await this.prisma.soilTestRequest.findFirst({
      where: {
        OR: [{ id: idOrNumber }, { requestNumber: idOrNumber }],
      },
    });

    if (!existing) {
      throw new NotFoundException(`Soil test request ${idOrNumber} not found`);
    }

    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const fullLabReport: SoilLabReport = {
      sampleId: existing.requestNumber,
      reportDate: today,
      soilTexture: reportData.soilTexture || 'Clay Loam (Rich Alluvial)',
      labTechnician: reportData.labTechnician || 'Dr. Nazmul Huda (PhD, Soil Science)',
      accreditation: reportData.accreditation || 'ISO/IEC 17025 Accredited AgriLab Bogura',
      overallHealthScore: Number(reportData.overallHealthScore) || 85,
      parameters: reportData.parameters || [],
      fertilizerPlan: reportData.fertilizerPlan || [],
      aiRecommendations: reportData.aiRecommendations || [],
    };

    const updated = await this.prisma.soilTestRequest.update({
      where: { id: existing.id },
      data: {
        status: 'Completed',
        completedDate: new Date(),
        labReport: fullLabReport as any,
      },
    });

    this.logger.log(`Published lab report for soil test #${existing.requestNumber}`);

    // Trigger report publication notification email
    if (updated.email) {
      this.mailService
        .sendSoilTestReportPublishedEmail(
          updated.email,
          updated.farmerName,
          updated.requestNumber,
          fullLabReport.overallHealthScore,
          fullLabReport.soilTexture,
          updated.targetCrop,
        )
        .catch((err) => {
          this.logger.error(`Failed to send report notification email to ${updated.email}:`, err);
        });
    }

    return this.formatRequest(updated);
  }

  async remove(idOrNumber: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.soilTestRequest.findFirst({
      where: {
        OR: [{ id: idOrNumber }, { requestNumber: idOrNumber }],
      },
    });

    if (!existing) {
      throw new NotFoundException(`Soil test request ${idOrNumber} not found`);
    }

    await this.prisma.soilTestRequest.delete({
      where: { id: existing.id },
    });

    this.logger.log(`Deleted soil test request #${existing.requestNumber}`);
    return {
      success: true,
      message: `Soil test request #${existing.requestNumber} deleted successfully`,
    };
  }

  /**
   * Generates sample slip PDF buffer and metadata for a soil test request
   */
  async generateSampleSlipPdf(
    idOrNumber: string,
  ): Promise<{ buffer: Buffer; request: SoilTestRequest }> {
    const request = await this.findOne(idOrNumber);
    const buffer = this.soilPdfService.generateSampleSlipPdf(request);
    return { buffer, request };
  }

  /**
   * Generates diagnostic lab report PDF buffer and metadata for a soil test request
   */
  async generateReportPdf(
    idOrNumber: string,
  ): Promise<{ buffer: Buffer; request: SoilTestRequest }> {
    const request = await this.findOne(idOrNumber);
    const buffer = this.soilPdfService.generateReportPdf(request);
    return { buffer, request };
  }
}
