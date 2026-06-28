'use client';

import { useState } from 'react';
import { DownloadSimple, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { employeesApi, type ImportReport } from '@/lib/api/employees';
import { ApiError } from '@/lib/api/client';
import { Modal, Button, FileUpload, useToast } from '@/components/ui';

export function ImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  function close() {
    setFile(null);
    setReport(null);
    onClose();
  }

  async function runImport() {
    if (!file) return;
    setBusy(true);
    try {
      const result = await employeesApi.import(file);
      setReport(result);
      if (result.inserted > 0) {
        toast.success(`Imported ${result.inserted} employees`);
        onImported();
      }
      if (result.errorCount > 0) toast.warning(`${result.errorCount} rows had errors`);
    } catch (err) {
      toast.error('Import failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import employees"
      description="Upload a CSV or Excel file. Download the template to get the exact columns."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={close} type="button">
            Close
          </Button>
          <Button onClick={runImport} loading={busy} disabled={!file}>
            Import file
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <a
          href={employeesApi.templateUrl()}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
        >
          <DownloadSimple size={16} weight="bold" />
          Download import template
        </a>

        <FileUpload onSelect={setFile} hint="CSV or XLSX, up to ~5,000 rows" />

        {report && (
          <div className="rounded-md border border-border bg-surface-2/50 p-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5 text-success">
                <CheckCircle size={16} weight="fill" /> {report.inserted} inserted
              </span>
              {report.errorCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-warning">
                  <WarningCircle size={16} weight="fill" /> {report.errorCount} errors
                </span>
              )}
              <span className="text-muted">of {report.totalRows} rows</span>
            </div>
            {report.errors.length > 0 && (
              <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto scrollbar-thin text-xs text-danger">
                {report.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>{e.row > 0 ? `Row ${e.row}: ` : ''}{e.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
