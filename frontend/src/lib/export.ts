import * as XLSX from "xlsx";
import { Contract } from "@/types";
import { MONTH_COLS } from "./utils";

/**
 * @param exec The exec or AM name this export is scoped to
 * @param contracts Already-filtered contracts for that exec/AM
 * @param dimension "exec" (default) scoped by salesperson; "am" scoped by accountManager.
 *   Affects the filename tag and which cross-info column is shown — when
 *   scoped to an exec, the Account Manager column is the useful varying
 *   info; when scoped to an AM, that column is constant/redundant on every
 *   row, so it's swapped for Salesperson instead.
 */
export function exportSalespersonExcel(
  exec: string,
  contracts: Contract[],
  dimension: "exec" | "am" = "exec"
) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const filenameTag = dimension === "am" ? `AM_${exec}` : exec;
  const filename = `ZribbleOS_${filenameTag}_${dateStr}.xlsx`;

  const crossColumnLabel = dimension === "am" ? "Salesperson" : "Account Manager";

  // Build header row
  const headers = [
    "Client", "Product", crossColumnLabel, "Contract ID",
    "Profiles", "GST", "Deal Value (₹)", "Term (months)", "First Renewal",
    ...MONTH_COLS,
    "Total Pipeline (₹)",
  ];

  // Build data rows
  const rows = contracts.map((c) => {
    // Build a map of month col → amount for this contract
    const monthMap: Record<string, number> = {};
    c.renewalSchedule.forEach((r) => {
      const col = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][r.month-1]}-${r.year}`;
      monthMap[col] = r.amount;
    });

    const monthValues = MONTH_COLS.map((col) => monthMap[col] ?? 0);
    const totalPipeline = monthValues.reduce((a, v) => a + v, 0);

    return [
      c.clientName,
      c.product,
      dimension === "am" ? c.salesperson : c.accountManager,
      c.contractId || "",
      c.profiles,
      c.gstStatus === "Y" ? "Yes" : "No",
      c.dealValue,
      c.contractTermMonths,
      c.firstRenewalDate,
      ...monthValues,
      totalPipeline,
    ];
  });

  // Sort by client name
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  // Add totals row
  const totalRow: (string | number)[] = [
    "TOTAL", "", "", "", "", "", 
    contracts.reduce((a, c) => a + c.dealValue, 0),
    "", "",
    ...MONTH_COLS.map((col) => {
      return contracts.reduce((sum, c) => {
        const r = c.renewalSchedule.find((r) => {
          const rCol = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][r.month-1]}-${r.year}`;
          return rCol === col;
        });
        return sum + (r?.amount ?? 0);
      }, 0);
    }),
    contracts.reduce((sum, c) => sum + c.renewalSchedule.reduce((a, r) => a + r.amount, 0), 0),
  ];

  const wsData = [headers, ...rows, totalRow];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  const colWidths = [
    { wch: 30 }, // Client
    { wch: 22 }, // Product
    { wch: 16 }, // AM / Salesperson (dimension-dependent)
    { wch: 10 }, // Contract ID
    { wch: 8  }, // Profiles
    { wch: 6  }, // GST
    { wch: 14 }, // Deal Value
    { wch: 8  }, // Term
    { wch: 14 }, // First Renewal
    ...MONTH_COLS.map(() => ({ wch: 10 })),
    { wch: 16 }, // Total Pipeline
  ];
  ws["!cols"] = colWidths;

  // Freeze first row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  // Sheet names can't exceed 31 chars or contain certain characters —
  // keep it simple and just use the exec/AM name as before.
  XLSX.utils.book_append_sheet(wb, ws, exec.slice(0, 31));
  XLSX.writeFile(wb, filename);
}