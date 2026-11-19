/**
 * Comprint wordmark logo.
 *
 * Glyphs are filled with `currentColor`, so colour is the caller's call —
 * pass `text-foreground` to stay legible in both light and dark themes.
 * The `viewBox` is cropped to the glyph bounding box (the source artwork
 * shipped with ~2x empty padding), so `h-* w-auto` sizes the wordmark
 * tightly with no stray whitespace around it.
 */
export function ComprintLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="203.91 196.46 742.84 107.08"
      fill="currentColor"
      role="img"
      aria-label="Comprint"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M203.91,285.4v-71.21l17.42-17.42h51.82l17.12,17.12v16.21h-20.61v-8.64l-7.12-7.12h-30.3l-7.73,7.73v55.46l7.73,7.73h30.3l7.12-7.12v-8.64h20.61v16.21l-17.12,17.12h-51.82L203.91,285.4z" />
      <path d="M299.06,285.4v-71.21l17.42-17.42h54.55l17.42,17.42v71.21l-17.42,17.42h-54.55L299.06,285.4z M360.13,285.25l7.73-7.73v-55.46l-7.73-7.73H327.4l-7.73,7.73v55.46l7.73,7.73H360.13z" />
      <path d="M397.33,196.76h19.09l31.52,68.49h0.3l31.67-68.49H499v106.06h-19.85v-64.55h-0.3l-24.39,49.7h-12.73l-24.24-49.7h-0.3v64.55h-19.85V196.76z" />
      <path d="M509.3,196.76h66.52l16.21,16.36v37.12l-16.36,16.52h-45.76v36.06H509.3V196.76z M566.43,249.49l5.3-5.3v-24.85l-5.3-5.3h-36.52v35.46H566.43z" />
      <path d="M685.7,267.37v35.15h-20.61v-30.46L656,261.92h-33.03v40.61h-20.61V196.46h66.52l16.21,16.36v32.12l-10.3,10.45L685.7,267.37z M622.97,244.94h36.52l5.3-5.3v-20.61l-5.3-5.3h-36.52V244.94z" />
      <path d="M695.12,196.76h20.61v106.06h-20.61V196.76z" />
      <path d="M725.78,196.76h18.49l47.27,71.97h0.3v-71.97h19.85v106.06H793.2l-47.27-71.82h-0.3v71.82h-19.85V196.76z" />
      <path d="M852.31,214.19h-31.67v-17.42h83.94v17.42h-31.67v88.64h-20.61V214.19z" />
      <rect x="905.05" y="261.84" width="41.7" height="41.7" />
    </svg>
  );
}
