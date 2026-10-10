import { useRef, useState } from "react";
import { FileSpreadsheet, FileUp, LoaderCircle, ShieldCheck, Sparkles, X } from "lucide-react";
import type { UploadBatch } from "../types";

interface Props {
  onUpload: (file: File) => Promise<UploadBatch>;
  onClose?: () => void;
  onManageProducts?: () => void;
  onSavedUploads?: () => void;
}

export function UploadPanel({ onUpload, onClose, onManageProducts, onSavedUploads }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<UploadBatch | null>(null);

  async function submit() {
    if (!file) return;
    setBusy(true); setError("");
    try { setResult(await onUpload(file)); }
    catch (err) { setError(err instanceof Error ? err.message : "Upload failed. Please try again."); }
    finally { setBusy(false); }
  }

  function choose(candidate?: File) {
    if (!candidate) return;
    if (!/\.(xlsx|xls)$/i.test(candidate.name)) { setError("Please choose an .xlsx or .xls workbook."); return; }
    setError(""); setFile(candidate); setResult(null);
  }

  if (result) {
    const report = result.validation_report;
    return <section className="upload-result card">
      <div className="result-head"><div className="success-icon"><ShieldCheck size={22}/></div><div><h2>{result.original_file_saved ? "Workbook saved on the server" : "Sales data saved"}</h2><p>{result.original_filename}</p></div>{onClose && <button className="icon-button close-button" onClick={onClose} aria-label="Close upload report"><X size={18}/></button>}</div>
      {report.products_added != null && <p className="inline-note">{report.products_added} new products saved to your menu · {report.products_existing ?? 0} existing products kept. New products from valid sales rows are saved as hidden items so you can review their current prices before making them available to order.</p>}
      <div className="saved-upload-actions">{onManageProducts && <button type="button" className="button button-outline" onClick={onManageProducts}>Manage saved products &amp; add new items</button>}{onSavedUploads && <button type="button" className="button button-quiet" onClick={onSavedUploads}>View saved workbooks</button>}</div>
      <div className="validation-grid">
        <div><strong>{report.total_rows.toLocaleString()}</strong><span>Total rows</span></div><div><strong>{report.valid_rows.toLocaleString()}</strong><span>Valid</span></div><div><strong>{report.invalid_rows.toLocaleString()}</strong><span>Invalid</span></div><div><strong>{report.duplicate_rows.toLocaleString()}</strong><span>Duplicates retained</span></div><div><strong>{report.missing_value_rows.toLocaleString()}</strong><span>Rows with missing values</span></div>
      </div>
      {report.warnings.map((warning) => <p className="inline-note" key={warning}>{warning}</p>)}
      {report.issues.length > 0 && <details className="issues"><summary>Review row issues ({report.invalid_rows})</summary><ul>{report.issues.slice(0, 8).map((issue) => <li key={issue.row_number}>Row {issue.row_number}: {issue.reasons.join(" ")}</li>)}</ul>{report.issues.length > 8 && <small>Showing first 8 issues. The full report is available through the API.</small>}</details>}
      {!report.valid_rows && <p className="error-text">No valid rows were found. Correct the workbook and upload it again.</p>}
      {report.waste_available && <p className="inline-note">Waste columns detected. Waste analytics will be available.</p>}
      {result.valid_records > 0 && <button className="button button-primary analyze-button" onClick={onClose}>Analyze {result.valid_records.toLocaleString()} valid rows <span>→</span></button>}
    </section>;
  }

  return <section className="upload-panel card">
    <div className="section-eyebrow"><Sparkles size={14}/> YOUR SALES, MADE CLEAR</div>
    <div className="upload-heading"><div><h2>Bring your numbers to life.</h2><p>Upload your bakery sales workbook to uncover what’s selling, when demand peaks, and where to focus next.</p></div>{onClose && <button className="icon-button close-button" onClick={onClose} aria-label="Close upload"><X size={18}/></button>}</div>
    <div className={`dropzone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]); }}>
      <div className="drop-icon"><FileSpreadsheet size={23}/></div><strong>Drop your Excel file here</strong><span>or browse files from your device</span>
      <button className="button button-outline" onClick={() => inputRef.current?.click()}><FileUp size={16}/> Choose a file</button>
      <small>Excel workbook · .xlsx or .xls · Up to 20 MB</small>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={(event) => choose(event.target.files?.[0])}/>
    </div>
    {file && <div className="selected-file"><div className="file-icon"><FileSpreadsheet size={19}/></div><div><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(file.size < 1024 * 1024 ? 0 : 1)} KB</span></div><button className="icon-button" onClick={() => setFile(null)} aria-label="Remove selected file"><X size={17}/></button></div>}
    {error && <p className="error-text" role="alert">{error}</p>}
    {file && <button className="button button-primary analyze-button" disabled={busy} onClick={submit}>{busy ? <><LoaderCircle className="spin" size={17}/> Checking workbook…</> : <>Validate and analyze <span>→</span></>}</button>}
    <div className="upload-footnote"><ShieldCheck size={15}/> Your original workbook is never changed.</div>
  </section>;
}
