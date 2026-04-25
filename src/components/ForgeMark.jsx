export default function ForgeMark({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 18 L12 5 L19 18 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M10.2 18 L12 12 L13.8 18 Z" fill="#7DFF00" />
    </svg>
  );
}
