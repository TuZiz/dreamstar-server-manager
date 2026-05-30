interface ConfirmDangerDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDangerDialog({
  open,
  title,
  description,
  confirmText = '确认执行',
  onConfirm,
  onCancel
}: ConfirmDangerDialogProps) {
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-5 shadow-2xl">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="rounded-md border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
