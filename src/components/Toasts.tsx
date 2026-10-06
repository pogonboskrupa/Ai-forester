import { toasts } from '../store';
import { Icon } from './Icon';

export function Toasts() {
  return (
    <div class="toasts" role="status" aria-live="polite">
      {toasts.value.map((t) => (
        <div key={t.id} class={`toast ${t.kind}`}><Icon name={t.kind === 'ok' ? 'check' : 'alert'} size={16} /> {t.text}</div>
      ))}
    </div>
  );
}
