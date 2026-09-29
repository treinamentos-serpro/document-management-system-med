import { useEffect, useRef, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/api.js';
import './styles.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const requestRef = useRef({ id: 0, controller: null });

  async function refreshDocuments() {
    const requestId = requestRef.current.id + 1;
    requestRef.current.controller?.abort();
    const controller = new AbortController();
    requestRef.current = { id: requestId, controller };
    setIsLoading(true);
    setError('');

    try {
      const loadedDocuments = await listDocuments({ signal: controller.signal });
      if (requestRef.current.id === requestId) {
        setDocuments(loadedDocuments);
      }
    } catch (loadError) {
      if (loadError.name !== 'AbortError' && requestRef.current.id === requestId) {
        setError(loadError.message);
      }
    } finally {
      if (requestRef.current.id === requestId) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    refreshDocuments();
    return () => requestRef.current.controller?.abort();
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
