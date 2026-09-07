export function NovaLogo({ className = 'size-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nova-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="nova-mint" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      {/* 4-point radiant morning star */}
      <path
        d="M24 3 C25.5 14.5 33.5 22.5 45 24 C33.5 25.5 25.5 33.5 24 45 C22.5 33.5 14.5 25.5 3 24 C14.5 22.5 22.5 14.5 24 3 Z"
        fill="url(#nova-gold)"
      />
      {/* Sprout seedling at the heart of the star */}
      <path
        d="M24 33 C24 27 21 22.5 16.5 20.5 C16.5 27 20 31 24 33 Z"
        fill="url(#nova-mint)"
      />
      <path
        d="M24 33 C24 25.5 27.5 19 33 17 C34 24.5 28.5 30.5 24 33 Z"
        fill="#10B981"
      />
      <circle cx="24" cy="33" r="1.5" fill="#047857" />
    </svg>
  );
}
