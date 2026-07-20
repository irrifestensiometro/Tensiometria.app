import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip } from './Tooltip';

export function FieldLabel({ label, tooltip }: { label: string, tooltip?: string }) {
  return (
    <div className="flex items-center space-x-1.5 mb-1">
      <label className="block text-sm font-bold text-slate-700">{label}</label>
      {tooltip && (
        <Tooltip text={tooltip}>
          <Info size={14} className="text-blue-500 cursor-help" />
        </Tooltip>
      )}
    </div>
  );
}
