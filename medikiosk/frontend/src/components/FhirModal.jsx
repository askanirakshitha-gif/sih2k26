import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, CheckCircle } from 'lucide-react';

export default function FhirModal({ isOpen, onClose, fhirBundle, sessionId }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !fhirBundle) return null;

  const jsonString = JSON.stringify(fhirBundle, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FHIR-Bundle-${sessionId || 'session'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const entriesCount = fhirBundle.entry ? fhirBundle.entry.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold">FHIR R4 Document Bundle</h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ABDM Compliant
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Standardized Resource Bundle ({entriesCount} resources packaged)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition text-xs font-semibold flex items-center space-x-1"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition text-xs font-semibold flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Resources Summary Badges */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex flex-wrap gap-2 text-xs">
          <span className="font-semibold text-slate-700">Resources included:</span>
          {(fhirBundle.entry || []).map((e, idx) => (
            <span key={idx} className="bg-white px-2.5 py-0.5 rounded-md border border-slate-300 font-mono text-slate-700">
              {e.resource.resourceType}
            </span>
          ))}
        </div>

        {/* Code Content */}
        <div className="p-6 flex-1 overflow-auto bg-slate-950 font-mono text-xs text-emerald-400 leading-relaxed">
          <pre className="whitespace-pre-wrap">{jsonString}</pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>ABDM Profile: https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 font-bold rounded-lg text-slate-800 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
