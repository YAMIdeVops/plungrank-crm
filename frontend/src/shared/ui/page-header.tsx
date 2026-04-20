export function PageHeader({
  title,
  description,
  badge,
}: {
  title: string;
  description?: string;
  badge?: string;
}) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <h2>{title}</h2>
        {description ? <p className="page-header-description">{description}</p> : null}
      </div>
      {badge ? <span className="chip">{badge}</span> : null}
    </header>
  );
}
