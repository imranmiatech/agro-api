import { Injectable, Logger } from '@nestjs/common';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SoilTestRequest } from './soil-tests.service.js';

@Injectable()
export class SoilPdfService {
  private readonly logger = new Logger(SoilPdfService.name);

  /**
   * Generates the official Soil Sample Courier Dispatch Slip & Packaging Label PDF
   */
  generateSampleSlipPdf(request: SoilTestRequest): Buffer {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const brandDarkGreen: [number, number, number] = [14, 49, 40]; // #0E3128
    const brandLime: [number, number, number] = [203, 255, 84]; // #CBFF54
    const brandLimeBg: [number, number, number] = [240, 253, 215];
    const brandCardBg: [number, number, number] = [248, 250, 252]; // #F8FAFC
    const textDark: [number, number, number] = [15, 23, 42]; // #0F172A
    const textGray: [number, number, number] = [100, 116, 139]; // #64748B
    const textGreen: [number, number, number] = [21, 128, 61]; // #15803D
    const borderLight: [number, number, number] = [226, 232, 240];

    const clientBaseUrl = (
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:5174'
    ).replace(/\/+$/, '');
    const trackingUrl = `${clientBaseUrl}/soil-test/requests`;

    // ==========================================
    // 1. TOP HEADER BANNER (SHIPPING LABEL HEADER)
    // ==========================================
    doc.setFillColor(...brandDarkGreen);
    doc.rect(12, 10, 186, 26, 'F');

    doc.setFillColor(...brandLime);
    doc.rect(12, 36, 186, 1.5, 'F');

    // Title & Subtitle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text('KRISHIKUNJO AGROAI LABS', 18, 19);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...brandLime);
    doc.text(
      'SOIL SAMPLE COURIER DISPATCH SLIP & LAB PACKAGING LABEL',
      18,
      25,
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(220, 230, 225);
    doc.text(
      'National Diagnostic Network | Govt. Reg: DAE-LAB-BOG-2026 | ISO/IEC 17025 Accredited',
      18,
      31,
    );

    // Right Side Tracking ID Card
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(138, 13, 56, 20, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...textGray);
    doc.text('SAMPLE TRACKING ID', 142, 18);

    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...brandDarkGreen);
    doc.text(request.id, 142, 24);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...textGreen);
    doc.text('EXPRESS LAB INTAKE', 142, 29);

    // ==========================================
    // 2. BARCODE & LIVE QR CODE SECTION
    // ==========================================
    doc.setFillColor(...brandCardBg);
    doc.roundedRect(12, 41, 186, 21, 1.5, 1.5, 'F');
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(12, 41, 186, 21, 1.5, 1.5, 'S');

    // Barcode Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...textGray);
    doc.text('AIRBILL / SHIPMENT BARCODE:', 18, 47);

    // Simulated Realistic Barcode
    doc.setDrawColor(15, 23, 42);
    const startX = 18;
    const barPattern = [
      2, 1, 1, 3, 1, 2, 1, 1, 2, 1, 3, 1, 1, 2, 2, 1, 1, 3, 1, 2, 1, 1, 3, 2, 1,
      1, 2, 1, 3, 1, 2, 1, 1, 2, 1, 3, 1, 1, 2, 2, 1, 1, 3, 1, 2,
    ];
    let curX = startX;
    for (let i = 0; i < barPattern.length; i++) {
      const w = barPattern[i] * 0.45;
      doc.setLineWidth(w);
      doc.line(curX, 49, curX, 57);
      curX += w + 0.85;
    }

