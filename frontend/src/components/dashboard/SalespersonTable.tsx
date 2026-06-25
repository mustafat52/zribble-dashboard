"use client";
import { SALES_SUMMARY, CONTRACTS } from "@/lib/mock-data";
import { formatCurrency, SALESPERSON_COLORS } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function SalespersonTable() {
  const router = useRouter();
  const { user, canPerform } = useAuth();
  const execFilter = canPerform("view_all") ? null : user?.salesperson ?? null;

  const summary = execFilter
    ? SALES_SUMMARY.filter((s) => s.salesperson === execFilter)
    : SALES_SUMMARY;

  const total = summary.reduce((a, s) => a + s.totalPipeline, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Executive Breakdown</CardTitle>
        <p className="text-xs text-slate-400 mt-0.5">
          {execFilter ? `${execFilter}'s portfolio` : "Portfolio value by salesperson"}
        </p>
      </CardHeader>
      <CardContent className="px-0 py-0">
        <Table>
          <THead>
            <Th>Executive</Th><Th>Accounts</Th><Th>2026</Th><Th>2027</Th><Th>2028</Th><Th>Pipeline %</Th>
          </THead>
          <TBody>
            {summary.map((s) => {
              const pct   = Math.round((s.totalPipeline / total) * 100);
              const color = SALESPERSON_COLORS[s.salesperson];
              return (
                <Tr key={s.salesperson} onClick={() => router.push(`/salesperson?exec=${s.salesperson}`)}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-medium text-slate-700">{s.salesperson}</span>
                    </div>
                  </Td>
                  <Td><span className="text-slate-500">{s.totalAccounts}</span></Td>
                  <Td>{formatCurrency(s.renewals2026)}</Td>
                  <Td>{formatCurrency(s.renewals2027)}</Td>
                  <Td>{formatCurrency(s.renewals2028)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-16">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width:`${pct}%`, backgroundColor:color }} />
                      </div>
                      <span className="text-xs text-slate-400 w-7">{pct}%</span>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total</span>
          <span className="text-sm font-bold text-slate-700">{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}