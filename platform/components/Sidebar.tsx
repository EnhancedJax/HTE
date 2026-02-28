"use client";

import { cn } from "@/lib/utils";
import { TreeStructureIcon, UserCircleIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";

const SIDEBAR_WIDTH = 260;

interface SidebarProps {
  open: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Sidebar({ open, className, children }: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? SIDEBAR_WIDTH : 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className={cn(
        "shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar overflow-hidden",
        className
      )}
    >
      <div className="flex h-full w-[260px] min-w-[260px] shrink-0 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
          <TreeStructureIcon className="size-5 shrink-0 text-sidebar-foreground" />
          <span className="truncate text-sm font-medium text-sidebar-foreground">
            Explorer
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2">
          <AnimatePresence mode="wait">
            {open ? (
              <motion.nav
                key="nav"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-2"
              >
                {children}
              </motion.nav>
            ) : null}
          </AnimatePresence>
        </div>
        {open && (
          <div className="shrink-0 border-t border-sidebar-border px-3 py-3">
            <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-2 py-2">
              <UserCircleIcon
                className="size-9 shrink-0 text-sidebar-foreground/80"
                weight="duotone"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  Alex Chen
                </p>
                <p className="truncate text-xs text-sidebar-foreground/70">
                  alex@example.com
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
