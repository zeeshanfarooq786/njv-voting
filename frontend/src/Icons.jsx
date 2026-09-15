const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Svg({ size = 16, children, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...base}
    >
      {children}
    </svg>
  )
}

export function IconBallot(props) {
  return (
    <Svg {...props}>
      <path d="M9 5.5h6a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5H9a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 9 5.5Z" />
      <path d="m10 12 1.6 1.7L15 9.8" />
    </Svg>
  )
}

export function IconTrophy(props) {
  return (
    <Svg {...props}>
      <path d="M7 5h10v4.5a5 5 0 0 1-10 0V5Z" />
      <path d="M7 6H4.5a3 3 0 0 0 3 3M17 6h2.5a3 3 0 0 1-3 3" />
      <path d="M12 14.5V18M9 20h6" />
    </Svg>
  )
}

export function IconUsers(props) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M17 6.5a2.6 2.6 0 0 1 0 5M18.5 19a5 5 0 0 0-2-4" />
    </Svg>
  )
}

export function IconPrinter(props) {
  return (
    <Svg {...props}>
      <path d="M7 9V4.5h10V9" />
      <rect x="4" y="9" width="16" height="7" rx="2" />
      <path d="M7 16h10v3.5H7z" />
    </Svg>
  )
}

export function IconChart(props) {
  return (
    <Svg {...props}>
      <path d="M4 20h16" />
      <path d="M7 20v-6M12 20V8M17 20v-9" />
    </Svg>
  )
}

export function IconCog(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
    </Svg>
  )
}

export function IconPlay(props) {
  return (
    <Svg {...props}>
      <path d="M8 5.5 18 12 8 18.5z" />
    </Svg>
  )
}

export function IconExit(props) {
  return (
    <Svg {...props}>
      <path d="M14 5.5H7A1.5 1.5 0 0 0 5.5 7v10A1.5 1.5 0 0 0 7 18.5h7" />
      <path d="M16 15.5 19.5 12 16 8.5M19 12h-8" />
    </Svg>
  )
}

export function IconRefresh(props) {
  return (
    <Svg {...props}>
      <path d="M19 12a7 7 0 1 1-2.3-5.2" />
      <path d="M19 4.5V9h-4.5" />
    </Svg>
  )
}

export function IconCheck(props) {
  return (
    <Svg {...props}>
      <path d="m5.5 12.5 4 4 9-9" />
    </Svg>
  )
}

export function IconShield(props) {
  return (
    <Svg {...props}>
      <path d="M12 4l6.5 2.4v5c0 4-2.7 7.2-6.5 8.6-3.8-1.4-6.5-4.6-6.5-8.6v-5L12 4Z" />
      <path d="m9.5 12 1.8 1.8 3.4-3.4" />
    </Svg>
  )
}

export function IconUser(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8.5" r="3.3" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </Svg>
  )
}

export function IconMail(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7 7.5 5.5L19.5 7" />
    </Svg>
  )
}

export function IconClock(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  )
}

export function IconEye(props) {
  return (
    <Svg {...props}>
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </Svg>
  )
}

export function IconSparkle(props) {
  return (
    <Svg {...props}>
      <path d="M12 4.5 13.6 9 18 10.5 13.6 12 12 16.5 10.4 12 6 10.5 10.4 9z" />
      <path d="M18.5 16.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" />
    </Svg>
  )
}
