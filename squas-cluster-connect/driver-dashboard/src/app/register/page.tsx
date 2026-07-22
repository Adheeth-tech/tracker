"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { Droplet, Phone, User, Award, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    license_number: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await api.registerDriver({
        name: formData.name,
        phone: formData.phone.trim(),
        license_number: formData.license_number || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Registration failed. Verify your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950 px-4 relative overflow-hidden">
      {/* Decorative radial gradients */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>

      <div className="max-w-md w-full z-10">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative">
          
          {/* Logo header */}
          <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-indigo-650 rounded-2xl shadow-lg shadow-indigo-600/35 mb-3">
              <Droplet className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">Driver Registration</h1>
            <p className="text-slate-400 text-xs mt-1 text-center font-medium leading-relaxed">
              Register your profile to start receiving wastewater dispatch jobs
            </p>
          </div>

          {success ? (
            <div className="space-y-6 text-center py-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-md font-bold text-white">Registration Successful!</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Your driver profile has been created and is currently <strong className="text-indigo-400">Awaiting Admin Approval</strong>. You will be assignable to dispatch jobs once approved.
                </p>
              </div>
              <Link
                href="/login"
                className="w-full inline-flex justify-center items-center gap-1.5 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-indigo-700 bg-white hover:bg-slate-50 transition-colors"
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="bg-red-900/25 border border-red-500/30 text-red-300 p-4 rounded-xl text-xs font-semibold flex items-start gap-2 leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Driver Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    value={formData.name}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-650 text-sm font-semibold transition-all"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="e.g. +919000000020"
                    value={formData.phone}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-650 text-sm font-semibold transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-550 mt-1">
                  Ensure this starts with a country code (e.g. +91).
                </p>
              </div>

              {/* License Number */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Commercial License Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Award className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="text"
                    name="license_number"
                    required
                    placeholder="e.g. KL-08-2024-1234"
                    value={formData.license_number}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-650 text-sm font-semibold transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-650 hover:bg-indigo-755 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    "Register Driver Profile"
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-slate-850 pt-4 mt-2">
                <Link
                  href="/login"
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
