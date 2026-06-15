export function Brand() {
  return (
    <div aria-label="NidhiFlow" className="brand">
      <svg aria-hidden="true" className="brand__mark" viewBox="0 0 96 96">
        <rect fill="var(--color-brand-soft)" height="96" rx="24" width="96" />
        <path d="M48 76C27 65 19 42 29 22C46 27 58 42 48 76Z" fill="#16a34a" />
        <path d="M50 76C73 64 80 39 67 18C50 25 40 45 50 76Z" fill="#22c55e" />
        <path
          d="M48 74C48 50 53 34 63 22M47 74C43 52 36 38 28 26"
          fill="none"
          stroke="#fff"
          strokeLinecap="round"
          strokeWidth="4"
        />
      </svg>
      <span className="brand__copy">
        <strong>NidhiFlow</strong>
        <small>Your Money, Your Flow</small>
      </span>
    </div>
  );
}
