import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Evaluation } from "@/types/evaluation";
import { VBMAPPEvaluation, VBMAPPBarrierItem } from "@/types/vbmapp";
import { calculateAge, formatAge, getVBMAPPDevelopmentalAge, getVBMAPPLevelMidpoint, calculateDevelopmentalDelay, calculatePreciseDevelopmentalAge } from "./ageUtils";
import { ClientInfo } from "@/types/client";
import { getABLLSInterpretation, getVBMAPPInterpretation, getPriorityAreas, calculateDomainScores, getBarrierRecommendation, getParentFriendlyName } from "./clinicalInterpretation";
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
  const categories = Object.values(evaluation.categorySummaries).sort((a, b) => 
    a.categoryKey.localeCompare(b.categoryKey)
  );
  
  const totalCategories = categories.length;
  const angleStep = (2 * Math.PI) / totalCategories;
  const startAngle = -Math.PI / 2;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.1);
  
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

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  for (let i = 0; i < totalCategories; i++) {
    const angle = startAngle + (i * angleStep);
    const xEnd = x + radius * Math.cos(angle);
    const yEnd = y + radius * Math.sin(angle);
    doc.line(x, y, xEnd, yEnd);
    const labelX = x + (radius + 5) * Math.cos(angle);
    const labelY = y + (radius + 5) * Math.sin(angle);
    const cat = categories[i];
    doc.text(cat.categoryKey, labelX, labelY, { align: 'center', baseline: 'middle' });
  }

  const drawPolygon = (evalData: Evaluation, color: [number, number, number]) => {
    const points: {x: number, y: number}[] = [];
    categories.forEach((cat, i) => {
      const angle = startAngle + (i * angleStep);
      const summary = evalData.categorySummaries[cat.categoryKey];
      const score = summary ? summary.percentage : 0;
      const pointRadius = (score / 100) * radius;
      points.push({ x: x + pointRadius * Math.cos(angle), y: y + pointRadius * Math.sin(angle) });
    });
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.5);
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      doc.line(p1.x, p1.y, p2.x, p2.y);
    }
  };

  if (previousEvaluation) drawPolygon(previousEvaluation, [150, 150, 150]);
  drawPolygon(evaluation, [79, 70, 229]);
}

// Helper to draw line chart
function drawLineChart(doc: jsPDF, history: Evaluation[], x: number, y: number, width: number, height: number) {
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.completedAt || a.createdAt).getTime() - new Date(b.completedAt || b.createdAt).getTime()
  );
  const dataPoints = sortedHistory.map(h => ({
    date: new Date(h.completedAt || h.createdAt),
    score: h.overallPercentage
  }));
  if (dataPoints.length < 2) return;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(x, y + height, x + width, y + height);
  doc.line(x, y, x, y + height);

  doc.setDrawColor(240, 240, 240);
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  [0, 25, 50, 75, 100].forEach(val => {
    const yPos = y + height - (val / 100) * height;
    doc.line(x, yPos, x + width, yPos);
    doc.text(`${val}%`, x - 2, yPos, { align: 'right', baseline: 'middle' });
  });

  const timeStart = dataPoints[0].date.getTime();
  const timeEnd = dataPoints[dataPoints.length - 1].date.getTime();
  const timeSpan = Math.max(1, timeEnd - timeStart);

  const points = dataPoints.map(pt => ({
    x: x + ((pt.date.getTime() - timeStart) / timeSpan) * width,
    y: y + height - (pt.score / 100) * height,
    date: pt.date
  }));

  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(1.5);
  for (let i = 0; i < points.length - 1; i++) {
    doc.line(points[i].x, points[i].y, points[i+1].x, points[i+1].y);
  }
  doc.setFillColor(79, 70, 229);
  points.forEach(pt => {
    doc.circle(pt.x, pt.y, 1.5, 'F');
    const dateStr = pt.date.toLocaleDateString("en-US", { month: 'short', year: '2-digit' });
    doc.text(dateStr, pt.x, y + height + 5, { align: 'center', angle: 45 });
  });
}

