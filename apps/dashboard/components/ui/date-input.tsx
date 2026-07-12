import { forwardRef, type InputHTMLAttributes } from 'react';

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      type="date"
      className={`input-date ${className}`}
      {...props}
    />
  ),
);

DateInput.displayName = 'DateInput';
