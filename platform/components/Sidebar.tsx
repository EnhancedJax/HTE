"use client";

import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGraphTreeContext } from "@/lib/graph-tree-context";
import { useQuery } from "@/lib/query-context";
import type { TreeItem } from "@/lib/tree-structure";
import { cn } from "@/lib/utils";
import { DefaultChatTransport } from "ai";
import {
  ChatCircleTextIcon,
  PaperPlaneRightIcon,
  TreeStructureIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import {
  CircleIcon,
  LightbulbIcon,
  LinuxLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import { FormEvent, useEffect, useRef, useState } from "react";

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

type SidebarView = "tree" | "chat";

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
  const [activeView, setActiveView] = useState<SidebarView>("tree");
  const [chatInput, setChatInput] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status: chatStatus } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  useEffect(() => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, chatStatus]);

  const handleSendChatMessage = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = chatInput.trim();
    if (!value) {
      return;
    }
    sendMessage({ text: value });
    setChatInput("");
  };

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
        <div className="shrink-0 border-b border-sidebar-border px-2 py-2">
          <div className="grid grid-cols-2 rounded-xl bg-sidebar-accent/50 p-1">
            <Button
              variant={activeView === "tree" ? "secondary" : "ghost"}
              size="sm"
              className="justify-center gap-1.5"
              onClick={() => setActiveView("tree")}
              aria-pressed={activeView === "tree"}
            >
              <TreeStructureIcon className="size-4" />
              <span className="text-xs">Tree</span>
            </Button>
            <Button
              variant={activeView === "chat" ? "secondary" : "ghost"}
              size="sm"
              className="justify-center gap-1.5"
              onClick={() => setActiveView("chat")}
              aria-pressed={activeView === "chat"}
            >
              <ChatCircleTextIcon className="size-4" />
              <span className="text-xs">AI Chat</span>
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2">
          <AnimatePresence mode="wait">
            {open && (
              <motion.div
                key={activeView}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-2 h-full"
              >
                {activeView === "tree" ? (
                  !query ? (
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
                  )
                ) : (
                  <div className="flex h-full min-h-0 flex-col">
                    <div
                      ref={messagesContainerRef}
                      className="min-h-0 flex-1 space-y-2 overflow-y-auto px-1 py-1"
                    >
                      {messages.length === 0 ? (
                        <p className="px-2 py-3 text-xs text-sidebar-foreground/60">
                          Ask anything about the current topic. Responses stream
                          in real time.
                        </p>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={cn(
                              "rounded-xl px-3 py-2 text-sm",
                              message.role === "user"
                                ? "ml-8 bg-primary text-primary-foreground"
                                : "mr-8 bg-sidebar-accent text-sidebar-foreground",
                            )}
                          >
                            {message.parts.map((part, index) =>
                              part.type === "text" ? (
                                <p
                                  key={`${message.id}-${index}`}
                                  className="whitespace-pre-wrap"
                                >
                                  {part.text}
                                </p>
                              ) : null,
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    <form
                      onSubmit={handleSendChatMessage}
                      className="mt-2 flex items-center gap-2 border-t border-sidebar-border pt-2"
                    >
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask the AI assistant..."
                        className="h-9 rounded-xl text-sm"
                      />
                      <Button
                        type="submit"
                        size="icon-sm"
                        disabled={!chatInput.trim() || chatStatus === "streaming"}
                        aria-label="Send message"
                      >
                        <PaperPlaneRightIcon className="size-4" weight="fill" />
                      </Button>
                    </form>
                    {chatStatus === "streaming" && (
                      <p className="px-1 pt-1 text-xs text-sidebar-foreground/60">
                        AI is typing...
                      </p>
                    )}
                  </div>
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
