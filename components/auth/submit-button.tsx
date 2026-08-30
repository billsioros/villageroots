"use client";

import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SubmitButton({
  isLoading,
  children,
  className,
}: {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button type="submit" disabled={isLoading} className={cn("w-full", className)}>
      {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}
