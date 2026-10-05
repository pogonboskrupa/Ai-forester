import './style.css';
import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import { Chat } from './components/Chat';
import { Library } from './components/Library';
import { ProjectEditor } from './components/ProjectEditor';
import { Settings } from './components/Settings';
import { Sidebar } from './components/Sidebar';
import { drawerOpen, init, loadError, ready, view } from './store';

function App() {
  useEffect(() => void init(), []);
  if (loadError.value) return <p class="boot err">{loadError.value}</p>;
  if (!ready.value) return <p class="boot">Učitavam propise…</p>;
  const v = view.value;
  return (
    <div class="app">
      <Sidebar />
      {drawerOpen.value && <div class="scrim" onClick={() => (drawerOpen.value = false)} />}
      <main>
        <button class="burger" aria-label="Meni" onClick={() => (drawerOpen.value = true)}>☰</button>
        {v === 'chat' && <Chat />}
        {v === 'library' && <Library />}
        {v === 'project' && <ProjectEditor />}
        {v === 'settings' && <Settings />}
      </main>
    </div>
  );
}

render(<App />, document.getElementById('app')!);
