import type { AnchorHTMLAttributes, ReactNode } from "react";

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children?: ReactNode;
  prefetch?: boolean;
  scroll?: boolean;
  replace?: boolean;
}

export default function Link({ href, children, ...rest }: LinkProps) {
  return (
    <a
      href={href}
      data-astro-prefetch="hover"
      {...rest}
    >
      {children}
    </a>
  );
}