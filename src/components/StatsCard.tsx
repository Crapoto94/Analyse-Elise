'use client';

import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'indigo' | 'purple';
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
};

export default function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
        </div>
      </div>
    </div>
  );
}
