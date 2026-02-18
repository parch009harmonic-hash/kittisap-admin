import { ReactNode } from "react";

type AdminTableProps = {
  columns: string[];
  children: ReactNode;
};

export function AdminTable({ columns, children }: AdminTableProps) {
  return (
    <div className="glass-card overflow-x-auto rounded-2xl">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50/75">
          <tr className="text-left text-steel">
            {columns.map((column) => (
              <th key={column} className="px-5 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
