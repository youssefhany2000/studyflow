import type { ReactNode } from 'react';

import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 w-full h-full overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}