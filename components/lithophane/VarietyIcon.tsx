/** Inline illustration used when a variety has no thumbnail URL. */
export default function VarietyIcon({ model, className = "" }: { model: string; className?: string }) {
  const stroke = "currentColor";
  return (
    <svg viewBox="0 0 80 64" className={className} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" aria-hidden>
      {model === "table_stand" ? (
        <>
          <path d="M24 8 h32 l2 36 h-36 z" fill="rgba(200,255,53,0.12)" />
          <path d="M14 44 h52 v8 h-52 z" />
          <path d="M30 20 q10 -6 20 0 v14 h-20 z" opacity="0.55" />
        </>
      ) : model === "light_box" ? (
        <>
          <rect x="14" y="10" width="52" height="44" rx="3" />
          <rect x="22" y="17" width="36" height="30" fill="rgba(200,255,53,0.18)" />
          <path d="M32 40 q8 -16 16 0" opacity="0.55" />
          <path d="M40 4 v-2 M20 6 l-2 -2 M60 6 l2 -2" opacity="0.5" />
        </>
      ) : (
        <>
          <rect x="12" y="6" width="56" height="52" rx="2" />
          <rect x="20" y="14" width="40" height="36" fill="rgba(200,255,53,0.12)" />
          <circle cx="34" cy="28" r="5" opacity="0.55" />
          <path d="M22 46 l12 -10 l8 7 l8 -9 l8 12" opacity="0.55" />
        </>
      )}
    </svg>
  );
}
