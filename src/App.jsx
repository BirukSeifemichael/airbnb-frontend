/**
 * App.jsx — Airbnb Accounting Confidence Dashboard
 *
 * Single-file React frontend for the Airbnb accounting FastAPI backend.
 * Uses Tailwind CSS (loaded via CDN in index.html) for styling.
 *
 * HOW TO RUN:
 *   1. npm create vite@latest airbnb-dashboard -- --template react
 *   2. cd airbnb-dashboard
 *   3. npm install
 *   4. Replace src/App.jsx with this file
 *   5. Add Tailwind via CDN in index.html (see note below)
 *   6. npm run dev
 *
 * TAILWIND CDN (add to index.html <head>):
 *   <script src="https://cdn.tailwindcss.com"></script>
 *
 * BACKEND: Make sure your FastAPI server is running at http://localhost:8000
 */

import { useState } from "react";

// ── Constants ────────────────────────────────────────────────────────────────
const API_BASE = "https://web-production-192cf.up.railway.app";

// ── Small reusable components ─────────────────────────────────────────────────

/** A single stat card — big number on top, label underneath */
function StatCard({ label, value, accent = false, prefix = "", suffix = "" }) {
  return (
    <div
      className={`rounded-2xl p-5 shadow-sm border flex flex-col gap-1 ${
        accent
          ? "bg-emerald-50 border-emerald-200"
          : "bg-white border-slate-100"
      }`}
    >
      <span
        className={`text-3xl font-bold tracking-tight ${
          accent ? "text-emerald-600" : "text-slate-800"
        }`}
      >
        {prefix}{value}{suffix}
      </span>
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

/** A horizontal progress bar showing matched vs unmatched value */
function ValueBar({ matched, unmatched }) {
  const total = matched + unmatched;
  const matchedPct = total > 0 ? (matched / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium text-slate-600">
        <span>
          Matched{" "}
          <span className="text-emerald-600 font-semibold">
            ${matched.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </span>
        <span>
          Unmatched{" "}
          <span className="text-amber-500 font-semibold">
            ${unmatched.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </span>
      </div>
      <div className="h-4 w-full rounded-full bg-amber-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
          style={{ width: `${matchedPct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{matchedPct.toFixed(1)}%</span>
        <span>{(100 - matchedPct).toFixed(1)}%</span>
      </div>
    </div>
  );
}

/** A warning card for a single unmatched Airbnb payout */
function UnmatchedRow({ payout, onMatchClick }) {
  const amount = payout?.payout_amount ?? 0;
  const date = payout?.date ?? "—";
  const listing = payout?.listing ?? "Unknown listing";

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 space-y-2">
      {/* ── Main row: icon + listing info + amount + button ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate">{listing}</p>
            <p className="text-xs text-slate-400">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-bold text-amber-600">
            ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <button
            onClick={() => onMatchClick(payout)}
            className="text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            Match manually
          </button>
        </div>
      </div>

      {/* ── Possible reasons — indented below the main row ── */}
      <div className="pl-8 space-y-1">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Possible reasons:
        </p>
        <ul className="space-y-0.5">
          {[
            "No matching bank deposit found for this amount",
            "Amount mismatch — bank deposit may differ slightly",
            "Timing difference — Airbnb payouts can arrive 1–3 days late",
          ].map((reason) => (
            <li key={reason} className="flex items-start gap-1.5 text-xs text-slate-400">
              <span className="mt-0.5 text-slate-300">•</span>
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** A simple file input styled as a drop-zone card */
function FileInput({ label, accept, onChange, fileName }) {
  return (
    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl p-6 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors group">
      <span className="text-2xl">📄</span>
      <span className="text-sm font-semibold text-slate-600 group-hover:text-emerald-700">
        {label}
      </span>
      <span className="text-xs text-slate-400 text-center">
        {fileName ? fileName : "Click to choose a CSV file"}
      </span>
      <input
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
      />
    </label>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [airbnbFile, setAirbnbFile] = useState(null);
  const [bankFile,   setBankFile]   = useState(null);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const [reconcileData, setReconcileData] = useState(null);

  const [insights,        setInsights]        = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError,   setInsightsError]   = useState(null);

  // ── Manual match modal state ───────────────────────────────────────────────
  const [isModalOpen,             setIsModalOpen]             = useState(false);
  const [selectedPayout,          setSelectedPayout]          = useState(null);
  const [selectedBankTransaction, setSelectedBankTransaction] = useState(null);
  const [bankTransactions,        setBankTransactions]        = useState([]);

  // ── API calls ──────────────────────────────────────────────────────────────

  async function handleAnalyze() {
    if (!airbnbFile || !bankFile) {
      setError("Please select both CSV files before analyzing.");
      return;
    }

    setLoading(true);
    setError(null);
    setReconcileData(null);
    setInsights(null);

    try {
      // Step 1: Upload Airbnb CSV
      const airbnbForm = new FormData();
      airbnbForm.append("file", airbnbFile);
      const airbnbRes = await fetch(`${API_BASE}/upload-airbnb`, {
        method: "POST",
        body:   airbnbForm,
      });
      if (!airbnbRes.ok) throw new Error("Failed to upload Airbnb CSV.");

      // Step 2: Upload bank CSV
      const bankForm = new FormData();
      bankForm.append("file", bankFile);
      const bankRes = await fetch(`${API_BASE}/upload-bank`, {
        method: "POST",
        body:   bankForm,
      });
      if (!bankRes.ok) throw new Error("Failed to upload bank CSV.");

      // Store parsed bank transactions so the modal can list them
      const bankJson = await bankRes.json();
      setBankTransactions(bankJson.transactions ?? []);

      // Step 3: Reconcile
      const reconcileRes = await fetch(`${API_BASE}/reconcile`, {
        method: "POST",
      });
      if (!reconcileRes.ok) throw new Error("Reconciliation failed.");
      const data = await reconcileRes.json();
      setReconcileData(data);

      // Step 4: AI insights (separate try/catch so failure doesn't hide dashboard)
      setInsightsLoading(true);
      setInsightsError(null);
      try {
        const insightsRes = await fetch(`${API_BASE}/ai-insights`);
        if (!insightsRes.ok) throw new Error("AI insights request failed.");
        const insightsData = await insightsRes.json();
        setInsights(insightsData.insights ?? []);
      } catch {
        setInsightsError("Failed to load insights.");
      } finally {
        setInsightsLoading(false);
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  // ── Modal handlers ─────────────────────────────────────────────────────────

  function handleMatchManually(payout) {
    setSelectedPayout(payout);
    setSelectedBankTransaction(null);
    setIsModalOpen(true);
  }

  async function handleConfirmMatch() {
    try {
      const res = await fetch(`${API_BASE}/match-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          airbnb_row: selectedPayout.row_number,
          bank_row:   selectedBankTransaction.row_number,
        }),
      });

      if (!res.ok) throw new Error("Manual match failed.");

      const data = await res.json();
      setReconcileData(data);
      setIsModalOpen(false);
      setSelectedPayout(null);
      setSelectedBankTransaction(null);

    } catch (err) {
      console.error("Manual match failed:", err);
      setError("Manual match failed. Please try again.");
    }
  }

  // ── Derived display values ─────────────────────────────────────────────────
  const summary         = reconcileData?.summary ?? {};
  const matchRate       = summary.match_rate_pct ?? 0;
  const totalPayouts    = summary.total_airbnb_payouts ?? 0;
  const matchedCount    = summary.matched_count ?? 0;
  const unmatchedAirbnb = summary.unmatched_airbnb_count ?? 0;
  const unmatchedBank   = summary.unmatched_bank_count ?? 0;
  const matchedValue    = summary.total_matched_value ?? 0;
  const unmatchedValue  = summary.total_unmatched_value ?? 0;
  const unmatchedList   = reconcileData?.unmatched_airbnb ?? [];

  // Confidence data — populated from reconcileData.confidence once available
  const confidence = reconcileData?.confidence ?? null;

  // Pick a colour theme for the confidence score based on status
  const confidenceTheme =
    confidence?.status === "Tax Ready"    ? "emerald" :
    confidence?.status === "Needs Review" ? "amber"   : "red";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-100 px-6 py-5 flex items-center gap-3 shadow-sm">
        <span className="text-2xl">🏡</span>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">
            Airbnb Accounting
          </h1>
          <p className="text-xs text-slate-400">Confidence Dashboard</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* ── Upload section ──────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-700">Upload Files</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FileInput
              label="Airbnb Earnings CSV"
              accept=".csv"
              fileName={airbnbFile?.name}
              onChange={(e) => setAirbnbFile(e.target.files[0] ?? null)}
            />
            <FileInput
              label="Bank Transactions CSV"
              accept=".csv"
              fileName={bankFile?.name}
              onChange={(e) => setBankFile(e.target.files[0] ?? null)}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              ❌ {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold py-3 transition-colors text-sm shadow-sm"
          >
            {loading ? "Analyzing…" : "Analyze Data"}
          </button>
        </section>

        {/* ── Dashboard — only shown once we have reconcile data ──────────── */}
        {reconcileData && (
          <>
            {/* ── 🛡️ CONFIDENCE SCORE — first card in the dashboard ──────── */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
              <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <span>🛡️</span>
                <span>Tax Confidence</span>
              </h2>

              {confidence && (
                <>
                  {/* Score + status on one line */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-4xl font-bold ${
                        confidenceTheme === "emerald" ? "text-emerald-600" :
                        confidenceTheme === "amber"   ? "text-amber-500"   : "text-red-500"
                      }`}
                    >
                      {confidence.score}
                    </span>
                    <span
                      className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        confidenceTheme === "emerald"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : confidenceTheme === "amber"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {confidence.status}
                    </span>
                  </div>

                  {/* Score bar */}
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        confidenceTheme === "emerald" ? "bg-emerald-500" :
                        confidenceTheme === "amber"   ? "bg-amber-400"   : "bg-red-400"
                      }`}
                      style={{ width: `${confidence.score}%` }}
                    />
                  </div>

                  {/* Matched / unmatched counts */}
                  <div className="flex gap-4 text-sm">
                    <span className="text-slate-600">
                      ✔{" "}
                      <span className="font-semibold text-slate-800">
                        {confidence.matched_transactions}
                      </span>{" "}
                      matched
                    </span>
                    {confidence.unmatched_transactions > 0 && (
                      <span className="text-amber-600">
                        ⚠{" "}
                        <span className="font-semibold">
                          {confidence.unmatched_transactions}
                        </span>{" "}
                        need review
                      </span>
                    )}
                  </div>

                  {/* Issues list — only shown when there are problems */}
                  {confidence.issues?.length > 0 && (
                    <ul className="space-y-1">
                      {confidence.issues.map((issue, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-slate-500"
                        >
                          <span className="mt-0.5 text-slate-300">•</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>

            {/* ── 📊 OVERVIEW — key metrics ───────────────────────────────── */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-slate-700">Overview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Match Rate"    value={matchRate}   suffix="%" accent />
                <StatCard label="Total Payouts" value={totalPayouts} />
                <StatCard label="Matched"       value={matchedCount} />
                <StatCard label="Unmatched"     value={unmatchedAirbnb + unmatchedBank} />
              </div>
            </section>

            {/* ── 📉 VALUE BAR ────────────────────────────────────────────── */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
              <h2 className="text-base font-semibold text-slate-700">
                Matched vs Unmatched Value
              </h2>
              <ValueBar matched={matchedValue} unmatched={unmatchedValue} />
              {unmatchedBank > 0 && (
                <p className="text-xs text-slate-400">
                  + {unmatchedBank} bank credit{unmatchedBank !== 1 ? "s" : ""}{" "}
                  not linked to any Airbnb payout
                </p>
              )}
            </section>

            {/* ── ⚠️ UNMATCHED PAYOUTS ────────────────────────────────────── */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <span>Unmatched Airbnb Payouts</span>
                {unmatchedList.length > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-600 font-semibold px-2 py-0.5 rounded-full">
                    {unmatchedList.length}
                  </span>
                )}
              </h2>

              {unmatchedList.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-sm text-emerald-700 font-medium">
                  ✅ All Airbnb payouts matched to a bank transaction.
                </div>
              ) : (
                <div className="space-y-2">
                  {unmatchedList.map((item, idx) => (
                    <UnmatchedRow
                      key={idx}
                      payout={item.airbnb_payout}
                      onMatchClick={handleMatchManually}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── ✨ AI INSIGHTS ───────────────────────────────────────────── */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
              <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <span>✨</span>
                <span>AI Insights</span>
              </h2>

              {insightsLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              )}

              {insightsError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  ❌ {insightsError}
                </div>
              )}

              {insights && insights.length > 0 && (
                <ol className="space-y-3">
                  {insights.map((insight, idx) => (
                    <li
                      key={idx}
                      className="flex gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3"
                    >
                      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-slate-700 leading-relaxed">{insight}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* ── 📄 SCHEDULE E EXPORT ────────────────────────────────────── */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
              <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <span>📄</span>
                <span>Tax Export</span>
              </h2>
              <p className="text-sm text-slate-500">
                Download a Schedule E summary for your Airbnb rental.
              </p>
              <button
                onClick={() => window.open(`${API_BASE}/export-schedule-e`, "_blank")}
                className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 transition-colors text-sm shadow-sm"
              >
                Download Schedule E (PDF)
              </button>
            </section>
          </>
        )}
      </main>

      {/* ── Manual Match Modal ────────────────────────────────────────────────
           Lives outside <main> so it overlays the full page.
           Clicking the dark backdrop closes the modal.                        */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">
                Select matching bank transaction
              </h2>
              {selectedPayout && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Airbnb payout:{" "}
                  <span className="font-medium text-slate-600">
                    ${(selectedPayout.payout_amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>{" "}
                  · {selectedPayout.date}
                </p>
              )}
            </div>

            {/* Scrollable transaction list */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
              {bankTransactions.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  No bank transactions available.
                </p>
              ) : (
                bankTransactions.map((txn, idx) => {
                  const isSelected = selectedBankTransaction === txn;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedBankTransaction(txn)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-300"
                          : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {txn.description ?? "Unknown"}
                          </p>
                          <p className="text-xs text-slate-400">{txn.date ?? "—"}</p>
                        </div>
                        <span className={`text-sm font-bold ${isSelected ? "text-emerald-600" : "text-slate-600"}`}>
                          ${Math.abs(txn.amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMatch}
                disabled={!selectedBankTransaction}
                className="text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-200 rounded-xl px-4 py-2 transition-colors"
              >
                Confirm Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
