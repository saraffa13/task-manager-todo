"use client";
import { useState } from "react";

interface Props {
  placeholder?: string;
  onAdd: (text: string) => void;
}

export default function AddTaskInput({ placeholder = "Add a task and press Enter", onAdd }: Props) {
  const [text, setText] = useState("");
  function submit() {
    if (text.trim()) {
      onAdd(text.trim());
      setText("");
    }
  }
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
      }}
      onBlur={submit}
      placeholder={placeholder}
      className="w-full text-sm bg-transparent border border-dashed border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-accent transition-all"
    />
  );
}
