'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/** Erişilebilir modal; native <dialog> üzerine kurulu. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        // ESC dialogu kendi başına kapatmasın; kararı React (onClose) versin.
        // Böylece "gönderiliyor" gibi kilitli durumlarda modal açık kalır.
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(e) => {
        // Dış alana tıklayınca kapat
        if (e.target === ref.current) onClose();
      }}
      className={`w-full ${
        wide ? 'max-w-3xl' : 'max-w-lg'
      } rounded-2xl border border-hairline bg-surface p-0 shadow-raised backdrop:bg-brand-950/50 backdrop:backdrop-blur-sm open:animate-[modal-in_160ms_ease-out]`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-hairline bg-plane/60 px-6 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="shrink-0 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-white hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}
