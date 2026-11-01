type Props = { variant: number };

const sharedProps = {
  viewBox: "0 0 560 250",
  role: "presentation",
  "aria-hidden": true,
  focusable: false,
} as const;

export function CategoryGraphic({ variant }: Props) {
  if (variant === 0) return <svg {...sharedProps} className="category-art-svg">
    <g data-layer="engine-block" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M35 197h168l42-44h117l33 29h130" opacity=".35"/>
      <path d="M73 189V86l45-27h134l43 29v101"/>
      <path d="M114 98h145M114 126h116M114 154h78" opacity=".42"/>
      <circle cx="396" cy="111" r="62"/><circle cx="396" cy="111" r="38" opacity=".4"/>
    </g>
    <g data-layer="oil-flow">
      <path d="M331 7c-18 36-57 73-57 113 0 45 35 78 82 78 39 0 72-25 79-60-11 12-29 19-48 19-38 0-67-27-67-64 0-30 16-56 11-86Z" fill="var(--graphic-accent)"/>
      <path d="M344 45c-9 22-23 43-23 66 0 23 17 41 40 41" fill="none" stroke="var(--graphic-ink)" strokeLinecap="round" strokeWidth="8" opacity=".72"/>
    </g>
  </svg>;

  if (variant === 1) return <svg {...sharedProps} className="category-art-svg">
    <g data-layer="diesel-grid" fill="none" stroke="currentColor" strokeWidth="3" opacity=".3">
      <path d="M18 55h524M18 104h524M18 153h524M18 202h524"/><path d="M91 20v212M183 20v212M275 20v212M367 20v212M459 20v212"/>
    </g>
    <g data-layer="pistons" fill="var(--graphic-paper)" stroke="currentColor" strokeWidth="5">
      <path d="M61 68h126v64H61zM80 132h88v82H80z"/><path d="M221 44h126v64H221zM240 108h88v106h-88z"/><path d="M381 82h126v64H381zM400 146h88v68h-88z"/>
    </g>
    <path data-layer="fuel-pulse" d="M24 174c63-48 88 48 148 0s91 48 151 0 91 48 213-9" fill="none" stroke="var(--graphic-accent)" strokeLinecap="round" strokeWidth="13"/>
  </svg>;

  if (variant === 2) return <svg {...sharedProps} className="category-art-svg">
    <g data-layer="road" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M-12 218C86 112 190 214 287 99S458 12 583 50" strokeWidth="52" opacity=".16"/>
      <path d="M-12 218C86 112 190 214 287 99S458 12 583 50" stroke="var(--graphic-paper)" strokeDasharray="18 22" strokeWidth="5"/>
    </g>
    <g data-layer="wheels" fill="none" stroke="currentColor">
      <circle cx="171" cy="151" r="72" strokeWidth="10"/><circle cx="171" cy="151" r="45" strokeWidth="3" opacity=".45"/>
      <circle cx="410" cy="104" r="91" strokeWidth="10"/><circle cx="410" cy="104" r="57" strokeWidth="3" opacity=".45"/>
      <path d="m171 151 77-93 69 66 93-20M248 58l-36-7M290 57h-42" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
    <path data-layer="oil-swoop" d="M27 56c122 35 205 24 293-26" fill="none" stroke="var(--graphic-accent)" strokeLinecap="round" strokeWidth="17"/>
  </svg>;

  if (variant === 3) return <svg {...sharedProps} className="category-art-svg">
    <g data-layer="fluid-channels" fill="none" stroke="currentColor" strokeWidth="4">
      <path d="M20 53h128l36 35h97l39-35h220M20 198h111l52-52h108l53 52h196" opacity=".38"/>
      <path d="M20 126h96l31-30h88l32 30h101l34-31h138"/>
    </g>
    <g data-layer="valves" fill="var(--graphic-paper)" stroke="currentColor" strokeWidth="4">
      <circle cx="148" cy="126" r="28"/><circle cx="267" cy="126" r="28"/><circle cx="402" cy="126" r="28"/>
      <path d="m132 110 32 32m0-32-32 32m119-32 32 32m0-32-32 32m119-32 32 32m0-32-32 32"/>
    </g>
    <path data-layer="transmission-flow" d="M42 31c99 0 101 53 199 53s101-53 277-53" fill="none" stroke="var(--graphic-accent)" strokeLinecap="round" strokeWidth="15"/>
  </svg>;

  return <svg {...sharedProps} className="category-art-svg">
    <g data-layer="gear-field" fill="none" stroke="currentColor">
      <circle cx="178" cy="123" r="90" strokeWidth="12" strokeDasharray="26 10"/><circle cx="178" cy="123" r="52" strokeWidth="5"/><circle cx="178" cy="123" r="16" strokeWidth="5"/>
      <circle cx="389" cy="123" r="115" strokeWidth="12" strokeDasharray="31 12"/><circle cx="389" cy="123" r="69" strokeWidth="5"/><circle cx="389" cy="123" r="20" strokeWidth="5"/>
    </g>
    <path data-layer="gear-oil" d="M21 211c88-60 143 28 222-23s137-99 298-39" fill="none" stroke="var(--graphic-accent)" strokeLinecap="round" strokeWidth="18"/>
    <path d="M317 32c-9 21-28 39-28 62 0 22 18 39 41 39s41-17 41-39c0-23-20-41-29-62-5-11-19-11-25 0Z" fill="var(--graphic-accent)"/>
  </svg>;
}
