'use client';

import { useRef, useState } from 'react';
import { UploadSimple, FileArrowUp, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

export type FileUploadProps = {
  accept?: string;
  /** Called with the selected file (single-file upload). */
  onSelect: (file: File | null) => void;
  hint?: string;
  className?: string;
};

/** Drag-and-drop + click file picker. Used by every module's import flow. */
export function FileUpload({ accept = '.csv,.xlsx,.xls', onSelect, hint, className }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  function choose(f: File | null) {
    setFile(f);
    onSelect(f);
  }

  return (
    <div className={className}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          choose(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragging ? 'border-brand bg-brand-subtle/50' : 'border-border bg-surface-2/40 hover:bg-surface-2',
        )}
      >
        <UploadSimple size={26} className="text-muted" />
        <p className="text-sm text-fg">
          <span className="font-medium text-brand">Click to upload</span> or drag and drop
        </p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
        />
      </div>

      {file && (
        <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-surface p-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <FileArrowUp size={18} className="shrink-0 text-brand" />
            <span className="truncate text-sm text-fg">{file.name}</span>
            <span className="shrink-0 text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</span>
          </div>
          <button
            onClick={() => choose(null)}
            className="rounded p-1 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label="Remove file"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      )}
    </div>
  );
}
