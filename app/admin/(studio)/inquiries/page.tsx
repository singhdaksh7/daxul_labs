"use client";

import React, { useEffect, useState } from "react";
import {
  Inbox,
  Mail,
  Phone,
  Clock,
  Trash2,
  CheckCircle,
  Archive,
  Search,
} from "lucide-react";

interface InquiryItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  status: "NEW" | "READ" | "RESPONDED" | "ARCHIVED";
  createdAt: string;
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryItem | null>(null);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inquiries");
      const data = await res.json();
      if (data?.inquiries) {
        setInquiries(data.inquiries);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleUpdateStatus = async (id: string, nextStatus: "NEW" | "READ" | "RESPONDED" | "ARCHIVED") => {
    try {
      await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      setInquiries(
        inquiries.map((inq) => (inq.id === id ? { ...inq, status: nextStatus } : inq))
      );
      if (selectedInquiry?.id === id) {
        setSelectedInquiry({ ...selectedInquiry, status: nextStatus });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this inquiry permanently?")) return;
    try {
      await fetch(`/api/admin/inquiries?id=${id}`, { method: "DELETE" });
      setInquiries(inquiries.filter((inq) => inq.id !== id));
      if (selectedInquiry?.id === id) setSelectedInquiry(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = inquiries.filter((inq) => {
    const matchesSearch =
      inq.name.toLowerCase().includes(search.toLowerCase()) ||
      inq.email.toLowerCase().includes(search.toLowerCase()) ||
      inq.message.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === "ALL") return matchesSearch;
    return matchesSearch && inq.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-daxul-lime" />
            <span>Customer Inquiries</span>
          </h1>
          <p className="font-mono text-xs text-[#B9B9B4] tracking-wide mt-1">
            Review and respond to messages submitted through the dynamic Contact forms.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#141416] p-4 border border-[#242426]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#B9B9B4]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inquiries by name, email, text..."
            className="w-full bg-[#1C1C1E] border border-[#242426] text-xs text-white pl-9 pr-4 py-2.5 focus:outline-none focus:border-daxul-lime"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto font-mono text-xs">
          {["ALL", "NEW", "READ", "RESPONDED", "ARCHIVED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 transition-colors uppercase ${
                statusFilter === s
                  ? "bg-daxul-lime text-daxul-black font-bold"
                  : "bg-[#1C1C1E] text-[#B9B9B4] hover:text-white border border-[#242426]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 2-Column Split: Inquiries List & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left List (7 cols) */}
        <div className="lg:col-span-7 bg-[#141416] border border-[#242426]">
          {loading ? (
            <div className="p-12 text-center font-mono text-xs text-[#B9B9B4]">
              Loading inquiries...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center font-mono text-xs text-[#B9B9B4]">
              No customer inquiries found.
            </div>
          ) : (
            <div className="divide-y divide-[#242426]">
              {filtered.map((inq) => {
                const isSelected = inq.id === selectedInquiry?.id;
                return (
                  <div
                    key={inq.id}
                    onClick={() => {
                      setSelectedInquiry(inq);
                      if (inq.status === "NEW") handleUpdateStatus(inq.id, "READ");
                    }}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#1C1C1E] border-l-2 border-daxul-lime"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{inq.name}</span>
                        {inq.status === "NEW" && (
                          <span className="w-2 h-2 rounded-full bg-daxul-lime inline-block" />
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-[#71717A]">
                        {new Date(inq.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-xs text-[#B9B9B4] truncate mb-2">
                      {inq.message}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#71717A]">{inq.email}</span>
                      <span
                        className={`uppercase px-2 py-0.5 text-[9px] ${
                          inq.status === "NEW"
                            ? "bg-daxul-lime/10 text-daxul-lime border border-daxul-lime/30"
                            : inq.status === "RESPONDED"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-[#242426] text-[#B9B9B4]"
                        }`}
                      >
                        {inq.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail Pane (5 cols) */}
        <div className="lg:col-span-5 bg-[#141416] border border-[#242426] p-6 space-y-6">
          {selectedInquiry ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-[#242426] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white uppercase tracking-wide">
                    {selectedInquiry.name}
                  </h2>
                  <div className="font-mono text-xs text-[#71717A] mt-1 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(selectedInquiry.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(selectedInquiry.id)}
                  className="p-1.5 text-[#B9B9B4] hover:text-red-400 transition-colors"
                  title="Delete Inquiry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-white">
                  <Mail className="w-3.5 h-3.5 text-[#71717A]" />
                  <a href={`mailto:${selectedInquiry.email}`} className="hover:underline text-daxul-lime">
                    {selectedInquiry.email}
                  </a>
                </div>
                {selectedInquiry.phone && (
                  <div className="flex items-center gap-2 text-[#B9B9B4]">
                    <Phone className="w-3.5 h-3.5 text-[#71717A]" />
                    <span>{selectedInquiry.phone}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase text-[#71717A] tracking-wider block mb-2">
                  Message
                </span>
                <div className="p-4 bg-[#101012] border border-[#242426] text-xs text-white leading-relaxed whitespace-pre-wrap">
                  {selectedInquiry.message}
                </div>
              </div>

              <div className="pt-4 border-t border-[#242426] flex items-center gap-2 font-mono text-xs">
                <span className="text-[#71717A] mr-2">Status:</span>
                <button
                  onClick={() => handleUpdateStatus(selectedInquiry.id, "RESPONDED")}
                  className={`px-3 py-1.5 transition-colors ${
                    selectedInquiry.status === "RESPONDED"
                      ? "bg-green-500/20 text-green-400 border border-green-500/40"
                      : "bg-[#1C1C1E] text-[#B9B9B4] hover:text-white"
                  }`}
                >
                  Mark Responded
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedInquiry.id, "ARCHIVED")}
                  className={`px-3 py-1.5 transition-colors ${
                    selectedInquiry.status === "ARCHIVED"
                      ? "bg-neutral-800 text-neutral-300"
                      : "bg-[#1C1C1E] text-[#B9B9B4] hover:text-white"
                  }`}
                >
                  Archive
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center font-mono text-xs text-[#71717A]">
              Select an inquiry from the list to view its message details.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
