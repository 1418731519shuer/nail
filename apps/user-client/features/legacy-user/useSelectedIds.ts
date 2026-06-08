"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "nail-tryon-selected-ids";

export function useSelectedIds() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSelectedIds(JSON.parse(stored));
    } catch {}
  }, []);

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id].slice(0, 6);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function clearSelected() {
    setSelectedIds([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  return { selectedIds, toggleSelected, clearSelected };
}
