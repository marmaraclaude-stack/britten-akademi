/**
 * Öğretmenin hazırladığı HTML içeriği güvenli biçimde gösterir.
 * - sandbox iframe: script çalışır ama üst sayfaya, çerezlere ve oturuma erişemez
 *   (allow-same-origin YOK).
 * - Liquid tarzı değişkenler kişiselleştirilir: {{ogrenci_adi}}, {{seviye}}.
 */
import { CEFR_LABELS } from '@/lib/utils';
import type { CefrLevel } from '@/lib/types';

export function renderTemplate(
  html: string,
  vars: { studentName: string; level: CefrLevel | null }
) {
  const levelText = vars.level
    ? `${vars.level === 'PreA1' ? 'Pre-A1' : vars.level} (${CEFR_LABELS[vars.level]})`
    : 'Henüz belirlenmedi';
  return html
    .replace(/\{\{\s*(ogrenci_adi|student_name)\s*\}\}/gi, vars.studentName)
    .replace(/\{\{\s*(seviye|level)\s*\}\}/gi, levelText);
}

const BASE_STYLE = `<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; margin: 16px; color: #0b0b0b; line-height: 1.65; }
</style>`;

export function HtmlViewer({
  html,
  studentName,
  level,
  title,
}: {
  html: string;
  studentName: string;
  level: CefrLevel | null;
  title: string;
}) {
  const doc = renderTemplate(html, { studentName, level });
  const withStyle = /<html|<head|<body/i.test(doc) ? doc : BASE_STYLE + doc;

  return (
    <iframe
      srcDoc={withStyle}
      title={title}
      sandbox="allow-scripts allow-forms allow-popups"
      className="h-[75vh] w-full rounded-card border border-hairline bg-white"
    />
  );
}
