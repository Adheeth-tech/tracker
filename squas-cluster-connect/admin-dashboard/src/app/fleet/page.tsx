"use client";

import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Vehicle, Driver } from "../../lib/types";
import ProtectedRoute from "../../components/ProtectedRoute";
import AppShell from "../../components/AppShell";
import { useToast } from "../../components/Toast";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { Plus, RefreshCw, AlertCircle, PlusCircle, Pencil, Power, UserPlus, Trash2 } from "lucide-react";

export default function FleetPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"vehicles" | "drivers">("vehicles");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals status
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [editingDriverId, setEditingDriverId] = useState<number | null>(null);

  // Form states
  const [vehNum, setVehNum] = useState("");
  const [vehCap, setVehCap] = useState("");
  const [vehDriverId, setVehDriverId] = useState("");
  const [drvName, setDrvName] = useState("");
  const [drvPhone, setDrvPhone] = useState("");
  const [drvLicense, setDrvLicense] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const formatVehicleNumber = (value: string) => {
    const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    return [
      compact.slice(0, 2),
      compact.slice(2, 4),
      compact.slice(4, 6),
      compact.slice(6, 10),
    ].filter(Boolean).join("-");
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [vData, dData] = await Promise.all([
        api.listVehicles(),
        api.listDrivers(),
      ]);
      setVehicles(vData);
      setDrivers(dData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load fleet data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const driver_id = vehDriverId ? parseInt(vehDriverId) : null;
      const payload = {
        vehicle_number: vehNum,
        capacity_litres: parseFloat(vehCap),
        driver_id,
      };
      if (editingVehicleId) await api.updateVehicle(editingVehicleId, payload);
      else await api.createVehicle(payload);
      // Reset & Refresh
      setVehNum("");
      setVehCap("");
      setVehDriverId("");
      setEditingVehicleId(null);
      setShowVehicleModal(false);
      await fetchData();
      showToast(editingVehicleId ? "Vehicle updated successfully." : "Vehicle added successfully.", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to save vehicle.", "error");
      setError(err.message || "Failed to add vehicle.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        name: drvName,
        phone: drvPhone,
        license_number: drvLicense || undefined,
      };
      if (editingDriverId) await api.updateDriver(editingDriverId, payload);
      else await api.createDriver(payload);
      // Reset & Refresh
      setDrvName("");
      setDrvPhone("");
      setDrvLicense("");
      setEditingDriverId(null);
      setShowDriverModal(false);
      await fetchData();
      showToast(editingDriverId ? "Driver updated successfully." : "Driver added successfully.", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to save driver.", "error");
      setError(err.message || "Failed to add driver.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVehicle = async (vehicle: Vehicle) => {
    if (!confirm(`${vehicle.status === "inactive" ? "Activate" : "Deactivate"} ${vehicle.vehicle_number}?`)) return;
    try {
      if (vehicle.status === "inactive") await api.activateVehicle(vehicle.id);
      else await api.deactivateVehicle(vehicle.id);
      await fetchData();
      showToast(`${vehicle.vehicle_number} status updated.`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to change vehicle status.", "error");
      setError(err.message || "Failed to change vehicle status.");
    }
  };

  const toggleDriver = async (driver: Driver) => {
    if (!confirm(`${driver.is_active ? "Deactivate" : "Activate"} ${driver.name}?`)) return;
    try {
      if (driver.is_active) await api.deactivateDriver(driver.id);
      else await api.activateDriver(driver.id);
      await fetchData();
      showToast(`${driver.name} status updated.`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to change driver status.", "error");
      setError(err.message || "Failed to change driver status.");
    }
  };

  const deleteVehicle = async (vehicle: Vehicle) => {
    if (!confirm(`Permanently delete ${vehicle.vehicle_number}? This is only possible when it has no trip or GPS history.`)) return;
    try {
      await api.deleteVehicle(vehicle.id);
      await fetchData();
      showToast(`${vehicle.vehicle_number} deleted.`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to delete vehicle.", "error");
      setError(err.message || "Failed to delete vehicle.");
    }
  };

  const deleteDriver = async (driver: Driver) => {
    if (!confirm(`Permanently delete ${driver.name}? Drivers with history must be suspended instead.`)) return;
    try {
      await api.deleteDriver(driver.id);
      await fetchData();
      showToast(`${driver.name} deleted.`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to delete driver.", "error");
      setError(err.message || "Failed to delete driver.");
    }
  };

  const getDriverName = (driverId?: number | null) => {
    if (!driverId) return "Unassigned";
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? driver.name : `Driver ID: ${driverId}`;
  };

  const vehicleColumns: Column<Vehicle>[] = [
    {
      header: "ID",
      accessor: "id",
      className: "text-slate-500 font-mono text-xs w-16",
    },
    {
      header: "Vehicle Number",
      accessor: "vehicle_number",
      className: "font-bold text-slate-800",
    },
    {
      header: "Capacity",
      accessor: (item) => `${item.capacity_litres.toLocaleString()} L`,
      className: "font-mono font-semibold text-slate-700",
    },
    {
      header: "Assigned Driver",
      accessor: (item) => getDriverName(item.driver_id),
      className: "font-medium text-slate-700",
    },
    {
      header: "Status",
      accessor: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: "Last Known Location",
      accessor: (item) => {
        if (item.last_lat !== null && item.last_lng !== null && item.last_lat !== undefined && item.last_lng !== undefined) {
          return `${item.last_lat.toFixed(4)}, ${item.last_lng.toFixed(4)}`;
        }
        return "None";
      },
      className: "text-xs font-mono text-slate-500",
    },
    {
      header: "Actions",
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <button
            title="Edit vehicle"
            onClick={() => {
              setEditingVehicleId(item.id);
              setVehNum(item.vehicle_number);
              setVehCap(String(item.capacity_litres));
              setVehDriverId(item.driver_id ? String(item.driver_id) : "");
              setShowVehicleModal(true);
            }}
            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 cursor-pointer"
          ><Pencil className="h-3.5 w-3.5" /></button>
          {!item.driver_id && item.status === "available" && (
            <button
              title="Assign driver"
              onClick={() => {
                setEditingVehicleId(item.id);
                setVehNum(item.vehicle_number);
                setVehCap(String(item.capacity_litres));
                setVehDriverId("");
                setShowVehicleModal(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
            ><UserPlus className="h-3 w-3" /> Assign Driver</button>
          )}
          <button
            title={item.status === "inactive" ? "Activate vehicle" : "Deactivate vehicle"}
            onClick={() => toggleVehicle(item)}
            className={`p-1.5 rounded-lg cursor-pointer ${item.status === "inactive" ? "text-emerald-600 hover:bg-emerald-50" : "text-amber-600 hover:bg-amber-50"}`}
          ><Power className="h-3.5 w-3.5" /></button>
          <button
            title="Delete vehicle"
            onClick={() => deleteVehicle(item)}
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
          ><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  const driverColumns: Column<Driver>[] = [
    {
      header: "ID",
      accessor: "id",
      className: "text-slate-500 font-mono text-xs w-16",
    },
    {
      header: "Name",
      accessor: "name",
      className: "font-bold text-slate-800",
    },
    {
      header: "Phone Number",
      accessor: "phone",
      className: "font-mono text-slate-700",
    },
    {
      header: "Duty Status",
      accessor: (driver) => {
        const vehicle = vehicles.find(v => v.driver_id === driver.id);
        if (!vehicle) return <span className="text-gray-400 italic">No Tanker Assigned</span>;
        
        if (vehicle.status === "on_trip") {
          return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              On Active Trip
            </span>
          );
        } else if (vehicle.status === "available") {
          return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Ready & Available
            </span>
          );
        } else {
          return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200 capitalize">
              {vehicle.status}
            </span>
          );
        }
      },
    },
    {
      header: "Status",
      accessor: (item) => <StatusBadge status={item.status as any} />,
    },
    {
      header: "Actions",
      accessor: (item) =>
        item.status === "pending" ? (
          <button
              onClick={async () => {
              if (confirm(`Approve driver ${item.name}?`)) {
                try {
                  await api.approveDriver(item.id);
                  await fetchData();
                } catch (e: any) {
                  alert(e.message || "Failed to approve driver");
                }
              }
            }}
            className="text-xs font-bold text-indigo-650 hover:text-white bg-indigo-50 hover:bg-indigo-650 px-2.5 py-1 rounded-lg border border-indigo-200 transition-all cursor-pointer"
          >
            Approve
          </button>
        ) : null,
    },
    {
      header: "Manage",
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <button
            title="Edit driver"
            onClick={() => {
              setEditingDriverId(item.id);
              setDrvName(item.name);
              setDrvPhone(item.phone);
              setDrvLicense(item.license_number || "");
              setShowDriverModal(true);
            }}
            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 cursor-pointer"
          ><Pencil className="h-3.5 w-3.5" /></button>
          {item.status !== "pending" && (
            <button
              title={item.is_active ? "Suspend driver" : "Reactivate driver"}
              onClick={() => toggleDriver(item)}
              className={`p-1.5 rounded-lg cursor-pointer ${item.is_active ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
            ><Power className="h-3.5 w-3.5" /></button>
          )}
          <button
            title="Delete driver"
            onClick={() => deleteDriver(item)}
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
          ><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Header Action Row */}
          <div className="flex justify-between items-center border-b border-gray-150 pb-4">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("vehicles")}
                className={`pb-4 px-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === "vehicles"
                    ? "border-indigo-650 text-indigo-650 font-black"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                Vehicles ({vehicles.length})
              </button>
              <button
                onClick={() => setActiveTab("drivers")}
                className={`pb-4 px-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === "drivers"
                    ? "border-indigo-650 text-indigo-650 font-black"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                Drivers ({drivers.length})
              </button>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
              onClick={() => {
                  if (activeTab === "vehicles") {
                    setEditingVehicleId(null);
                    setVehNum(""); setVehCap(""); setVehDriverId("");
                    setShowVehicleModal(true);
                  } else {
                    setEditingDriverId(null);
                    setDrvName(""); setDrvPhone(""); setDrvLicense("");
                    setShowDriverModal(true);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" />
                Add {activeTab === "vehicles" ? "Vehicle" : "Driver"}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-semibold flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {loading && vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-150 rounded-2xl shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-sm text-gray-500 font-medium">Fetching fleet roster...</p>
            </div>
          ) : (
            <div>
              {activeTab === "vehicles" ? (
                <DataTable
                  columns={vehicleColumns}
                  data={vehicles}
                  keyExtractor={(item) => item.id}
                  emptyMessage="No vehicles registered in the fleet."
                />
              ) : (
                <DataTable
                  columns={driverColumns}
                  data={drivers}
                  keyExtractor={(item) => item.id}
                  emptyMessage="No drivers registered in the fleet."
                />
              )}
            </div>
          )}

          {/* Add Vehicle Modal */}
          {showVehicleModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-gray-150 max-w-md w-full shadow-2xl p-6 relative">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-indigo-600" />
                  {editingVehicleId ? "Edit Vehicle" : "Add Vehicle to Fleet"}
                </h3>
                <form onSubmit={handleAddVehicle} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Vehicle Plate Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="KL-07-CD-1234"
                      value={vehNum}
                      onChange={(e) => setVehNum(formatVehicleNumber(e.target.value))}
                      className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Tank Capacity (Litres)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="5000"
                      value={vehCap}
                      onChange={(e) => setVehCap(e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Assign Driver (Optional)
                    </label>
                    <select
                      value={vehDriverId}
                      onChange={(e) => setVehDriverId(e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-650 focus:border-indigo-650 text-sm font-semibold bg-white"
                    >
                      <option value="">Unassigned</option>
                      {drivers.filter(d => d.status === "active").map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowVehicleModal(false)}
                      className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 text-sm font-bold text-white bg-indigo-650 hover:bg-indigo-750 rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? "Saving..." : editingVehicleId ? "Save Changes" : "Add Vehicle"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Driver Modal */}
          {showDriverModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-gray-150 max-w-md w-full shadow-2xl p-6 relative">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-indigo-600" />
                  {editingDriverId ? "Edit Driver" : "Register Driver"}
                </h3>
                <form onSubmit={handleAddDriver} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={drvName}
                      onChange={(e) => setDrvName(e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+919000000020"
                      value={drvPhone}
                      onChange={(e) => setDrvPhone(e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      License Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="DL-1420110012345"
                      value={drvLicense}
                      onChange={(e) => setDrvLicense(e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm font-semibold"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowDriverModal(false)}
                      className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 text-sm font-bold text-white bg-indigo-650 hover:bg-indigo-750 rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? "Saving..." : editingDriverId ? "Save Changes" : "Register"}
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
