import { useState } from 'react';
import { uploadDocument } from '../services/api.js';

export default function UploadComponent({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [owner, setOwner] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      setMessage({ type: 'error', text: 'Selecione um arquivo para enviar.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      await uploadDocument(file, owner.trim());
      setFile(null);
      event.target.reset();
      setMessage({ type: 'success', text: 'Documento enviado com sucesso.' });
      await onUploaded();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="panel upload-panel" aria-labelledby="upload-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Entrada</span>
          <h2 id="upload-title">Adicionar documento</h2>
        </div>
        <span className="file-mark" aria-hidden="true">+</span>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="owner">Identificador do usuário <span>(opcional)</span></label>
        <input
          id="owner"
          className="text-input"
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
          placeholder="ex.: equipe-financeiro"
          maxLength={100}
        />

        <label className="file-picker" htmlFor="document-file">
          <span className="file-picker-icon" aria-hidden="true">↑</span>
          <span>
            <strong>{file ? file.name : 'Escolha um arquivo'}</strong>
            <small>{file ? `${Math.ceil(file.size / 1024)} KB` : 'PDF, DOC, DOCX, TXT, PNG ou JPG'}</small>
          </span>
          <input
            id="document-file"
            type="file"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>

        <button className="primary-button" type="submit" disabled={isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </form>

      {message && <p className={`feedback ${message.type}`} role="status">{message.text}</p>}
    </section>
  );
}