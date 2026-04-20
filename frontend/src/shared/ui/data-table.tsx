import type { ReactNode } from "react";

export function DataTable({
  headers,
  rows,
  caption,
  loading = false,
  emptyMessage = "Nenhum registro encontrado.",
}: {
  headers: string[];
  rows: Array<Array<ReactNode>>;
  caption?: string;
  loading?: boolean;
  emptyMessage?: string;
}) {
  return (
    <div className="table-wrap">
      {caption ? <div className="table-caption">{caption}</div> : null}
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={headers.length} className="empty-cell">
                Carregando dados...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="empty-cell">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={`${String(row[0])}-${index}`}>
                {row.map((value, cellIndex) => (
                  <td key={`${index}-${cellIndex}`}>{value ?? "-"}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
