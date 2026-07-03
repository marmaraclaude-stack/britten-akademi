import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BadgeCheck,
  CalendarDays,
  CircleAlert,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { requireTeacher } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  cn,
  dayKeyIstanbul,
  formatDate,
  formatDateShort,
  formatMoney,
} from '@/lib/utils';
import type { Package, Profile } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Stat } from '@/components/ui/Stat';
import { PaymentControls } from './PaymentControls';

export const metadata: Metadata = { title: 'Finans' };

type StudentLite = Pick<Profile, 'id' | 'full_name' | 'is_active'>;

/** Para birimine gore toplamlar (genelde tek para birimi olur) */
function sumByCurrency(packages: Package[]): string {
  const totals = new Map<string, number>();
  for (const p of packages) {
    if (p.price === null) continue;
    totals.set(p.currency, (totals.get(p.currency) ?? 0) + Number(p.price));
  }
  if (totals.size === 0) return formatMoney(0);
  return [...totals.entries()]
    .map(([cur, val]) => formatMoney(val, cur))
    .join(' + ');
}

function PackageRow({
  pkg,
  student,
}: {
  pkg: Package;
  student: StudentLite | undefined;
}) {
  const paid = Boolean(pkg.paid_at);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
      <Link
        href={`/ogretmen/ogrenciler/${pkg.student_id}`}
        className="flex min-w-0 items-center gap-2.5 hover:underline"
      >
        <Avatar name={student?.full_name ?? '?'} size="sm" />
        <span className="truncate text-sm font-medium text-ink">
          {student?.full_name ?? 'Öğrenci'}
        </span>
      </Link>
      <span className="text-[13px] text-ink-secondary">
        {pkg.name} · {pkg.total_lessons} ders
      </span>
      <span className="text-[13px] text-ink-muted">
        Başlangıç: {formatDateShort(pkg.starts_on)}
      </span>
      <span className="ml-auto text-sm font-semibold tabular-nums text-ink">
        {pkg.price !== null ? formatMoney(Number(pkg.price), pkg.currency) : 'Ücret girilmedi'}
      </span>
      {paid ? (
        <Badge tone="green">
          <BadgeCheck className="h-3 w-3" aria-hidden />
          Ödendi · {formatDateShort(pkg.paid_at!)}
        </Badge>
      ) : (
        <Badge tone="red">Ödenmedi</Badge>
      )}
      <PaymentControls
        packageId={pkg.id}
        packageName={pkg.name}
        studentName={student?.full_name ?? 'Öğrenci'}
        paid={paid}
      />
    </li>
  );
}

