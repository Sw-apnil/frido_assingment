'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

type Status = 'OPEN' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
type Reason = 'DAMAGED' | 'WRONG_ITEM' | 'SIZE_ISSUE' | 'NOT_AS_DESCRIBED' | 'CHANGED_MIND';
type Resolution = 'REFUND' | 'REPLACEMENT' | 'STORE_CREDIT';

interface NoteItem {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

interface ReturnRequestItem {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  itemName: string;
  itemVariant: string | null;
  units: number;
  reason: Reason;
  status: Status;
  resolution: Resolution | null;
  refundAmount: string | number | null;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
  notes: NoteItem[];
}

const statusDisplay: Record<Status, { label: string; badgeClass: string; dotClass: string }> = {
  OPEN: { label: 'Open', badgeClass: 'bg-[#f6ebd7] text-[#87500b] border-[#ebd4b0]', dotClass: 'bg-[#b8761a]' },
  IN_REVIEW: { label: 'In review', badgeClass: 'bg-[#e5ecf1] text-[#344d62] border-[#ccd8e3]', dotClass: 'bg-[#4b6d8b]' },
  APPROVED: { label: 'Approved', badgeClass: 'bg-[#e2f1e2] text-[#205b36] border-[#c4e3c4]', dotClass: 'bg-[#2e7d4c]' },
  REJECTED: { label: 'Rejected', badgeClass: 'bg-[#f7dfd7] text-[#933d28] border-[#f0c3b5]', dotClass: 'bg-[#bf4f35]' },
  COMPLETED: { label: 'Completed', badgeClass: 'bg-[#e3f0e3] text-[#205b36] border-[#c5e4c5]', dotClass: 'bg-[#2e7d4c]' }
};

const reasonDisplay: Record<Reason, string> = {
  DAMAGED: 'Damaged',
  WRONG_ITEM: 'Wrong Item',
  SIZE_ISSUE: 'Size Issue',
  NOT_AS_DESCRIBED: 'Not As Described',
  CHANGED_MIND: 'Changed Mind'
};

const resolutionDisplay: Record<Resolution, string> = {
  REFUND: 'Refund',
  REPLACEMENT: 'Replacement',
  STORE_CREDIT: 'Store Credit'
};

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    box: <><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/></>,
    chart: <><path d="M4 19V5M4 19h16"/><path d="m7 15 3-4 3 2 5-7"/></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 22h4"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    note: <><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    check: <path d="M20 6 9 17l-5-5"/>,
    alert: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    refresh: <><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></>
  };
  return <svg {...props}>{paths[name] || null}</svg>;
}

