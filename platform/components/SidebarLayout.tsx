"use client";

import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen}>
        <div className="space-y-1 px-2 text-sm text-sidebar-foreground/80">
          <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/60">
            Navigation
          </p>
          <a
            href="/"
            className="block rounded-md px-2 py-1.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Knowledge Tree
          </a>
        </div>
      </Sidebar>
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          {children}
        </div>
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          className="absolute left-3 top-3 z-50 size-8 rounded-full shadow-md cursor-pointer"
        >
          {sidebarOpen ? (
            <CaretLeftIcon className="size-4" weight="bold" />
          ) : (
            <CaretRightIcon className="size-4" weight="bold" />
          )}
        </Button>
      </div>
    </div>
  );
}
