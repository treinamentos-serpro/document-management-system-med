import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/api.js';
import './styles.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  async function refreshDocuments() {
    setIsLoading(true);
    setError('');

    try {
      setDocuments(await listDocuments());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialDocuments() {
      try {
        const loadedDocuments = await listDocuments();
        if (active) setDocuments(loadedDocuments);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadInitialDocuments();
    return () => { active = false; };
  }, []);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <span className="brand-kicker">DMS / espaço de trabalho</span>
          <h1>Seus documentos,<br />em ordem.</h1>
        </div>
        <p className="header-note">Arquivos locais para uma equipe que precisa encontrar o que importa sem perder o ritmo.</p>
      </header>

      <div className="workspace">
        <UploadComponent onUploaded={refreshDocuments} />
        <DocumentList
          documents={documents}
          isLoading={isLoading}
          error={error}
          onRefresh={refreshDocuments}
        />
      </div>
    </main>
  );
}
