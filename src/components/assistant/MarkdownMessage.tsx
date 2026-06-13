"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders an assistant message as styled Markdown (GFM tables, lists, emphasis,
 *  code) instead of raw text. Tailwind classes match the chat bubble + dark mode. */
export default function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary-600 dark:text-primary-400 underline">
              {children}
            </a>
          ),
          h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-neutral-300 dark:border-neutral-600 pl-3 italic text-neutral-600 dark:text-neutral-400 mb-2">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = /language-/.test(className || "");
            if (isBlock) return <code className={className}>{children}</code>;
            return (
              <code className="px-1 py-0.5 rounded bg-neutral-200/70 dark:bg-neutral-700/70 text-[0.85em] font-mono">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-2 p-3 rounded-lg bg-neutral-900 text-neutral-100 text-xs overflow-x-auto">{children}</pre>
          ),
          hr: () => <hr className="my-2 border-neutral-200 dark:border-neutral-700" />,
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2 -mx-1">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          th: ({ children }) => (
            <th className="border border-neutral-300 dark:border-neutral-600 px-2 py-1 text-left font-semibold bg-neutral-100 dark:bg-neutral-800">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-neutral-300 dark:border-neutral-600 px-2 py-1 align-top">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
