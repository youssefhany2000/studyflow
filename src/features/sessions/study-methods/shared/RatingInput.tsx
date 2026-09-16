export function RatingInput({
  value,
  onChange,
  max = 5,
}: {
  value: number | null;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-8 w-8 rounded-md border text-sm ${
            value === n ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-muted-foreground'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
