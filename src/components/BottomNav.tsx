import { libraryFocus, libraryTab, view, drawerOpen } from '../store';
import { procedure } from '../procedure';
import { Icon, type IconName } from './Icon';

type Item = { id: string; label: string; icon: IconName; on: boolean; go: () => void };

/** Donja navigacija za telefon: glavni dijelovi su na dohvat palca, ostalo je u meniju ("Više"). */
export function BottomNav() {
  const v = view.value;
  const items: Item[] = [
    { id: 'chat', label: 'Razgovor', icon: 'sparkle', on: v === 'chat' || v === 'project', go: () => (view.value = 'chat') },
    {
      id: 'lib', label: 'Propisi', icon: 'book', on: v === 'library',
      go: () => { if (libraryTab.value === 'spd') libraryTab.value = 'laws'; libraryFocus.value = null; view.value = 'library'; },
    },
    { id: 'tools', label: 'Alati', icon: 'tool', on: v === 'tools', go: () => (view.value = 'tools') },
    ...(procedure.value ? [{ id: 'proc', label: 'Procedura', icon: 'tree' as IconName, on: v === 'procedure', go: () => (view.value = 'procedure') }] : []),
    { id: 'more', label: 'Više', icon: 'menu', on: v === 'settings' || v === 'import', go: () => (drawerOpen.value = true) },
  ];
  return (
    <nav class="bottom-nav" aria-label="Glavna navigacija">
      {items.map((i) => (
        <button key={i.id} class={i.on ? 'on' : ''} aria-current={i.on ? 'page' : undefined} onClick={i.go}>
          <span class="bn-ico"><Icon name={i.icon} size={20} /></span>
          {i.label}
        </button>
      ))}
    </nav>
  );
}
