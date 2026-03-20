import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TASK_COLORS } from '../utils/constants';
import { timeToMins, formatMins, addDays, getDisplayDate } from '../utils/helpers';

export default function StatsView({ actuals, currentDate }) {
  const currentActuals = actuals.filter(a => a.date === currentDate);

  const pieData = useMemo(() => {
    const acc = {};
    let total = 0;
    currentActuals.forEach(a => {
      const dur = timeToMins(a.actualEnd) - timeToMins(a.actualStart);
      if (dur > 0) {
        if (!acc[a.color]) acc[a.color] = { name: a.name, value: 0, color: a.color };
        acc[a.color].value += dur;
        total += dur;
      }
    });
    return { data: Object.values(acc).sort((a, b) => b.value - a.value), total };
  }, [currentActuals]);

  const barData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(currentDate, -i);
      const dayActuals = actuals.filter(a => a.date === d);
      const dayObj = { date: getDisplayDate(d).split(' ')[0], fullDate: d };
      dayActuals.forEach(a => {
        const dur = timeToMins(a.actualEnd) - timeToMins(a.actualStart);
        if (dur > 0) {
          dayObj[a.color] = (dayObj[a.color] || 0) + dur;
          if (!dayObj[a.color + '_name']) dayObj[a.color + '_name'] = a.name;
        }
      });
      days.push(dayObj);
    }
    return days;
  }, [actuals, currentDate]);

  const yAxisFormatter = (val) => val === 0 ? '0' : `${Math.floor(val / 60)}h`;

  return (
    <div className="pb-10">
      <div className="bg-white rounded-3xl p-6 shadow-sm mb-6 mt-4 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-500 mb-4">今日执行分布</h3>
        {pieData.total === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">今日暂无执行记录</div>
        ) : (
          <>
            <div className="relative h-56 w-full flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData.data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                    {pieData.data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatMins(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-gray-400 font-medium">总计</span>
                <span className="text-2xl font-bold text-gray-900 mt-1">{formatMins(pieData.total)}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {pieData.data.map(d => (
                <div key={d.color} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                  {d.name} <span className="text-gray-400 ml-1">{formatMins(d.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-500 mb-6">近 7 天趋势</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={yAxisFormatter} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '12px' }}
                formatter={(value, name, props) => {
                  const colorName = TASK_COLORS.find(c => c.hex === name)?.name || '记录';
                  const taskName = props.payload[name + '_name'] || colorName;
                  return [formatMins(value), taskName];
                }}
                labelStyle={{ fontWeight: 'bold', color: '#1F2937', marginBottom: '8px' }} />
              {TASK_COLORS.map(color => (
                <Bar key={color.hex} dataKey={color.hex} stackId="a" fill={color.hex} radius={[2, 2, 2, 2]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}