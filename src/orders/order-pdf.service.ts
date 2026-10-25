import { Injectable, NotFoundException } from '@nestjs/common';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrdersService } from './orders.service.js';

@Injectable()
export class OrderPdfService {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Generates a clean, simple, and beautifully aligned official A4 invoice PDF.
   */
  async generateInvoicePdf(idOrNumber: string): Promise<{ buffer: Buffer; filename: string }> {
    const order = await this.ordersService.findOne(idOrNumber);
    if (!order) {
      throw new NotFoundException(`Order ${idOrNumber} not found`);
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const margin = 14;
    const contentWidth = pageWidth - margin * 2; // 182mm

    // Professional Brand Color Palette
    const darkGreen: [number, number, number] = [14, 49, 40]; // #0E3128
    const lightBg: [number, number, number] = [245, 249, 250]; // #F5F9FA
    const textDark: [number, number, number] = [15, 23, 42]; // #0F172A
    const textMuted: [number, number, number] = [100, 116, 139]; // #64748B
    const borderColor: [number, number, number] = [226, 232, 240]; // #E2E8F0

    // ==========================================
    // 1. TOP HEADER BANNER
    // ==========================================
    doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.roundedRect(margin, 12, contentWidth, 26, 3, 3, 'F');

    // Brand Title & Tagline
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('KrishiKunjo Agro AI', margin + 6, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 255, 84); // Lime accent #CBFF54
    doc.text('Smart Agriculture & Cold-Chain Supply Distribution', margin + 6, 28);
    doc.setTextColor(220, 230, 225);
    doc.setFontSize(7.5);
    doc.text(
      'Dhaka Central Hub & Regional Farm Depot | Helpline: 16123 | support@agroai.bd',
      margin + 6,
      33
    );

    // Official Tax Invoice Badge Card on Right
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - margin - 52, 16, 46, 18, 2, 2, 'F');
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('TAX INVOICE', pageWidth - margin - 29, 22, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`INV-${order.orderNumber}`, pageWidth - margin - 29, 26.5, { align: 'center' });
    doc.text(
      `${order.orderDate || new Date().toISOString().slice(0, 10)}`,
      pageWidth - margin - 29,
      31,
      { align: 'center' }
    );

    // ==========================================
    // 2. BILLED TO & DISPATCH INFO (TWO COLUMNS)
    // ==========================================
    const cardY = 43;
    const cardWidth = (contentWidth - 6) / 2; // 88mm
    const cardHeight = 36;

    // Left Card: Customer / Billed To
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(margin, cardY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('BILLED & DELIVERED TO:', margin + 4, cardY + 6);

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(String(order.customerName || 'Valued Farmer'), margin + 4, cardY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Phone: ${order.customerPhone || 'N/A'}`, margin + 4, cardY + 17);
    if (order.customerEmail) {
      doc.text(`Email: ${order.customerEmail}`, margin + 4, cardY + 22);
    }
    const addressText = `${order.deliveryAddress || ''}, ${order.district || ''}`;
    const splitAddress = doc.splitTextToSize(`Address: ${addressText}`, cardWidth - 8);
    doc.text(splitAddress, margin + 4, cardY + (order.customerEmail ? 27 : 22));

    // Right Card: Order & Logistics
    const rightCardX = margin + cardWidth + 6;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(rightCardX, cardY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('DISPATCH & PAYMENT INFO:', rightCardX + 4, cardY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    doc.text('Order #:', rightCardX + 4, cardY + 12);
    doc.setFont('helvetica', 'bold');
    doc.text(String(order.orderNumber), rightCardX + cardWidth - 4, cardY + 12, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('Courier Partner:', rightCardX + 4, cardY + 17);
    doc.text(
      String(order.courierName || 'KrishiKunjo Logistics'),
      rightCardX + cardWidth - 4,
      cardY + 17,
      { align: 'right' }
    );

    doc.text('Payment Method:', rightCardX + 4, cardY + 22);
    doc.text(
      String(order.paymentMethod || 'Cash on Delivery'),
      rightCardX + cardWidth - 4,
      cardY + 22,
      { align: 'right' }
    );

    doc.text('Payment Status:', rightCardX + 4, cardY + 27);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Green
    doc.text(String(order.paymentStatus || 'Paid'), rightCardX + cardWidth - 4, cardY + 27, {
      align: 'right',
    });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Delivery Status:', rightCardX + 4, cardY + 32);
    doc.setFont('helvetica', 'bold');
    doc.text(String(order.status || 'Processing'), rightCardX + cardWidth - 4, cardY + 32, {
      align: 'right',
    });

    // ==========================================
    // 3. ORDER ITEMS TABLE (jspdf-autotable)
    // ==========================================
    const tableData = (order.items || []).map((it: any, idx: number) => [
      String(idx + 1),
      String(it.productName || 'Agricultural Supply Item'),
      String(it.sku || `SKU-${idx + 1}`),
      String(it.quantity || 1),
      `BDT ${Number(it.price || 0).toFixed(2)}`,
      `BDT ${(Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2)}`,
    ]);

    (autoTable as any)(doc, {
      startY: 83,
      head: [['#', 'Item Description', 'SKU / Code', 'Qty', 'Unit Price', 'Subtotal']],
      body: tableData,
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: {
        fillColor: [14, 49, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
        cellPadding: 3.5,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 23, 42],
        cellPadding: 3,
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      alternateRowStyles: {
        fillColor: [250, 252, 253],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 70, fontStyle: 'bold' },
        2: { cellWidth: 32, font: 'courier' },
        3: { halign: 'center', cellWidth: 15, fontStyle: 'bold' },
        4: { halign: 'right', cellWidth: 26 },
        5: { halign: 'right', cellWidth: 29, fontStyle: 'bold' },
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 150;

    // ==========================================
    // 4. FINANCIAL BREAKDOWN & QUALITY GUARANTEE
    // ==========================================
    const totalBoxWidth = 74;
    const totalBoxX = pageWidth - margin - totalBoxWidth;

    // Agronomy Guarantee Box (Left)
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.setDrawColor(187, 247, 208); // emerald-200
    doc.roundedRect(margin, finalY, contentWidth - totalBoxWidth - 8, 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(21, 128, 61); // emerald-700
    doc.text('Certified Quality & Agronomy Guarantee', margin + 4, finalY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const guaranteeText = doc.splitTextToSize(
      'All agricultural supplies (certified seeds, plant nutrition, organic inputs) have been verified for germination purity and cold-chain compliance. For field returns or advisory support, call national helpline 16123.',
      contentWidth - totalBoxWidth - 16
    );
    doc.text(guaranteeText, margin + 4, finalY + 12);

    // Totals Box (Right)
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(totalBoxX, finalY, totalBoxWidth, 34, 2, 2, 'FD');

    let rowY = finalY + 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('Items Subtotal:', totalBoxX + 4, rowY);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`BDT ${Number(order.subtotal || 0).toFixed(2)}`, totalBoxX + totalBoxWidth - 4, rowY, {
      align: 'right',
    });

    rowY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('Cold-Chain Delivery:', totalBoxX + 4, rowY);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(
      order.deliveryFee === 0 ? 'FREE' : `BDT ${Number(order.deliveryFee || 0).toFixed(2)}`,
      totalBoxX + totalBoxWidth - 4,
      rowY,
      { align: 'right' }
    );

    if (order.discount && Number(order.discount) > 0) {
      rowY += 5.5;
      doc.setTextColor(21, 128, 61);
      doc.text('Package Discount:', totalBoxX + 4, rowY);
      doc.text(
        `-BDT ${Number(order.discount).toFixed(2)}`,
        totalBoxX + totalBoxWidth - 4,
        rowY,
        { align: 'right' }
      );
    }

    // Divider Line
    rowY += 6;
    doc.setDrawColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.setLineWidth(0.4);
    doc.line(totalBoxX + 4, rowY - 1, totalBoxX + totalBoxWidth - 4, rowY - 1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text('TOTAL AMOUNT:', totalBoxX + 4, rowY + 4);
    doc.text(`BDT ${Number(order.total || 0).toFixed(2)}`, totalBoxX + totalBoxWidth - 4, rowY + 4, {
      align: 'right',
    });

    // ==========================================
    // 5. FOOTER & AUTHORIZED SIGNATURE
    // ==========================================
    const footerY = 270;
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text('KrishiKunjo Agro Technologies Ltd.', margin, footerY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(
      'System-generated official tax invoice & delivery receipt. Verified on KrishiKunjo Agro Platform.',
      margin,
      footerY + 9
    );
    doc.text(
      'Web: www.agroai.bd | National Hotline: 16123 | Regional Farmgate Dispatch',
      margin,
      footerY + 13
    );

    // Authorized Signature Box
    doc.line(pageWidth - margin - 45, footerY + 8, pageWidth - margin, footerY + 8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(
      'Authorized Dispatch Officer',
      pageWidth - margin - 22.5,
      footerY + 11.5,
      { align: 'center' }
    );

    const buffer = Buffer.from(doc.output('arraybuffer'));
    const filename = `Invoice_${order.orderNumber}.pdf`;

    return { buffer, filename };
  }
}
