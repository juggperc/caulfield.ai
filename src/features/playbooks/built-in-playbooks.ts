import type { PlaybookEntry } from "./types";

export const BUILT_IN_PLAYBOOKS: readonly PlaybookEntry[] = [
  {
    id: "builtin-meeting-notes",
    title: "Meeting notes",
    description: "Template only — blank structure for notes",
    prompt:
      "## Meeting\n\n**Date:** \n**Attendees:** \n\n### Agenda\n- \n\n### Decisions\n- \n\n### Action items\n- [ ] \n",
    builtIn: true,
  },
  {
    id: "builtin-weekly-review",
    title: "Weekly review",
    description: "Thinking mode · memory in RAG",
    prompt:
      "Help me do a weekly review: wins, blockers, priorities for next week, and one thing to stop doing. Use my notes and memory if relevant.",
    apply: {
      chatMode: "thinking",
      ragMemory: true,
    },
    builtIn: true,
  },
  {
    id: "builtin-web-fact-check",
    title: "Quick fact check",
    description: "Thinking mode · web search on",
    prompt:
      "I need current, sourced facts about the following (cite what you find):\n\n",
    apply: {
      chatMode: "thinking",
      webSearch: true,
    },
    builtIn: true,
  },
  {
    id: "builtin-code-review",
    title: "Code review checklist",
    description: "Template only",
    prompt:
      "Review this code for correctness, edge cases, security, performance, and readability. List issues by severity and suggest concrete fixes.\n\n```\n\n```",
    builtIn: true,
  },
  {
    id: "builtin-research-brief",
    title: "Research brief",
    description: "Thinking · research snippets in RAG",
    prompt:
      "Using my saved research snippets and notes, produce a short brief: thesis, key claims, gaps, and suggested next sources.\n\nTopic focus:\n",
    apply: {
      chatMode: "thinking",
      ragResearch: true,
      ragMemory: true,
    },
    builtIn: true,
  },
  {
    id: "builtin-draft-email",
    title: "Draft email",
    description: "Template only",
    prompt:
      "Draft a concise professional email.\n\n**To:** \n**Goal:** \n**Tone:** \n\nKey points to cover:\n- \n",
    builtIn: true,
  },
] as const;
