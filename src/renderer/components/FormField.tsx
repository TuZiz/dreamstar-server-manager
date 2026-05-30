import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
}

export function FormField({ label, children, hint, error }: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
