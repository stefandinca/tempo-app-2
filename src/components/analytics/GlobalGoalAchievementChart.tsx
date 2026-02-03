"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface GlobalGoalAchievementChartProps {
  data: { month: string; rate: number }[];
}

export default function GlobalGoalAchievementChart({ data }: GlobalGoalAchievementChartProps) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Clinical Progress Index</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Global Goal Achievement Rate (%)</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-success-600 dark:text-success-400">
            {data.length > 0 ? `${data[data.length - 1].rate}%` : '0%'}
          </p>
          <p className="text-xs text-neutral-500">+3% vs last month</p>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              domain={[50, 100]}
            />
            <Tooltip 
              formatter={(value: any) => `${value}%`}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Line 
              type="monotone" 
              dataKey="rate" 
              stroke="#8B5CF6" 
              strokeWidth={3}
              dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4, stroke: '#fff' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
