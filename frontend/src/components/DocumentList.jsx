import DownloadButton from './DownloadButton.jsx';

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DocumentList({ documents, isLoading, error, onRefresh }) {
  return (
    <section className="panel document-panel" aria-labelledby="documents-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Arquivo</span>
          <h2 id="documents-title">Documentos disponíveis</h2>
        </div>
        <button className="icon-button" type="button" onClick={onRefresh} disabled={isLoading} aria-label="Atualizar documentos" title="Atualizar documentos">
          ↻
        </button>
      </div>

      {isLoading && <p className="muted-state">Carregando documentos...</p>}
      {!isLoading && error && <p className="feedback error" role="alert">{error}</p>}
      {!isLoading && !error && documents.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">○</span>
          <p>Nenhum documento enviado ainda.</p>
          <small>Os arquivos adicionados aparecerão aqui.</small>
        </div>
      )}

      {!isLoading && !error && documents.length > 0 && (
        <div className="document-table" role="table" aria-label="Documentos enviados">
          <div className="document-row table-header" role="row">
            <span role="columnheader">Nome</span>
            <span role="columnheader">Proprietário</span>
            <span role="columnheader">Adicionado em</span>
            <span role="columnheader" aria-label="Ações" />
          </div>
          {documents.map((document) => (
            <div className="document-row" role="row" key={document.id}>
              <div className="document-name" role="cell">
                <span className="document-icon" aria-hidden="true">□</span>
                <span>
                  <strong title={document.originalName}>{document.originalName}</strong>
                  <small>{Math.ceil(document.size / 1024)} KB</small>
                </span>
              </div>
              <span className="owner-cell" role="cell">{document.owner}</span>
              <time role="cell" dateTime={document.uploadedAt}>{formatDate(document.uploadedAt)}</time>
              <span role="cell"><DownloadButton document={document} /></span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}