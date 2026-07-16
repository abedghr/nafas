export function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <div className="card p-8 text-sub">
        This section is built in <span className="text-primary font-semibold">{phase}</span>.
      </div>
    </div>
  );
}