export function generateEvaluationPDF(
  evaluation: Evaluation, 
  client: ClientInfo, 
  previousEvaluation?: Evaluation | null,
  history?: Evaluation[],
  isParentVersion: boolean = false
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text(isParentVersion ? "Child Development Progress Report" : "ABLLS Evaluation Report", margin, 30);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`${isParentVersion ? "Child" : "Client"}: ${client.name}`, margin, 40);
  doc.text(`Date: ${formatDate(evaluation.completedAt || evaluation.createdAt)}`, margin, 46);
  if (!isParentVersion) doc.text(`Evaluator: ${evaluation.evaluatorName}`, margin, 52);

  if (client.birthDate) {
    const age = calculateAge(client.birthDate);
    doc.text(`Age: ${formatAge(age)}`, pageWidth / 2, 40);
    doc.text(`DOB: ${formatDate(client.birthDate)}`, pageWidth / 2, 46);
  }
  
  if (client.primaryDiagnosis && !isParentVersion) {
    doc.text(`Diagnosis: ${client.primaryDiagnosis}${client.diagnosisLevel ? ` (Level ${client.diagnosisLevel})` : ''}`, pageWidth / 2, 52);
  }

  const boxTop = 60;
  const boxHeight = 40;
  doc.setFillColor(245, 247, 255);
  doc.roundedRect(margin, boxTop, pageWidth - (margin * 2), boxHeight, 3, 3, "F");
  
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text(isParentVersion ? "Overall Development Score" : "Overall Score", margin + 10, boxTop + 15);
  
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(`${evaluation.overallPercentage}%`, margin + 10, boxTop + 28);
  
  if (previousEvaluation) {
    const diff = evaluation.overallPercentage - previousEvaluation.overallPercentage;
    const sign = diff > 0 ? "+" : "";
    const color = diff > 0 ? [22, 163, 74] : diff < 0 ? [220, 38, 38] : [100, 100, 100];
    doc.setFontSize(12);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(`${sign}${diff}%`, margin + 35, boxTop + 28);
  }
  
  if (!isParentVersion) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`(${evaluation.overallScore} / ${evaluation.overallMaxScore} points)`, margin + 55, boxTop + 28);
  }

  const interpretation = getABLLSInterpretation(evaluation.overallPercentage);
  const interpretY = boxTop + boxHeight + 10;
  doc.setFillColor(245, 250, 255);
  doc.roundedRect(margin, interpretY, pageWidth - (margin * 2), 35, 3, 3, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text(isParentVersion ? `Progress Summary: ${interpretation.title}` : `Clinical Interpretation: ${interpretation.title}`, margin + 5, interpretY + 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  const descLines = doc.splitTextToSize(interpretation.description, pageWidth - (margin * 2) - 10);
  doc.text(descLines, margin + 5, interpretY + 18);
  doc.setFont("helvetica", "italic");
  doc.text(isParentVersion ? "Recommendations:" : "Clinical Recommendations:", margin + 5, interpretY + 28);
  doc.setFont("helvetica", "normal");
  doc.text(interpretation.recommendation, margin + (isParentVersion ? 35 : 45), interpretY + 28);

  const domainScores = calculateDomainScores(evaluation.categorySummaries);
  const domainData = Object.entries(domainScores).map(([domain, data]) => [
    domain,
    data.categories.join(", "),
    `${data.percentage}%`
  ]);

  autoTable(doc, {
    startY: interpretY + 45,
    head: [[isParentVersion ? 'Development Area' : 'Clinical Domain', 'Included Categories', 'Score']],
    body: domainData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 2: { halign: 'center', fontStyle: 'bold', cellWidth: 25 } },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    margin: { left: margin, right: margin }
  });

  const sortedCategories = Object.values(evaluation.categorySummaries).sort((a, b) => a.categoryKey.localeCompare(b.categoryKey));
  const tableData = sortedCategories.map(cat => {
    let changeText = "-";
    if (previousEvaluation && previousEvaluation.categorySummaries[cat.categoryKey]) {
      const prev = previousEvaluation.categorySummaries[cat.categoryKey].percentage;
      const diff = cat.percentage - prev;
      changeText = diff > 0 ? `+${diff}%` : `${diff}%`;
    }
    return [
      cat.categoryKey,
      isParentVersion ? getParentFriendlyName(cat.categoryKey, cat.categoryName) : cat.categoryName,
      isParentVersion ? `${cat.percentage}%` : `${cat.scoredItems}/${cat.totalItems}`,
      isParentVersion ? changeText : `${cat.percentage}%`,
      isParentVersion ? "" : changeText
    ];
  });

  const tableHead = isParentVersion ? [['ID', 'Skill Area', 'Score', 'Change']] : [['ID', 'Category', 'Items Scored', 'Score %', 'Change']];
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 15,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold', halign: 'center' }, 2: { halign: 'center', fontStyle: 'bold' }, 3: { halign: 'center', fontStyle: 'italic' } },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin }
  });

  doc.addPage();
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text("Skill Profile & Progress", margin, 30);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Comparison of skill mastery across all categories.", margin, 36);
  drawRadarChart(doc, evaluation, previousEvaluation, pageWidth / 2, 100, 60);
  const legendY = 180;
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - 40, legendY, pageWidth / 2 - 20, legendY);
  doc.setTextColor(40, 40, 40);
  doc.text("Current Evaluation", pageWidth / 2 - 15, legendY + 1);
  if (previousEvaluation) {
    doc.setDrawColor(150, 150, 150);
    doc.line(pageWidth / 2 + 20, legendY, pageWidth / 2 + 40, legendY);
    doc.text("Previous Evaluation", pageWidth / 2 + 45, legendY + 1);
  }
  if (history && history.length > 1) {
    doc.setFontSize(14);
    doc.text("Progress Over Time", margin, 210);
    drawLineChart(doc, history, margin + 10, 220, pageWidth - (margin * 2) - 20, 50);
  }

  const suggestedGoals = generateABLLSGoals(evaluation, client.name || "Client", ABLLS_CATEGORIES);
  if (suggestedGoals.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Suggested IEP Goals", margin, 30);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`${suggestedGoals.length} emerging skills identified for goal development`, margin, 38);
    const goalsData = suggestedGoals.slice(0, 10).map((goal, i) => [
      `${i + 1}`, goal.skillCode || "", goal.itemDescription.substring(0, 40), goal.goalText.substring(0, 80)
    ]);
    autoTable(doc, {
      startY: 45, head: [['#', 'Area', 'Skill', 'Goal']], body: goalsData, theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: 255 },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 15 }, 2: { cellWidth: 50 }, 3: { cellWidth: 95 } },
      styles: { fontSize: 8 }, margin: { left: margin, right: margin }
    });
  }

  const sigY = pageHeight - 40;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, sigY, margin + 80, sigY);
  doc.line(pageWidth - margin - 80, sigY, pageWidth - margin, sigY);
  doc.setFontSize(10);
  doc.text("Evaluator Signature", margin, sigY + 5);
  doc.text("Clinical Director / Supervisor", pageWidth - margin - 80, sigY + 5);

  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Tempo App - Evaluation Report - Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  }
  doc.save(`Evaluation_${client.name.replace(/\s+/g, '_')}_${formatDate(evaluation.createdAt)}.pdf`);
}

