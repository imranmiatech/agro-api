import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

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
  farmerName: string;
  phone: string;
  email?: string;
  district: string;
  upazila: string;
  villagePlot: string;
  landArea: string;
  targetCrop: string;
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
}

@Injectable()
export class SoilTestsService {
  private readonly logger = new Logger(SoilTestsService.name);
  private readonly storageFilePath = path.resolve(process.cwd(), 'data', 'soil_tests.json');
  private requests: SoilTestRequest[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      const dataDir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.requests = parsed;
          this.logger.log(`Loaded ${this.requests.length} soil test requests from disk.`);
          return;
        }
      }
    } catch (err) {
      this.logger.error('Failed to load soil test requests from disk:', err);
    }

    // Default Seed Data from AgroAi
    this.requests = [
      {
        id: 'SL-2026-8941',
        farmerName: 'Md. Rafiqul Islam',
        phone: '+880 1712-345678',
        email: 'rafiqul.farm@gmail.com',
        district: 'Bogura',
        upazila: 'Sherpur',
        villagePlot: 'Kashipur, Plot #14-B',
        landArea: '4.5 Bigha',
        targetCrop: 'Boro Rice & Hybrid Tomato',
        packageId: 'pkg-standard',
        packageName: 'Standard 16-Parameter Lab Diagnostic',
        amount: 1650,
        pickupMethod: 'Agent Field Pickup',
        paymentMethod: 'bKash',
        transactionId: 'BK9X77421L',
        paymentStatus: 'Paid',
        status: 'Completed',
        requestDate: '10 Oct 2026',
        completedDate: '13 Oct 2026',
        labReport: {
          sampleId: 'SL-2026-8941',
          reportDate: '13 Oct 2026',
          soilTexture: 'Clay Loam (Rich Alluvial)',
          labTechnician: 'Dr. Nazmul Huda (PhD, Soil Science)',
          accreditation: 'ISO/IEC 17025 Accredited AgriLab Bogura',
          overallHealthScore: 84,
          parameters: [
            { name: 'Soil pH', unit: 'pH Scale', measuredValue: 6.4, optimalRange: '6.0 - 7.0', status: 'Optimal' },
            { name: 'Available Nitrogen (N)', unit: 'kg/ha', measuredValue: 142, optimalRange: '200 - 300', status: 'Deficient' },
            { name: 'Available Phosphorus (P)', unit: 'ppm', measuredValue: 24.5, optimalRange: '18 - 30', status: 'Optimal' },
            { name: 'Available Potassium (K)', unit: 'ppm', measuredValue: 185, optimalRange: '150 - 250', status: 'Optimal' },
            { name: 'Organic Carbon', unit: '%', measuredValue: '1.32%', optimalRange: '1.50 - 2.50%', status: 'Moderate' },
            { name: 'Available Zinc (Zn)', unit: 'ppm', measuredValue: 0.72, optimalRange: '1.00 - 2.50', status: 'Deficient' },
            { name: 'Available Sulfur (S)', unit: 'ppm', measuredValue: 16.8, optimalRange: '15.0 - 25.0', status: 'Optimal' },
            { name: 'Boron (B)', unit: 'ppm', measuredValue: 0.38, optimalRange: '0.50 - 1.20', status: 'Deficient' },
            { name: 'Electrical Conductivity (EC)', unit: 'dS/m', measuredValue: 0.42, optimalRange: '< 1.0 (Non-saline)', status: 'Optimal' },
            { name: 'Calcium (Ca)', unit: 'meq/100g', measuredValue: 8.4, optimalRange: '6.0 - 12.0', status: 'Optimal' },
          ],
          fertilizerPlan: [
            {
              fertilizer: 'Urea (Nitrogen Booster)',
              dosePerBigha: '28 kg',
              applicationStage: 'Split in 3 doses (Basal, Tillering, Panicle)',
              purpose: 'Restore critical nitrogen deficit for vigorous vegetative growth',
            },
            {
              fertilizer: 'Triple Super Phosphate (TSP)',
              dosePerBigha: '14 kg',
              applicationStage: 'Full basal application during final ploughing',
              purpose: 'Sustain strong root network and early tillering',
            },
            {
              fertilizer: 'Zinc Sulfate (Heptahydrate 21%)',
              dosePerBigha: '2.5 kg',
              applicationStage: 'Basal dressing with organic manure',
              purpose: 'Correct severe zinc deficiency and prevent Khaira disease',
            },
            {
              fertilizer: 'Organic Vermicompost',
              dosePerBigha: '120 kg',
              applicationStage: 'Broadcast 7 days before transplantation',
              purpose: 'Elevate organic carbon and beneficial soil biological count',
            },
          ],
          aiRecommendations: [
            'Soil pH of 6.4 is in the ideal range; avoid liming as it will reduce phosphorus availability.',
            'Nitrogen and Zinc are primary limiting factors in this plot. Apply zinc sulfate strictly at planting.',
            'Increase organic matter by incorporating crop residues and applying 120kg/bigha vermicompost.',
            'Maintain shallow 2-3cm intermittent wetting and drying (AWD) irrigation during tillering.',
          ],
        },
      },
      {
        id: 'SL-2026-8942',
        farmerName: 'Anisur Rahman',
        phone: '+880 1819-876543',
        email: 'anis.agro@gmail.com',
        district: 'Rajshahi',
        upazila: 'Paba',
        villagePlot: 'Harian, Mango Orchard Sector 3',
        landArea: '8 Bigha',
        targetCrop: 'Himsagar & Amrapali Mango',
        packageId: 'pkg-advanced',
        packageName: 'Complete 24-Parameter AI Soil & Microbial Suite',
        amount: 2900,
        pickupMethod: 'Agent Field Pickup',
        paymentMethod: 'Nagad',
        transactionId: 'NG7820119X',
        paymentStatus: 'Paid',
        status: 'Completed',
        requestDate: '08 Oct 2026',
        completedDate: '12 Oct 2026',
        labReport: {
          sampleId: 'SL-2026-8942',
          reportDate: '12 Oct 2026',
          soilTexture: 'Sandy Loam',
          labTechnician: 'Prof. Farhana Yasmin (Chief Agronomist)',
          accreditation: 'ISO/IEC 17025 Accredited AgriLab Rajshahi',
          overallHealthScore: 88,
          parameters: [
            { name: 'Soil pH', unit: 'pH Scale', measuredValue: 6.8, optimalRange: '6.2 - 7.5', status: 'Optimal' },
            { name: 'Available Nitrogen (N)', unit: 'kg/ha', measuredValue: 210, optimalRange: '200 - 300', status: 'Optimal' },
            { name: 'Available Phosphorus (P)', unit: 'ppm', measuredValue: 28.0, optimalRange: '20 - 35', status: 'Optimal' },
            { name: 'Available Potassium (K)', unit: 'ppm', measuredValue: 240, optimalRange: '180 - 280', status: 'Optimal' },
            { name: 'Boron (B)', unit: 'ppm', measuredValue: 0.95, optimalRange: '0.80 - 1.50', status: 'Optimal' },
            { name: 'Zinc (Zn)', unit: 'ppm', measuredValue: 1.45, optimalRange: '1.20 - 2.50', status: 'Optimal' },
          ],
          fertilizerPlan: [
            {
              fertilizer: 'Muriate of Potash (MOP)',
              dosePerBigha: '35 kg',
              applicationStage: 'Post-monsoon ring trench application',
              purpose: 'Enhance fruit brix sweetness and uniform fruit development',
            },
            {
              fertilizer: 'Solubor Boron 20%',
              dosePerBigha: '1.5 kg',
              applicationStage: 'Pre-flowering foliar spray at 2g/L',
              purpose: 'Prevent fruit cracking and optimize flower retention',
            },
          ],
          aiRecommendations: [
            'Orchard soil exhibits high organic balance and fertility with zero heavy metal contamination.',
            'Apply Solubor spray 2 weeks prior to inflorescence emergence for peak fruit set.',
          ],
        },
      },
      {
        id: 'SL-2026-8943',
        farmerName: 'Kabir Hossain',
        phone: '+880 1911-556677',
        email: 'kabir.hossain@yahoo.com',
        district: 'Dinajpur',
        upazila: 'Birganj',
        villagePlot: 'Mohonpur, North Plot 7',
        landArea: '3 Bigha',
        targetCrop: 'Maize & Mustard',
        packageId: 'pkg-basic',
        packageName: 'Essential Soil Fertility Package',
        amount: 850,
        pickupMethod: 'Courier Delivery',
        paymentMethod: 'Rocket',
        transactionId: 'RK8810231P',
        paymentStatus: 'Paid',
        status: 'Lab Testing',
        requestDate: '13 Oct 2026',
      },
      {
        id: 'SL-2026-8944',
        farmerName: 'Suraiya Begum',
        phone: '+880 1610-998877',
        email: 'suraiya.begum@gmail.com',
        district: 'Mymensingh',
        upazila: 'Trishal',
        villagePlot: 'Boilor, Agro Farm 2',
        landArea: '2 Bigha',
        targetCrop: 'Greenhouse Capsicum & Strawberry',
        packageId: 'pkg-standard',
        packageName: 'Standard 16-Parameter Lab Diagnostic',
        amount: 1650,
        pickupMethod: 'Agent Field Pickup',
        paymentMethod: 'Cash on Pickup',
        paymentStatus: 'Pending Payment',
        status: 'Pending Pickup',
        requestDate: '14 Oct 2026',
      },
    ];

    this.saveData();
  }

  private saveData() {
    try {
      const dataDir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.storageFilePath, JSON.stringify(this.requests, null, 2), 'utf8');
    } catch (err) {
      this.logger.error('Failed to save soil test requests to disk:', err);
    }
  }

  findAll(): SoilTestRequest[] {
    return this.requests;
  }

  findOne(id: string): SoilTestRequest {
    const found = this.requests.find((r) => r.id === id);
    if (!found) {
      throw new NotFoundException(`Soil test request ${id} not found`);
    }
    return found;
  }

  create(dto: any): SoilTestRequest {
    const generatedId = dto.id || `SL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const newRequest: SoilTestRequest = {
      id: generatedId,
      farmerName: dto.farmerName,
      phone: dto.phone,
      email: dto.email || `${dto.farmerName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      district: dto.district,
      upazila: dto.upazila || 'Sadar Upazila',
      villagePlot: dto.villagePlot || 'Farmland Plot',
      landArea: dto.landArea || '3 Bigha',
      targetCrop: dto.targetCrop || 'Seasonal Crops',
      packageId: dto.packageId || 'pkg-standard',
      packageName: dto.packageName || 'Standard 16-Parameter Lab Diagnostic',
      amount: dto.amount || 1650,
      pickupMethod: dto.pickupMethod || 'Agent Field Pickup',
      paymentMethod: dto.paymentMethod || 'bKash',
      transactionId: dto.transactionId,
      paymentStatus: dto.paymentStatus || 'Paid',
      status: dto.status || 'Pending Pickup',
      requestDate: dto.requestDate || today,
    };

    this.requests.unshift(newRequest);
    this.saveData();
    this.logger.log(`Created new soil test request ${newRequest.id} for ${newRequest.farmerName}`);
    return newRequest;
  }

  updateStatus(id: string, status: string): SoilTestRequest {
    const request = this.findOne(id);
    request.status = status as SoilTestStatus;
    this.saveData();
    return request;
  }

  publishReport(id: string, reportData: any): SoilTestRequest {
    const request = this.findOne(id);
    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const fullLabReport: SoilLabReport = {
      sampleId: request.id,
      reportDate: today,
      soilTexture: reportData.soilTexture || 'Clay Loam (Rich Alluvial)',
      labTechnician: reportData.labTechnician || 'Dr. Agricultural Specialist (Chief Agronomist)',
      accreditation: reportData.accreditation || 'ISO/IEC 17025 Accredited AgriLab Bogura',
      overallHealthScore: reportData.overallHealthScore || 85,
      parameters: reportData.parameters || [],
      fertilizerPlan: reportData.fertilizerPlan || [],
      aiRecommendations: reportData.aiRecommendations || [],
    };

    request.status = 'Completed';
    request.completedDate = today;
    request.labReport = fullLabReport;

    this.saveData();
    this.logger.log(`Published lab report for soil test request ${request.id}`);
    return request;
  }
}
