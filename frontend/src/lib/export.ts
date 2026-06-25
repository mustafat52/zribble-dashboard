import * as XLSX from "xlsx";
import { Contract } from "@/types";
import { MONTH_COLS } from "./utils";

export function exportSalespersonExcel(exec: string, contracts: Contract[]) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const filename = `ZribbleOS_${exec}_${dateStr}.xlsx`;

  // Build header row
  const headers = [
    "Client", "Product", "Account Manager", "Contract ID",
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
      c.accountManager,
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
    { wch: 16 }, // AM
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
  XLSX.utils.book_append_sheet(wb, ws, exec);
  XLSX.writeFile(wb, filename);
}