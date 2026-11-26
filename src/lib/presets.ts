import type { FieldSpec } from './types';

let counter = 0;
export function newId(): string {
  counter += 1;
  return `f${Date.now().toString(36)}${counter}`;
}

export interface Preset {
  name: string;
  fields: Omit<FieldSpec, 'id'>[];
}

export const PRESETS: Preset[] = [
  {
    name: 'User signup',
    fields: [
      { name: 'Full name', type: 'text', required: true, min: 2, max: 50 },
      { name: 'Age', type: 'integer', required: true, min: 18, max: 65 },
      { name: 'Email', type: 'email', required: true },
      { name: 'Mobile', type: 'phMobile', required: false },
    ],
  },
  {
    name: 'Leave request',
    fields: [
      { name: 'Start date', type: 'date', required: true, minDate: '2026-01-01', maxDate: '2026-12-31' },
      { name: 'Days requested', type: 'integer', required: true, min: 1, max: 30 },
      { name: 'Reason', type: 'text', required: false, max: 250 },
    ],
  },
  {
    name: 'Checkout',
    fields: [
      { name: 'Quantity', type: 'integer', required: true, min: 1, max: 99 },
      { name: 'Discount code', type: 'text', required: false, min: 6, max: 12 },
      { name: 'Contact number', type: 'phMobile', required: true },
    ],
  },
];

export function fieldsFromPreset(preset: Preset): FieldSpec[] {
  return preset.fields.map((f) => ({ ...f, id: newId() }));
}
