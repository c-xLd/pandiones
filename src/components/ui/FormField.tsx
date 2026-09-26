import React from 'react';

type ControlProps = {
  id?: string;
  className?: string;
  required?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

type FormFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactElement<ControlProps>;
};

/** Persistent label, control, hint and field-level error — see DESIGN.md "Form alanı". */
export default function FormField({ id, label, required, optional, hint, error, className, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = React.cloneElement(children, {
    id,
    required: required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    className: ['field__control', children.props.className].filter(Boolean).join(' '),
  });

  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
        {!required && optional ? <> <span className="field__optional">isteğe bağlı</span></> : null}
      </label>
      {control}
      {hint ? <p id={hintId} className="field__hint">{hint}</p> : null}
      {error ? <p id={errorId} className="field__error">{error}</p> : null}
    </div>
  );
}
