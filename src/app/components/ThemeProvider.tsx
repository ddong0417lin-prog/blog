'use client';

/**
 * ============================================================================
 * Theme Provider 封装
 * ============================================================================
 *
 * 封装 next-themes 的 ThemeProvider，支持深浅主题切换
 */

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}