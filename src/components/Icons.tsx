import type { JSX } from "react";
import type { ReactNode } from "react";

/** Line icons drawn on a 24 grid, so they do not depend on the font's glyphs. */
function Icon({ size, children }: { size: number; children: ReactNode }): JSX.Element {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function ArrowRightIcon({ size = 18 }: { size?: number }): JSX.Element {
  return (
    <Icon size={size}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </Icon>
  );
}

export function ChevronUpIcon({ size = 18 }: { size?: number }): JSX.Element {
  return (
    <Icon size={size}>
      <path d="M6 15l6-6 6 6" />
    </Icon>
  );
}

export function ChevronDownIcon({ size = 18 }: { size?: number }): JSX.Element {
  return (
    <Icon size={size}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

export function AlertIcon({ size = 18 }: { size?: number }): JSX.Element {
  return (
    <Icon size={size}>
      <path d="M12 3.5 2.5 20h19L12 3.5zM12 10v4.5M12 17.3v.2" />
    </Icon>
  );
}
