"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X, Sprout, LoaderCircle, ArrowUpRight } from "lucide-react";
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`logo ${light ? "logo-light" : ""}`}>
      <Sprout size={27} strokeWidth={1.5} />
      <span>
        heirloom<span className="logo-dot">.</span>
      </span>
    </span>
  );
}
export function Spinner() {
  return <LoaderCircle className="spin" size={18} aria-label="Loading" />;
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function DemoArt({ variant = 0 }: { variant?: number }) {
  return (
    <svg
      className={`memory-art art-${variant % 6}`}
      viewBox="0 0 600 360"
      role="img"
      aria-label={
        [
          "A little house in a green landscape",
          "A sunlit kitchen still life",
          "A winding road toward the sea",
          "Flowers gathered in a vase",
          "Leaves in a quiet garden",
          "Mountains in the evening light",
        ][variant % 6]
      }
    >
      <defs>
        <filter id={`grain-${variant}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".8"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".12" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
      </defs>
      <rect width="600" height="360" fill="var(--art-bg)" />
      {variant % 6 === 0 ? (
        <g>
          <circle cx="470" cy="75" r="42" fill="#eac892" />
          <path d="M0 225Q130 125 290 240T600 210V360H0" fill="#829578" />
          <path d="M0 280Q260 200 600 280V360H0" fill="#5f7861" />
          <path d="M187 155H366V291H187Z" fill="#e9dcc3" />
          <path d="M170 158L276 79L384 158Z" fill="#975d48" />
          <path d="M254 214H301V291H254Z" fill="#497a83" />
          <path d="M206 191H236V222H206ZM323 191H349V222H323Z" fill="#b9a47b" />
          <path d="M276 291Q230 328 218 360H315Q294 330 279 291" fill="#c3af8a" />
          <path d="M75 270V156M506 260V140" stroke="#495b44" strokeWidth="8" />
          <ellipse cx="75" cy="145" rx="48" ry="75" fill="#445f49" />
          <ellipse cx="506" cy="132" rx="53" ry="84" fill="#6a8059" />
        </g>
      ) : variant % 6 === 1 ? (
        <g>
          <path d="M0 250H600V360H0Z" fill="#b89572" />
          <rect x="55" y="24" width="194" height="205" fill="#f2e8cf" />
          <path d="M152 24V229M55 126H249" stroke="#c9bba0" strokeWidth="8" />
          <path d="M318 163H452L432 270H338Z" fill="#567066" />
          <ellipse cx="385" cy="164" rx="67" ry="17" fill="#344e45" />
          <path
            d="M452 185Q502 180 482 227Q470 246 440 235"
            fill="none"
            stroke="#567066"
            strokeWidth="16"
          />
          <ellipse cx="206" cy="290" rx="109" ry="27" fill="#dfd0ad" />
          <path d="M126 280Q147 203 238 233Q280 246 279 280Z" fill="#aa7042" />
          <path
            d="M165 252L181 273M201 240L219 270M235 247L250 270"
            stroke="#edc689"
            strokeWidth="6"
          />
        </g>
      ) : variant % 6 === 2 ? (
        <g>
          <circle cx="420" cy="92" r="43" fill="#e9b76a" />
          <path d="M0 158H600V360H0Z" fill="#749494" />
          <path d="M0 205Q160 178 300 242T600 267V360H0Z" fill="#d0b790" />
          <path d="M0 232Q190 210 276 278T465 360H0Z" fill="#657961" />
          <path
            d="M155 360Q278 280 180 253Q111 230 179 220"
            fill="none"
            stroke="#eee0b9"
            strokeWidth="32"
          />
          <path d="M369 174H469M340 195H496M490 222H580" stroke="#c5d0b8" strokeWidth="3" />
        </g>
      ) : variant % 6 === 3 ? (
        <g>
          <ellipse cx="303" cy="310" rx="140" ry="20" fill="#c9b297" />
          <path d="M248 208H355L369 300Q299 330 235 300Z" fill="#ae7861" />
          <path
            d="M295 250Q286 100 225 94M302 232Q350 153 389 83M317 249L310 65"
            fill="none"
            stroke="#587058"
            strokeWidth="7"
          />
          {[
            [220, 93],
            [389, 85],
            [310, 65],
            [267, 151],
            [351, 145],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="32" fill={i % 2 ? "#d5a177" : "#e9d0a1"} />
              <circle cx={x} cy={y} r="10" fill="#96724c" />
            </g>
          ))}
        </g>
      ) : variant % 6 === 4 ? (
        <g>
          <path
            d="M103 361Q156 166 242 59M291 360Q310 173 479 70M170 360Q314 276 372 183"
            stroke="#486b53"
            strokeWidth="6"
            fill="none"
          />
          {[
            [151, 242, -40],
            [183, 165, -40],
            [220, 97, -40],
            [140, 300, 40],
            [219, 252, 40],
            [358, 183, -40],
            [404, 124, -40],
            [297, 305, -40],
            [328, 246, 40],
            [453, 122, 40],
          ].map(([x, y, r], i) => (
            <ellipse
              key={i}
              cx={x}
              cy={y}
              rx="28"
              ry="60"
              transform={`rotate(${r} ${x} ${y})`}
              fill={i % 2 ? "#8e9f6c" : "#5d7d60"}
            />
          ))}
        </g>
      ) : (
        <g>
          <circle cx="405" cy="99" r="51" fill="#dfb674" />
          <path d="M0 298L184 94L355 300Z" fill="#879287" />
          <path d="M174 360L387 128L600 343V360Z" fill="#66766c" />
          <path d="M0 310Q180 262 361 327T600 287V360H0Z" fill="#b2a587" />
          <path d="M-5 355Q264 302 605 356" stroke="#d4c1a1" strokeWidth="22" fill="none" />
        </g>
      )}
      <rect width="600" height="360" fill="transparent" filter={`url(#grain-${variant})`} />
    </svg>
  );
}
export function ExternalArrow() {
  return <ArrowUpRight size={16} />;
}
