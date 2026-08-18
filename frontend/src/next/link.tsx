import type { AnchorHTMLAttributes, ReactNode } from "react";

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children?: ReactNode;
  prefetch?: boolean;
  scroll?: boolean;
  replace?: boolean;
}

export default function Link({ href, children, ...rest }: LinkProps) {
  const isAdmin = typeof href === 'string' && href.startsWith('/admin');

  return (
    <a
      href={href}
      data-astro-prefetch="hover"
      {...(isAdmin ? { 'data-astro-reload': '' } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}