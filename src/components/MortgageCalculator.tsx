"use client";

import { useState, useMemo } from "react";

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function MortgageCalculator({ price }: { price: number }) {
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(6.5);
  const [term, setTerm] = useState(30);
  const [showTaxIns, setShowTaxIns] = useState(true);

  const calc = useMemo(() => {
    const downPayment = price * (downPct / 100);
    const loanAmount = price - downPayment;
    const monthlyRate = rate / 100 / 12;
    const numPayments = term * 12;

    let monthlyPI: number;
    if (monthlyRate === 0) {
      monthlyPI = loanAmount / numPayments;
    } else {
      monthlyPI =
        (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);
    }

    // Estimates
    const monthlyTax = (price * 0.0115) / 12; // ~1.15% CA property tax
    const monthlyInsurance = (price * 0.0035) / 12; // ~0.35% homeowners
    const monthlyPMI = downPct < 20 ? (loanAmount * 0.005) / 12 : 0;

    const totalMonthly = monthlyPI + (showTaxIns ? monthlyTax + monthlyInsurance + monthlyPMI : 0);

    return {
      downPayment,
      loanAmount,
      monthlyPI,
      monthlyTax,
      monthlyInsurance,
      monthlyPMI,
      totalMonthly,
    };
  }, [price, downPct, rate, term, showTaxIns]);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 space-y-5">
      <h3 className="font-semibold text-lg text-slate-900">Payment Calculator</h3>

      {/* Monthly Payment Display */}
      <div className="text-center bg-slate-50 rounded-lg p-4">
        <p className="text-sm text-slate-500">Estimated Monthly Payment</p>
        <p className="text-3xl font-bold text-slate-900">{formatUSD(calc.totalMonthly)}</p>
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <label className="text-slate-600">Down Payment</label>
            <span className="font-medium text-slate-900">{downPct}% ({formatUSD(calc.downPayment)})</span>
          </div>
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={downPct}
            onChange={(e) => setDownPct(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <label className="text-slate-600">Interest Rate</label>
            <span className="font-medium text-slate-900">{rate.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min={2}
            max={10}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <label className="text-slate-600">Loan Term</label>
            <span className="font-medium text-slate-900">{term} years</span>
          </div>
          <div className="flex gap-2">
            {[15, 20, 30].map((t) => (
              <button
                key={t}
                onClick={() => setTerm(t)}
                className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${
                  term === t
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t} yr
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Principal & Interest</span>
          <span className="font-medium text-slate-700">{formatUSD(calc.monthlyPI)}</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showTaxIns}
            onChange={(e) => setShowTaxIns(e.target.checked)}
            className="accent-blue-600"
          />
          <span className="text-slate-500 text-xs">Include tax & insurance estimates</span>
        </label>
        {showTaxIns && (
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">Property Tax <span className="text-slate-400">(est.)</span></span>
              <span className="font-medium text-slate-700">{formatUSD(calc.monthlyTax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Insurance <span className="text-slate-400">(est.)</span></span>
              <span className="font-medium text-slate-700">{formatUSD(calc.monthlyInsurance)}</span>
            </div>
            {calc.monthlyPMI > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">PMI <span className="text-slate-400">(est.)</span></span>
                <span className="font-medium text-slate-700">{formatUSD(calc.monthlyPMI)}</span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between pt-2 border-t border-slate-100 font-semibold">
          <span className="text-slate-700">Total</span>
          <span className="text-slate-900">{formatUSD(calc.totalMonthly)}</span>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 leading-tight">
        Estimates for informational purposes only. Actual payments may vary based on credit score, lender terms, and other factors.
      </p>
    </div>
  );
}
