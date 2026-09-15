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
      await deleteObject(fileRef).catch(() => {});
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
    <div className="max-w-[900px] mx-auto space-y-4" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-[#37352F] tracking-[-0.01em]">Engineering Documents</h2>
          <p className="text-[12px] text-[#787774] mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
        </div>
        {canUpload && (
          <button
            onClick={() => { setShowForm(!showForm); }}
            className="flex items-center gap-2 px-3 py-[6px] text-[14px] font-medium rounded-[6px] cursor-pointer transition-colors duration-150"
            style={showForm ? { background: '#FFFFFF', color: '#37352F', border: '1px solid #E9E9E7' } : { background: '#2383E2', color: '#FFFFFF', border: '1px solid #2383E2' }}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Upload document'}
          </button>
        )}
      </div>

      {showForm && canUpload && (
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4 space-y-4">
          <h3 className="text-[12px] font-semibold text-[#37352F] tracking-wider uppercase">Upload new document</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#787774] mb-1">Document name *</label>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. System Architecture v2"
                className="w-full px-2.5 py-[6px] bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] outline-none placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:shadow-[0_0_0_1px_#2383E2] transition-colors duration-150"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#787774] mb-1">Version</label>
              <input
                type="text"
                value={docVersion}
                onChange={(e) => setDocVersion(e.target.value)}
                placeholder="e.g. 1.0, 2.3"
                className="w-full px-2.5 py-[6px] bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] outline-none placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:shadow-[0_0_0_1px_#2383E2] transition-colors duration-150"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#787774] mb-1">File *</label>
            <div className="border border-dashed border-[#E0E0DE] rounded-[8px] p-6 text-center hover:border-[#2383E2] hover:bg-[#F7F7F5] transition-colors duration-150">
              {docFile ? (
                <div className="flex items-center justify-center gap-2 text-[14px] text-[#37352F]">
                  <span className="w-8 h-8 rounded-[6px] bg-[#F7F7F5] border border-[#E9E9E7] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#787774]" />
                  </span>
                  <span className="truncate">{docFile.name}</span>
                  <span className="text-[#787774] text-[12px]">({formatSize(docFile.size)})</span>
                  <button onClick={() => setDocFile(null)} className="text-[#2383E2] hover:underline text-[12px] ml-2 cursor-pointer">Remove</button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center">
                  <span className="w-10 h-10 rounded-[6px] bg-[#F7F7F5] border border-[#E9E9E7] flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5 text-[#787774]" />
                  </span>
                  <p className="text-[14px] text-[#787774]">Click to select a file</p>
                  <p className="text-[12px] text-[#9B9A97] mt-0.5">PDF, Word, Markdown, etc.</p>
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
              className="flex items-center gap-2 px-4 py-[6px] bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] disabled:opacity-50 cursor-pointer transition-colors duration-150"
            >
              {uploading && <Loader className="w-4 h-4 animate-spin" />}
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px]">
          <span className="w-12 h-12 rounded-[8px] bg-[#F7F7F5] border border-[#E9E9E7] flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-[#9B9A97]" />
          </span>
          <p className="text-[14px] text-[#787774]">No engineering documents yet.</p>
          {canUpload && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-[14px] font-medium text-[#2383E2] hover:underline cursor-pointer"
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
              className="bg-white border border-[#E9E9E7] rounded-[8px] p-3 flex items-center gap-3 hover:bg-[#F7F7F5] cursor-pointer transition-colors duration-150"
              onClick={() => setPreviewDoc(previewDoc === doc.id ? null : doc.id)}
            >
              <span className="w-8 h-8 rounded-[6px] bg-[#F7F7F5] border border-[#E9E9E7] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-[#787774]" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-medium text-[#37352F] truncate">{doc.name}</h3>
                  <span className="text-[11px] font-medium px-1.5 py-0.5 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px] text-[#787774]">
                    v{doc.version}
                  </span>
                </div>
                <p className="text-[12px] text-[#787774] mt-0.5 truncate">
                  {doc.uploadedByName} · {new Date(doc.createdAt).toLocaleDateString()} · {formatSize(doc.fileSize)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] cursor-pointer transition-colors duration-150"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                {canUpload && (
                  <button
                    onClick={() => handleDelete(doc)}
                    className="p-1.5 text-[#787774] hover:text-[#EB5757] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] cursor-pointer transition-colors duration-150"
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

      {previewDoc && (
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] overflow-hidden">
          {(() => {
            const doc = docs.find(d => d.id === previewDoc);
            if (!doc) return null;
            const isPdf = doc.fileType === 'application/pdf' || doc.fileName.endsWith('.pdf');
            const isImage = doc.fileType.startsWith('image/');
            const isText = doc.fileType.startsWith('text/') || doc.fileName.endsWith('.md') || doc.fileName.endsWith('.txt');

            return (
              <div>
                <div className="flex items-center justify-between p-4 border-b border-[#E9E9E7]">
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#37352F]">{doc.name}</h3>
                    <p className="text-[12px] text-[#787774]">v{doc.version} · {doc.uploadedByName} · {new Date(doc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-2 px-3 py-[6px] bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] cursor-pointer transition-colors duration-150"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
                <div className="p-4 bg-white" style={{ height: '70vh' }}>
                  {isPdf ? (
                    <iframe src={doc.fileUrl} className="w-full h-full border border-[#E9E9E7] rounded-[6px]" title={doc.name} />
                  ) : isImage ? (
                    <img src={doc.fileUrl} alt={doc.name} className="max-w-full max-h-full mx-auto rounded-[6px] border border-[#E9E9E7]" />
                  ) : isText ? (
                    <iframe src={doc.fileUrl} className="w-full h-full border border-[#E9E9E7] rounded-[6px]" title={doc.name} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-[#787774]">
                      <p className="text-center">
                        <span className="w-12 h-12 rounded-[8px] bg-[#F7F7F5] border border-[#E9E9E7] flex items-center justify-center mx-auto mb-3">
                          <FileText className="w-6 h-6 text-[#9B9A97]" />
                        </span>
                        <span className="text-[14px]">Preview not available for this file type.</span>
                        <br />
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" download className="text-[#2383E2] hover:underline mt-2 inline-block text-[14px] cursor-pointer">
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
