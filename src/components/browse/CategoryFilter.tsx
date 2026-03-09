"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
}

interface CategoryFilterProps {
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/topics")
      .then((res) => res.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

  if (categories.length === 0) return null;

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        <Badge
          variant={selected === null ? "default" : "outline"}
          className={cn(
            "cursor-pointer shrink-0 px-3 py-1.5 text-sm transition-colors",
            selected === null
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "hover:bg-accent"
          )}
          onClick={() => onSelect(null)}
        >
          All
        </Badge>
        {categories.map((cat) => (
          <Badge
            key={cat.id}
            variant={selected === cat.slug ? "default" : "outline"}
            className={cn(
              "cursor-pointer shrink-0 px-3 py-1.5 text-sm transition-colors",
              selected === cat.slug
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "hover:bg-accent"
            )}
            onClick={() => onSelect(cat.slug === selected ? null : cat.slug)}
          >
            {cat.icon && <span className="mr-1">{cat.icon}</span>}
            {cat.name}
          </Badge>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
