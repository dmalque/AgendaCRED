import { useRef } from 'react';
import type { InputHTMLAttributes, ChangeEvent, InputEvent } from 'react';
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;
export function DateInput({
  onChange,
  onInput,
  max = '9999-12-31',
  min = '0001-01-01',
  ...props
}: Props) {
  const lastValid = useRef(String(props.value ?? props.defaultValue ?? ''));
  function accept(input: HTMLInputElement) {
    if (input.value && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input.value)) {
      input.value = lastValid.current;
      input.setCustomValidity('Ingresa una fecha con un año de cuatro dígitos.');
      input.reportValidity();
      return false;
    }
    input.setCustomValidity('');
    lastValid.current = input.value;
    return true;
  }
  return (
    <input
      {...props}
      type="date"
      max={max}
      min={min}
      onInput={(event: InputEvent<HTMLInputElement>) => {
        if (accept(event.currentTarget)) onInput?.(event);
      }}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        if (accept(event.currentTarget)) onChange?.(event);
      }}
    />
  );
}
