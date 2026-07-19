"use client";

export function DeletePostButton() {
  return <button type="submit" className="border-2 border-red-900 bg-red-50 px-4 py-3 text-xs font-bold uppercase text-red-900" onClick={(event) => { if (!window.confirm("Permanently delete this journal entry and its photos? This cannot be undone.")) event.preventDefault(); }}>Delete entry</button>;
}
