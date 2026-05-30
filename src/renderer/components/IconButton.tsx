import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  danger?: boolean;
}

export function IconButton({ icon, label, danger, className = '', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`square-button ${danger ? 'danger-button' : ''} ${className}`}
      title={label}
      aria-label={label}
      {...props}
    >
      {icon}
    </button>
  );
}
