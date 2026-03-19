import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import pool from '../config/database.js';
import { getTodayMilkSummary, getTodayFeedSummary, getCowStatusSummary, getActivitySummary } from './dashboardService.js';
import { getMilkLogByDate } from './milkService.js';

export async function getDailyReportData(dateStr) {
  const milkSummary = await getTodayMilkSummary(dateStr);
  const feedSummary = await getTodayFeedSummary(dateStr);
  const cowSummary = await getCowStatusSummary();
  const activitySummary = await getActivitySummary();
  
  const milkLogs = await getMilkLogByDate(dateStr);
  
  const feedLogsResult = await pool.query(
    `SELECT l.feed_item_id, m.item_name, c.category_name, l.quantity_kg, l.total_amount
     FROM feed_log l
     JOIN feed_item_master m ON l.feed_item_id = m.id
     JOIN feed_category_master c ON m.category_id = c.id
     WHERE l.date = $1`, [dateStr]
  );
  
  return {
    date: dateStr,
    summary: {
      totalCows: cowSummary.total,
      milkingCows: cowSummary.milking,
      pregnantCows: cowSummary.pregnant,
      sickCows: cowSummary.sick,
      totalMilkLitre: milkSummary.total,
      averageMilkLitre: milkSummary.average,
      topCow: milkSummary.top_cow,
      lowCow: milkSummary.low_cow,
      totalFeedKg: feedSummary.total_kg,
      totalFeedCost: feedSummary.total_cost,
    },
    milkDetails: milkLogs,
    feedDetails: feedLogsResult.rows,
    activities: {
      pending: activitySummary.pending,
      completed: activitySummary.completed
    }
  };
}

