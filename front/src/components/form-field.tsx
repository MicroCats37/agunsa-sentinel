import { Label } from '@/components/ui/label';
import { cn } from 'cn';
import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Campo de formulario con etiqueta, pista y error.
 *
 * El error sustituye a la pista: un campo con incidencia no necesita las dos
 * lineas a la vez.
 */

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  /** Texto de ayuda bajo el control. */
  hint?: string;
  /** Mensaje de error; tiene prioridad sobre la pista. */
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className,
}: FormFieldProps) {
  return (
    <div data-slot="form-field" className={cn('flex flex-col gap-1.5', className)}>
      <Label
        htmlFor={htmlFor}
        className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
      >
        {label}
        {required ? <span className="-ml-1.5 text-critical">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-[11px] text-critical">
          <CircleAlert className="size-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
