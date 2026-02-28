"use client";

import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const desktopMediaQuery = window.matchMedia("(min-width: 768px)");

    const syncSidebarToViewport = (isDesktop: boolean) => {
      setSidebarOpen(isDesktop);
    };

    syncSidebarToViewport(desktopMediaQuery.matches);

    const handleViewportChange = (event: MediaQueryListEvent) => {
      syncSidebarToViewport(event.matches);
    };

    desktopMediaQuery.addEventListener("change", handleViewportChange);

    return () => {
      desktopMediaQuery.removeEventListener("change", handleViewportChange);
    };
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} />
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
