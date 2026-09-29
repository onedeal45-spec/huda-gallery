import { availabilityLabel } from '@/lib/site';

export const AvailBadge = ({ s }) => <span className={`badge badge--${s}`}>{availabilityLabel(s)}</span>;
export const InqBadge = ({ s }) => <span className={`badge badge--${s}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>;

export function DeleteButton({ action, id, title, confirm, label, redirect, small = true }) {
  return (
    <button className={`btn ${small ? 'btn--sm btn--icon ' : ''}btn--danger`} type="button" title="Delete" aria-label={label || 'Delete'}
      data-api-delete={action} data-id={id} data-confirm={confirm} data-confirm-title={title} data-redirect={redirect}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
      {small ? null : 'Delete'}
    </button>
  );
}
