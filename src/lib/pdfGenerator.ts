import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Evaluation } from "@/types/evaluation";
import { VBMAPPEvaluation, VBMAPPBarrierItem } from "@/types/vbmapp";
import { calculateAge, formatAge, getVBMAPPDevelopmentalAge, getVBMAPPLevelMidpoint, calculateDevelopmentalDelay } from "./ageUtils";
import { ClientInfo } from "@/types/client";
import { getABLLSInterpretation, getVBMAPPInterpretation, getPriorityAreas } from "./clinicalInterpretation";
import { generateABLLSGoals, generateVBMAPPGoals, formatGoalsForPDF, SuggestedGoal } from "./goalGenerator";
import { ABLLS_CATEGORIES } from "@/hooks/useEvaluations";
import { VBMAPP_SKILL_AREAS } from "@/hooks/useVBMAPP";

// Helper to draw radar chart
function drawRadarChart(
  doc: jsPDF,
  evaluation: Evaluation,
  previousEvaluation: Evaluation | null | undefined,
  x: number,
  y: number,
  radius: number
) {
  // ... existing code ...
  const categories = Object.values(evaluation.categorySummaries).sort((a, b) => 
    a.categoryKey.localeCompare(b.categoryKey)
  );
  
  const totalCategories = categories.length;
  const angleStep = (2 * Math.PI) / totalCategories;
  // Start from top (-PI/2)
  const startAngle = -Math.PI / 2;

  // Draw Web (Background)
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.1);
  
  // Concentric circles/polygons (20%, 40%, 60%, 80%, 100%)
  for (let level = 1; level <= 5; level++) {
    const levelRadius = (radius / 5) * level;
    for (let i = 0; i < totalCategories; i++) {
      const angle = startAngle + (i * angleStep);
      const nextAngle = startAngle + ((i + 1) * angleStep);
      
      const x1 = x + levelRadius * Math.cos(angle);
      const y1 = y + levelRadius * Math.sin(angle);
      const x2 = x + levelRadius * Math.cos(nextAngle);
      const y2 = y + levelRadius * Math.sin(nextAngle);
      
      doc.line(x1, y1, x2, y2);
    }
  }

  // Axis lines and Labels
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  
  for (let i = 0; i < totalCategories; i++) {
    const angle = startAngle + (i * angleStep);
    const xEnd = x + radius * Math.cos(angle);
    const yEnd = y + radius * Math.sin(angle);
    
    // Axis line
    doc.line(x, y, xEnd, yEnd);
    
    // Label
    const labelX = x + (radius + 5) * Math.cos(angle);
    const labelY = y + (radius + 5) * Math.sin(angle);
    const cat = categories[i];
    doc.text(cat.categoryKey, labelX, labelY, { align: 'center', baseline: 'middle' });
  }

  // Draw Data Polygons
  const drawPolygon = (evalData: Evaluation, color: [number, number, number], filled: boolean = false) => {
    const points: {x: number, y: number}[] = [];
    
    // Calculate points
    categories.forEach((cat, i) => {
      const angle = startAngle + (i * angleStep);
      const summary = evalData.categorySummaries[cat.categoryKey];
      const score = summary ? summary.percentage : 0;
      const pointRadius = (score / 100) * radius;
      
      points.push({
        x: x + pointRadius * Math.cos(angle),
        y: y + pointRadius * Math.sin(angle)
      });
    });

    // Draw lines
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.5);
    
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      doc.line(p1.x, p1.y, p2.x, p2.y);
    }
  };

  // Draw Previous Evaluation (Gray)
  if (previousEvaluation) {
    drawPolygon(previousEvaluation, [150, 150, 150]);
  }

  // Draw Current Evaluation (Primary Blue)
  drawPolygon(evaluation, [79, 70, 229]);
}