export default function Home() {
  const [requests, setRequests] = useState<ReturnRequestItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  // Filters & Pagination
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Status>('ALL');
  const [reasonFilter, setReasonFilter] = useState<'ALL' | Reason>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail panel mobile visibility
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Note entry
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Approval modal / state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalResolution, setApprovalResolution] = useState<Resolution>('REFUND');
  const [approvalRefundAmount, setApprovalRefundAmount] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Create Request Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    customerName: '',
    customerEmail: '',
    orderNumber: '',
    itemName: '',
    itemVariant: '',
    units: 1,
    reason: 'DAMAGED' as Reason,
    initialNote: ''
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Edit Request Details Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerEmail: '',
    orderNumber: '',
    itemName: '',
    itemVariant: '',
    units: 1,
    reason: 'DAMAGED' as Reason
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  // Search input debounce (350ms delay) to prevent firing on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch requests from Server API
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setServerError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '10',
        sort: sortOrder
      });

      if (debouncedQuery) params.set('q', debouncedQuery);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (reasonFilter !== 'ALL') params.set('reason', reasonFilter);

      const response = await fetch(`/api/requests?${params.toString()}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with HTTP ${response.status}`);
      }

      const data = await response.json();
      setRequests(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);

      // Keep selected request in sync or select first
      if (data.items && data.items.length > 0) {
        setSelectedRequest((current) => {
          if (!current) return data.items[0];
          const found = data.items.find((item: ReturnRequestItem) => item.id === current.id);
          return found || data.items[0];
        });
      } else {
        setSelectedRequest(null);
      }
    } catch (err: any) {
      console.error('Fetch requests error:', err);
      setServerError(err.message || 'Failed to load requests from server.');
    } finally {
      setLoading(false);
    }
  }, [page, sortOrder, debouncedQuery, statusFilter, reasonFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Fetch full details of single request
  const fetchSingleRequest = async (id: string) => {
    try {
      const response = await fetch(`/api/requests/${id}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch request details.');
      }
      const data = await response.json();
      setSelectedRequest(data);
      // update in list if present
      setRequests((prev) => prev.map((item) => (item.id === data.id ? data : item)));
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !newNote.trim()) return;

    setIsAddingNote(true);
    try {
      const response = await fetch(`/api/requests/${selectedRequest.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newNote.trim(), authorName: 'Jordan Singh' })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'The server could not record the note.');
      }

      setNewNote('');
      showToast('Note added to timeline.', 'success');
      // refresh request to get new notes in order
      await fetchSingleRequest(selectedRequest.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsAddingNote(false);
    }
  };

  // Status transitions
  const handleTransition = async (nextStatus: Status) => {
    if (!selectedRequest) return;

    if (nextStatus === 'APPROVED') {
      setApprovalResolution(selectedRequest.resolution || 'REFUND');
      setApprovalRefundAmount(selectedRequest.refundAmount ? String(selectedRequest.refundAmount) : '');
      setShowApprovalModal(true);
      return;
    }

    try {
      const response = await fetch(`/api/requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Status transition refused by server.');
      }

      showToast(`Request transitioned to ${statusDisplay[nextStatus].label}.`, 'success');
      await fetchRequests();
      await fetchSingleRequest(selectedRequest.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Approve request with resolution
  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setIsSubmittingApproval(true);
    try {
      const payload: any = {
        status: 'APPROVED',
        resolution: approvalResolution
      };

      if (approvalResolution === 'REFUND') {
        const amt = parseFloat(approvalRefundAmount);
        if (isNaN(amt) || amt <= 0) {
          throw new Error('Please enter a valid refund amount greater than 0.');
        }
        payload.refundAmount = amt;
      } else {
        payload.refundAmount = null;
      }

      const response = await fetch(`/api/requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Approval refused by server.');
      }

      setShowApprovalModal(false);
      showToast('Request approved with resolution.', 'success');
      await fetchRequests();
      await fetchSingleRequest(selectedRequest.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Remove request from desk (soft delete)
  const handleRemoveRequest = async () => {
    if (!selectedRequest) return;
    const confirmRemove = window.confirm(`Remove request ${selectedRequest.reference} from the desk? The record will remain archived in the database.`);
    if (!confirmRemove) return;

    try {
      const response = await fetch(`/api/requests/${selectedRequest.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Server refused request removal.');
      }

      showToast(`Request ${selectedRequest.reference} removed from desk.`, 'info');
      setMobileDetailOpen(false);
      await fetchRequests();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Create new request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server could not create the return request.');
      }

      setShowCreateModal(false);
      setCreateForm({
        customerName: '',
        customerEmail: '',
        orderNumber: '',
        itemName: '',
        itemVariant: '',
        units: 1,
        reason: 'DAMAGED',
        initialNote: ''
      });
      showToast(`Request ${data.reference} created successfully.`, 'success');
      setPage(1);
      await fetchRequests();
      setSelectedRequest(data);
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Open edit modal with current request data
  const openEditModal = () => {
    if (!selectedRequest) return;
    setEditForm({
      customerName: selectedRequest.customerName,
      customerEmail: selectedRequest.customerEmail,
      orderNumber: selectedRequest.orderNumber,
      itemName: selectedRequest.itemName,
      itemVariant: selectedRequest.itemVariant || '',
      units: selectedRequest.units || 1,
      reason: selectedRequest.reason
    });
    setEditError(null);
    setShowEditModal(true);
  };

  // Save edited request details
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setEditError(null);
    setIsEditing(true);

    try {
      const response = await fetch(`/api/requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server refused updating request details.');
      }

      setShowEditModal(false);
      showToast('Request details updated.', 'success');
      await fetchRequests();
      await fetchSingleRequest(selectedRequest.id);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setIsEditing(false);
    }
  };

  const isDecided = selectedRequest ? ['APPROVED', 'REJECTED', 'COMPLETED'].includes(selectedRequest.status) : false;

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      {/* Toast Notification */}
      {toast && (
        <div
          role="alert"
          onClick={() => setToast(null)}
          className={`fixed bottom-6 left-1/2 z-50 flex max-w-md -translate-x-1/2 cursor-pointer items-center gap-3 rounded-md px-4 py-3 text-[13px] font-medium shadow-2xl transition-all ${
            toast.type === 'error'
              ? 'bg-[#8f2b1d] text-white border border-[#b84332]'
              : toast.type === 'success'
              ? 'bg-[#1b4e2d] text-white border border-[#2d7748]'
              : 'bg-[#1c1c1b] text-white'
          }`}
        >
          <Icon name={toast.type === 'error' ? 'alert' : toast.type === 'success' ? 'check' : 'note'} size={18} />
          <span className="flex-1">{toast.message}</span>
          <button aria-label="Dismiss toast" className="opacity-75 hover:opacity-100">
            <Icon name="close" size={15} />
          </button>
        </div>
      )}

      {/* Desktop Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 hidden w-[240px] flex-col border-r hairline bg-[var(--surface)] lg:flex">
        <div className="px-6 pt-7">
          <div className="serif text-[30px] font-normal leading-none tracking-[-.04em]">ReturnDesk</div>
          <div className="mt-2 text-[10px] font-semibold uppercase tracking-[.22em] text-[var(--muted)]">Returns Operations</div>
        </div>

        <nav className="mt-10 px-3">
          <div className="flex w-full items-center gap-3 rounded-[5px] bg-[#f4eadb] px-3.5 py-2.5 text-[13px] font-semibold text-[#73430b]">
            <Icon name="box" size={18} />
            <span className="flex-1">Desk Queue</span>
            <span className="rounded-full bg-[#ebd7ba] px-2 py-0.5 text-[11px] font-bold">{totalCount}</span>
          </div>
        </nav>

        <div className="mt-auto border-t hairline p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[5px] bg-[#e7e3d7] font-serif text-lg font-bold">B</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-bold">Brooklane Goods</div>
              <div className="truncate text-[11px] text-[var(--muted)]">Small Home · Calmer Life</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="min-h-screen lg:ml-[240px]">
        {/* Top Header */}
        <header className="flex h-[68px] items-center justify-between border-b hairline bg-[var(--surface)] px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="serif text-[26px] lg:hidden">ReturnDesk</div>
            <span className="hidden text-[12px] font-medium text-[var(--muted)] sm:inline">Returns Operations Desk</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="focus-ring flex h-9 items-center gap-2 rounded-[4px] bg-[var(--ink)] px-3 text-[12px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              <Icon name="plus" size={14} /> New Request
            </button>
            <div className="h-4 w-px bg-[var(--line)]" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5e1d7] text-[12px] font-bold">JS</div>
              <div className="hidden sm:block">
                <div className="text-[12px] font-semibold">Jordan Singh</div>
                <div className="text-[10px] text-[var(--muted)]">Support Agent</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Split: Desk List + Detail Sidebar */}
        <div className="flex min-h-[calc(100vh-68px)]">
          {/* Desk List Section */}
          <div className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="serif text-[38px] leading-[1.0] tracking-[-.04em] sm:text-[46px]">Return Requests</h1>
                <p className="mt-2 text-[13px] text-[var(--muted)]">
                  Server-queried return operations. <span className="font-semibold text-[var(--ink)]">{totalCount} active requests</span> in database.
                </p>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12">
              <div className="relative sm:col-span-2 md:col-span-2 lg:col-span-5">
                <span className="pointer-events-none absolute left-3 top-3 text-[var(--muted)]">
                  <Icon name="search" size={16} />
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search customer, order, reference, item..."
                  className="focus-ring h-10 w-full rounded-[4px] border hairline bg-[var(--surface)] pl-9 pr-3 text-[12px] outline-none placeholder:text-[#99978f]"
                />
              </div>

              <div className="lg:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setPage(1);
                  }}
                  className="focus-ring h-10 w-full rounded-[4px] border hairline bg-[var(--surface)] px-2.5 text-[12px] outline-none"
                >
                  <option value="ALL">All statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_REVIEW">In review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={reasonFilter}
                  onChange={(e) => {
                    setReasonFilter(e.target.value as any);
                    setPage(1);
                  }}
                  className="focus-ring h-10 w-full rounded-[4px] border hairline bg-[var(--surface)] px-2.5 text-[12px] outline-none"
                >
                  <option value="ALL">All reasons</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="WRONG_ITEM">Wrong Item</option>
                  <option value="SIZE_ISSUE">Size Issue</option>
                  <option value="NOT_AS_DESCRIBED">Not As Described</option>
                  <option value="CHANGED_MIND">Changed Mind</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value as any);
                    setPage(1);
                  }}
                  className="focus-ring h-10 w-full rounded-[4px] border hairline bg-[var(--surface)] px-2.5 text-[12px] outline-none"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
            </div>

            {/* Server Error State */}
            {serverError && (
              <div className="mb-6 rounded-[5px] border border-[#d97c6c] bg-[#faebe8] p-4 text-[#8a2414]">
                <div className="flex items-center gap-2 font-semibold text-[13px]">
                  <Icon name="alert" size={17} /> Server Query Failed
                </div>
                <p className="mt-1 text-[12px] leading-relaxed">{serverError}</p>
                <button
                  onClick={() => fetchRequests()}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-[4px] bg-[#8a2414] px-3 py-1.5 text-[11px] font-semibold text-white"
                >
                  <Icon name="refresh" size={13} /> Retry Query
                </button>
              </div>
            )}

            {/* Requests Table */}
            <div className="overflow-x-auto rounded-[5px] border hairline bg-[var(--surface)] shadow-xs">
              <div className="min-w-[760px]">
                {/* Table Header */}
                <div className="grid grid-cols-[1.2fr_1.6fr_1.8fr_1.1fr_1.1fr_40px] items-center border-b hairline bg-[#f5f3ec] px-4 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-[var(--muted)]">
                  <span>Reference</span>
                  <span>Customer & Order</span>
                  <span>Item & Qty</span>
                  <span>Reason</span>
                  <span>Status</span>
                  <span />
                </div>

                {/* Loading State */}
                {loading ? (
                  <div className="divide-y hairline">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="flex animate-pulse items-center gap-4 px-4 py-4">
                        <div className="h-4 w-20 rounded bg-[#e8e5dc]" />
                        <div className="h-4 w-40 rounded bg-[#e8e5dc]" />
                        <div className="h-4 w-48 rounded bg-[#e8e5dc]" />
                        <div className="h-4 w-24 rounded bg-[#e8e5dc]" />
                        <div className="h-5 w-16 rounded-full bg-[#e8e5dc]" />
                      </div>
                    ))}
                  </div>
                ) : requests.length === 0 ? (
                  /* Empty State */
                  <div className="px-6 py-20 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eee9dc] text-[var(--muted)]">
                      <Icon name="box" size={24} />
                    </div>
                    <div className="serif mt-3 text-[26px]">No requests found</div>
                    <p className="mx-auto mt-1 max-w-sm text-[13px] text-[var(--muted)]">
                      {debouncedQuery || statusFilter !== 'ALL' || reasonFilter !== 'ALL'
                        ? 'No return requests matched your active search or filters. Try adjusting your query.'
                        : 'There are currently no return requests on the desk. You can raise a new one above.'}
                    </p>
                    {(debouncedQuery || statusFilter !== 'ALL' || reasonFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setQuery('');
                          setDebouncedQuery('');
                          setStatusFilter('ALL');
                          setReasonFilter('ALL');
                          setPage(1);
                        }}
                        className="mt-4 rounded-[4px] border hairline bg-white px-3 py-1.5 text-[11px] font-semibold text-[var(--ink)] shadow-xs"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  /* Request Rows */
                  <div className="divide-y hairline">
                    {requests.map((r) => {
                      const isSelected = selectedRequest?.id === r.id;
                      const statusInfo = statusDisplay[r.status];
                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedRequest(r);
                            setMobileDetailOpen(true);
                          }}
                          className={`focus-ring grid w-full grid-cols-[1.2fr_1.6fr_1.8fr_1.1fr_1.1fr_40px] items-center px-4 py-3.5 text-left transition-colors hover:bg-[#f6f2ea] ${
                            isSelected ? 'bg-[#f7f0e2]' : ''
                          }`}
                        >
                          {/* Reference */}
                          <div className="min-w-0 pr-2">
                            <span className="mono text-[12px] font-semibold text-[var(--ink)]">{r.reference}</span>
                            <span className="block text-[10px] text-[var(--muted)]">{formatRelativeTime(r.createdAt)}</span>
                          </div>

                          {/* Customer & Order */}
                          <div className="min-w-0 pr-2">
                            <span className="block truncate text-[12px] font-semibold text-[var(--ink)]">{r.customerName}</span>
                            <span className="block truncate text-[11px] text-[var(--muted)]">
                              {r.orderNumber} · {r.customerEmail}
                            </span>
                          </div>

                          {/* Item & Qty */}
                          <div className="min-w-0 pr-2">
                            <span className="block truncate text-[12px] font-medium text-[var(--ink)]">{r.itemName}</span>
                            <span className="block truncate text-[11px] text-[var(--muted)]">
                              Qty {r.units || 1} {r.itemVariant ? `· ${r.itemVariant}` : ''}
                            </span>
                          </div>

                          {/* Reason */}
                          <div className="min-w-0 pr-2">
                            <span className="truncate text-[12px] text-[#4d4c45]">{reasonDisplay[r.reason] || r.reason}</span>
                          </div>

                          {/* Status Badge */}
                          <div>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusInfo.badgeClass}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
                              {statusInfo.label}
                            </span>
                          </div>

                          {/* Chevron */}
                          <div className="text-right text-[var(--muted)]">
                            <Icon name="chevron" size={16} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--muted)]">
              <span>
                Showing {requests.length > 0 ? (page - 1) * 10 + 1 : 0}–{Math.min(page * 10, totalCount)} of {totalCount} requests
              </span>
              <div className="flex items-center gap-3">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-[4px] border hairline bg-[var(--surface)] px-3 py-1 font-semibold text-[var(--ink)] shadow-2xs transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>
                <span>
                  Page <span className="font-semibold text-[var(--ink)]">{page}</span> of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-[4px] border hairline bg-[var(--surface)] px-3 py-1 font-semibold text-[var(--ink)] shadow-2xs transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* Request Detail Panel (Desktop Drawer / Mobile Full-Screen Overlay) */}
          {selectedRequest && (
            <aside
              className={`detail-panel w-full shrink-0 border-l hairline bg-[var(--surface)] md:w-[420px] ${
                mobileDetailOpen ? 'block' : 'hidden lg:block'
              }`}
            >
              {/* Detail Header */}
              <div className="flex h-[68px] items-center justify-between border-b hairline px-5">
                <div>
                  <div className="mono text-[19px] font-bold text-[var(--ink)]">{selectedRequest.reference}</div>
                  <div className="text-[11px] text-[var(--muted)]">
                    Created {new Date(selectedRequest.createdAt).toLocaleDateString()} · {formatRelativeTime(selectedRequest.createdAt)}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!isDecided && (
                    <button
                      onClick={openEditModal}
                      title="Edit request details"
                      className="focus-ring flex items-center gap-1 rounded-[4px] border hairline px-2.5 py-1 text-[11px] font-semibold text-[var(--ink)] hover:bg-[#ede8dc]"
                    >
                      <Icon name="edit" size={13} /> Edit
                    </button>
                  )}
                  <button
                    onClick={() => setMobileDetailOpen(false)}
                    className="focus-ring rounded p-1 text-[var(--muted)] hover:text-[var(--ink)] lg:hidden"
                  >
                    <Icon name="close" size={20} />
                  </button>
                </div>
              </div>

              {/* Detail Scrollable Body */}
              <div className="scrollbar h-[calc(100vh-136px)] overflow-y-auto px-5 py-5 space-y-5">
                {/* Status & Lifecycle Indicator */}
                <div className="rounded-[5px] border hairline bg-[#f7f5ed] p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[.13em] text-[var(--muted)]">Status Lifecycle</span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                        statusDisplay[selectedRequest.status].badgeClass
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDisplay[selectedRequest.status].dotClass}`} />
                      {statusDisplay[selectedRequest.status].label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10px] font-semibold text-[var(--muted)]">
                    <span className={selectedRequest.status === 'OPEN' ? 'text-[var(--ink)] font-bold' : ''}>1. Open</span>
                    <span>→</span>
                    <span className={selectedRequest.status === 'IN_REVIEW' ? 'text-[var(--ink)] font-bold' : ''}>2. In Review</span>
                    <span>→</span>
                    <span
                      className={
                        selectedRequest.status === 'APPROVED' || selectedRequest.status === 'REJECTED'
                          ? 'text-[var(--ink)] font-bold'
                          : ''
                      }
                    >
                      3. Decision
                    </span>
                    <span>→</span>
                    <span className={selectedRequest.status === 'COMPLETED' ? 'text-[var(--ink)] font-bold' : ''}>4. Completed</span>
                  </div>

                  {/* Resolution banner if Approved or Completed */}
                  {selectedRequest.resolution && (
                    <div className="mt-3 border-t hairline pt-2.5 text-[11px]">
                      <span className="font-semibold text-[var(--ink)]">Resolution:</span>{' '}
                      <span className="text-[#205b36] font-medium">{resolutionDisplay[selectedRequest.resolution]}</span>
                      {selectedRequest.resolution === 'REFUND' && selectedRequest.refundAmount && (
                        <span className="ml-2 font-bold text-[#205b36]">(${Number(selectedRequest.refundAmount).toFixed(2)})</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Customer & Order Card */}
                <div className="grid grid-cols-2 gap-4 border-b hairline pb-5">
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[.13em] text-[var(--muted)]">Customer</div>
                    <div className="text-[13px] font-bold text-[var(--ink)]">{selectedRequest.customerName}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)] truncate">{selectedRequest.customerEmail}</div>
                  </div>
                  <div className="border-l hairline pl-4">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[.13em] text-[var(--muted)]">Order</div>
                    <div className="text-[13px] font-bold text-[var(--ink)]">{selectedRequest.orderNumber}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">Online Store</div>
                  </div>
                </div>

                {/* Item Details */}
                <div className="border-b hairline pb-5">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[.13em] text-[var(--muted)]">Item Details</div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[5px] bg-[#ece7dc] text-2xl">
                      📦
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-[var(--ink)]">{selectedRequest.itemName}</div>
                      {selectedRequest.itemVariant && (
                        <div className="mt-0.5 text-[11px] text-[var(--muted)]">{selectedRequest.itemVariant}</div>
                      )}
                      <div className="mt-1 text-[11px] font-semibold text-[#54524c]">
                        Units to return: <span className="font-bold text-[var(--ink)]">{selectedRequest.units || 1}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Return Reason */}
                <div className="border-b hairline pb-5">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-[.13em] text-[var(--muted)]">Return Reason</div>
                  <div className="text-[13px] font-bold text-[var(--ink)]">
                    {reasonDisplay[selectedRequest.reason] || selectedRequest.reason}
                  </div>
                </div>

                {/* Legal Action Controls based on current state */}
                <div className="rounded-[5px] border hairline bg-[#fbfaf8] p-4">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[.13em] text-[var(--muted)]">
                    Available Lifecycle Actions
                  </div>

                  {/* 1. If OPEN: Legal action is 'Start Review' or 'Remove request' */}
                  {selectedRequest.status === 'OPEN' && (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleTransition('IN_REVIEW')}
                        className="focus-ring flex h-10 w-full items-center justify-center rounded-[4px] bg-[#2a2926] text-[12px] font-bold text-white shadow-xs transition-opacity hover:opacity-90"
                      >
                        Start Review
                      </button>
                      <button
                        onClick={handleRemoveRequest}
                        className="focus-ring flex h-9 w-full items-center justify-center gap-1.5 rounded-[4px] border border-[#d98b79] bg-transparent text-[11px] font-semibold text-[#963721] hover:bg-[#faeae6]"
                      >
                        <Icon name="trash" size={13} /> Remove Request From Desk
                      </button>
                    </div>
                  )}

                  {/* 2. If IN_REVIEW: Legal actions are 'Approve' (needs resolution) or 'Reject'. Removal is NOT allowed. */}
                  {selectedRequest.status === 'IN_REVIEW' && (
                    <div className="space-y-2.5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTransition('APPROVED')}
                          className="focus-ring flex h-10 flex-1 items-center justify-center rounded-[4px] bg-[#1f5f37] text-[12px] font-bold text-white shadow-xs transition-opacity hover:opacity-90"
                        >
                          Approve Return…
                        </button>
                        <button
                          onClick={() => handleTransition('REJECTED')}
                          className="focus-ring flex h-10 flex-1 items-center justify-center rounded-[4px] border border-[#d98b79] bg-transparent text-[12px] font-semibold text-[#963721] hover:bg-[#faeae6]"
                        >
                          Reject Return
                        </button>
                      </div>
                      <p className="text-[11px] italic text-[var(--muted)]">
                        Approval requires selecting a resolution (Refund, Replacement, or Store Credit).
                      </p>
                    </div>
                  )}

                  {/* 3. If APPROVED: Legal action is 'Complete Return'. Details locked. Removal NOT allowed. */}
                  {selectedRequest.status === 'APPROVED' && (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleTransition('COMPLETED')}
                        className="focus-ring flex h-10 w-full items-center justify-center rounded-[4px] bg-[#1f5f37] text-[12px] font-bold text-white shadow-xs transition-opacity hover:opacity-90"
                      >
                        Complete Return
                      </button>
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                        <Icon name="lock" size={13} /> Details are locked once decided.
                      </div>
                    </div>
                  )}

                  {/* 4. If REJECTED: Final state. Removal IS allowed. Details locked. */}
                  {selectedRequest.status === 'REJECTED' && (
                    <div className="space-y-2.5">
                      <div className="rounded-[4px] bg-[#f9ebe6] p-2.5 text-[11px] text-[#933d28]">
                        This request is closed and rejected. Details are locked. Notes can still be recorded.
                      </div>
                      <button
                        onClick={handleRemoveRequest}
                        className="focus-ring flex h-9 w-full items-center justify-center gap-1.5 rounded-[4px] border border-[#d98b79] bg-transparent text-[11px] font-semibold text-[#963721] hover:bg-[#faeae6]"
                      >
                        <Icon name="trash" size={13} /> Remove Request From Desk
                      </button>
                    </div>
                  )}

                  {/* 5. If COMPLETED: Final state. Details locked. Removal NOT allowed. */}
                  {selectedRequest.status === 'COMPLETED' && (
                    <div className="rounded-[4px] bg-[#eef7ee] p-2.5 text-[11px] text-[#205b36]">
                      This request has been completed and closed. Details and record are permanent. Notes can still be appended.
                    </div>
                  )}
                </div>

                {/* Notes Timeline Section */}
                <div className="pt-2">
                  <div className="mb-3 flex items-center justify-between border-b hairline pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-[.13em] text-[var(--muted)]">
                      Notes Timeline ({selectedRequest.notes?.length || 0})
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">Immutable history</span>
                  </div>

                  {/* Existing Notes List */}
                  {selectedRequest.notes && selectedRequest.notes.length > 0 ? (
                    <div className="space-y-3">
                      {selectedRequest.notes.map((n) => (
                        <div key={n.id} className="rounded-[4px] border hairline bg-[#fcfbfa] p-3 shadow-2xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-[var(--ink)]">{n.authorName}</span>
                            <span className="text-[10px] text-[var(--muted)]">{formatRelativeTime(n.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-[12px] leading-relaxed text-[#4e4d46] whitespace-pre-wrap">{n.body}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[4px] border border-dashed hairline p-4 text-center text-[12px] text-[var(--muted)]">
                      No notes recorded yet on this request.
                    </div>
                  )}

                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="mt-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add an internal note..."
                        className="focus-ring h-9 min-w-0 flex-1 rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isAddingNote || !newNote.trim()}
                        className="h-9 rounded-[4px] bg-[var(--ink)] px-3.5 text-[11px] font-semibold text-white transition-opacity disabled:opacity-40"
                      >
                        {isAddingNote ? 'Saving…' : 'Add Note'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </aside>
          )}
        </div>
      </section>

      {/* Approve Request Modal (Enforcing Rule 2) */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleConfirmApproval}
            className="w-full max-w-md rounded-[6px] border hairline bg-[var(--surface)] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between border-b hairline pb-3">
              <div>
                <h2 className="serif text-[26px] font-normal leading-tight">Approve Return Request</h2>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {selectedRequest.reference} · {selectedRequest.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="focus-ring rounded p-1 text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Resolution Type <span className="text-red-600">*</span>
                </label>
                <select
                  value={approvalResolution}
                  onChange={(e) => setApprovalResolution(e.target.value as Resolution)}
                  className="focus-ring mt-1.5 h-10 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                >
                  <option value="REFUND">Refund</option>
                  <option value="REPLACEMENT">Replacement</option>
                  <option value="STORE_CREDIT">Store Credit</option>
                </select>
              </div>

              {approvalResolution === 'REFUND' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                    Refund Amount ($) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={approvalRefundAmount}
                    onChange={(e) => setApprovalRefundAmount(e.target.value)}
                    placeholder="e.g. 45.00"
                    className="focus-ring mt-1.5 h-10 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                  />
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    Server rule: A refund amount strictly greater than zero is required.
                  </p>
                </div>
              )}

              {approvalResolution !== 'REFUND' && (
                <div className="rounded-[4px] bg-[#f5f3ec] p-3 text-[11px] text-[var(--muted)]">
                  Server rule: If the resolution is not Refund, no refund amount may be recorded.
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2.5 border-t hairline pt-4">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="h-9 rounded-[4px] border hairline px-4 text-[12px] font-semibold text-[var(--ink)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingApproval}
                className="h-9 rounded-[4px] bg-[#1f5f37] px-4 text-[12px] font-semibold text-white shadow-xs disabled:opacity-40"
              >
                {isSubmittingApproval ? 'Approving…' : 'Confirm Approval'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Return Request Modal (Enforcing Rule 3 & Unique Reference) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleCreateRequest}
            className="w-full max-w-lg rounded-[6px] border hairline bg-[var(--surface)] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between border-b hairline pb-3">
              <div>
                <h2 className="serif text-[28px] font-normal leading-tight">Raise Return Request</h2>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  The system will automatically generate a unique, human-readable reference number.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="focus-ring rounded p-1 text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {createError && (
              <div className="mt-4 rounded-[4px] border border-[#d97c6c] bg-[#faebe8] p-3 text-[12px] text-[#8a2414]">
                <span className="font-bold">Error:</span> {createError}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Customer Name <span className="text-red-600">*</span>
                </label>
                <input
                  required
                  value={createForm.customerName}
                  onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                  placeholder="e.g. Priya Shah"
                  className="focus-ring mt-1 h-9 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Customer Email <span className="text-red-600">*</span>
                </label>
                <input
                  required
                  type="email"
                  value={createForm.customerEmail}
                  onChange={(e) => setCreateForm({ ...createForm, customerEmail: e.target.value })}
                  placeholder="priya@example.com"
                  className="focus-ring mt-1 h-9 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Order Number <span className="text-red-600">*</span>
                </label>
                <input
                  required
                  value={createForm.orderNumber}
                  onChange={(e) => setCreateForm({ ...createForm, orderNumber: e.target.value })}
                  placeholder="e.g. ORD-10432"
                  className="focus-ring mt-1 h-9 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Units (Quantity) <span className="text-red-600">*</span>
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={createForm.units}
                  onChange={(e) => setCreateForm({ ...createForm, units: parseInt(e.target.value, 10) || 1 })}
                  className="focus-ring mt-1 h-9 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Item Name <span className="text-red-600">*</span>
                </label>
                <input
                  required
                  value={createForm.itemName}
                  onChange={(e) => setCreateForm({ ...createForm, itemName: e.target.value })}
                  placeholder="e.g. Stoneware Ceramic Mug"
                  className="focus-ring mt-1 h-9 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Item Variant (Optional)
                </label>
                <input
                  value={createForm.itemVariant}
                  onChange={(e) => setCreateForm({ ...createForm, itemVariant: e.target.value })}
                  placeholder="e.g. Sand · Set of 2"
                  className="focus-ring mt-1 h-9 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Return Reason <span className="text-red-600">*</span>
                </label>
                <select
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value as Reason })}
                  className="focus-ring mt-1 h-9 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                >
                  <option value="DAMAGED">Damaged</option>
                  <option value="WRONG_ITEM">Wrong Item</option>
                  <option value="SIZE_ISSUE">Size Issue</option>
                  <option value="NOT_AS_DESCRIBED">Not As Described</option>
                  <option value="CHANGED_MIND">Changed Mind</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Initial Customer Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={createForm.initialNote}
                  onChange={(e) => setCreateForm({ ...createForm, initialNote: e.target.value })}
                  placeholder="Customer's comments regarding the return..."
                  className="focus-ring mt-1 w-full rounded-[4px] border hairline bg-[var(--surface)] p-2.5 text-[12px] outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5 border-t hairline pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="h-9 rounded-[4px] border hairline px-4 text-[12px] font-semibold text-[var(--ink)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="h-9 rounded-[4px] bg-[var(--ink)] px-4 text-[12px] font-semibold text-white shadow-xs disabled:opacity-40"
              >
                {isCreating ? 'Creating…' : 'Create Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Request Details Modal (Enforcing Rule 4) */}
      {showEditModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-lg rounded-[6px] border hairline bg-[var(--surface)] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between border-b hairline pb-3">
              <div>
                <h2 className="serif text-[28px] font-normal leading-tight">Edit Request Details</h2>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  Correct details for {selectedRequest.reference} while in undecided status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="focus-ring rounded p-1 text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {editError && (
              <div className="mt-4 rounded-[4px] border border-[#d97c6c] bg-[#faebe8] p-3 text-[12px] text-[#8a2414]">
                <span className="font-bold">Error:</span> {editError}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Customer Name <span className="text-red-600">*</span>
                </label>
                <input
                  required
                  value={editForm.customerName}
                  onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                  className="focus-ring mt-1 h-9 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Customer Email <span className="text-red-600">*</span>
                </label>
                <input
                  required
                  type="email"
                  value={editForm.customerEmail}
                  onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
                  className="focus-ring mt-1 h-9 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Order Number <span className="text-red-600">*</span>
                </label>
                <input
                  required
                  value={editForm.orderNumber}
                  onChange={(e) => setEditForm({ ...editForm, orderNumber: e.target.value })}
                  className="focus-ring mt-1 h-9 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Units (Quantity) <span className="text-red-600">*</span>
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={editForm.units}
                  onChange={(e) => setEditForm({ ...editForm, units: parseInt(e.target.value, 10) || 1 })}
                  className="focus-ring mt-1 h-9 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Item Name <span className="text-red-600">*</span>
                </label>
                <input
                  required
                  value={editForm.itemName}
                  onChange={(e) => setEditForm({ ...editForm, itemName: e.target.value })}
                  className="focus-ring mt-1 h-9 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Item Variant
                </label>
                <input
                  value={editForm.itemVariant}
                  onChange={(e) => setEditForm({ ...editForm, itemVariant: e.target.value })}
                  className="focus-ring mt-1 h-9 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                  Return Reason <span className="text-red-600">*</span>
                </label>
                <select
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value as Reason })}
                  className="focus-ring mt-1 h-9 w-full rounded-[4px] border hairline bg-[var(--surface)] px-3 text-[12px] outline-none"
                >
                  <option value="DAMAGED">Damaged</option>
                  <option value="WRONG_ITEM">Wrong Item</option>
                  <option value="SIZE_ISSUE">Size Issue</option>
                  <option value="NOT_AS_DESCRIBED">Not As Described</option>
                  <option value="CHANGED_MIND">Changed Mind</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5 border-t hairline pt-4">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="h-9 rounded-[4px] border hairline px-4 text-[12px] font-semibold text-[var(--ink)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isEditing}
                className="h-9 rounded-[4px] bg-[var(--ink)] px-4 text-[12px] font-semibold text-white shadow-xs disabled:opacity-40"
              >
                {isEditing ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
