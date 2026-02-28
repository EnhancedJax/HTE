"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useQuery } from "@/lib/query-context";
import { nodesEdgesToTree, type TreeItem } from "@/lib/tree-structure";
import { cn } from "@/lib/utils";
import { useTreeData } from "@/hooks/useTreeData";
import {
  CaretRightIcon,
  FolderIcon,
  FileIcon,
  TreeStructureIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";

const SIDEBAR_WIDTH = 260;

interface SidebarProps {
  open: boolean;
  className?: string;
}

function SidebarTreeItem({ item }: { item: TreeItem }) {
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <Collapsible key={item.id} defaultOpen>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="group h-8 w-full justify-start gap-2 rounded-md px-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-none font-normal"
          >
            <CaretRightIcon className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
            <FolderIcon className="size-4 shrink-0" weight="duotone" />
            <span className="truncate text-left">{item.label}</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
            {item.children!.map((child) => (
              <SidebarTreeItem key={child.id} item={child} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Button
      key={item.id}
      variant="ghost"
      size="sm"
      className="h-8 w-full justify-start gap-2 rounded-md px-2 text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-none font-normal"
    >
      <span className="size-4 shrink-0" aria-hidden />
      <FileIcon className="size-4 shrink-0" weight="duotone" />
      <span className="truncate text-left">{item.label}</span>
    </Button>
  );
}

export function Sidebar({ open, className }: SidebarProps) {
  const { query } = useQuery();
  const { nodes, edges, status } = useTreeData(query);
  const treeRoot = status === "success" ? nodesEdgesToTree(nodes, edges) : null;

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
            {open && (
              <motion.div
                key="tree"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-2"
              >
                {!query ? (
                  <p className="px-2 py-4 text-xs text-sidebar-foreground/60">
                    Search a topic to see the knowledge tree.
                  </p>
                ) : status === "loading" ? (
                  <p className="px-2 py-4 text-xs text-sidebar-foreground/60">
                    Loading…
                  </p>
                ) : treeRoot ? (
                  <div className="flex flex-col gap-0.5">
                    <SidebarTreeItem item={treeRoot} />
                  </div>
                ) : (
                  <p className="px-2 py-4 text-xs text-sidebar-foreground/60">
                    No tree data.
                  </p>
                )}
              </motion.div>
            )}
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
