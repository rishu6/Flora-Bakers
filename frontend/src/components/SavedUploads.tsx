import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Package } from "lucide-react";
import { downloadOriginalWorkbook, getUploads } from "../services/api";
import type { UploadBatch } from "../types";

export function SavedUploads({ onManageProducts }: { onManageProducts: () => void }) {
  const uploads = useQuery({ queryKey: ["uploads"], queryFn: getUploads });
  const download = useMutation({ mutationFn: (batch: UploadBatch) => downloadOriginalWorkbook(batch.id, batch.original_filename) });
  return <section className="staff-panel card saved-uploads-panel">
    <div className="staff-panel-heading"><div><span className="muted-label">SAVED ON THE SERVER</span><h3>Your uploaded workbooks</h3></div><button type="button" className="button button-outline" onClick={onManageProducts}><Package size={16}/> Manage saved products</button></div>
    <p>Accepted workbooks and their sales data are saved automatically. Products stay in your menu when you upload another workbook, and you can add new products at any time.</p>
    {uploads.isLoading && <p role="status">Loading saved uploads…</p>}
    {uploads.isError && <div><p className="error-text" role="alert">{uploads.error.message}</p><button type="button" className="button button-outline" onClick={() => void uploads.refetch()}>Try again</button></div>}
    {download.isError && <p className="error-text" role="alert">{download.error.message}</p>}
    {uploads.data?.length === 0 && <p className="empty-copy">No saved workbooks yet. Use Import sales to upload your first file.</p>}
    <div className="saved-upload-list">{uploads.data?.map((batch) => <article className="saved-upload-row" key={batch.id}>
      <FileSpreadsheet size={24} aria-hidden="true"/>
      <div className="saved-upload-copy"><h4>{batch.original_filename}</h4><p>{new Date(batch.uploaded_at).toLocaleString()} · {batch.valid_records.toLocaleString()} saved sales rows</p>
        {batch.validation_report.products_added != null && <p>{batch.validation_report.products_added} products added · {batch.validation_report.products_existing ?? 0} existing products kept</p>}
        {!batch.original_file_saved && <small>This older upload has saved sales data, but its original workbook was not archived.</small>}
      </div>
      {batch.original_file_saved && <button type="button" className="button button-outline" disabled={download.isPending} onClick={() => download.mutate(batch)}><Download size={16}/>{download.isPending && download.variables?.id === batch.id ? "Downloading…" : "Download original"}</button>}
    </article>)}</div>
  </section>;
}
