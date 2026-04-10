declare module 'class-variance-authority' {
  import { type ClassValue } from 'clsx';

  export interface VariantConfig<T extends string> {
    variants?: {
      [key: string]: {
        [key: string]: string;
      };
    };
    defaultVariants?: {
      [key: string]: string;
    };
  }

  export function cva<T extends string>(
    base: string,
    config?: VariantConfig<T>
  ): (props?: { [key: string]: string | undefined }) => string;

  export type VariantProps<T extends (...args: any[]) => any> = Parameters<T>[0];
}