export function generatePDFReport(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // --- HELPER: Draw Table Row ---
      const drawTableRow = (y, col1, col2, col3, col4, isHeader = false) => {
        doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor('#1e293b');
        doc.text(col1, 55, y);
        doc.text(col2, 200, y);
        doc.text(col3, 350, y);
        if (col4) doc.text(col4, 460, y);
        // horizontal line below text
        doc.moveTo(50, y + 15).lineTo(545, y + 15).lineWidth(0.5).stroke('#e2e8f0');
      };

      // 1. Title Header
      doc.rect(0, 0, 600, 80).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('Dairy Farm Daily Report', 0, 25, { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Date: ${data.date}`, 0, 55, { align: 'center' });
      doc.fillColor('#1e293b');
      doc.moveDown(4);

      // 2. Summary Cards
      let currentY = 110;
      doc.fontSize(16).font('Helvetica-Bold').text('Farm Summary', 50, currentY);
      currentY += 25;
      
      // Box 1: Milk
      doc.rect(50, currentY, 150, 60).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(10).text('Total Milk', 60, currentY + 10);
      doc.fillColor('#10b981').fontSize(16).font('Helvetica-Bold').text(`${data.summary.totalMilkLitre || 0} L`, 60, currentY + 30);
      
      // Box 2: Feed
      doc.rect(220, currentY, 150, 60).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(10).text('Total Feed', 230, currentY + 10);
      doc.fillColor('#f59e0b').fontSize(16).font('Helvetica-Bold').text(`${data.summary.totalFeedKg || 0} kg`, 230, currentY + 30);
      
      // Box 3: Cows
      doc.rect(390, currentY, 150, 60).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(10).text('Active Cows', 400, currentY + 10);
      doc.fillColor('#3b82f6').fontSize(16).font('Helvetica-Bold').text(`${data.summary.milkingCows || 0} Milking`, 400, currentY + 30);

      currentY += 90;

      // 3. Animal Performance
      doc.fillColor('#1e293b').fontSize(16).font('Helvetica-Bold').text('Animal Performance', 50, currentY);
      currentY += 25;
      doc.fontSize(12).font('Helvetica');
      doc.text(`Top Yielding Cow: ${data.summary.topCow || 'N/A'}`, 50, currentY);
      doc.text(`Lowest Yielding Cow: ${data.summary.lowCow || 'N/A'}`, 300, currentY);
      
      currentY += 20;
      doc.text(`Completed Activities: ${data.activities.completed}`, 50, currentY);
      doc.text(`Pending Activities: ${data.activities.pending}`, 300, currentY);
      
      currentY += 40;

      // 4. Milk Table
      doc.fontSize(16).font('Helvetica-Bold').text('Milk Yield Log', 50, currentY);
      currentY += 25;
      
      // Table Header Background
      doc.rect(50, currentY - 5, 495, 20).fill('#f1f5f9');
      drawTableRow(currentY, 'Cow ID', 'Session', 'Yield (L)', 'Recorded Time', true);
      currentY += 25;

      if (data.milkDetails.length === 0) {
        doc.fontSize(12).font('Helvetica-Oblique').text('No milk logs recorded for this date.', 55, currentY);
        currentY += 25;
      } else {
        data.milkDetails.forEach(log => {
          if (currentY > 750) { doc.addPage(); currentY = 50; } // Page break
          drawTableRow(currentY, log.cow_id, log.session, `${Number(log.milk_qty_litre).toFixed(2)} L`, new Date(log.recorded_at).toLocaleTimeString());
          currentY += 20;
        });
      }

      currentY += 30;
      if (currentY > 700) { doc.addPage(); currentY = 50; }

      // 5. Feed Table
      doc.fontSize(16).font('Helvetica-Bold').text('Feed Log', 50, currentY);
      currentY += 25;
      
      doc.rect(50, currentY - 5, 495, 20).fill('#f1f5f9');
      drawTableRow(currentY, 'Feed Category', 'Feed Item', 'Quantity (kg)', 'Cost (Rs)', true);
      currentY += 25;

      if (data.feedDetails.length === 0) {
        doc.fontSize(12).font('Helvetica-Oblique').text('No feed logs recorded for this date.', 55, currentY);
      } else {
        data.feedDetails.forEach(log => {
          if (currentY > 750) { doc.addPage(); currentY = 50; }
          drawTableRow(currentY, log.category_name, log.item_name, `${Number(log.quantity_kg).toFixed(2)} kg`, `Rs. ${Number(log.total_amount).toFixed(2)}`);
          currentY += 20;
        });
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#94a3b8').text(
          `Generated by DairySense V2 - Page ${i + 1} of ${pages.count}`,
          50,
          800,
          { align: 'center', width: 500 }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function sendReportEmail(pdfBuffer, dateStr) {
  const { EMAIL_USER, EMAIL_PASS, CLIENT_EMAIL } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS || !CLIENT_EMAIL || EMAIL_USER === 'your_email@gmail.com') {
    console.warn('Email credentials not configured in .env. Skipping automated email delivery.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"DairySense Alerts" <${EMAIL_USER}>`,
    to: CLIENT_EMAIL,
    subject: `Daily Farm Master Report: ${dateStr}`,
    text: `Hello,\n\nPlease find the attached comprehensive Farm Master Report for ${dateStr}.\n\nRegards,\nDairySense V2 Auto-Bot`,
    attachments: [
      {
        filename: `DairySense_Report_${dateStr}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  await transporter.sendMail(mailOptions);
  console.log(`Email report sent to ${CLIENT_EMAIL} for ${dateStr}`);
}

// Init Daily Cron Job at 8 PM (20:00)
cron.schedule('0 20 * * *', async () => {
  console.log('Running daily master report cron job (8:00 PM)...');
  try {
    const dateStr = new Date().toISOString().split('T')[0];
    const data = await getDailyReportData(dateStr);
    const pdfBuffer = await generatePDFReport(data);
    await sendReportEmail(pdfBuffer, dateStr);
  } catch (err) {
    console.error('Failed to run daily report cron job:', err);
  }
});
