"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGraphTreeContext } from "@/lib/graph-tree-context";
import { useQuery } from "@/lib/query-context";
import type { TreeItem } from "@/lib/tree-structure";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChatCircleTextIcon,
  PaperPlaneRightIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react";
import {
  CircleIcon,
  LightbulbIcon,
  LinuxLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { FormEvent, useEffect, useRef, useState } from "react";

/** Converts the tree structure to a compact indented text for the AI. */
function serializeTree(item: TreeItem, depth = 0): string {
  const indent = "  ".repeat(depth);
  const lines = [`${indent}- ${item.label}`];
  if (item.children) {
    for (const child of item.children) {
      lines.push(serializeTree(child, depth + 1));
    }
  }
  return lines.join("\n");
}

const SIDEBAR_WIDTH = 312;

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

function extractAssistantContent(text: string) {
  const thinkStartTag = "<think>";
  const thinkEndTag = "</think>";
  const startIndex = text.indexOf(thinkStartTag);

  if (startIndex === -1) {
    return {
      visibleText: text,
      thinkingText: "",
      isThinking: false,
    };
  }

  const afterThinkStart = text.slice(startIndex + thinkStartTag.length);
  const endIndex = afterThinkStart.indexOf(thinkEndTag);

  if (endIndex === -1) {
    return {
      visibleText: text.slice(0, startIndex).trim(),
      thinkingText: afterThinkStart,
      isThinking: true,
    };
  }

  return {
    visibleText: (
      text.slice(0, startIndex) +
      afterThinkStart.slice(endIndex + thinkEndTag.length)
    ).trim(),
    thinkingText: "",
    isThinking: false,
  };
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
  const { treeRoot, status, setFocusNodeId, selectedNode, selectedNodes } =
    useGraphTreeContext();
  const [activeView, setActiveView] = useState<SidebarView>("tree");
  const [chatInput, setChatInput] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Mutable body object so context stays fresh on every request without
  // reinitialising the transport (DefaultChatTransport reads properties at
  // send-time via object spread, so mutating the same reference works).
  const chatBodyRef = useRef<Record<string, string>>({});
  useEffect(() => {
    chatBodyRef.current.treeContextText = treeRoot
      ? serializeTree(treeRoot)
      : "";
    chatBodyRef.current.selectedNodeLabel = selectedNode?.data?.label
      ? String(selectedNode.data.label)
      : "";
    chatBodyRef.current.selectedNodeSummary =
      selectedNode?.data?.summary || selectedNode?.data?.description
        ? String(selectedNode.data.summary ?? selectedNode.data.description ?? "")
        : "";
    chatBodyRef.current.selectedNodesContext = JSON.stringify(
      selectedNodes
        .map((node) => {
          const label = node.data?.label ? String(node.data.label) : "";
          const summary =
            node.data?.summary || node.data?.description
              ? String(node.data.summary ?? node.data.description ?? "")
              : "";
          if (!label) {
            return null;
          }
          return { id: node.id, label, summary };
        })
        .filter((entry): entry is { id: string; label: string; summary: string } =>
          Boolean(entry),
        ),
    );
    chatBodyRef.current.topicQuery = query ?? "";
  }, [treeRoot, selectedNode, selectedNodes, query]);

  const {
    messages,
    sendMessage,
    status: chatStatus,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: chatBodyRef.current,
    }),
  });

  useEffect(() => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, chatStatus]);

  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const assistantHasStarted =
    latestAssistantMessage?.parts.some(
      (part) => part.type === "text" && part.text.trim().length > 0,
    ) ?? false;
  const showPendingAssistant =
    chatStatus === "submitted" ||
    (chatStatus === "streaming" && !assistantHasStarted);

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
      <div
        className="flex h-full shrink-0 flex-col"
        style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
      >
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
        <div className="minimal-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2">
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
                      className="minimal-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-1 py-1"
                    >
                      {messages.length === 0 ? (
                        <p className="px-2 py-3 text-xs text-sidebar-foreground/60">
                          Ask anything about the current topic. Responses stream
                          in real time.
                        </p>
                      ) : (
                        messages.map((message) => {
                          const plainText = message.parts
                            .filter((part) => part.type === "text")
                            .map((part) => part.text)
                            .join("");

                          const { visibleText, thinkingText, isThinking } =
                            extractAssistantContent(plainText);

                          return (
                            <div key={message.id} className="space-y-1.5">
                              {message.role === "assistant" &&
                                isThinking &&
                                thinkingText && (
                                  <p className="mr-8 px-1 text-xs whitespace-pre-wrap text-sidebar-foreground/60">
                                    {thinkingText}
                                  </p>
                                )}
                              {visibleText && (
                                <div
                                  className={cn(
                                    "rounded-xl px-3 py-2 text-sm",
                                    message.role === "user"
                                      ? "ml-8 bg-primary text-primary-foreground"
                                      : "mr-8 bg-sidebar-accent text-sidebar-foreground",
                                  )}
                                >
                                  {message.role === "assistant" ? (
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        p: ({ children }) => (
                                          <p className="mb-2 last:mb-0 leading-relaxed">
                                            {children}
                                          </p>
                                        ),
                                        ul: ({ children }) => (
                                          <ul className="mb-2 list-disc pl-4 space-y-1">
                                            {children}
                                          </ul>
                                        ),
                                        ol: ({ children }) => (
                                          <ol className="mb-2 list-decimal pl-4 space-y-1">
                                            {children}
                                          </ol>
                                        ),
                                        li: ({ children }) => (
                                          <li className="leading-relaxed">
                                            {children}
                                          </li>
                                        ),
                                        strong: ({ children }) => (
                                          <strong className="font-semibold">
                                            {children}
                                          </strong>
                                        ),
                                        em: ({ children }) => (
                                          <em className="italic">{children}</em>
                                        ),
                                        h1: ({ children }) => (
                                          <h1 className="mb-2 text-base font-bold">
                                            {children}
                                          </h1>
                                        ),
                                        h2: ({ children }) => (
                                          <h2 className="mb-1.5 text-sm font-bold">
                                            {children}
                                          </h2>
                                        ),
                                        h3: ({ children }) => (
                                          <h3 className="mb-1 text-sm font-semibold">
                                            {children}
                                          </h3>
                                        ),
                                        code: ({ children, className }) => (
                                          <code className={cn("font-mono text-xs", className)}>
                                            {children}
                                          </code>
                                        ),
                                        pre: ({ children }) => (
                                          <pre className="mb-2 overflow-x-auto rounded-lg bg-black/10 p-2">
                                            {children}
                                          </pre>
                                        ),
                                        blockquote: ({ children }) => (
                                          <blockquote className="mb-2 border-l-2 border-sidebar-foreground/30 pl-3 italic text-sidebar-foreground/70">
                                            {children}
                                          </blockquote>
                                        ),
                                        hr: () => (
                                          <hr className="my-2 border-sidebar-foreground/20" />
                                        ),
                                      }}
                                    >
                                      {visibleText}
                                    </ReactMarkdown>
                                  ) : (
                                    <p className="whitespace-pre-wrap">
                                      {visibleText}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                      {showPendingAssistant && (
                        <div className="mr-8 rounded-xl bg-sidebar-accent px-3 py-2 text-sm text-sidebar-foreground">
                          <p className="skeleton-shimmer rounded-md px-1 py-0.5 text-sidebar-foreground/70">
                            Thinking...
                          </p>
                        </div>
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
                        disabled={
                          !chatInput.trim() || chatStatus === "streaming"
                        }
                        aria-label="Send message"
                      >
                        <PaperPlaneRightIcon className="size-4" weight="fill" />
                      </Button>
                    </form>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