export function generateVBMAPPPDF(
  evaluation: VBMAPPEvaluation,
  client: ClientInfo,
  barriersList: VBMAPPBarrierItem[],
  isParentVersion: boolean = false
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text(isParentVersion ? "Developmental Progress Report (VB-MAPP)" : "VB-MAPP Evaluation Report", margin, 30);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`${isParentVersion ? "Child" : "Client"}: ${client.name}`, margin, 40);
  doc.text(`Date: ${formatDate(evaluation.completedAt || evaluation.createdAt)}`, margin, 46);
  if (!isParentVersion) doc.text(`Evaluator: ${evaluation.evaluatorName}`, margin, 52);

  if (client.birthDate) {
    const age = calculateAge(client.birthDate);
    doc.text(`Age: ${formatAge(age)}`, pageWidth / 2, 40);
    doc.text(`DOB: ${formatDate(client.birthDate)}`, pageWidth / 2, 46);
  }
  
  if (client.primaryDiagnosis && !isParentVersion) {
    doc.text(`Diagnosis: ${client.primaryDiagnosis}${client.diagnosisLevel ? ` (Level ${client.diagnosisLevel})` : ''}`, pageWidth / 2, 52);
  }

  const boxTop = 60;
  const boxHeight = 40;
  doc.setFillColor(245, 247, 255);
  doc.roundedRect(margin, boxTop, pageWidth - (margin * 2), boxHeight, 3, 3, "F");
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text(isParentVersion ? "Skill Mastery Score" : "Milestones Score", margin + 10, boxTop + 15);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(`${evaluation.overallMilestonePercentage}%`, margin + 10, boxTop + 28);
  
  doc.setFontSize(14);
  doc.text(isParentVersion ? "Learning Stage" : "Dominant Level", margin + 100, boxTop + 15);
  doc.text(`Level ${evaluation.dominantLevel}`, margin + 100, boxTop + 28);

  const ageData = client.birthDate ? calculateAge(client.birthDate) : null;
  let interpretY = boxTop + boxHeight + 10;

  if (ageData) {
    const delayStats = calculateDevelopmentalDelay(ageData.totalMonths, calculatePreciseDevelopmentalAge(evaluation.overallMilestoneScore));
    const interpretation = getVBMAPPInterpretation(delayStats.delayPercentage, delayStats.severityLabel, evaluation.dominantLevel);

    doc.setFillColor(240, 245, 255);
    doc.roundedRect(margin, interpretY, pageWidth - (margin * 2), 25, 3, 3, "F");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Dev. Age Equivalent: ${getVBMAPPDevelopmentalAge(evaluation.dominantLevel)}`, margin + 5, interpretY + 10);
    if (delayStats.delayMonths > 0) doc.text(`Developmental Gap: ${delayStats.delayMonths} months`, margin + 80, interpretY + 10);

    interpretY += 30;
    doc.setFillColor(250, 250, 255);
    doc.roundedRect(margin, interpretY, pageWidth - (margin * 2), 30, 3, 3, "F");
    doc.text(isParentVersion ? `Progress Summary: ${interpretation.title}` : `Clinical Interpretation: ${interpretation.title}`, margin + 5, interpretY + 8);
    doc.setFontSize(8);
    const recLines = doc.splitTextToSize(interpretation.recommendation, pageWidth - (margin * 2) - 10);
    doc.text(recLines, margin + 5, interpretY + 16);
    interpretY += 35;
  }

  const levelData = Object.values(evaluation.levelSummaries).map(level => [
    isParentVersion ? level.levelName.replace('Nivel', 'Stage') : level.levelName,
    `${level.scoredItems} / ${level.totalItems}`,
    `${level.percentage}%`
  ]);
  autoTable(doc, {
    startY: interpretY, head: [['Stage', 'Skills Achieved', 'Percentage']], body: levelData, theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }, margin: { left: margin, right: margin }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(16);
  doc.text(isParentVersion ? "Learning Barriers" : "Barriers Assessment", margin, currentY);
  currentY += 10;
  if (evaluation.barrierSummary.severeBarriers.length > 0) {
    const barrierData: any[] = [];
    evaluation.barrierSummary.severeBarriers.forEach(id => {
      const b = barriersList.find(x => x.id === id);
      barrierData.push([id, isParentVersion ? getParentFriendlyName(id, b?.text || id) : (b?.text || id), evaluation.barrierScores[id]?.score || "-"]);
      barrierData.push(["", { content: `Support Strategy: ${getBarrierRecommendation(id)}`, styles: { fontStyle: 'italic' } }, ""]);
    });
    autoTable(doc, {
      startY: currentY, head: [['ID', 'Barrier', 'Intensity']], body: barrierData, theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] }, margin: { left: margin, right: margin }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  const suggestedGoals = generateVBMAPPGoals(evaluation, client.name || "Client", VBMAPP_SKILL_AREAS);
  if (suggestedGoals.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Recommended Learning Goals", margin, 30);
    const goalsData = suggestedGoals.slice(0, 10).map((g, i) => [i + 1, g.itemDescription.substring(0, 50), g.goalText.substring(0, 100)]);
    autoTable(doc, {
      startY: 40, head: [['#', 'Skill', 'Target Goal']], body: goalsData, theme: 'grid',
      headStyles: { fillColor: [217, 119, 6] }, margin: { left: margin, right: margin }
    });
  }

  const sigY = pageHeight - 40;
  doc.line(margin, sigY, margin + 80, sigY);
  doc.line(pageWidth - margin - 80, sigY, pageWidth - margin, sigY);
  doc.text("Evaluator", margin, sigY + 5);
  doc.text("Supervisor", pageWidth - margin - 80, sigY + 5);

  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Tempo App - VB-MAPP Report - Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  }
  doc.save(`VBMAPP_${client.name.replace(/\s+/g, '_')}_${formatDate(evaluation.createdAt)}.pdf`);
}
