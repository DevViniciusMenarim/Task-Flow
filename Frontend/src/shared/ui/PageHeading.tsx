import type { ReactNode } from "react";

interface PageHeadingProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeading({ eyebrow, title, description, action }: PageHeadingProps) {
  return (
    <div className="section-heading page-heading">
      <div className="page-heading-copy">
        {eyebrow && <span className="section-kicker">{eyebrow}</span>}
        <h1 tabIndex={-1}>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
