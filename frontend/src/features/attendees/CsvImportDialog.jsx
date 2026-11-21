import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import { Button, Dialog, Textarea } from '@/components/ui';
import { parseAttendeeCsv, SAMPLE_CSV } from '@/lib/csv';

const MAX_BYTES = 2 * 1024 * 1024;

export function CsvImportDialog({ open, onClose, existingEmails, onImport }) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState(null);
  const [result, setResult] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef(null);

  const analyse = (csv) => {
    setText(csv);
    setResult(csv.trim() ? parseAttendeeCsv(csv, existingEmails) : null);
  };

  const onFile = (file) => {
    setFileError(null);
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') return setFileError('Please choose a .csv file.');
    if (file.size > MAX_BYTES) return setFileError('File is larger than 2 MB.');
    setFileName(file.name);
    file
      .text()
      .then(analyse)
      .catch(() => setFileError('Could not read the file.'));
  };

  const close = () => {
    setText('');
    setResult(null);
    setFileName(null);
    setFileError(null);
    onClose();
  };

  const doImport = async () => {
    if (!result?.valid.length) return;
    setImporting(true);
    try {
      await onImport(result.valid);
      close();
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      size="lg"
      title="Import attendees from CSV"
      description="Required columns: name, email. Optional: department (or organization), type (student / parent / faculty / guest / speaker). Hundreds of rows are fine."
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={doImport} disabled={!result?.valid.length} loading={importing}>
            Import {result?.valid.length ?? 0} attendee(s)
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files[0]);
          }}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition hover:border-primary/50"
        >
          <FileSpreadsheet className="mb-2 h-8 w-8 text-primary" />
          <p className="text-sm font-medium">{fileName ?? 'Drop a CSV file here'}</p>
          <p className="text-xs text-muted-foreground">or</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Choose file
          </Button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          {fileError && (
            <p role="alert" className="mt-2 text-xs font-medium text-danger">
              {fileError}
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="csv-text" className="text-sm font-medium">
              …or paste CSV
            </label>
            <button className="text-xs font-medium text-primary hover:underline" onClick={() => analyse(SAMPLE_CSV)}>
              Use example
            </button>
          </div>
          <Textarea
            id="csv-text"
            rows={5}
            value={text}
            onChange={(e) => analyse(e.target.value)}
            className="font-mono text-xs"
            placeholder="name,email,organization,ticket type,status"
          />
        </div>

        {result && (
          <div className="space-y-2" aria-live="polite">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 font-medium text-success">
                <CheckCircle2 className="h-4 w-4" /> {result.valid.length} valid
              </span>
              {result.errors.length > 0 && (
                <span className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 font-medium text-danger">
                  <AlertTriangle className="h-4 w-4" /> {result.errors.length} invalid
                </span>
              )}
              {result.duplicates > 0 && (
                <span className="rounded-lg bg-muted px-3 py-1.5 font-medium text-muted-foreground">{result.duplicates} duplicate(s) skipped</span>
              )}
            </div>
            {result.errors.length > 0 && (
              <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-danger/20 bg-danger/5 p-3 text-xs scrollbar-thin">
                {result.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    <span className="font-semibold">Row {e.row || '—'}:</span> {e.message}
                  </li>
                ))}
              </ul>
            )}
            {result.valid.length > 0 && (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 text-left">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Department</th>
                      <th className="px-3 py-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.valid.slice(0, 5).map((r) => (
                      <tr key={r.email} className="border-t">
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5">{r.email}</td>
                        <td className="px-3 py-1.5">{r.organization || '—'}</td>
                        <td className="px-3 py-1.5 capitalize">{r.ticketType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.valid.length > 5 && <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">…and {result.valid.length - 5} more</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
