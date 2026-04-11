// ═══════════════════════════════════════════
// WORK ORDER 9-STAGE LIFECYCLE
// ═══════════════════════════════════════════
export const STAGES = [
  { n: 1, label: 'Submitted', color: '#97D1DC', who: 'Manager', action: 'Send to Contractors' },
  { n: 2, label: 'Contractors Notified', color: '#97D1DC', who: 'Contractor', action: 'Accept Job' },
  { n: 3, label: 'Contractor Accepted', color: '#d97706', who: 'Manager → Owner', action: 'Upload Quote & Notify Owner' },
  { n: 4, label: 'Owner Approval', color: '#d97706', who: 'Owner / Manager', action: 'Approve Bid' },
  { n: 5, label: 'Scheduled', color: '#005357', who: 'Contractor', action: 'Mark On Site' },
  { n: 6, label: 'In Progress', color: '#005357', who: 'Contractor', action: 'Mark Complete' },
  { n: 7, label: 'Complete', color: '#27ae60', who: 'Owner / Manager', action: 'Confirm Payment' },
  { n: 8, label: 'Paid', color: '#27ae60', who: 'Manager', action: 'Close Work Order' },
  { n: 9, label: 'Closed', color: '#ccc5b8', who: '—', action: null },
]

export const getStage = (n) => STAGES.find(s => s.n === n) || STAGES[0]

// ═══════════════════════════════════════════
// ROLE CONFIG
// ═══════════════════════════════════════════
export const ROLE_LABELS = {
  manager: 'Property Manager',
  owner: 'Property Owner',
  contractor: 'Contractor',
  tenant: 'Tenant',
}

export const ROLE_ICONS = {
  manager: '🏢',
  owner: '🏠',
  contractor: '🔧',
  tenant: '🔑',
}

// ═══════════════════════════════════════════
// WORK ORDER CATEGORIES
// ═══════════════════════════════════════════
export const WO_CATEGORIES = [
  'hvac', 'plumbing', 'electrical', 'roofing',
  'appliances', 'landscaping', 'painting', 'general',
]

// ═══════════════════════════════════════════
// PAYMENT TYPES
// ═══════════════════════════════════════════
export const PAYMENT_TYPES = [
  { value: 'rent', label: 'Rent' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'management_fee', label: 'Management Fee' },
  { value: 'late_fee', label: 'Late Fee' },
  { value: 'other', label: 'Other' },
]

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
export const priBadge = (p) => ({ urgent: 'b-red', high: 'b-amber', normal: 'b-blue', low: 'b-grey' })[p] || 'b-grey'
export const priLabel = (p) => p.charAt(0).toUpperCase() + p.slice(1)
export const stageBadge = (s) => s <= 2 ? 'b-blue' : s <= 4 ? 'b-amber' : s <= 6 ? 'b-forest' : s <= 8 ? 'b-green' : 'b-grey'
export const daysAgo = (d) => {
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000)
  return diff < 1 ? 'Today' : diff === 1 ? 'Yesterday' : `${diff}d ago`
}
