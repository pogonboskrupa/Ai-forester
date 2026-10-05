import './style.css';
import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import { Chat } from './components/Chat';
import { Icon } from './components/Icon';
import { Library } from './components/Library';
import { ProjectEditor } from './components/ProjectEditor';
import { Settings } from './components/Settings';
import { Sidebar } from './components/Sidebar';
import { SourcePanel } from './components/SourcePanel';
import { Toasts } from './components/Toasts';
import {
  busy, drawerOpen, filterProjectId, init, loadError, newConversation, openSourceId, ready, stopGeneration, view,
} from './store';

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const f = filterProjectId.value;
        newConversation(f === 'all' ? null : f);
      } else if (e.key === 'Escape') {
        if (busy.value) stopGeneration();
        else if (openSourceId.value) openSourceId.value = null;
        else drawerOpen.value = false;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function App() {
  useEffect(() => void init(), []);
  useShortcuts();
  if (loadError.value) {
    return (
      <div class="boot err"><Icon name="alert" size={28} /><p>{loadError.value}</p><button class="btn" onClick={() => location.reload()}>Osvježi</button></div>
    );
  }
  if (!ready.value) return <div class="boot"><div class="spinner" /><p class="muted">Učitavam propise…</p></div>;
  const v = view.value;
  return (
    <div class={`app ${openSourceId.value && v === 'chat' ? 'with-panel' : ''}`}>
      <Sidebar />
      {drawerOpen.value && <div class="scrim" onClick={() => (drawerOpen.value = false)} />}
      <main class="main">
        {v === 'chat' && <Chat />}
        {v === 'library' && <Library />}
        {v === 'project' && <ProjectEditor />}
        {v === 'settings' && <Settings />}
      </main>
      {v === 'chat' && openSourceId.value && <div class="panel-scrim" onClick={() => (openSourceId.value = null)} />}
      {v === 'chat' && <SourcePanel />}
      <Toasts />
    </div>
  );
}

render(<App />, document.getElementById('app')!);
