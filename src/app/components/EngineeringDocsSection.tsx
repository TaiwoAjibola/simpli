import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Upload, Download, Trash2, FileText, Loader, Plus, X } from 'lucide-react';
import { storage } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

type Props = {
  appId: string;
};

export function EngineeringDocsSection({ appId }: Props) {
  const { appDocuments, addAppDocument, deleteAppDocument, getDocumentsForApp } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [docName, setDocName] = useState('');
  const [docVersion, setDocVersion] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);

  const docs = getDocumentsForApp(appId);
  const canUpload = hasPermission('manage_documents');

  const handleUpload = async () => {
    if (!currentUser || !docFile || !docName.trim()) return;
    setUploading(true);
    try {
      const safeName = docFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileRef = ref(storage, `appDocs/${appId}/${Date.now()}_${safeName}`);
      await uploadBytes(fileRef, docFile);
      const fileUrl = await getDownloadURL(fileRef);

      await addAppDocument({
        appId,
        name: docName.trim(),
        version: docVersion.trim() || '1.0',
        fileName: docFile.name,
        fileUrl,
        fileSize: docFile.size,
        fileType: docFile.type,
        uploadedBy: currentUser.id,
        uploadedByName: currentUser.name || 'Unknown'
      });

      showToast({ type: 'success', title: 'Document Uploaded', message: `${docName} v${docVersion || '1.0'} uploaded.` });
      setShowForm(false);
      setDocName('');
      setDocVersion('');
      setDocFile(null);
    } catch (error: any) {
      showToast({ type: 'error', title: 'Upload Failed', message: error?.message || 'Could not upload document.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: typeof docs[0]) => {
    if (!confirm(`Delete "${doc.name}" v${doc.version}?`)) return;
    try {
      const fileRef = ref(storage, doc.fileUrl);
      await deleteObject(fileRef).catch(() => {}); // ignore if file already gone
      await deleteAppDocument(doc.id);
      showToast({ type: 'success', title: 'Deleted', message: `${doc.name} removed.` });
    } catch (error: any) {
      showToast({ type: 'error', title: 'Delete Failed', message: error?.message || 'Could not delete document.' });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#f0f0f5]">Engineering Documents</h2>
          <p className="text-sm text-[#6b6b80] mt-1">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
        </div>
        {canUpload && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] text-sm font-medium hover:bg-[#00c4e0]"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Upload Document'}
          </button>
        )}
      </div>

      {/* Upload form */}
      {showForm && canUpload && (
        <div className="p-6 bg-[#12121a] border border-[rgba(0,229,255,0.1)] space-y-4">
          <h3 className="text-sm font-semibold text-[#f0f0f5] uppercase tracking-wider">Upload New Document</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#6b6b80] mb-1">Document Name *</label>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. System Architecture v2"
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b6b80] mb-1">Version</label>
              <input
                type="text"
                value={docVersion}
                onChange={(e) => setDocVersion(e.target.value)}
                placeholder="e.g. 1.0, 2.3"
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#6b6b80] mb-1">File *</label>
            <div className="border-2 border-dashed border-[rgba(0,229,255,0.2)] p-6 text-center hover:border-[rgba(0,229,255,0.4)] transition-colors">
              {docFile ? (
                <div className="flex items-center justify-center gap-2 text-sm text-[#f0f0f5]">
                  <FileText className="w-4 h-4 text-[#00e5ff]" />
                  <span>{docFile.name}</span>
                  <span className="text-[#6b6b80]">({formatSize(docFile.size)})</span>
                  <button onClick={() => setDocFile(null)} className="text-[#ff3b5c] hover:underline text-xs ml-2">Remove</button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-8 h-8 text-[#6b6b80] mx-auto mb-2" />
                  <p className="text-sm text-[#6b6b80]">Click to select a file (PDF, Word, Markdown, etc.)</p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.md,.txt,.xlsx,.pptx"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={uploading || !docName.trim() || !docFile}
              className="flex items-center gap-2 px-6 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] disabled:opacity-50"
            >
              {uploading && <Loader className="w-4 h-4 animate-spin" />}
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      )}

      {/* Document list */}
      {docs.length === 0 ? (
        <div className="text-center py-12 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <FileText className="w-12 h-12 text-[#6b6b80] mx-auto mb-3" />
          <p className="text-[#6b6b80]">No engineering documents uploaded yet.</p>
          {canUpload && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-[#00e5ff] hover:underline"
            >
              Upload the first document
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div
              key={doc.id}
              className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-4 flex items-center gap-4 hover:bg-[rgba(255,255,255,0.02)] cursor-pointer"
              onClick={() => setPreviewDoc(previewDoc === doc.id ? null : doc.id)}
            >
              <div className="p-2 bg-[rgba(0,229,255,0.05)] flex-shrink-0">
                <FileText className="w-5 h-5 text-[#00e5ff]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-[#f0f0f5] truncate">{doc.name}</h3>
                  <span className="text-xs px-1.5 py-0.5 bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]">
                    v{doc.version}
                  </span>
                </div>
                <p className="text-xs text-[#6b6b80] mt-0.5">
                  {doc.uploadedByName} &middot; {new Date(doc.createdAt).toLocaleDateString()} &middot; {formatSize(doc.fileSize)}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="p-2 text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] rounded"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                {canUpload && (
                  <button
                    onClick={() => handleDelete(doc)}
                    className="p-2 text-[#6b6b80] hover:text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {previewDoc && (
        <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] overflow-hidden">
          {(() => {
            const doc = docs.find(d => d.id === previewDoc);
            if (!doc) return null;
            const isPdf = doc.fileType === 'application/pdf' || doc.fileName.endsWith('.pdf');
            const isImage = doc.fileType.startsWith('image/');
            const isText = doc.fileType.startsWith('text/') || doc.fileName.endsWith('.md') || doc.fileName.endsWith('.txt');

            return (
              <div>
                <div className="flex items-center justify-between p-4 border-b border-[rgba(0,229,255,0.1)]">
                  <div>
                    <h3 className="font-medium text-[#f0f0f5]">{doc.name}</h3>
                    <p className="text-xs text-[#6b6b80]">v{doc.version} &middot; {doc.uploadedByName} &middot; {new Date(doc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] text-sm font-medium hover:bg-[#00c4e0]"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
                <div className="p-4" style={{ height: '70vh' }}>
                  {isPdf ? (
                    <iframe src={doc.fileUrl} className="w-full h-full border-0" title={doc.name} />
                  ) : isImage ? (
                    <img src={doc.fileUrl} alt={doc.name} className="max-w-full max-h-full mx-auto" />
                  ) : isText ? (
                    <iframe src={doc.fileUrl} className="w-full h-full border-0" title={doc.name} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-[#6b6b80]">
                      <p className="text-center">
                        <FileText className="w-12 h-12 mx-auto mb-3" />
                        Preview not available for this file type.
                        <br />
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" download className="text-[#00e5ff] hover:underline mt-2 inline-block">
                          Download to view
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}