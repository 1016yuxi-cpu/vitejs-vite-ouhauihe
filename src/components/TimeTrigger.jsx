import React from 'react';

export default function TimeTrigger({ label, value, onClick }) {
  return (
    <div className="flex-1 cursor-pointer group" onClick={onClick}>
      <label className="block text-xs text-gray-400 mb-1 ml-1 group-hover:text-indigo-400 transition-colors">{label}</label>
      <div className="w-full bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 font-medium text-lg flex items-center justify-center group-hover:border-indigo-200 group-hover:bg-indigo-50/50 transition-colors">{value}</div>
    </div>
  );
}