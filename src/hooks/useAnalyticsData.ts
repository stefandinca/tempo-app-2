import { useMemo } from "react";
import { useEventsByMonth, useInvoicesByMonth, useClients, useTeamMembers, useServices } from "./useCollections";

export function useAnalyticsData(year: number, month: number) {
  const { data: events, loading: eventsLoading } = useEventsByMonth(year, month);
  const { data: invoices, loading: invoicesLoading } = useInvoicesByMonth(year, month);
  const { data: clients, loading: clientsLoading } = useClients();
  const { data: team, loading: teamLoading } = useTeamMembers();
  const { data: services, loading: servicesLoading } = useServices();

  const stats = useMemo(() => {
    if (eventsLoading || invoicesLoading || clientsLoading || teamLoading || servicesLoading) return null;

    // 1. KPI Calculations
    const totalSessions = events.length;
    const completedSessions = events.filter(e => e.status === 'completed' || e.status === 'confirmed').length;
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
    
    const monthlyRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const activeClientsCount = clients.filter(c => c.status !== 'inactive').length;

    // --- PHASE 3: AI & PREDICTIVE ANALYTICS ---

    // 1. Revenue Projection
    const now = new Date();
    const futureSessions = events.filter(e => {
      const eventDate = new Date(e.startTime);
      return eventDate > now && (e.status === 'scheduled' || e.status === 'confirmed');
    });

    // Estimate value based on historical average from invoices
    // (Total Revenue / Total Invoiced Items) - simplistic but effective for MVP
    let totalInvoicedItems = 0;
    invoices.forEach(inv => {
      totalInvoicedItems += Array.isArray(inv.items) ? inv.items.length : 1;
    });
    const averageSessionValue = totalInvoicedItems > 0 ? monthlyRevenue / totalInvoicedItems : 0;
    
    const projectedAdditionalRevenue = futureSessions.length * averageSessionValue;
    const projectedTotalRevenue = monthlyRevenue + projectedAdditionalRevenue;

    // 2. Cancellation Risk Radar
    // Identify clients with cancellations in the current month
    const clientCancellationCounts: Record<string, number> = {};
    events.forEach(e => {
      if (e.status === 'cancelled' && e.clientId) {
        clientCancellationCounts[e.clientId] = (clientCancellationCounts[e.clientId] || 0) + 1;
      }
    });

    const highRiskClients = Object.entries(clientCancellationCounts)
      .filter(([_, count]) => count >= 2) // Threshold: 2+ cancellations
      .map(([clientId, count]) => {
        const client = clients.find(c => c.id === clientId);
        return {
          id: clientId,
          name: client?.name || 'Unknown Client',
          cancellations: count,
          trend: 'high' as const
        };
      })
      .sort((a, b) => b.cancellations - a.cancellations)
      .slice(0, 5); // Top 5

    // ------------------------------------------

    // 2. Session Volume Chart Data (Current Month breakdown by week)
    // Simple 4-week split for MVP
    const weeklySessions = [0, 0, 0, 0];
    events.forEach(e => {
      const day = new Date(e.startTime).getDate();
      const weekIdx = Math.min(Math.floor((day - 1) / 7), 3);
      weeklySessions[weekIdx]++;
    });

    const sessionChartData = [
      { name: 'Week 1', sessions: weeklySessions[0] },
      { name: 'Week 2', sessions: weeklySessions[1] },
      { name: 'Week 3', sessions: weeklySessions[2] },
      { name: 'Week 4', sessions: weeklySessions[3] },
    ];

    // 3. Revenue Mix Data (Normalized)
    const revenueByService: Record<string, number> = {};
    
    invoices.forEach(inv => {
      // Helper to categorize item description based on known services
      const categorizeService = (description: string) => {
        if (!description) return 'Other';
        const lowerDesc = description.toLowerCase();
        
        // 1. Try matching against DB services
        const matchedService = services.find(s => s.name && lowerDesc.includes(s.name.toLowerCase()));
        if (matchedService) return matchedService.name;

        // 2. Fallback: Common Keywords Mapping
        if (lowerDesc.includes('aba') || lowerDesc.includes('autism') || lowerDesc.includes('terapie')) return 'ABA / Therapy';
        if (lowerDesc.includes('speech') || lowerDesc.includes('logoped') || lowerDesc.includes('limbaj')) return 'Speech / Logopedie';
        if (lowerDesc.includes('eval') || lowerDesc.includes('assess')) return 'Assessment';
        if (lowerDesc.includes('group') || lowerDesc.includes('grup') || lowerDesc.includes('social')) return 'Social Group';
        if (lowerDesc.includes('parent') || lowerDesc.includes('parinte') || lowerDesc.includes('consiliere')) return 'Parent Counseling';

        return 'Other';
      };

      // Check if items exist and is an array
      if (Array.isArray(inv.items)) {
        inv.items.forEach((item: any) => {
          const category = categorizeService(item.description);
          revenueByService[category] = (revenueByService[category] || 0) + (item.amount || 0);
        });
      } else {
        // Fallback for legacy invoices without items array
        const category = categorizeService(inv.serviceName || '');
        revenueByService[category] = (revenueByService[category] || 0) + (inv.total || 0);
      }
    });

    const colors = ['#4A90E2', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444'];
    const revenueMixData = Object.entries(revenueByService).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length]
    }));

    // 4. Team Utilization Data
    const teamUtilizationData = team.map(member => {
      const memberSessions = events.filter(e => e.therapistId === member.id).length;
      return {
        name: member.name,
        billable: memberSessions, // For now, we count sessions as billable units
        capacity: member.weeklyCapacity || 40 // Default to 40
      };
    });

    return {
      kpis: [
        { label: 'Monthly Sessions', value: totalSessions.toLocaleString(), change: '+0%', trend: 'up' as const },
        { label: 'Completion Rate', value: `${completionRate.toFixed(1)}%`, change: '+0%', trend: 'up' as const },
        { label: 'Monthly Revenue', value: `$${(monthlyRevenue / 1000).toFixed(1)}k`, change: '+0%', trend: 'up' as const },
        { label: 'Projected Revenue', value: `$${(projectedTotalRevenue / 1000).toFixed(1)}k`, change: 'Forecast', trend: 'up' as const },
      ],
      sessionChartData,
      revenueMixData,
      teamUtilizationData,
      attendanceData: (() => {
        // Calculate real attendance rates by week from event data
        const weeklyAttendance = [
          { total: 0, present: 0 },
          { total: 0, present: 0 },
          { total: 0, present: 0 },
          { total: 0, present: 0 },
        ];
        events.forEach(e => {
          if (!e.attendance) return; // Skip events without attendance logged
          const day = new Date(e.startTime).getDate();
          const weekIdx = Math.min(Math.floor((day - 1) / 7), 3);
          weeklyAttendance[weekIdx].total++;
          if (e.attendance === 'present') {
            weeklyAttendance[weekIdx].present++;
          }
        });
        return weeklyAttendance.map((week, i) => ({
          name: `W${i + 1}`,
          rate: week.total > 0 ? Math.round((week.present / week.total) * 100) : 0
        }));
      })(),
      clinicalData: (() => {
        // Calculate real clinical progress from programScores on events
        // programScores: { [programId]: { minus, zero, prompted, plus } }
        const weeklyProgress = [
          { totalTrials: 0, successTrials: 0 },
          { totalTrials: 0, successTrials: 0 },
          { totalTrials: 0, successTrials: 0 },
          { totalTrials: 0, successTrials: 0 },
        ];
        events.forEach(e => {
          if (!e.programScores || !e.attendance || e.attendance !== 'present') return;
          const day = new Date(e.startTime).getDate();
          const weekIdx = Math.min(Math.floor((day - 1) / 7), 3);
          Object.values(e.programScores).forEach((scores: any) => {
            if (!scores) return;
            const total = (scores.minus || 0) + (scores.zero || 0) + (scores.prompted || 0) + (scores.plus || 0);
            const success = (scores.prompted || 0) + (scores.plus || 0);
            weeklyProgress[weekIdx].totalTrials += total;
            weeklyProgress[weekIdx].successTrials += success;
          });
        });
        return weeklyProgress.map((week, i) => ({
          month: `W${i + 1}`,
          rate: week.totalTrials > 0 ? Math.round((week.successTrials / week.totalTrials) * 100) : 0
        }));
      })(),
      predictive: {
        highRiskClients
      }
    };
  }, [events, invoices, clients, team, services, eventsLoading, invoicesLoading, clientsLoading, teamLoading, servicesLoading]);

  return {
    data: stats,
    loading: eventsLoading || invoicesLoading || clientsLoading || teamLoading || servicesLoading
  };
}