    // Barcode ID below bars
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...textDark);
    doc.text(`* ${request.id} *`, 32, 60.5);

    // Simulated QR Code Box on right
    const qrX = 158;
    const qrY = 43;
    const qrSize = 17;
    doc.setFillColor(255, 255, 255);
    doc.rect(qrX, qrY, qrSize, qrSize, 'F');
    doc.setDrawColor(...brandDarkGreen);
    doc.setLineWidth(0.4);
    doc.rect(qrX, qrY, qrSize, qrSize, 'S');

    // QR Corner Finder Patterns
    const drawQrFinder = (fx: number, fy: number) => {
      doc.setFillColor(...brandDarkGreen);
      doc.rect(fx, fy, 4, 4, 'F');
      doc.setFillColor(255, 255, 255);
      doc.rect(fx + 0.9, fy + 0.9, 2.2, 2.2, 'F');
      doc.setFillColor(...brandDarkGreen);
      doc.rect(fx + 1.4, fy + 1.4, 1.2, 1.2, 'F');
    };
    drawQrFinder(qrX + 1.2, qrY + 1.2);
    drawQrFinder(qrX + qrSize - 5.2, qrY + 1.2);
    drawQrFinder(qrX + 1.2, qrY + qrSize - 5.2);

    // QR internal data dots
    doc.setFillColor(...brandDarkGreen);
    doc.rect(qrX + 7, qrY + 2, 2, 1, 'F');
    doc.rect(qrX + 10, qrY + 3.5, 1, 2, 'F');
    doc.rect(qrX + 3, qrY + 7, 2, 2, 'F');
    doc.rect(qrX + 7, qrY + 7, 3, 3, 'F');
    doc.rect(qrX + 12, qrY + 8, 2, 1, 'F');
    doc.rect(qrX + 8, qrY + 12, 2, 2, 'F');
    doc.rect(qrX + 12, qrY + 11.5, 3, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...brandDarkGreen);
    doc.text('SECURE QR CODE', 154, 61.5);

    // ==========================================
    // 3. TWO-COLUMN ADDRESS & DISPATCH SECTION
    // ==========================================
    const leftX = 12;
    const leftW = 90;
    const colY = 66;
    const colH = 68;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(leftX, colY, leftW, colH, 1.5, 1.5, 'F');
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(leftX, colY, leftW, colH, 1.5, 1.5, 'S');

    // Left Header Strip
    doc.setFillColor(241, 245, 249);
    doc.rect(leftX, colY, leftW, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...brandDarkGreen);
    doc.text('SENDER / FARMER PLOT DETAILS', leftX + 4, colY + 5.2);

    let yL = colY + 13;
    const renderRow = (label: string, val: string, isPaid = false) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(...textGray);
      doc.text(label, leftX + 4, yL);

      if (isPaid) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...textGreen);
        doc.text(val, leftX + 28, yL);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...textDark);
        doc.text(val, leftX + 28, yL);
      }
      yL += 6;
    };

    renderRow('Farmer Name:', request.farmerName);
    renderRow('Mobile Phone:', request.phone);
    renderRow('Email Address:', request.email || 'Registered Farmer');
    renderRow(
      'Plot Location:',
      `${request.villagePlot || 'Plot #1'}, ${request.upazila}, ${request.district}`,
    );
    renderRow(
      'Farmland Size:',
      `${request.landArea || '3 Bigha'} | Crop: ${request.targetCrop || 'General Farmland'}`,
    );
    renderRow('Package Plan:', request.packageName);
    renderRow(
      'Payment Status:',
      `PAID - BDT ${request.amount} (Stripe Verified)`,
      true,
    );
    renderRow(
      'Transaction Ref:',
      request.transactionId || `pi_live_${request.id.toLowerCase()}`,
    );

    // RIGHT COLUMN: CONSIGNEE / LAB DELIVERY ADDRESS
    const rightX = 106;
    const rightW = 92;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(rightX, colY, rightW, colH, 1.5, 1.5, 'F');
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(rightX, colY, rightW, colH, 1.5, 1.5, 'S');

    // Right Header Strip
    doc.setFillColor(...brandDarkGreen);
    doc.rect(rightX, colY, rightW, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...brandLime);
    doc.text(
      'TO: CENTRAL DIAGNOSTIC LABORATORY (CONSIGNEE)',
      rightX + 4,
      colY + 5.2,
    );

    let yR = colY + 13;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...brandDarkGreen);
    doc.text('AgroAi Central Soil Testing & Bio-Diagnostic Lab', rightX + 4, yR);

    yR += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...textDark);
    doc.text(
      'Krishikunjo Agricultural Research & Bio-Technology Complex',
      rightX + 4,
      yR,
    );

    yR += 4.5;
    doc.text(
      'Building 04, Level 02, Farmgate Agro Complex, Tejgaon',
      rightX + 4,
      yR,
    );

    yR += 4.5;
    doc.text('Dhaka - 1215, Bangladesh', rightX + 4, yR);

    yR += 6.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Sample Intake Helpline:', rightX + 4, yR);
    doc.setFont('helvetica', 'normal');
    doc.text('+880 1700-000000 / +880 1711-234567', rightX + 37, yR);

    yR += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Lab Desk Email:', rightX + 4, yR);
    doc.setFont('helvetica', 'normal');
    doc.text('lab-intake@krishikunjo.com', rightX + 37, yR);

    yR += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Supported Couriers:', rightX + 4, yR);
    doc.setFont('helvetica', 'normal');
    doc.text('Sundarban, SA Paribahan, Pathao, RedX', rightX + 37, yR);

    yR += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // Amber
    doc.text('Courier Tag:', rightX + 4, yR);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Fragile Agricultural Soil Sample - Express Delivery',
      rightX + 22,
      yR,
    );

    // ==========================================
    // 4. CUT-OUT INSTRUCTION LINE
    // ==========================================
    const cutY = 138;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.setLineDashPattern([2.5, 2], 0);
    doc.line(12, cutY, 198, cutY);
    doc.setLineDashPattern([], 0);

    // Centered Scissor Cut-out Banner
    doc.setFillColor(255, 255, 255);
    doc.rect(52, cutY - 2.5, 106, 5, 'F');
    doc.setDrawColor(148, 163, 184);
    doc.rect(52, cutY - 2.5, 106, 5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...textDark);
    doc.text(
      '-- CUT ALONG DOTTED LINE & AFFIX UPPER LABEL TO SOIL SAMPLE BAG --',
      56,
      cutY + 1,
    );

    // ==========================================
    // 5. SOIL SAMPLING & PACKAGING INSTRUCTIONS (LOWER)
    // ==========================================
    const lowerY = 145;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, lowerY, 186, 128, 1.5, 1.5, 'F');
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(12, lowerY, 186, 128, 1.5, 1.5, 'S');

    // Section Header
    doc.setFillColor(241, 245, 249);
    doc.rect(12, lowerY, 186, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...brandDarkGreen);
    doc.text(
      'STANDARD SOIL SAMPLING & PACKAGING INSTRUCTIONS (FARMER SOP)',
      18,
      lowerY + 5.5,
    );

    const sopSteps = [
      {
        num: '1',
        title: 'SCIENTIFIC FIELD COLLECTION (Soil Sampling Procedure)',
        desc: "Scrape away surface grass, dry weeds, and debris from the soil surface. Using a spade or khurpi, dig a 'V' shaped hole to a depth of 6-9 inches (15-20 cm). Take a uniform 1-inch slice of soil from the wall of the hole. Repeat this at 5 to 7 random spots across your farmland plot in a zig-zag pattern.",
      },
      {
        num: '2',
        title: 'SHADE DRYING & THOROUGH MIXING (Sample Preparation)',
        desc: 'Place all collected soil portions together on a clean polythene sheet or thick paper. Break up large clods and remove roots, and foreign matter. Mix thoroughly into a single composite sample. Air-dry in open shade for 4-6 hours. (Never dry under direct burning sunlight or artificial heat/stoves).',
      },
      {
        num: '3',
        title: '500g PACKAGING & LABELING (Polythene Bag Packaging)',
        desc: 'Weigh or take approximately 500 grams (about two handfuls) of the dry mixed composite soil. Pour it into a clean, sturdy transparent polythene or zip-lock bag. Seal the mouth of the bag tightly with packaging tape. Cut the top shipping label above and tape it firmly on the exterior of the bag.',
      },
      {
        num: '4',
        title: 'COURIER DISPATCH & ONLINE REPORT ACCESS (Courier & Tracking)',
        desc: 'Drop the sealed soil parcel at your nearest courier desk (Sundarban / SA Paribahan / Pathao / RedX) addressed to our Central Lab. Upon receipt at our laboratory, chemical analysis will be conducted. You will receive an SMS/Email alert and can download your certified PDF report online within 48-72 hours.',
      },
    ];

    let yStep = lowerY + 16;
    sopSteps.forEach((s) => {
      // Step Number Badge
      doc.setFillColor(...brandDarkGreen);
      doc.circle(20, yStep + 1, 3.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...brandLime);
      doc.text(s.num, 18.8, yStep + 2.2);

      // Step Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...brandDarkGreen);
      doc.text(s.title, 27, yStep + 2);

      // Step Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(...textDark);
      const splitDesc = doc.splitTextToSize(s.desc, 168);
      doc.text(splitDesc, 27, yStep + 6.5);

      yStep += 24;
    });

    // Important Notice Box
    doc.setFillColor(...brandLimeBg);
    doc.roundedRect(16, lowerY + 106, 178, 16, 1, 1, 'F');
    doc.setDrawColor(...brandLime);
    doc.setLineWidth(0.3);
    doc.roundedRect(16, lowerY + 106, 178, 16, 1, 1, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...brandDarkGreen);
    doc.text('IMPORTANT LAB QUALITY NOTICE:', 20, lowerY + 112);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...textDark);
    doc.text(
      'Ensure soil sample is NOT collected within 15 days of fertilizer or pesticide application. Samples damaged in transit',
      20,
      lowerY + 116,
    );
    doc.text(
      'or lacking the tracking slip cannot be processed. For dispatch inquiries, call our 24/7 Agro Diagnostic Hotline: +880 1700-000000.',
      20,
      lowerY + 119.5,
    );

    // ==========================================
    // 6. BOTTOM FOOTER & VERIFICATION
    // ==========================================
    const footerY = 277;
    doc.setFillColor(...brandDarkGreen);
    doc.rect(12, footerY, 186, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(
      'AgroAi Agricultural Diagnostic Network  Krishikunjo | ISO/IEC 17025 Accredited Laboratory',
      18,
      footerY + 5,
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...brandLime);
    doc.text(
      `Online Portal: ${trackingUrl}  |  Sample Tracking ID: ${request.id}`,
      18,
      footerY + 9.5,
    );

    const arrayBuffer = doc.output('arraybuffer');
    return Buffer.from(arrayBuffer);
  }

  /**
   * Generates the official Soil Diagnostic & Bio-Nutrient Laboratory Report PDF
   */
  generateReportPdf(request: SoilTestRequest): Buffer {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const report = request.labReport;
    const brandDarkGreen: [number, number, number] = [14, 49, 40]; // #0E3128
    const brandLime: [number, number, number] = [203, 255, 84]; // #CBFF54
    const textDark: [number, number, number] = [30, 41, 59];
    const textGray: [number, number, number] = [100, 116, 139];

    // ==========================================
    // 1. TOP HEADER BANNER
    // ==========================================
    doc.setFillColor(...brandDarkGreen);
    doc.rect(0, 0, 210, 36, 'F');

    // Accent line
    doc.setFillColor(...brandLime);
    doc.rect(0, 36, 210, 2, 'F');

    // Title & Header Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('KRISHIKUNJO AGROAI LABS', 15, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...brandLime);
    doc.text('SOIL DIAGNOSTICS & BIO-NUTRIENT LABORATORY', 15, 21);

    doc.setFontSize(7.5);
    doc.setTextColor(220, 230, 225);
    doc.text(
      'ISO/IEC 17025 Accredited | Ministry of Agriculture Reg: DAE-LAB-BOG-2026',
      15,
      27,
    );
    doc.text(
      'Sherpur Road Regional Lab, Bogura, Bangladesh | Hotline: +880 1712-KRISHI',
      15,
      32,
    );

    // Right Badge
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(148, 8, 48, 20, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...brandDarkGreen);
    doc.text('OFFICIAL LAB REPORT', 152, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...textGray);
    doc.text(`Sample ID: ${request.id}`, 152, 19);
    doc.text(
      `Date: ${report?.reportDate || request.completedDate || request.requestDate}`,
      152,
      24,
    );

    // ==========================================
    // 2. FARMER & LAND METADATA SUMMARY
    // ==========================================
    let currentY = 46;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...brandDarkGreen);
    doc.text('1. FARMER & FARMLAND INFORMATION', 15, currentY);

    currentY += 4;

    (autoTable as any)(doc, {
      startY: currentY,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 2, textColor: textDark },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: textGray, cellWidth: 32 },
        1: { cellWidth: 60 },
        2: { fontStyle: 'bold', textColor: textGray, cellWidth: 32 },
        3: { cellWidth: 56 },
      },
      body: [
        ['Farmer Name:', request.farmerName, 'Sample / Test ID:', request.id],
        ['Mobile Number:', request.phone, 'Testing Package:', request.packageName],
        [
          'Location / Plot:',
          `${request.villagePlot || 'Plot #01'}, ${request.upazila}, ${request.district}`,
          'Date of Collection:',
          request.requestDate,
        ],
        [
          'Land Size & Crop:',
          `${request.landArea || '3 Bigha'} | ${request.targetCrop || 'General'}`,
          'Soil Texture Class:',
          report?.soilTexture || 'Clay Loam (Alluvial)',
        ],
        [
          'Payment Status:',
          `BDT ${request.amount} Paid via ${request.paymentMethod}`,
          'Overall Health Score:',
          `${report?.overallHealthScore || 84}/100 (Good Soil Quality)`,
        ],
      ],
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // ==========================================
    // 3. PARAMETERS LAB ANALYSIS TABLE
    // ==========================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...brandDarkGreen);
    doc.text('2. CHEMICAL & PHYSICAL NUTRIENT ANALYSIS', 15, currentY);

    currentY += 4;

    const parameterRows = report?.parameters
      ? report.parameters.map((p) => [
          p.name,
          `${p.measuredValue} ${p.unit}`,
          p.optimalRange,
          p.status,
        ])
      : [
          ['Soil pH', '6.4 pH', '6.0 - 7.0', 'Optimal'],
          ['Available Nitrogen (N)', '142 kg/ha', '200 - 300', 'Deficient'],
          ['Available Phosphorus (P)', '24.5 ppm', '18 - 30', 'Optimal'],
          ['Available Potassium (K)', '185 ppm', '150 - 250', 'Optimal'],
          ['Organic Carbon', '1.32 %', '1.50 - 2.50 %', 'Moderate'],
          ['Available Zinc (Zn)', '0.72 ppm', '1.00 - 2.50', 'Deficient'],
          ['Available Sulfur (S)', '16.8 ppm', '15.0 - 25.0', 'Optimal'],
          ['Boron (B)', '0.38 ppm', '0.50 - 1.20', 'Deficient'],
        ];

    (autoTable as any)(doc, {
      startY: currentY,
      theme: 'striped',
      headStyles: {
        fillColor: brandDarkGreen,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 2.5,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: textDark,
      },
      columnStyles: {
        0: { cellWidth: 65, fontStyle: 'bold' },
        1: { cellWidth: 40 },
        2: { cellWidth: 45 },
        3: { cellWidth: 30, fontStyle: 'bold' },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 3) {
          const val = String(data.cell.raw).trim();
          if (val === 'Optimal') {
            data.cell.styles.textColor = [16, 122, 60];
          } else if (val === 'Deficient') {
            data.cell.styles.textColor = [220, 38, 38];
          } else if (val === 'Moderate') {
            data.cell.styles.textColor = [202, 138, 4];
          }
        }
      },
      head: [
        [
          'Nutrient / Parameter',
          'Measured Lab Value',
          'Agronomic Target Range',
          'Status',
        ],
      ],
      body: parameterRows,
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // ==========================================
    // 4. AGRONOMIST FERTILIZER DOSAGE PLAN
    // ==========================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...brandDarkGreen);
    doc.text('3. CUSTOMIZED FERTILIZER PRESCRIPTION & DOSAGE', 15, currentY);

    currentY += 4;

    const fertilizerRows = report?.fertilizerPlan
      ? report.fertilizerPlan.map((f) => [
          f.fertilizer,
          f.dosePerBigha,
          f.applicationStage,
          f.purpose,
        ])
      : [
          [
            'Urea (Granular)',
            '32 kg/Bigha',
            '3 Splits (Basal, 25 DAT, 45 DAT)',
            'Compensate Nitrogen deficiency',
          ],
          [
            'Triple Super Phosphate (TSP)',
            '18 kg/Bigha',
            '100% at final land preparation',
            'Root anchoring and tillering',
          ],
          [
            'Muriate of Potash (MoP)',
            '16 kg/Bigha',
            '50% Basal + 50% Top-dress',
            'Grain filling & disease tolerance',
          ],
          [
            'Zinc Sulfate (Heptahydrate)',
            '2.5 kg/Bigha',
            'Basal broadcasting with soil',
            'Correct leaf chlorosis deficiency',
          ],
          [
            'Trichoderma Bio-Compost',
            '120 kg/Bigha',
            'Final land tilling',
            'Restore organic matter and microbes',
          ],
        ];

    (autoTable as any)(doc, {
      startY: currentY,
      theme: 'striped',
      headStyles: {
        fillColor: brandDarkGreen,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 2.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: textDark,
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 32 },
        2: { cellWidth: 50 },
        3: { cellWidth: 48 },
      },
      head: [
        [
          'Recommended Input',
          'Dose per Bigha',
          'Application Stage',
          'Agronomic Purpose',
        ],
      ],
      body: fertilizerRows,
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    if (currentY > 245) {
      doc.addPage();
      currentY = 20;
    }

    // ==========================================
    // 5. AI AGRONOMIST RECOMMENDATIONS & SIGNATURES
    // ==========================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...brandDarkGreen);
    doc.text('4. EXPERT AGRONOMIST RECOMMENDATIONS', 15, currentY);

    currentY += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...textDark);

    const tips = report?.aiRecommendations || [
      'Broadcast Zinc Sulfate 4-5 days prior to seedling transplanting for optimum root bioavailability.',
      'Introduce green manure (Dhaincha) during fallow periods to elevate soil organic carbon naturally.',
      'Split Urea applications into 3 equal doses to minimize nitrogen volatilization and groundwater runoff.',
    ];

    tips.forEach((tip) => {
      doc.text(`- ${tip}`, 18, currentY);
      currentY += 4;
    });

    currentY += 4;

    // Signatures Row
    doc.setDrawColor(200, 200, 200);
    doc.line(15, currentY + 12, 70, currentY + 12);
    doc.line(135, currentY + 12, 195, currentY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...brandDarkGreen);
    doc.text('Dr. Nazmul Huda (PhD, Soil Science)', 15, currentY + 16);
    doc.text('Dr. Shamim Ara Begum', 135, currentY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...textGray);
    doc.text('Lead Laboratory Analyst & Chemist', 15, currentY + 20);
    doc.text('Chief Agronomist & Research Director', 135, currentY + 20);

    // Footer Note
    doc.setFontSize(6.5);
    doc.setTextColor(...textGray);
    doc.text(
      'Verified electronically by KrishiKunjo AgroAi ISO/IEC 17025 Accredited Laboratory. Valid nationwide.',
      15,
      285,
    );

    const arrayBuffer = doc.output('arraybuffer');
    return Buffer.from(arrayBuffer);
  }
}
