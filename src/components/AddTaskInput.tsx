"use client";
import { useState } from "react";
import type { Attachment } from "@/types";
import AttachmentEditor from "./AttachmentEditor";

interface Props {
  placeholder?: string;
  onAdd: (text: string, attachments: Attachment[]) => void;
  allowAttachments?: boolean;
}

export default function AddTaskInput({
  placeholder = "Add a task and press Enter",
  onAdd,
  allowAttachments = true,
}: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  function submit() {
    if (text.trim()) {
      onAdd(text.trim(), attachments);
      setText("");
      setAttachments([]);
    }
  }

  return (
    <div className="w-full">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder={placeholder}
        className="w-full text-sm bg-transparent border border-dashed border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-accent transition-all"
      />
      {allowAttachments && (
        <div className="mt-1.5">
          <AttachmentEditor attachments={attachments} onChange={setAttachments} compact />
        </div>
      )}
    </div>
  );
}
