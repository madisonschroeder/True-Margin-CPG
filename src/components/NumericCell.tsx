import React, { useState, useRef, useEffect } from 'react';

/**
 * Google-Sheets-style numeric input.
 * - Displays formatted value when not focused
 * - Switches to raw string editing on focus (select-all)
 * - Only commits the number on blur or Enter
 * - Allows typing ".05", "0", deleting all digits, etc.
 */

interface NumericCellProps {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  min?: number;
  disabled?: boolean;
  /** If true, the stored value is a 0-1 decimal but displayed as 0-100 percent */
  isPercent?: boolean;
  /** Number of decimal places for display when not editing */
  decimals?: number;
}

export const NumericCell: React.FC<NumericCellProps> = ({
  value,
  onChange,
  className = '',
  min,
  disabled = false,
  isPercent = false,
  decimals,
}) => {
  const displayNum = isPercent ? value * 100 : value;
  const dp = decimals ?? (isPercent ? 2 : 2);
  const formatted = displayNum % 1 === 0 && dp === 0 ? displayNum.toString() : displayNum.toFixed(dp);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatted);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display when value changes externally while not editing
  useEffect(() => {
    if (!editing) {
      setDraft(formatted);
    }
  }, [formatted, editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === '' || trimmed === '-' || trimmed === '.') {
      // Reset to current value
      setDraft(formatted);
      return;
    }
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed)) {
      setDraft(formatted);
      return;
    }
    if (min !== undefined && parsed < min) {
      setDraft(formatted);
      return;
    }
    const final = isPercent ? parsed / 100 : parsed;
    onChange(final);
  };

  const handleFocus = () => {
    setEditing(true);
    setDraft(formatted);
    // Select all on next tick so the user can just start typing
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setDraft(formatted);
      setEditing(false);
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={editing ? draft : formatted}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={handleFocus}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={className}
    />
  );
};
