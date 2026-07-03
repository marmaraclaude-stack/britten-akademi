export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Yükleniyor">
      <div className="h-8 w-56 rounded-lg bg-navy-100" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-card bg-navy-100/70" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-card bg-navy-100/50" />
        <div className="h-72 rounded-card bg-navy-100/50" />
      </div>
    </div>
  );
}
