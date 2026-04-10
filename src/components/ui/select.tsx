import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-10 w-full rounded-lg border border-[#2a2a3a] bg-[#12121a] px-3 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700] focus-visible:ring-offset-2 focus-visible:border-[#ffd700] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 appearance-none cursor-pointer',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export { Select };
