import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { requireStudent } from '@/lib/auth';
import { ensurePlacementDone } from '@/lib/placement-gate';
import { createClient } from '@/lib/supabase/server';
import { formatDate, MATERIAL_KIND_LABELS } from '@/lib/utils';
import type { Material } from '@/lib/types';
import { HtmlViewer } from '@/components/materials/HtmlViewer';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { SkillBadge } from '@/components/ui/DomainBadges';
import { DownloadButton } from '@/components/ui/DownloadButton';

export const metadata: Metadata = { title: 'Materyal' };

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireStudent();
  ensurePlacementDone(profile);

  const supabase = await createClient();
  const { data } = await supabase
    .from('materials')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  const material = data as Material | null;
  if (!material) notFound();

  return (
    <div>
      <Link
        href="/ogrenci/materyaller"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-navy-700 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Materyallere dön
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {material.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <SkillBadge skill={material.skill} />
          <Badge tone="gray">{MATERIAL_KIND_LABELS[material.kind]}</Badge>
          <span className="text-[13px] text-ink-muted">
            Eklenme: {formatDate(material.created_at)}
          </span>
        </div>
        {material.description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-secondary">
            {material.description}
          </p>
        ) : null}
      </div>

      {material.kind === 'html' ? (
        <HtmlViewer
          html={material.html_content ?? ''}
          studentName={profile.full_name}
          level={profile.cefr_level}
          title={material.title}
        />
      ) : null}

      {material.kind === 'link' ? (
        <Card>
          <CardBody className="py-6">
            <p className="text-sm leading-6 text-ink-secondary">
              Bu materyal harici bir kaynağa bağlanıyor. Aşağıdaki düğmeyle yeni
              sekmede açabilirsin.
            </p>
            {material.url ? (
              <a
                href={material.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-navy-800 px-4 text-sm font-medium text-white transition-colors hover:bg-navy-900"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Bağlantıyı Aç
              </a>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">
                Bağlantı adresi bulunamadı. Öğretmenine haber verebilirsin.
              </p>
            )}
          </CardBody>
        </Card>
      ) : null}

      {material.kind === 'file' ? (
        <Card>
          <CardBody className="py-6">
            <p className="text-sm leading-6 text-ink-secondary">
              Bu materyal indirilebilir bir dosya içeriyor.
            </p>
            {material.file_path ? (
              <div className="mt-4">
                <DownloadButton
                  path={material.file_path}
                  name={material.file_name ?? 'Materyal dosyası'}
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">
                Dosya bulunamadı. Öğretmenine haber verebilirsin.
              </p>
            )}
          </CardBody>
        </Card>
      ) : null}

      {material.kind === 'text' ? (
        <Card>
          <CardBody className="py-6">
            <div className="prose-brit whitespace-pre-wrap">{material.body}</div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
