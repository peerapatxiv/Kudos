"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  const { children, ...rest } = props;
  return (
    <NextThemesProvider {...rest} enableColorScheme={false}>
      {children}
    </NextThemesProvider>
  );
}
