import * as React from "react";
import { cn } from "@/lib/utils";

const IconInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { icon?: React.ReactNode }
>(({ className, icon, type, ...props }, ref) => {
  return (
    <div className="relative flex items-center">
      {icon && (
        <span className="pointer-events-none absolute left-3 text-muted-foreground">
          {icon}
        </span>
      )}
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[10px] border border-transparent bg-[#EEF0F4] px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          icon && "pl-10",
          className,
        )}
        ref={ref}
        {...props}
      />
    </div>
  );
});
IconInput.displayName = "IconInput";

export { IconInput };
