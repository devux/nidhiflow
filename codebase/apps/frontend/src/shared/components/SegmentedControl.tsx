interface Segment {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  label: string;
  onChange: (value: string) => void;
  options: Segment[];
  value: string;
}

export function SegmentedControl({ label, onChange, options, value }: SegmentedControlProps) {
  return (
    <div aria-label={label} className="segmented-control" role="group">
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={value === option.value ? "is-selected" : ""}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
