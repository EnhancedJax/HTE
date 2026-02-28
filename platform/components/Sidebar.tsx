"use client";

import { Button } from "@/components/ui/button";
import { useGraphTreeContext } from "@/lib/graph-tree-context";
import { useQuery } from "@/lib/query-context";
import type { TreeItem } from "@/lib/tree-structure";
import { cn } from "@/lib/utils";
import { TreeStructureIcon, UserCircleIcon } from "@phosphor-icons/react";
import {
  CircleIcon,
  LightbulbIcon,
  LinuxLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";

const SIDEBAR_WIDTH = 260;

/** Indentation in px per depth level so deeper layers stay compact. */
const INDENT_PER_LEVEL = 1;

interface SidebarProps {
  open: boolean;
  className?: string;
}

interface SidebarTreeItemProps {
  item: TreeItem;
  depth: number;
  onSelectNode: (nodeId: string) => void;
}

function SidebarTreeItem({ item, depth, onSelectNode }: SidebarTreeItemProps) {
  const hasChildren = item.children && item.children.length > 0;
  const paddingLeft = depth * INDENT_PER_LEVEL;

  const handleClick = () => onSelectNode(item.id);

  if (hasChildren) {
    return (
      <div key={item.id} className="flex flex-col gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          style={{ paddingLeft: `${paddingLeft}px` }}
          className="group h-8 w-full justify-start gap-2 rounded-md px-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-none font-normal"
          onClick={handleClick}
        >
          <CircleIcon className="size-4 shrink-0" />
          <span className="truncate text-left">{item.label}</span>
        </Button>
        <div
          className="mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-1"
          style={{ marginLeft: paddingLeft }}
        >
          {item.children!.map((child) => (
            <SidebarTreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Button
      key={item.id}
      variant="ghost"
      size="sm"
      style={{ paddingLeft: `${paddingLeft}px` }}
      className="h-8 w-full justify-start gap-2 rounded-md px-2 text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-none font-normal"
      onClick={handleClick}
    >
      <span className="size-4 shrink-0" aria-hidden />
      <LightbulbIcon className="size-4 shrink-0" weight="duotone" />
      <span className="truncate text-left">{item.label}</span>
    </Button>
  );
}

export function Sidebar({ open, className }: SidebarProps) {
  const { query } = useQuery();
  const { treeRoot, status, setFocusNodeId } = useGraphTreeContext();

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? SIDEBAR_WIDTH : 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className={cn(
        "shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar overflow-hidden",
        className,
      )}
    >
      <div className="flex h-full w-[260px] min-w-[260px] shrink-0 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
          <TreeStructureIcon className="size-5 shrink-0 text-sidebar-foreground" />
          <span className="flex flex-row items-baseline gap-2">
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              KTE
            </span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              v0.1.0
            </span>
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
                className="px-2 h-full"
              >
                {!query ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <LinuxLogoIcon className="size-10 text-sidebar-foreground/60" />
                  </div>
                ) : status === "loading" ? (
                  <p className="px-2 py-4 text-xs text-sidebar-foreground/60">
                    Loading…
                  </p>
                ) : treeRoot ? (
                  <div className="flex flex-col gap-0.5">
                    <SidebarTreeItem
                      item={treeRoot}
                      depth={0}
                      onSelectNode={setFocusNodeId}
                    />
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
