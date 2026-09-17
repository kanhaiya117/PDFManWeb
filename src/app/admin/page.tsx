"use client";

import { useState } from "react";
import { 
  Shield, 
  Users, 
  Clock, 
  Key, 
  FileText, 
  CheckCircle2, 
  Building2, 
  Lock, 
  Search,
  Download,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'sso' | 'retention'>('audit');
  const [entraEnabled, setEntraEnabled] = useState(true);
  const [retentionDays, setRetentionDays] = useState("0"); // 0 = immediate local purge

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Enterprise Compliance & Audit Portal</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Manage organization-wide single sign-on (SSO), Microsoft Entra ID, RBAC, and zero-retention policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs rounded-xl">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export Audit CSV
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 border rounded-2xl bg-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Enterprise Seats</span>
          <p className="text-2xl font-black mt-1">2,480</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">&uarr; 14% this month</span>
        </div>
        <div className="p-5 border rounded-2xl bg-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Local WASM Operations</span>
          <p className="text-2xl font-black mt-1">1,489,200</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">100% Zero-Cloud</span>
        </div>
        <div className="p-5 border rounded-2xl bg-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Organizations</span>
          <p className="text-2xl font-black mt-1">64</p>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Multi-tenant isolation</span>
        </div>
        <div className="p-5 border rounded-2xl bg-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Data Retention Window</span>
          <p className="text-2xl font-black mt-1">0 Days</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Immediate RAM purge</span>
        </div>
      </div>

      {/* Tabs Control */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'audit' 
              ? 'bg-indigo-600 text-white shadow-2xs' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          Activity & Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('sso')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'sso' 
              ? 'bg-indigo-600 text-white shadow-2xs' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          SSO & Microsoft Entra ID
        </button>
        <button
          onClick={() => setActiveTab('retention')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'retention' 
              ? 'bg-indigo-600 text-white shadow-2xs' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          Data Retention & Storage
        </button>
      </div>

      {/* TAB CONTENT: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="border rounded-2xl bg-card overflow-hidden shadow-xs">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <span className="font-bold text-xs text-foreground">Live Security Audit Stream</span>
            <span className="text-[11px] text-muted-foreground">Section 37: Zero document content recorded</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold">Timestamp</th>
                  <th className="px-4 py-3 font-semibold">Principal</th>
                  <th className="px-4 py-3 font-semibold">Organization</th>
                  <th className="px-4 py-3 font-semibold">Action Type</th>
                  <th className="px-4 py-3 font-semibold">Processing Mode</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { time: '2 mins ago', user: 'officer.rajesh@gov.in', org: 'Ministry of IT', action: 'Applied OFFICIAL COPY Stamp', mode: 'Local WASM', status: 'Success' },
                  { time: '14 mins ago', user: 'compliance@hdfc.internal', org: 'Banking Org #12', action: 'True Redaction: PAN & Aadhaar', mode: 'Local WASM', status: 'Success' },
                  { time: '45 mins ago', user: 'auditor@deloitte.corp', org: 'Enterprise Audit', action: 'Visual Diff: Contract Revisions', mode: 'Local Worker', status: 'Success' },
                  { time: '1 hour ago', user: 'admin@state.gov', org: 'Public Records Dept', action: 'Exported ISO PDF/A Archival', mode: 'Local WASM', status: 'Success' },
                  { time: '3 hours ago', user: 'analyst@icici.corp', org: 'Risk Management', action: 'Bank Statement Table Inspect', mode: 'Local WASM', status: 'Success' },
                ].map((log, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono">{log.time}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{log.user}</td>
                    <td className="px-4 py-3 text-muted-foreground">{log.org}</td>
                    <td className="px-4 py-3">{log.action}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">
                        {log.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{log.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SSO & Microsoft Entra ID */}
      {activeTab === 'sso' && (
        <div className="space-y-6">
          <div className="p-6 bg-card border rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Microsoft Entra ID (Azure AD) SSO</h3>
                  <p className="text-xs text-muted-foreground">Enforce SAML 2.0 and OAuth2 enterprise single sign-on</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={entraEnabled}
                onChange={(e) => setEntraEnabled(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 cursor-pointer"
              />
            </div>

            {entraEnabled && (
              <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Entra Tenant ID</label>
                  <Input value="8fa741e9-4912-4c28-98e3-0d92384a9e21" readOnly className="font-mono text-xs" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Client ID / App Registration</label>
                  <Input value="pdfman-enterprise-prod-auth-client" readOnly className="font-mono text-xs" />
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-card border rounded-3xl space-y-3">
            <h3 className="font-bold text-sm">Role-Based Access Control (RBAC)</h3>
            <p className="text-xs text-muted-foreground">
              Define permissions for Document Viewers, Compliance Officers, Editors, and Org Admins.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs">
                Configure RBAC Policies
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Data Retention Policies */}
      {activeTab === 'retention' && (
        <div className="p-6 bg-card border rounded-3xl space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Automated Document Retention & Purge Policy</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                PDFMan architecture is local-first by default. Any temporary server processing queues automatically purge document artifacts based on this policy.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t text-xs">
            <label className="font-semibold block">Retention Threshold</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "0", label: "Immediate Purge (0s)", desc: "Cleared from memory as soon as download completes" },
                { id: "1", label: "1 Hour Ephemeral", desc: "Cached temporarily for multi-step batch jobs" },
                { id: "24", label: "24 Hours Maximum", desc: "Hard deadline deletion for asynchronous jobs" },
              ].map((opt) => (
                <div 
                  key={opt.id}
                  onClick={() => setRetentionDays(opt.id)}
                  className={`p-3.5 border rounded-2xl cursor-pointer transition-all ${
                    retentionDays === opt.id 
                      ? 'border-indigo-600 bg-indigo-500/10 shadow-2xs' 
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <p className="font-bold text-xs">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
