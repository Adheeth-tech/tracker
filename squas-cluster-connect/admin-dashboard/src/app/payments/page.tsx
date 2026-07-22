"use client";

import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PaymentMode, PaymentStatus } from "../../lib/types";
import ProtectedRoute from "../../components/ProtectedRoute";
import AppShell from "../../components/AppShell";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { AlertCircle, CreditCard, RefreshCw, FileText, Check } from "lucide-react";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update Payment Modal State
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [payMode, setPayMode] = useState<PaymentMode>("cash");
  const [payStatus, setPayStatus] = useState<PaymentStatus>("paid");
  const [txnId, setTxnId] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Invoicing Form State
  const [invHotelId, setInvHotelId] = useState("");
  const [invStart, setInvStart] = useState("");
  const [invEnd, setInvEnd] = useState("");
  const [generatedInvoice, setGeneratedInvoice] = useState<any | null>(null);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [payData, tripData, reqData, hotData] = await Promise.all([
        api.pendingPayments(),
        api.listTrips(),
        api.listRequests(),
        api.listHotels(),
      ]);

      setPayments(payData);
      setTrips(tripData);
      setRequests(reqData);
      setHotels(hotData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load payments data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    setError(null);
    setSubmittingPayment(true);
    try {
      await api.updatePayment(
        selectedPayment.trip_id,
        payMode,
        payStatus,
        txnId || undefined
      );

      setSelectedPayment(null);
      setTxnId("");
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update payment status.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmittingInvoice(true);
    setGeneratedInvoice(null);
    try {
      const res = await api.generateInvoice(
        parseInt(invHotelId),
        invStart,
        invEnd
      );
      setGeneratedInvoice(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate monthly invoice.");
    } finally {
      setSubmittingInvoice(false);
    }
  };

  // Helper relationships resolvers
  const getPaymentDetails = (payment: any) => {
    const trip = trips.find((t) => t.id === payment.trip_id);
    if (!trip) return { tripCode: `Trip ID: ${payment.trip_id}`, hotelName: "Unknown Hotel" };

    const req = requests.find((r) => r.id === trip.request_id);
    if (!req) return { tripCode: trip.trip_code, hotelName: "Unknown Hotel" };

    const hotel = hotels.find((h) => h.id === req.hotel_id);
    return {
      tripCode: trip.trip_code,
      hotelName: hotel ? hotel.hotel_name : `Hotel ID: ${req.hotel_id}`,
    };
  };

  const paymentColumns: Column<any>[] = [
    {
      header: "Trip Code",
      accessor: (item) => getPaymentDetails(item).tripCode,
      className: "font-mono font-bold text-slate-800",
    },
    {
      header: "Hotel Name",
      accessor: (item) => getPaymentDetails(item).hotelName,
      className: "font-semibold text-slate-700",
    },
    {
      header: "Litres",
      accessor: (item) => (item.quantity_litres ? `${item.quantity_litres.toLocaleString()} L` : "-"),
      className: "font-mono text-slate-650",
    },
    {
      header: "Rate/L",
      accessor: (item) => (item.rate_per_litre ? `₹${item.rate_per_litre.toFixed(2)}` : "-"),
      className: "font-mono text-slate-500",
    },
    {
      header: "Total Amount",
      accessor: (item) => (item.amount ? `₹${item.amount.toLocaleString()}` : "-"),
      className: "font-mono font-bold text-slate-800",
    },
    {
      header: "Mode",
      accessor: "payment_mode",
      className: "font-medium text-slate-600 capitalize",
    },
    {
      header: "Status",
      accessor: (item) => <StatusBadge status={item.payment_status} />,
    },
    {
      header: "Actions",
      accessor: (item) => (
        <button
          onClick={() => {
            setSelectedPayment(item);
            setPayMode(item.payment_mode || "cash");
            setPayStatus("paid");
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Update status
        </button>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-8">
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-semibold flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Pending Payments Table (Takes 2/3 width on wide screens) */}
            <div className="xl:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-md font-bold text-slate-800">Pending & Partial Payments</h3>
                  <p className="text-xs text-gray-400 mt-1">Outstanding payments awaiting review or confirmation</p>
                </div>
                <button
                  onClick={fetchData}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {loading && payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-150 rounded-2xl shadow-sm">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                  <p className="mt-4 text-sm text-gray-500 font-medium">Fetching unpaid transactions...</p>
                </div>
              ) : (
                <DataTable
                  columns={paymentColumns}
                  data={payments}
                  keyExtractor={(item) => item.id}
                  emptyMessage="No pending payments found."
                />
              )}
            </div>

            {/* Invoicing Panel (Takes 1/3 width) */}
            <div className="space-y-6">
              <div className="bg-white p-6 border border-gray-150 rounded-2xl shadow-sm">
                <h3 className="text-md font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  Generate Invoice
                </h3>
                <p className="text-xs text-gray-400 mb-6">Create summary invoices for hotel clients</p>
                
                <form onSubmit={handleGenerateInvoice} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Select Client Hotel
                    </label>
                    <select
                      required
                      value={invHotelId}
                      onChange={(e) => setInvHotelId(e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm font-semibold bg-white"
                    >
                      <option value="">-- Choose Hotel --</option>
                      {hotels.filter(h => h.status === "active").map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.hotel_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        required
                        value={invStart}
                        onChange={(e) => setInvStart(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        required
                        value={invEnd}
                        onChange={(e) => setInvEnd(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingInvoice}
                    className="w-full py-3 bg-indigo-655 hover:bg-indigo-755 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer bg-indigo-600"
                  >
                    {submittingInvoice ? "Processing..." : "Generate Invoice"}
                  </button>
                </form>
              </div>

              {/* Display Generated Invoice */}
              {generatedInvoice && (
                <div className="bg-emerald-50/20 border border-emerald-100 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-emerald-850 font-bold">
                    <Check className="h-5 w-5 text-emerald-600" />
                    <h4>Invoice Generated Successfully</h4>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 space-y-2">
                    <div className="flex justify-between py-1 border-b border-emerald-100/50">
                      <span>Invoice Code</span>
                      <span className="font-mono text-slate-900 font-bold">{generatedInvoice.invoice_code}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-emerald-100/50">
                      <span>Total Litres Cleared</span>
                      <span className="font-mono text-slate-900">{generatedInvoice.total_litres.toLocaleString()} L</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-emerald-100/50">
                      <span>Trip Count</span>
                      <span className="text-slate-900">{generatedInvoice.trip_count} trips</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-emerald-100/50">
                      <span>Total Invoice Amount</span>
                      <span className="font-mono text-slate-900 font-bold">₹{generatedInvoice.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Status</span>
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">{generatedInvoice.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Update Payment Modal */}
          {selectedPayment && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-gray-150 max-w-md w-full shadow-2xl p-6 relative">
                <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-indigo-650" />
                  Record Payment Received
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  For Trip: <span className="font-bold font-mono text-slate-800">{getPaymentDetails(selectedPayment).tripCode}</span> ({getPaymentDetails(selectedPayment).hotelName})
                </p>

                <form onSubmit={handleUpdatePayment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Payment Mode
                    </label>
                    <select
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                      className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm font-semibold bg-white"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI (GPay/PhonePe)</option>
                      <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="credit">Credit / Account balance</option>
                      <option value="monthly_invoice">Monthly Invoice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Payment Status
                    </label>
                    <select
                      value={payStatus}
                      onChange={(e) => setPayStatus(e.target.value as PaymentStatus)}
                      className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm font-semibold bg-white"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Transaction ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="TXN9876543210"
                      value={txnId}
                      onChange={(e) => setTxnId(e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm font-semibold"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPayment(null);
                        setTxnId("");
                      }}
                      className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingPayment}
                      className="px-4 py-2 text-sm font-bold text-white bg-indigo-650 hover:bg-indigo-750 rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {submittingPayment ? "Updating..." : "Update Status"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
