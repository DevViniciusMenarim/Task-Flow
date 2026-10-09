import { Link, type LinkProps } from "react-router";

interface AppLinkProps extends Omit<LinkProps, "to"> {
  to: string;
}

export function AppLink({ to, ...props }: AppLinkProps) {
  return <Link to={to} {...props} />;
}
