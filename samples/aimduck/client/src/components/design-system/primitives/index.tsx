// SPDX-License-Identifier: Apache-2.0

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  return (
    <button
      className={`${variant === "secondary" ? "button-secondary" : ""} ${className}`.trim()}
      {...props}
    />
  );
}

export function Badge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "info";
  children: ReactNode;
}) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}

export function Alert({
  tone = "error",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: "error" | "info" }) {
  return (
    <div className={`notice ${tone === "error" ? "notice-error" : "notice-info"}`} {...props}>
      {children}
    </div>
  );
}

export function Card({ children, className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={`entity-card ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

export function Progress({ label, value, max }: { label: string; value: number; max: number }) {
  const bounded = Math.min(max, Math.max(0, value));
  return (
    <div>
      <span>{label}</span>
      <progress aria-label={label} value={bounded} max={max} />
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return <p role="status">{label}</p>;
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="empty-state">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function ErrorState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="notice notice-error" role="alert">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose(): void;
}) {
  return (
    <dialog open aria-labelledby="design-system-dialog-title">
      <h2 id="design-system-dialog-title">{title}</h2>
      {children}
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
    </dialog>
  );
}