export default async function FinancePage() {
  await requireTeacher();
  const supabase = await createClient();

  const [packagesRes, studentsRes] = await Promise.all([
    supabase
      .from('packages')
      .select('*')
      .order('starts_on', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, is_active')
      .eq('role', 'student')
      .order('full_name'),
  ]);

  const packages = (packagesRes.data ?? []) as Package[];
  const students = (studentsRes.data ?? []) as StudentLite[];
  const studentById = new Map(students.map((s) => [s.id, s]));

  const priced = packages.filter((p) => p.price !== null);
  const paidPkgs = packages.filter((p) => p.paid_at);
  const unpaidPkgs = packages.filter((p) => !p.paid_at);

  const monthKey = dayKeyIstanbul(new Date()).slice(0, 7); // YYYY-MM
  const paidThisMonth = paidPkgs.filter(
    (p) => p.paid_at && dayKeyIstanbul(p.paid_at).startsWith(monthKey)
  );

  // Ogrenci bazinda ozet
  const byStudent = new Map<string, Package[]>();
  for (const p of packages) {
    const arr = byStudent.get(p.student_id) ?? [];
    arr.push(p);
    byStudent.set(p.student_id, arr);
  }

  return (
    <div>
      <PageHeader
        title="Finans"
        description="Ders paketlerinin fiyatları ve ödeme takibi; ödemeleri tarihiyle kaydedin."
      />

      {packages.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Henüz ders paketi yok"
          description="Öğrenci detay sayfasından ders paketi tanımladığınızda fiyat ve ödeme takibi burada görünür."
        />
      ) : (
        <div className="space-y-8">
          {/* Özet */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Tahsil edilen"
              value={sumByCurrency(paidPkgs)}
              sub={`${paidPkgs.length} paket ödendi`}
              icon={BadgeCheck}
              tone="green"
            />
            <Stat
              label="Bekleyen ödeme"
              value={sumByCurrency(unpaidPkgs)}
              sub={`${unpaidPkgs.length} paket ödenmedi`}
              icon={CircleAlert}
              tone="accent"
            />
            <Stat
              label="Bu ay tahsilat"
              value={sumByCurrency(paidThisMonth)}
              sub={formatDate(new Date(), { month: 'long', year: 'numeric', day: undefined })}
              icon={CalendarDays}
              tone="brand"
            />
            <Stat
              label="Toplam hacim"
              value={sumByCurrency(priced)}
              sub={`${packages.length} paket`}
              icon={TrendingUp}
              tone="amber"
            />
          </div>

          {/* Bekleyen ödemeler */}
          <Card className={unpaidPkgs.length > 0 ? 'border-accent-200' : undefined}>
            <CardHeader
              title="Bekleyen ödemeler"
              description={
                unpaidPkgs.length > 0
                  ? `${unpaidPkgs.length} paketin ödemesi alınmadı`
                  : 'Tüm paketlerin ödemesi alındı'
              }
              action={
                unpaidPkgs.length > 0 ? (
                  <Badge tone="accent">{unpaidPkgs.length}</Badge>
                ) : undefined
              }
            />
            {unpaidPkgs.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-ink-muted">
                Bekleyen ödeme yok.
              </p>
            ) : (
              <ul className="divide-y divide-hairline">
                {unpaidPkgs.map((p) => (
                  <PackageRow
                    key={p.id}
                    pkg={p}
                    student={studentById.get(p.student_id)}
                  />
                ))}
              </ul>
            )}
          </Card>

          {/* Ödenenler */}
          <Card>
            <CardHeader
              title="Alınan ödemeler"
              description={`${paidPkgs.length} paket, ödeme tarihine göre`}
            />
            {paidPkgs.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-ink-muted">
                Henüz kaydedilen ödeme yok.
              </p>
            ) : (
              <ul className="divide-y divide-hairline">
                {[...paidPkgs]
                  .sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''))
                  .map((p) => (
                    <PackageRow
                      key={p.id}
                      pkg={p}
                      student={studentById.get(p.student_id)}
                    />
                  ))}
              </ul>
            )}
          </Card>

          {/* Öğrenci bazında özet */}
          <Card>
            <CardHeader
              title="Öğrenci bazında özet"
              description="Toplam paket tutarı ve ödeme durumu"
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-plane/60 text-left">
                    <th className="px-5 py-2.5 text-[13px] font-semibold text-ink-secondary">
                      Öğrenci
                    </th>
                    <th className="px-3 py-2.5 text-right text-[13px] font-semibold text-ink-secondary">
                      Paket
                    </th>
                    <th className="px-3 py-2.5 text-right text-[13px] font-semibold text-ink-secondary">
                      Toplam
                    </th>
                    <th className="px-3 py-2.5 text-right text-[13px] font-semibold text-ink-secondary">
                      Ödenen
                    </th>
                    <th className="px-5 py-2.5 text-right text-[13px] font-semibold text-ink-secondary">
                      Kalan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {students
                    .filter((s) => byStudent.has(s.id))
                    .map((s) => {
                      const pkgs = byStudent.get(s.id) ?? [];
                      const paid = pkgs.filter((p) => p.paid_at);
                      const unpaid = pkgs.filter((p) => !p.paid_at);
                      return (
                        <tr key={s.id} className="hover:bg-plane/50">
                          <td className="px-5 py-2.5">
                            <Link
                              href={`/ogretmen/ogrenciler/${s.id}`}
                              className="flex items-center gap-2.5 font-medium text-ink hover:underline"
                            >
                              <Avatar name={s.full_name} size="sm" />
                              {s.full_name}
                              {!s.is_active ? (
                                <Badge tone="gray">Pasif</Badge>
                              ) : null}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-ink-secondary">
                            {pkgs.length}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium tabular-nums text-ink">
                            {sumByCurrency(pkgs)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">
                            {sumByCurrency(paid)}
                          </td>
                          <td
                            className={cn(
                              'px-5 py-2.5 text-right font-medium tabular-nums',
                              unpaid.some((p) => p.price !== null)
                                ? 'text-accent-700'
                                : 'text-ink-muted'
                            )}
                          >
                            {sumByCurrency(unpaid)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
