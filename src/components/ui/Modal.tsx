'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/** Erişilebilir modal; native <dialog> üzerine kurulu. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
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
      className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl border border-hairline bg-surface p-0 shadow-raised backdrop:bg-brand-950/40 backdrop:backdrop-blur-[2px]`}
    >
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-plane hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
