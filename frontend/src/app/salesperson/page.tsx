import { Suspense } from "react";
import SalespersonContent from "./SalespersonContent";

export default function SalespersonPage() {
  return (
    <Suspense fallback={<div className="ml-60 mt-14 p-6 text-slate-400 text-sm">Loading...</div>}>
      <SalespersonContent />
    </Suspense>
  );
}