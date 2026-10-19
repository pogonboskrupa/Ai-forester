import { signal } from '@preact/signals';
import { drawerOpen } from '../../store';
import { Icon, type IconName } from '../Icon';
import { Kazne } from './Kazne';
import { Kubikator } from './Kubikator';
import { Liste } from './Liste';
import { Registar } from './Registar';
import { Rokovi } from './Rokovi';
import { Zapisnik } from './Zapisnik';

type ToolId = 'kubikator' | 'kazne' | 'zapisnik' | 'rokovi' | 'registar' | 'liste';
const TABS: { id: ToolId; label: string; icon: IconName }[] = [
  { id: 'kubikator', label: 'Kubikator', icon: 'tool' },
  { id: 'kazne', label: 'Kazne', icon: 'scale' },
  { id: 'zapisnik', label: 'Zapisnik', icon: 'edit' },
  { id: 'rokovi', label: 'Rokovi', icon: 'calendar' },
  { id: 'registar', label: 'Registar', icon: 'folder' },
  { id: 'liste', label: 'Kontrolne liste', icon: 'check' },
];

export const toolTab = signal<ToolId>('kubikator');

/** Terenski alati: obračuni, kazne, zapisnik, rokovi, registri i kontrolne liste. */
export function Tools() {
  const t = toolTab.value;
  return (
    <section class="page">
      <header class="topbar">
        <button class="icon-btn only-mobile" aria-label="Meni" onClick={() => (drawerOpen.value = true)}><Icon name="menu" /></button>
        <span class="topbar-title">Alati</span>
      </header>
      <div class="page-inner narrow">
        <div class="segmented tools-tabs" role="tablist">
          {TABS.map((x) => (
            <button key={x.id} role="tab" aria-selected={t === x.id} class={t === x.id ? 'on' : ''} onClick={() => (toolTab.value = x.id)}>
              <Icon name={x.icon} size={15} /> {x.label}
            </button>
          ))}
        </div>
        {t === 'kubikator' && <Kubikator />}
        {t === 'kazne' && <Kazne />}
        {t === 'zapisnik' && <Zapisnik />}
        {t === 'rokovi' && <Rokovi />}
        {t === 'registar' && <Registar />}
        {t === 'liste' && <Liste />}
      </div>
    </section>
  );
}
