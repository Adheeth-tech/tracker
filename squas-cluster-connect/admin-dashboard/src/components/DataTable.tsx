import React from "react";

export interface Column<T> {
  header: string;
  accessor?: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto border border-gray-150 rounded-xl bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50/80">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                scope="col"
                className={`px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider ${
                  col.className || ""
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-10 text-center text-sm text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={keyExtractor(item)} className="hover:bg-slate-50/70 transition-colors">
                {columns.map((col, colIdx) => {
                  let content: React.ReactNode = "";
                  if (col.accessor) {
                    if (typeof col.accessor === "function") {
                      content = col.accessor(item);
                    } else {
                      const val = item[col.accessor];
                      content = val !== null && val !== undefined ? String(val) : "-";
                    }
                  }
                  return (
                    <td
                      key={colIdx}
                      className={`px-5 py-3.5 whitespace-nowrap text-sm text-slate-700 ${
                        col.className || ""
                      }`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
