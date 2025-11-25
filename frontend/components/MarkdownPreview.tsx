"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-2xl font-bold text-slate-100" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-xl font-semibold text-slate-200" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-lg font-medium text-slate-300" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="text-slate-300 leading-relaxed" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc list-inside space-y-1 text-slate-300" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal list-inside space-y-1 text-slate-300" {...props} />
          ),
          code: ({ ...props }) => (
            <code className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-400" {...props} />
          ),
          pre: ({ ...props }) => (
            <pre className="bg-slate-800 p-4 rounded-md overflow-x-auto" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