// Helper to draw line chart for history
function drawLineChart(
  doc: jsPDF,
  history: Evaluation[],
  x: number,
  y: number,
  width: number,
  height: number
) {
  // Sort history by date
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.completedAt || a.createdAt).getTime() - new Date(b.completedAt || b.createdAt).getTime()
  );

  const dataPoints = sortedHistory.map(h => ({
    date: new Date(h.completedAt || h.createdAt),
    score: h.overallPercentage
  }));

  if (dataPoints.length < 2) return;

  // Axes
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(x, y + height, x + width, y + height); // X axis
  doc.line(x, y, x, y + height); // Y axis

  // Grid lines (0, 25, 50, 75, 100)
  doc.setDrawColor(240, 240, 240);
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  
  [0, 25, 50, 75, 100].forEach(val => {
    const yPos = y + height - (val / 100) * height;
    doc.line(x, yPos, x + width, yPos);
    doc.text(`${val}%`, x - 2, yPos, { align: 'right', baseline: 'middle' });
  });

  // Plot Line
  const timeStart = dataPoints[0].date.getTime();
  const timeEnd = dataPoints[dataPoints.length - 1].date.getTime();
  const timeSpan = timeEnd - timeStart;

  // Avoid division by zero if all on same day
  const effectiveTimeSpan = timeSpan === 0 ? 1 : timeSpan;

  const points = dataPoints.map(pt => {
    const xPos = x + ((pt.date.getTime() - timeStart) / effectiveTimeSpan) * width;
    const yPos = y + height - (pt.score / 100) * height;
    return { x: xPos, y: yPos, date: pt.date, score: pt.score };
  });

  doc.setDrawColor(79, 70, 229); // Primary Blue
  doc.setLineWidth(1.5);

  for (let i = 0; i < points.length - 1; i++) {
    doc.line(points[i].x, points[i].y, points[i+1].x, points[i+1].y);
  }

  // Draw Dots
  doc.setFillColor(79, 70, 229);
  points.forEach(pt => {
    doc.circle(pt.x, pt.y, 1.5, 'F');
    // Date Label
    const dateStr = pt.date.toLocaleDateString("en-US", { month: 'short', year: '2-digit' });
    doc.text(dateStr, pt.x, y + height + 5, { align: 'center', angle: 45 });
  });
}

