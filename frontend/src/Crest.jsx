import logo from './assets/logo.png'

export default function Crest({ size = 56, className = '', glow = false }) {
  return (
    <img
      src={logo}
      alt="NJV Govt. Higher Secondary School"
      width={size}
      height={size}
      className={`crest ${className}`}
      style={{
        '--crest-size': `${size}px`,
        objectFit: 'contain',
        filter: glow ? 'drop-shadow(0 0 18px rgba(255,199,44,0.55))' : undefined,
      }}
    />
  )
}

export function BrandMark({ size = 48, subtitle, prominent = false }) {
  if (prominent) {
    const title = 'NJV GOVT. HIGHER SECONDARY SCHOOL'
    return (
      <div className="brandmark-hero flex flex-col items-center text-center">
        <span className="brandmark-crest-wrap crest-float inline-flex">
          <span className="brandmark-halo" aria-hidden />
          <span className="brandmark-halo brandmark-halo-delay" aria-hidden />
          <Crest size={size} glow />
        </span>
        <p className="brandmark-school-hero mt-4" aria-label={title}>
          {title.split('').map((ch, i) => (
            <span key={`${ch}-${i}`} style={{ animationDelay: `${i * 0.045}s` }}>
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </p>
        <span className="brandmark-gold-line" aria-hidden />
        <p className="brandmark-title brandmark-title-hero mt-2 font-display text-white">{subtitle || 'KARACHI'}</p>
      </div>
    )
  }

  return (
    <div className="brandmark flex min-w-0 items-center gap-2 sm:gap-3">
      <span className="crest-float inline-flex">
        <Crest size={size} glow />
      </span>
      <div className="min-w-0">
        <p className="brandmark-school font-serif text-[#FFC72C]">
          NJV GOVT. HIGHER SECONDARY SCHOOL
        </p>
        <p className="brandmark-title truncate font-display text-white">{subtitle || 'KARACHI'}</p>
      </div>
    </div>
  )
}
