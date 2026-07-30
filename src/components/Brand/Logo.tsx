import React from 'react';

interface LogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'dark',
  size = 'md',
  showTagline = false,
  iconOnly = false,
  className = ''
}) => {
  // Dimension mappings
  const dimensions = {
    sm: { iconWidth: 32, iconHeight: 32, textScale: 'text-sm', taglineSize: 'text-[9px]' },
    md: { iconWidth: 42, iconHeight: 42, textScale: 'text-xl', taglineSize: 'text-[10px]' },
    lg: { iconWidth: 56, iconHeight: 56, textScale: 'text-2xl', taglineSize: 'text-[11px]' },
    xl: { iconWidth: 72, iconHeight: 72, textScale: 'text-4xl', taglineSize: 'text-[13px]' }
  }[size];

  const sessaoColor = variant === 'dark' ? '#FFFFFF' : '#0F172A';
  const certaColor = variant === 'dark' ? '#34D399' : '#10B981';
  const taglineTextColor = variant === 'dark' ? '#CBD5E1' : '#475569';
  const lineBorderColor = variant === 'dark' ? '#334155' : '#94A3B8';

  // SVG Icon component representing the official Sessão Certa symbol:
  // Interlocking blue & green 'S' ribbons with human figures & central checkmark
  const IconSymbol = (
    <svg
      width={dimensions.iconWidth}
      height={dimensions.iconHeight}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 hover:scale-105"
    >
      <defs>
        <linearGradient id="scBlueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="scGreenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="shadowGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Blue Top Arm / Ribbon */}
      <path
        d="M 75 22 C 50 22 26 30 26 50 C 26 62 36 72 50 82 L 62 90 C 72 96 82 98 82 90 C 82 82 72 74 62 66 C 50 56 42 48 42 38 C 42 30 54 28 68 28 C 76 28 85 30 85 22 Z"
        fill="url(#scBlueGradient)"
        filter="url(#shadowGlow)"
      />

      {/* Blue Figure Head Circle */}
      <circle cx="48" cy="38" r="9" fill="url(#scBlueGradient)" />

      {/* Green Bottom Arm / Ribbon */}
      <path
        d="M 45 98 C 70 98 94 90 94 70 C 94 58 84 48 70 38 L 58 30 C 48 24 38 22 38 30 C 38 38 48 46 58 54 C 70 64 78 72 78 82 C 78 90 66 92 52 92 C 44 92 35 90 35 98 Z"
        fill="url(#scGreenGradient)"
        filter="url(#shadowGlow)"
      />

      {/* Green Figure Head Circle */}
      <circle cx="72" cy="82" r="9" fill="url(#scGreenGradient)" />

      {/* Center Checkmark (Sessão Certa) */}
      <path
        d="M 50 59 L 57 66 L 70 51"
        stroke="#10B981"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (iconOnly) {
    return <div className={`inline-flex items-center ${className}`}>{IconSymbol}</div>;
  }

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <div className="flex items-center gap-2.5">
        {IconSymbol}
        <div className="flex flex-col leading-none">
          <div className={`font-black tracking-tight ${dimensions.textScale} flex items-center`}>
            <span style={{ color: sessaoColor }} className="font-extrabold">
              Sessão
            </span>
            <span style={{ color: certaColor }} className="font-black ml-1">
              Certa
            </span>
          </div>
        </div>
      </div>

      {showTagline && (
        <div className="mt-1.5 flex items-center gap-2 w-full">
          <div className="h-[1px] flex-1" style={{ backgroundColor: lineBorderColor }} />
          <span
            className={`font-semibold tracking-wide whitespace-nowrap uppercase ${dimensions.taglineSize}`}
            style={{ color: taglineTextColor }}
          >
            Tecnologia que organiza o cuidado humano
          </span>
          <div className="h-[1px] flex-1" style={{ backgroundColor: lineBorderColor }} />
        </div>
      )}
    </div>
  );
};
