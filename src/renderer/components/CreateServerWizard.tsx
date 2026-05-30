import type { ReactNode } from 'react';

interface CreateServerWizardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function CreateServerWizard({ title, description, children }: CreateServerWizardProps) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="panel p-6">{children}</div>
    </div>
  );
}
