import React from 'react';
import { NumericCell } from './NumericCell';

interface InputRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  type?: 'currency' | 'percent' | 'number';
  disabled?: boolean;
  highlight?: boolean;
}

export const InputRow: React.FC<InputRowProps> = ({
  label,
  value,
  onChange,
  type = 'number',
  disabled = false,
  highlight = false,
}) => {
  return (
    <div className={`flex items-center justify-between py-1.5 px-3 rounded ${highlight ? 'bg-warning/10' : ''}`}>
      <span className="text-sm text-base-content/80 flex-1">{label}</span>
      <div className="flex items-center gap-1">
        {type === 'currency' && <span className="text-xs text-base-content/50">$</span>}
        <NumericCell
          value={value}
          onChange={onChange}
          isPercent={type === 'percent'}
          decimals={type === 'percent' ? 2 : type === 'currency' ? 2 : 0}
          disabled={disabled}
          className={`input input-bordered input-sm w-28 text-right font-mono ${
            highlight ? 'border-warning/50 bg-warning/5 text-warning' : ''
          } ${disabled ? 'opacity-60' : ''}`}
        />
        {type === 'percent' && <span className="text-xs text-base-content/50">%</span>}
      </div>
    </div>
  );
};

interface OutputRowProps {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  bold?: boolean;
  danger?: boolean;
}

export const OutputRow: React.FC<OutputRowProps> = ({ label, value, accent, bold, danger }) => (
  <div
    className={`flex items-center justify-between py-1.5 px-3 rounded ${
      accent ? 'bg-primary/10' : ''
    } ${danger ? 'bg-error/10' : ''}`}
  >
    <span className={`text-sm ${bold ? 'font-semibold' : ''} text-base-content/80`}>{label}</span>
    <span
      className={`font-mono text-sm ${
        danger ? 'text-error font-bold' : accent ? 'text-primary font-semibold' : 'text-base-content'
      }`}
    >
      {value}
    </span>
  </div>
);

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle }) => (
  <div className="flex items-center gap-2 py-2 px-3 bg-base-300 rounded-lg mt-4 first:mt-0">
    <span className="font-bold text-sm text-base-content tracking-wide">{title}</span>
    {subtitle && <span className="text-xs text-base-content/50">{subtitle}</span>}
  </div>
);