export function generateEvaluationPDF(
  evaluation: Evaluation, 
  client: ClientInfo, 
  previousEvaluation?: Evaluation | null,
  history?: Evaluation[]
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Helper for date formatting
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  // --- Header ---
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text("ABLLS Evaluation Report", margin, 30);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Client: ${client.name}`, margin, 40);
  doc.text(`Date: ${formatDate(evaluation.completedAt || evaluation.createdAt)}`, margin, 46);
  doc.text(`Evaluator: ${evaluation.evaluatorName}`, margin, 52);

  // Demographics
  if (client.birthDate) {
    const age = calculateAge(client.birthDate);
    doc.text(`Age: ${formatAge(age)}`, pageWidth / 2, 40);
    doc.text(`DOB: ${formatDate(client.birthDate)}`, pageWidth / 2, 46);
  }
  
  if (client.primaryDiagnosis) {
    doc.text(`Diagnosis: ${client.primaryDiagnosis}${client.diagnosisLevel ? ` (Level ${client.diagnosisLevel})` : ''}`, pageWidth / 2, 52);
  }

  // --- Overall Score Box ---
  const boxTop = 60;
  const boxHeight = 40;
  
  // Background
  doc.setFillColor(245, 247, 255); // Light primary bg
  doc.roundedRect(margin, boxTop, pageWidth - (margin * 2), boxHeight, 3, 3, "F");
  
  // Score text
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229); // Primary color
  doc.text("Overall Score", margin + 10, boxTop + 15);
  
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(`${evaluation.overallPercentage}%`, margin + 10, boxTop + 28);
  
  // Overall Change
  if (previousEvaluation && evaluation.overallPercentage !== undefined) {
    const diff = evaluation.overallPercentage - previousEvaluation.overallPercentage;
    const sign = diff > 0 ? "+" : "";
    const color = diff > 0 ? [22, 163, 74] : diff < 0 ? [220, 38, 38] : [100, 100, 100]; // Green, Red, Gray
    
    doc.setFontSize(12);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(`${sign}${diff}%`, margin + 35, boxTop + 28);
  }
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`(${evaluation.overallScore} / ${evaluation.overallMaxScore} points)`, margin + 55, boxTop + 28);

  // --- Clinical Interpretation ---
  const interpretation = getABLLSInterpretation(evaluation.overallPercentage);
  const interpretY = boxTop + boxHeight + 10;

  doc.setFillColor(245, 250, 255);
  doc.roundedRect(margin, interpretY, pageWidth - (margin * 2), 35, 3, 3, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text(`Clinical Interpretation: ${interpretation.title}`, margin + 5, interpretY + 10);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);

  // Word wrap the description
  const descLines = doc.splitTextToSize(interpretation.description, pageWidth - (margin * 2) - 10);
  doc.text(descLines, margin + 5, interpretY + 18);

  doc.setFont("helvetica", "italic");
  doc.text(interpretation.recommendation, margin + 5, interpretY + 28);
  if (interpretation.interventionHours) {
    doc.text(interpretation.interventionHours, margin + 5, interpretY + 33);
  }

  // --- Category Breakdown Table ---
  const sortedCategories = Object.values(evaluation.categorySummaries)
    .sort((a, b) => a.categoryKey.localeCompare(b.categoryKey));

  const tableData = sortedCategories.map(cat => {
    let changeText = "-";
    if (previousEvaluation && previousEvaluation.categorySummaries[cat.categoryKey]) {
      const prev = previousEvaluation.categorySummaries[cat.categoryKey].percentage;
      const diff = cat.percentage - prev;
      changeText = diff > 0 ? `+${diff}%` : `${diff}%`;
    }

    return [
      cat.categoryKey,
      cat.categoryName,
      `${cat.scoredItems}/${cat.totalItems}`,
      `${cat.percentage}%`,
      changeText
    ];
  });

  autoTable(doc, {
    startY: interpretY + 45,
    head: [['ID', 'Category', 'Items Scored', 'Score %', 'Change']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center', fontStyle: 'bold' },
      4: { halign: 'center', fontStyle: 'italic' }
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    margin: { left: margin, right: margin }
  });

  // --- New Page for Visuals ---
  doc.addPage();
  
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text("Skill Profile & Progress", margin, 30);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Comparison of skill mastery across all categories.", margin, 36);

  // Draw Radar Chart
  const centerX = pageWidth / 2;
  const centerY = 100; // Moved up slightly
  const radius = 60;   // Slightly smaller
  
  drawRadarChart(doc, evaluation, previousEvaluation, centerX, centerY, radius);

  // Legend
  const legendY = 180;
  // Current
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(1);
  doc.line(centerX - 40, legendY, centerX - 20, legendY);
  doc.setTextColor(40, 40, 40);
  doc.text("Current Evaluation", centerX - 15, legendY + 1);
  
  // Previous
  if (previousEvaluation) {
    doc.setDrawColor(150, 150, 150);
    doc.line(centerX + 20, legendY, centerX + 40, legendY);
    doc.text("Previous Evaluation", centerX + 45, legendY + 1);
  }

  // Draw History Line Chart (if applicable)
  if (history && history.length > 1) {
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("Progress Over Time", margin, 210);

    const chartX = margin + 10;
    const chartY = 220;
    const chartWidth = pageWidth - (margin * 2) - 20;
    const chartHeight = 50;
    
    drawLineChart(doc, history, chartX, chartY, chartWidth, chartHeight);
  }

  // --- Suggested IEP Goals ---
  const suggestedGoals = generateABLLSGoals(evaluation, client.name || "Client", ABLLS_CATEGORIES);

  if (suggestedGoals.length > 0) {
    doc.addPage();

    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text("Suggested IEP Goals", margin, 30);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`${suggestedGoals.length} emerging skills identified for goal development`, margin, 38);

    const goalsData = suggestedGoals.slice(0, 10).map((goal, i) => [
      `${i + 1}`,
      goal.skillCode || "",
      goal.itemDescription.length > 40 ? goal.itemDescription.substring(0, 40) + "..." : goal.itemDescription,
      goal.goalText.length > 80 ? goal.goalText.substring(0, 80) + "..." : goal.goalText
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['#', 'Area', 'Skill', 'Goal']],
      body: goalsData,
      theme: 'grid',
      headStyles: {
        fillColor: [217, 119, 6], // Amber
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 50 },
        3: { cellWidth: 95 }
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [255, 251, 235]
      },
      margin: { left: margin, right: margin }
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Goals are auto-generated from emerging skills (scored 1 - Emerging). Review and customize for individual IEP.", margin, (doc as any).lastAutoTable.finalY + 10);
  }

  // --- Signatures ---
  const signatureY = pageHeight - 40;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, signatureY, margin + 80, signatureY);
  doc.line(pageWidth - margin - 80, signatureY, pageWidth - margin, signatureY);
  
  doc.setFontSize(10);
  doc.text("Evaluator Signature", margin, signatureY + 5);
  doc.text("Clinical Director / Supervisor", pageWidth - margin - 80, signatureY + 5);

  // --- Footer ---
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Tempo App - Evaluation Report - Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  // Save the PDF
  const filename = `Evaluation_${client.name.replace(/\s+/g, '_')}_${formatDate(evaluation.createdAt)}.pdf`;
  doc.save(filename);
}

export function generateVBMAPPPDF(
  evaluation: VBMAPPEvaluation,
  client: ClientInfo,
  barriersList: VBMAPPBarrierItem[]
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Helper for date formatting
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  // --- Header ---
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text("VB-MAPP Evaluation Report", margin, 30);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Client: ${client.name}`, margin, 40);
  doc.text(`Date: ${formatDate(evaluation.completedAt || evaluation.createdAt)}`, margin, 46);
  doc.text(`Evaluator: ${evaluation.evaluatorName}`, margin, 52);

  // Demographics
  if (client.birthDate) {
    const age = calculateAge(client.birthDate);
    doc.text(`Age: ${formatAge(age)}`, pageWidth / 2, 40);
    doc.text(`DOB: ${formatDate(client.birthDate)}`, pageWidth / 2, 46);
  }
  
  if (client.primaryDiagnosis) {
    doc.text(`Diagnosis: ${client.primaryDiagnosis}${client.diagnosisLevel ? ` (Level ${client.diagnosisLevel})` : ''}`, pageWidth / 2, 52);
  }

  // --- Overall Score Box ---
  const boxTop = 60;
  const boxHeight = 40;
  
  // Background
  doc.setFillColor(245, 247, 255); // Light primary bg
  doc.roundedRect(margin, boxTop, pageWidth - (margin * 2), boxHeight, 3, 3, "F");
  
  // Milestone Score
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text("Milestones Score", margin + 10, boxTop + 15);
  
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(`${evaluation.overallMilestonePercentage}%`, margin + 10, boxTop + 28);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`(${evaluation.overallMilestoneScore} points)`, margin + 45, boxTop + 28);

  // Dominant Level
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text("Dominant Level", margin + 100, boxTop + 15);

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(`Level ${evaluation.dominantLevel}`, margin + 100, boxTop + 28);

  // --- Age Analysis & Clinical Interpretation ---
  const age = client.birthDate ? calculateAge(client.birthDate) : null;
  let interpretY = boxTop + boxHeight + 10;

  if (age) {
    const delayStats = calculateDevelopmentalDelay(
      age.totalMonths,
      getVBMAPPLevelMidpoint(evaluation.dominantLevel)
    );
    const devAge = getVBMAPPDevelopmentalAge(evaluation.dominantLevel);
    const interpretation = getVBMAPPInterpretation(
      delayStats.delayPercentage,
      delayStats.severityLabel,
      evaluation.dominantLevel
    );

    // Age Analysis Box
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(margin, interpretY, pageWidth - (margin * 2), 25, 3, 3, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("Chronological Age:", margin + 5, interpretY + 10);
    doc.setFont("helvetica", "normal");
    doc.text(formatAge(age), margin + 45, interpretY + 10);

    doc.setFont("helvetica", "bold");
    doc.text("Developmental Age:", margin + 80, interpretY + 10);
    doc.setFont("helvetica", "normal");
    doc.text(devAge, margin + 120, interpretY + 10);

    if (delayStats.delayMonths > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Delay:", margin + 5, interpretY + 18);
      doc.setFont("helvetica", "normal");
      doc.text(`${delayStats.delayMonths} months (${delayStats.delayPercentage}%)`, margin + 20, interpretY + 18);

      doc.setFont("helvetica", "bold");
      const severityColor = delayStats.severityLabel === 'profound' ? [180, 0, 0] :
        delayStats.severityLabel === 'severe' ? [200, 100, 0] :
        delayStats.severityLabel === 'moderate' ? [180, 130, 0] : [0, 100, 180];
      doc.setTextColor(severityColor[0], severityColor[1], severityColor[2]);
      doc.text(`Severity: ${delayStats.severityLabel.toUpperCase()}`, margin + 80, interpretY + 18);
      doc.setTextColor(60, 60, 60);
    }

    interpretY += 30;

    // Clinical Interpretation Box
    doc.setFillColor(250, 250, 255);
    doc.roundedRect(margin, interpretY, pageWidth - (margin * 2), 30, 3, 3, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(`Clinical Interpretation: ${interpretation.title}`, margin + 5, interpretY + 8);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const descLines = doc.splitTextToSize(interpretation.recommendation, pageWidth - (margin * 2) - 10);
    doc.text(descLines, margin + 5, interpretY + 16);

    if (interpretation.interventionHours) {
      doc.setFont("helvetica", "italic");
      doc.text(interpretation.interventionHours, margin + 5, interpretY + 24);
    }

    interpretY += 35;
  }

  // --- Level Breakdown Table ---
  const levelData = Object.values(evaluation.levelSummaries).map(level => [
    level.levelName,
    `${level.scoredItems} / ${level.totalItems}`,
    `${level.percentage}%`,
    `${level.totalScore}`
  ]);

  autoTable(doc, {
    startY: interpretY,
    head: [['Level', 'Items Achieved', 'Percentage', 'Total Score']],
    body: levelData,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    margin: { left: margin, right: margin }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 15;

  // --- Barriers Assessment ---
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text("Barriers Assessment", margin, currentY);
  currentY += 10;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Total Score: ${evaluation.barrierSummary.totalSeverity} (Avg: ${evaluation.barrierSummary.averageSeverity})`, margin, currentY);
  currentY += 6;
  doc.text(`Severe Barriers Identified: ${evaluation.barrierSummary.severeBarriers.length}`, margin, currentY);
  currentY += 10;

  if (evaluation.barrierSummary.severeBarriers.length > 0) {
    const severeBarrierData = evaluation.barrierSummary.severeBarriers.map(id => {
      const barrier = barriersList.find(b => b.id === id);
      const score = evaluation.barrierScores[id]?.score;
      return [
        id,
        barrier ? barrier.text : id,
        score?.toString() || "-"
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['ID', 'Barrier', 'Score']],
      body: severeBarrierData,
      theme: 'grid',
      headStyles: {
        fillColor: [220, 38, 38], // Red for barriers
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
        2: { halign: 'center', fontStyle: 'bold', cellWidth: 20 }
      },
      margin: { left: margin, right: margin }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- Transition Assessment ---
  // Check if we have space, else new page
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 30;
  }

  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text("Transition Assessment", margin, currentY);
  currentY += 10;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Readiness Level: ${evaluation.transitionSummary.readinessLevel.toUpperCase().replace('_', ' ')}`, margin, currentY);
  currentY += 6;
  doc.text(`Score: ${evaluation.transitionSummary.totalScore} / ${evaluation.transitionSummary.maxScore} (${evaluation.transitionSummary.percentage}%)`, margin, currentY);

  // --- Suggested IEP Goals ---
  const suggestedGoals = generateVBMAPPGoals(evaluation, client.name || "Client", VBMAPP_SKILL_AREAS);

  if (suggestedGoals.length > 0) {
    doc.addPage();

    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text("Suggested IEP Goals", margin, 30);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`${suggestedGoals.length} emerging skills identified for goal development`, margin, 38);

    const goalsData = suggestedGoals.slice(0, 10).map((goal, i) => [
      `${i + 1}`,
      goal.skillCode || "",
      goal.itemDescription.length > 40 ? goal.itemDescription.substring(0, 40) + "..." : goal.itemDescription,
      goal.goalText.length > 80 ? goal.goalText.substring(0, 80) + "..." : goal.goalText
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['#', 'Area', 'Skill', 'Goal']],
      body: goalsData,
      theme: 'grid',
      headStyles: {
        fillColor: [217, 119, 6], // Amber
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 50 },
        3: { cellWidth: 95 }
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [255, 251, 235]
      },
      margin: { left: margin, right: margin }
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Goals are auto-generated from emerging skills (scored 0.5 - Emerging). Review and customize for individual IEP.", margin, (doc as any).lastAutoTable.finalY + 10);
  }

  // --- Signatures ---
  const signatureY = pageHeight - 40;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, signatureY, margin + 80, signatureY);
  doc.line(pageWidth - margin - 80, signatureY, pageWidth - margin, signatureY);
  
  doc.setFontSize(10);
  doc.text("Evaluator Signature", margin, signatureY + 5);
  doc.text("Clinical Director / Supervisor", pageWidth - margin - 80, signatureY + 5);

  // --- Footer ---
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Tempo App - VB-MAPP Report - Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  // Save the PDF
  const filename = `VBMAPP_${client.name.replace(/\s+/g, '_')}_${formatDate(evaluation.createdAt)}.pdf`;
  doc.save(filename);
}
