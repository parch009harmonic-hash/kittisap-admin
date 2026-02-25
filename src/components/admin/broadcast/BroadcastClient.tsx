"use client";

import { FormEvent, useMemo, useState } from "react";

import { AdminLocale } from "../../../../lib/i18n/admin";
import { ConfirmModal } from "../ConfirmModal";

type Subscriber = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  unsubscribedAt: string | null;
  createdAt: string;
};

type BroadcastClientProps = {
  locale: AdminLocale;
  initialSubscribers: Subscriber[];
  bootstrapError: string | null;
};

type SendMode = "all" | "single";

type SendResponse = {
  ok: boolean;
  error?: string;
  data?: {
    sentCount: number;
    failedCount: number;
  };
};

export default function BroadcastClient({ locale, initialSubscribers, bootstrapError }: BroadcastClientProps) {
  const text = useMemo(
    () =>
      locale === "th"
        ? {
            section: "บอร์ดแคส",
            title: "ส่งโปรโมชันผ่านอีเมล",
            subtitle: "ดูรายชื่อผู้รับข่าวสาร และส่งข้อความ/รูปภาพแบบทั้งหมดหรือรายคน",
            totalSubscribers: "ผู้สมัครทั้งหมด",
            search: "ค้นหาชื่อหรืออีเมล",
            sendMode: "โหมดการส่ง",
            openComposer: "เปิดโหมดการส่ง",
            closeComposer: "ซ่อนโหมดการส่ง",
            sendAll: "ส่งทั้งหมด",
            sendSingle: "ส่งรายคน",
            selectTarget: "เลือกรายชื่อปลายทาง",
            subject: "หัวข้ออีเมล",
            headline: "หัวข้อใหญ่ในอีเมล",
            message: "ข้อความโปรโมชัน",
            imageUrl: "ลิงก์รูปโปรโมชัน (ไม่บังคับ)",
            uploadImage: "อัปโหลดรูป",
            uploadingImage: "กำลังอัปโหลด...",
            preview: "พรีวิว",
            send: "ส่งบอร์ดแคส",
            sending: "กำลังส่ง...",
            sent: "ส่งสำเร็จ",
            sendFailed: "ส่งไม่สำเร็จ",
            noData: "ยังไม่มีผู้สมัครรับข่าวสาร",
            loadError: "โหลดข้อมูลเริ่มต้นไม่สำเร็จ",
            popupSendingTitle: "กำลังส่งอีเมล...",
            popupSendingDesc: "ระบบกำลังส่งโปรโมชันไปยังผู้รับที่เลือก",
            popupSuccessTitle: "ส่งเรียบร้อยแล้ว",
            popupSuccessDesc: "ระบบส่งอีเมลสำเร็จ",
            result: "ผลการส่ง",
            sentCount: "สำเร็จ",
            failedCount: "ไม่สำเร็จ",
            joinedAt: "สมัครเมื่อ",
            actions: "จัดการ",
            edit: "แก้ไข",
            saveEdit: "บันทึก",
            cancelEdit: "ยกเลิก",
            delete: "ลบ",
            deleting: "กำลังลบ...",
            deleteConfirm: "ยืนยันลบอีเมลรายการนี้ใช่หรือไม่",
            deleteConfirmTitle: "ยืนยันการลบผู้สมัคร",
            deleteConfirmDesc: "รายการนี้จะถูกซ่อนจากการส่ง (soft delete) และสามารถกู้คืนได้ภายหลัง",
            hardDelete: "ลบถาวร",
            hardDeleting: "กำลังลบถาวร...",
            hardDeleteConfirmTitle: "ยืนยันการลบถาวร",
            hardDeleteConfirmDesc: "การลบถาวรจะลบข้อมูลรายการนี้ออกจากระบบ และไม่สามารถกู้คืนได้",
            hardDeleteSuccess: "ลบถาวรสำเร็จ",
            hardDeleteFailed: "ลบถาวรไม่สำเร็จ",
            updateSuccess: "แก้ไขข้อมูลสำเร็จ",
            updateFailed: "แก้ไขข้อมูลไม่สำเร็จ",
            deleteSuccess: "ลบข้อมูลสำเร็จ",
            deleteFailed: "ลบข้อมูลไม่สำเร็จ",
            restore: "กู้คืน",
            restoreSuccess: "กู้คืนข้อมูลสำเร็จ",
            restoreFailed: "กู้คืนข้อมูลไม่สำเร็จ",
            showDeleted: "แสดงรายการที่ลบแล้ว",
            statusHeader: "สถานะ",
            statusActive: "ใช้งาน",
            statusDeleted: "ลบแล้ว",
            nameHeader: "Name",
            emailHeader: "Email",
          }
        : {
            section: "Broadcast",
            title: "Send Promotions via Email",
            subtitle: "View newsletter subscribers and send message/image to all or individual.",
            totalSubscribers: "Total Subscribers",
            search: "Search by name or email",
            sendMode: "Send Mode",
            openComposer: "Open Send Panel",
            closeComposer: "Hide Send Panel",
            sendAll: "Send to All",
            sendSingle: "Send Individual",
            selectTarget: "Select Target",
            subject: "Email Subject",
            headline: "Email Headline",
            message: "Promotion Message",
            imageUrl: "Promotion Image URL (optional)",
            uploadImage: "Upload Image",
            uploadingImage: "Uploading...",
            preview: "Preview",
            send: "Send Broadcast",
            sending: "Sending...",
            sent: "Sent",
            sendFailed: "Send failed",
            noData: "No newsletter subscribers yet",
            loadError: "Failed to load initial data",
            popupSendingTitle: "Sending emails...",
            popupSendingDesc: "The system is sending promotions to selected recipients.",
            popupSuccessTitle: "Sent successfully",
            popupSuccessDesc: "Broadcast emails delivered.",
            result: "Send result",
            sentCount: "Success",
            failedCount: "Failed",
            joinedAt: "Joined",
            actions: "Actions",
            edit: "Edit",
            saveEdit: "Save",
            cancelEdit: "Cancel",
            delete: "Delete",
            deleting: "Deleting...",
            deleteConfirm: "Delete this subscriber?",
            deleteConfirmTitle: "Confirm Subscriber Deletion",
            deleteConfirmDesc: "This entry will be hidden from sending (soft delete) and can be restored later.",
            hardDelete: "Delete Permanently",
            hardDeleting: "Deleting permanently...",
            hardDeleteConfirmTitle: "Confirm Permanent Deletion",
            hardDeleteConfirmDesc: "Permanent delete removes this record from the system and cannot be restored.",
            hardDeleteSuccess: "Permanent delete completed",
            hardDeleteFailed: "Permanent delete failed",
            updateSuccess: "Subscriber updated",
            updateFailed: "Update failed",
            deleteSuccess: "Subscriber deleted",
            deleteFailed: "Delete failed",
            restore: "Restore",
            restoreSuccess: "Subscriber restored",
            restoreFailed: "Restore failed",
            showDeleted: "Show deleted",
            statusHeader: "Status",
            statusActive: "Active",
            statusDeleted: "Deleted",
            nameHeader: "Name",
            emailHeader: "Email",
          },
    [locale],
  );

  const [subscribers, setSubscribers] = useState<Subscriber[]>(initialSubscribers);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [mode, setMode] = useState<SendMode>("all");
  const [targetSubscriberId, setTargetSubscriberId] = useState<string>(initialSubscribers[0]?.id ?? "");
  const [subject, setSubject] = useState("โปรโมชันพิเศษจาก Kittisap ATV");
  const [headline, setHeadline] = useState("โปรโมชั่นใหม่ล่าสุด");
  const [message, setMessage] = useState("อัปเดตส่วนลดและข้อเสนอใหม่จากเรา ขอบคุณที่ติดตามข่าวสารกับ Kittisap ATV");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isHardDeletingId, setIsHardDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingHardDeleteId, setPendingHardDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [status, setStatus] = useState<{ tone: "idle" | "success" | "error"; message: string | null }>({
    tone: bootstrapError ? "error" : "idle",
    message: bootstrapError ? `${text.loadError}: ${bootstrapError}` : null,
  });
  const [result, setResult] = useState<{ sentCount: number; failedCount: number } | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const filteredSubscribers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((item) => item.fullName.toLowerCase().includes(q) || item.email.toLowerCase().includes(q));
  }, [search, subscribers]);

  const selectableSubscribers = useMemo(() => subscribers.filter((item) => item.isActive), [subscribers]);

  async function refreshSubscribers(nextIncludeInactive = includeInactive) {
    const response = await fetch(`/api/admin/broadcast/subscribers?includeInactive=${nextIncludeInactive ? "1" : "0"}`, {
      cache: "no-store",
    });
    const resultJson = (await response.json()) as { ok: boolean; data?: Subscriber[]; error?: string };
    if (!response.ok || !resultJson.ok || !resultJson.data) {
      throw new Error(resultJson.error || "Failed to load subscribers");
    }

    setSubscribers(resultJson.data);

    const activeRows = resultJson.data.filter((item) => item.isActive);
    if (activeRows.length === 0) {
      setTargetSubscriberId("");
      return;
    }

    const stillExists = activeRows.some((item) => item.id === targetSubscriberId);
    if (!stillExists) {
      setTargetSubscriberId(activeRows[0].id);
    }
  }

  function startEdit(item: Subscriber) {
    setEditingId(item.id);
    setEditName(item.fullName);
    setEditEmail(item.email);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditEmail("");
  }

  async function saveEdit(id: string) {
    setStatus({ tone: "idle", message: null });
    try {
      const response = await fetch(`/api/admin/broadcast/subscribers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ fullName: editName, email: editEmail }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || text.updateFailed);
      }

      await refreshSubscribers();
      setStatus({ tone: "success", message: text.updateSuccess });
      cancelEdit();
    } catch (error) {
      setStatus({ tone: "error", message: `${text.updateFailed}: ${error instanceof Error ? error.message : "Unknown error"}` });
    }
  }

  async function removeSubscriber(id: string) {
    setIsDeletingId(id);
    setStatus({ tone: "idle", message: null });
    try {
      const response = await fetch(`/api/admin/broadcast/subscribers/${id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || text.deleteFailed);
      }

      await refreshSubscribers();
      if (editingId === id) {
        cancelEdit();
      }
      setStatus({ tone: "success", message: text.deleteSuccess });
    } catch (error) {
      setStatus({ tone: "error", message: `${text.deleteFailed}: ${error instanceof Error ? error.message : "Unknown error"}` });
    } finally {
      setIsDeletingId(null);
      setPendingDeleteId(null);
    }
  }

  async function restoreSubscriber(id: string) {
    setStatus({ tone: "idle", message: null });
    try {
      const response = await fetch(`/api/admin/broadcast/subscribers/${id}`, {
        method: "POST",
        cache: "no-store",
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || text.restoreFailed);
      }

      await refreshSubscribers();
      setStatus({ tone: "success", message: text.restoreSuccess });
    } catch (error) {
      setStatus({ tone: "error", message: `${text.restoreFailed}: ${error instanceof Error ? error.message : "Unknown error"}` });
    }
  }

  async function hardDeleteSubscriber(id: string) {
    setIsHardDeletingId(id);
    setStatus({ tone: "idle", message: null });
    try {
      const response = await fetch(`/api/admin/broadcast/subscribers/${id}?mode=hard`, {
        method: "DELETE",
        cache: "no-store",
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || text.hardDeleteFailed);
      }

      await refreshSubscribers();
      if (editingId === id) {
        cancelEdit();
      }
      setStatus({ tone: "success", message: text.hardDeleteSuccess });
    } catch (error) {
      setStatus({ tone: "error", message: `${text.hardDeleteFailed}: ${error instanceof Error ? error.message : "Unknown error"}` });
    } finally {
      setIsHardDeletingId(null);
      setPendingHardDeleteId(null);
    }
  }

  async function handleUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/upload/banner-image", { method: "POST", body: form });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Upload failed");
      }
      setImageUrl(payload.url);
    } catch (error) {
      setStatus({
        tone: "error",
        message: `${text.sendFailed}: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ tone: "idle", message: null });
    setResult(null);
    setIsSending(true);
    try {
      const response = await fetch("/api/admin/broadcast/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          mode,
          targetSubscriberId: mode === "single" ? targetSubscriberId : undefined,
          subject,
          headline,
          message,
          imageUrl,
        }),
      });
      const payload = (await response.json()) as SendResponse;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error || text.sendFailed);
      }
      setResult({ sentCount: payload.data.sentCount, failedCount: payload.data.failedCount });
      setStatus({ tone: "success", message: text.sent });
      setShowSuccessPopup(true);
      window.setTimeout(() => setShowSuccessPopup(false), 1200);
      await refreshSubscribers();
    } catch (error) {
      setStatus({
        tone: "error",
        message: `${text.sendFailed}: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="sst-card-soft rounded-3xl p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-blue-600">{text.section}</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{text.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{text.subtitle}</p>
      </header>

      <div className={`grid gap-4 ${isComposerOpen ? "xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]" : "grid-cols-1"}`}>
        <section className="sst-card-soft rounded-2xl p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">{text.totalSubscribers}: {subscribers.length}</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsComposerOpen((prev) => !prev)}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                {isComposerOpen ? text.closeComposer : text.openComposer}
              </button>
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setIncludeInactive(checked);
                    void refreshSubscribers(checked);
                  }}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>{text.showDeleted}</span>
              </label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={text.search}
                className="input-base max-w-[280px]"
              />
            </div>
          </div>

          {filteredSubscribers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{text.noData}</div>
          ) : (
            <div className="max-h-[560px] overflow-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">{text.nameHeader}</th>
                    <th className="px-3 py-2">{text.emailHeader}</th>
                    <th className="px-3 py-2">{text.statusHeader}</th>
                    <th className="px-3 py-2">{text.joinedAt}</th>
                    <th className="px-3 py-2">{text.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscribers.map((item) => {
                    const isEditing = editingId === item.id;
                    return (
                      <tr key={item.id} className={`border-t border-slate-100 ${targetSubscriberId === item.id ? "bg-blue-50/60" : ""} ${item.isActive ? "" : "bg-slate-50/60"}`}>
                        <td className="px-3 py-2 font-semibold text-slate-700">
                          {isEditing && item.isActive ? (
                            <input value={editName} onChange={(event) => setEditName(event.target.value)} className="input-base h-9" maxLength={120} />
                          ) : (
                            item.fullName
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {isEditing && item.isActive ? (
                            <input value={editEmail} onChange={(event) => setEditEmail(event.target.value)} className="input-base h-9" maxLength={160} />
                          ) : (
                            item.email
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {item.isActive ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{text.statusActive}</span>
                          ) : (
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">{text.statusDeleted}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{new Date(item.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {isEditing && item.isActive ? (
                              <>
                                <button type="button" onClick={() => void saveEdit(item.id)} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{text.saveEdit}</button>
                                <button type="button" onClick={cancelEdit} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">{text.cancelEdit}</button>
                              </>
                            ) : (
                              <>
                                {item.isActive ? (
                                  <>
                                    <button type="button" onClick={() => startEdit(item)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">{text.edit}</button>
                                    <button type="button" disabled={isDeletingId === item.id} onClick={() => setPendingDeleteId(item.id)} className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60">{isDeletingId === item.id ? text.deleting : text.delete}</button>
                                  </>
                                ) : (
                                  <>
                                    <button type="button" onClick={() => void restoreSubscriber(item.id)} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{text.restore}</button>
                                    <button type="button" disabled={isHardDeletingId === item.id} onClick={() => setPendingHardDeleteId(item.id)} className="rounded-md border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60">{isHardDeletingId === item.id ? text.hardDeleting : text.hardDelete}</button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {isComposerOpen ? (
        <form onSubmit={handleSubmit} className="sst-card-soft space-y-4 rounded-2xl p-4">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>{text.sendMode}</span>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMode("all")} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${mode === "all" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700"}`}>{text.sendAll}</button>
              <button type="button" onClick={() => setMode("single")} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${mode === "single" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700"}`}>{text.sendSingle}</button>
            </div>
          </label>

          {mode === "single" ? (
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>{text.selectTarget}</span>
              <select value={targetSubscriberId} onChange={(event) => setTargetSubscriberId(event.target.value)} className="input-base">
                {selectableSubscribers.map((item) => (
                  <option key={item.id} value={item.id}>{item.fullName} ({item.email})</option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>{text.subject}</span>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} className="input-base" maxLength={160} required />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>{text.headline}</span>
            <input value={headline} onChange={(event) => setHeadline(event.target.value)} className="input-base" maxLength={160} required />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>{text.message}</span>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} className="input-base min-h-[120px] resize-y" maxLength={4000} required />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>{text.imageUrl}</span>
            <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} className="input-base" placeholder="https://..." />
            <div className="mt-1">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                {uploadingImage ? text.uploadingImage : text.uploadImage}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={(event) => void handleUpload(event.target.files)} />
              </label>
            </div>
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{text.preview}</p>
            <p className="mt-2 text-base font-bold text-slate-900">{headline}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{message}</p>
            {imageUrl ? <img src={imageUrl} alt="Preview" className="mt-3 w-full rounded-lg border border-slate-200 object-cover" /> : null}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className={`text-sm ${status.tone === "error" ? "text-rose-600" : status.tone === "success" ? "text-emerald-600" : "text-slate-500"}`}>{status.message}</p>
            <button type="submit" disabled={isSending} className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {isSending ? text.sending : text.send}
            </button>
          </div>

          {result ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <p className="font-semibold">{text.result}</p>
              <p>{text.sentCount}: {result.sentCount}</p>
              <p>{text.failedCount}: {result.failedCount}</p>
            </div>
          ) : null}
        </form>
        ) : null}
      </div>

      {(isSending || showSuccessPopup) ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${isSending ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"}`}>
                {isSending ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 animate-spin" aria-hidden>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
                    <path d="M20 7L9 18l-5-5" />
                  </svg>
                )}
              </span>
              <div>
                <p className="text-base font-bold text-slate-900">{isSending ? text.popupSendingTitle : text.popupSuccessTitle}</p>
                <p className="text-sm text-slate-600">{isSending ? text.popupSendingDesc : text.popupSuccessDesc}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={pendingDeleteId !== null}
        title={text.deleteConfirmTitle}
        message={text.deleteConfirmDesc}
        confirmText={isDeletingId ? text.deleting : text.delete}
        cancelText={text.cancelEdit}
        confirmDisabled={Boolean(isDeletingId)}
        onCancel={() => {
          if (!isDeletingId) setPendingDeleteId(null);
        }}
        onConfirm={() => {
          if (pendingDeleteId) {
            void removeSubscriber(pendingDeleteId);
          }
        }}
      >
        <p className="rounded-xl border border-rose-200/70 bg-rose-50/70 px-3 py-2 text-xs font-semibold text-rose-700">
          {text.deleteConfirm}
        </p>
      </ConfirmModal>

      <ConfirmModal
        open={pendingHardDeleteId !== null}
        title={text.hardDeleteConfirmTitle}
        message={text.hardDeleteConfirmDesc}
        confirmText={isHardDeletingId ? text.hardDeleting : text.hardDelete}
        cancelText={text.cancelEdit}
        confirmDisabled={Boolean(isHardDeletingId)}
        onCancel={() => {
          if (!isHardDeletingId) setPendingHardDeleteId(null);
        }}
        onConfirm={() => {
          if (pendingHardDeleteId) {
            void hardDeleteSubscriber(pendingHardDeleteId);
          }
        }}
      >
        <p className="rounded-xl border border-rose-200/70 bg-rose-50/70 px-3 py-2 text-xs font-semibold text-rose-700">
          {text.hardDeleteConfirmDesc}
        </p>
      </ConfirmModal>
    </section>
  );
}
