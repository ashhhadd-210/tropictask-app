// ═══════════════════════════════════════════
// SEED DATA — matches Supabase schema from dev doc
// Replace with Supabase queries when backend is connected
// ═══════════════════════════════════════════

export const SEED_DATA = {
  users: [
    { id: 'u1', email: 'jane@smithpm.com', password: 'pass123', name: 'Jane Smith', phone: '(601) 555-0100', roles: ['manager'], company_name: 'Smith Property Management', license_number: 'MS-PM-4421', trade: null, manager_id: null, property_id: null, stripe_customer_id: null },
    { id: 'u2', email: 'robert@email.com', password: 'pass123', name: 'Robert Johnson', phone: '(601) 555-0200', roles: ['owner'], company_name: null, license_number: null, trade: null, manager_id: 'u1', property_id: null, stripe_customer_id: null },
    { id: 'u3', email: 'mike@plumbing.com', password: 'pass123', name: 'Mike Reynolds', phone: '(601) 555-0300', roles: ['contractor'], company_name: "Mike's Plumbing LLC", license_number: 'MS-PL-887', trade: 'Plumbing', manager_id: null, property_id: null, stripe_customer_id: null },
    { id: 'u4', email: 'sarah@email.com', password: 'pass123', name: 'Sarah Davis', phone: '(601) 555-0400', roles: ['tenant'], company_name: null, license_number: null, trade: null, manager_id: 'u1', property_id: 'p2', stripe_customer_id: null },
    { id: 'u5', email: 'linda@email.com', password: 'pass123', name: 'Linda Moore', phone: '(601) 555-0500', roles: ['owner'], company_name: null, license_number: null, trade: null, manager_id: 'u1', property_id: null, stripe_customer_id: null },
    { id: 'u6', email: 'coolairco@email.com', password: 'pass123', name: 'James Cooper', phone: '(601) 555-0600', roles: ['contractor'], company_name: 'Cool Air Co.', license_number: 'MS-HVAC-221', trade: 'HVAC', manager_id: null, property_id: null, stripe_customer_id: null },
    { id: 'u7', email: 'tom@email.com', password: 'pass123', name: 'Tom Harris', phone: '(601) 555-0700', roles: ['tenant'], company_name: null, license_number: null, trade: null, manager_id: 'u1', property_id: 'p1', stripe_customer_id: null },
  ],

  properties: [
    { id: 'p1', address: '142 Oak Street', city: 'Meridian', state: 'MS', zip: '39301', type: 'SFR', beds: 3, baths: 2, sqft: 1850, year_built: 1998, monthly_rent: 1200, status: 'occupied', manager_id: 'u1', owner_id: 'u2', emoji: '🏡', notes: 'Gate code: 4421' },
    { id: 'p2', address: '88 River Bend Drive', city: 'Meridian', state: 'MS', zip: '39301', type: 'SFR', beds: 4, baths: 3, sqft: 2400, year_built: 2005, monthly_rent: 1650, status: 'occupied', manager_id: 'u1', owner_id: 'u5', emoji: '🏘️', notes: '' },
    { id: 'p3', address: '310 Elmwood Avenue', city: 'Laurel', state: 'MS', zip: '39440', type: 'SFR', beds: 2, baths: 1, sqft: 1100, year_built: 1985, monthly_rent: 850, status: 'vacant', manager_id: 'u1', owner_id: 'u2', emoji: '🏠', notes: 'Needs paint before listing' },
    { id: 'p4', address: '55 Magnolia Lane', city: 'Hattiesburg', state: 'MS', zip: '39401', type: 'SFR', beds: 3, baths: 2, sqft: 1700, year_built: 2001, monthly_rent: 1100, status: 'occupied', manager_id: 'u1', owner_id: 'u2', emoji: '🏡', notes: '' },
    { id: 'p5', address: '204 Cypress Court', city: 'Meridian', state: 'MS', zip: '39301', type: 'Condo', beds: 2, baths: 2, sqft: 1200, year_built: 2012, monthly_rent: 1050, status: 'vacant', manager_id: 'u1', owner_id: 'u5', emoji: '🏠', notes: '' },
  ],

  workOrders: [
    { id: 'wo1', wo_number: 'WO-1042', property_id: 'p1', category: 'hvac', title: 'HVAC not cooling — unit unlivable', notes: 'AC stopped working completely. Temperature rising to 90+ inside.', timing: 'immediate', scheduled_date: null, scheduled_time: null, stage: 2, priority: 'urgent', submitted_by: 'u7', contractor_id: null, created_at: '2025-03-20T10:00:00' },
    { id: 'wo2', wo_number: 'WO-1039', property_id: 'p1', category: 'roofing', title: 'Roof leak above master bedroom', notes: 'Water dripping from ceiling during rain. Visible water damage on drywall.', timing: 'immediate', scheduled_date: null, scheduled_time: null, stage: 1, priority: 'urgent', submitted_by: 'u1', contractor_id: null, created_at: '2025-03-19T09:00:00' },
    { id: 'wo3', wo_number: 'WO-1037', property_id: 'p2', category: 'plumbing', title: 'Kitchen faucet leaking under sink', notes: 'Persistent drip under kitchen sink. Bucket catching water.', timing: 'scheduled', scheduled_date: '2025-03-26', scheduled_time: '11:00 AM', stage: 5, priority: 'high', submitted_by: 'u4', contractor_id: 'u3', created_at: '2025-03-17T14:00:00' },
    { id: 'wo4', wo_number: 'WO-1033', property_id: 'p4', category: 'general', title: 'Fence panel replacement — backyard', notes: 'Two fence panels damaged in storm.', timing: 'scheduled', scheduled_date: null, scheduled_time: null, stage: 1, priority: 'normal', submitted_by: 'u1', contractor_id: null, created_at: '2025-03-15T08:00:00' },
    { id: 'wo5', wo_number: 'WO-1031', property_id: 'p2', category: 'general', title: "Bedroom window won't latch", notes: 'Window latch broken in master bedroom, security concern.', timing: 'scheduled', scheduled_date: null, scheduled_time: null, stage: 3, priority: 'normal', submitted_by: 'u4', contractor_id: 'u3', created_at: '2025-03-19T11:00:00' },
    { id: 'wo6', wo_number: 'WO-1028', property_id: 'p1', category: 'electrical', title: 'Electrical panel inspection', notes: 'Annual safety inspection due.', timing: 'scheduled', scheduled_date: '2025-03-28', scheduled_time: '9:00 AM', stage: 5, priority: 'normal', submitted_by: 'u1', contractor_id: 'u6', created_at: '2025-03-10T08:00:00' },
    { id: 'wo7', wo_number: 'WO-1025', property_id: 'p4', category: 'plumbing', title: 'Water heater assessment', notes: 'Water heater making unusual sounds.', timing: 'immediate', scheduled_date: null, scheduled_time: null, stage: 6, priority: 'high', submitted_by: 'u1', contractor_id: 'u3', created_at: '2025-03-08T10:00:00' },
    { id: 'wo8', wo_number: 'WO-1020', property_id: 'p2', category: 'appliances', title: 'Dishwasher not draining', notes: 'Dishwasher completed cycle but water remains.', timing: 'scheduled', scheduled_date: null, scheduled_time: null, stage: 9, priority: 'normal', submitted_by: 'u4', contractor_id: 'u3', created_at: '2025-02-20T08:00:00' },
  ],

  payments: [
    { id: 'pay1', title: 'March Rent', property_id: 'p1', type: 'rent', amount: 1200, frequency: 'monthly', status: 'paid', due_date: '2025-03-01', created_by: 'u1', recipient_id: 'u7', note: '' },
    { id: 'pay2', title: 'Plumbing Repair Deposit', property_id: 'p2', type: 'maintenance', amount: 350, frequency: 'one_time', status: 'pending', due_date: '2025-03-28', created_by: 'u1', recipient_id: 'u5', note: 'Kitchen faucet repair — WO-1037' },
    { id: 'pay3', title: 'April Rent', property_id: 'p1', type: 'rent', amount: 1200, frequency: 'monthly', status: 'overdue', due_date: '2025-04-01', created_by: 'u1', recipient_id: 'u7', note: '' },
    { id: 'pay4', title: 'April Rent', property_id: 'p2', type: 'rent', amount: 1650, frequency: 'monthly', status: 'pending', due_date: '2025-04-01', created_by: 'u1', recipient_id: 'u4', note: '' },
    { id: 'pay5', title: 'Management Fee — Q1', property_id: 'p1', type: 'management_fee', amount: 480, frequency: 'one_time', status: 'paid', due_date: '2025-03-15', created_by: 'u1', recipient_id: 'u2', note: 'Q1 2025 management fee' },
    { id: 'pay6', title: 'Security Deposit Refund', property_id: 'p3', type: 'deposit', amount: 850, frequency: 'one_time', status: 'paid', due_date: '2025-02-28', created_by: 'u1', recipient_id: 'u2', note: 'Previous tenant move-out' },
  ],

  reviews: [
    { id: 'r1', contractor_id: 'u3', manager_id: 'u1', work_order_id: 'wo8', stars: 5, text: 'Excellent work. Fixed dishwasher quickly and cleaned up after.', location_label: 'Residential · Meridian, MS', created_at: '2025-02-22' },
    { id: 'r2', contractor_id: 'u6', manager_id: 'u1', work_order_id: null, stars: 4, text: 'Good HVAC service. Slightly late but thorough inspection.', location_label: 'Residential · Meridian, MS', created_at: '2025-01-15' },
  ],

  components: [
    { id: 'c1', property_id: 'p1', name: 'HVAC Unit — Main Floor', icon: '❄️', installed: '2019', last_serviced: 'Jan 2025', warranty_expiry: '2029', warranty_status: 'ok', notes: 'Trane XR15' },
    { id: 'c2', property_id: 'p1', name: 'Water Heater — Garage', icon: '🔥', installed: '2021', last_serviced: 'Dec 2024', warranty_expiry: '2027', warranty_status: 'ok', notes: 'Rheem 50 gal' },
    { id: 'c3', property_id: 'p2', name: 'HVAC Unit — Upstairs', icon: '❄️', installed: '2015', last_serviced: 'Nov 2024', warranty_expiry: '2025', warranty_status: 'soon', notes: 'Carrier Comfort' },
  ],

  invites: [],

  expenses: [
    { id: 'exp1', work_order_id: 'wo3', property_id: 'p2', contractor_id: 'u3', amount: 45.50, description: 'Replacement faucet cartridge & supply lines', payment_type: 'company_card', receipt_url: null, receipt_name: null, status: 'approved', created_at: '2025-03-26T11:30:00', approved_at: '2025-03-26T15:00:00', approved_by: 'u1' },
    { id: 'exp2', work_order_id: 'wo3', property_id: 'p2', contractor_id: 'u3', amount: 28.00, description: 'Plumber\'s putty and pipe sealant', payment_type: 'personal', receipt_url: null, receipt_name: null, status: 'pending', created_at: '2025-03-26T12:00:00', approved_at: null, approved_by: null },
    { id: 'exp3', work_order_id: 'wo7', property_id: 'p4', contractor_id: 'u3', amount: 320.00, description: 'Water heater diagnostic + thermostat replacement', payment_type: 'company_card', receipt_url: null, receipt_name: null, status: 'approved', created_at: '2025-03-09T14:30:00', approved_at: '2025-03-10T09:15:00', approved_by: 'u1' },
    { id: 'exp4', work_order_id: 'wo6', property_id: 'p1', contractor_id: 'u6', amount: 125.00, description: 'Annual electrical safety inspection — service call', payment_type: 'company_card', receipt_url: null, receipt_name: null, status: 'pending', created_at: '2025-03-28T10:00:00', approved_at: null, approved_by: null },
    { id: 'exp5', work_order_id: 'wo8', property_id: 'p2', contractor_id: 'u3', amount: 18.75, description: 'Drain snake rental + cleaner', payment_type: 'personal', receipt_url: null, receipt_name: null, status: 'approved', created_at: '2025-02-21T11:00:00', approved_at: '2025-02-22T08:30:00', approved_by: 'u1' },
  ],

  _nextId: { u: 8, p: 6, wo: 9, pay: 7, r: 3, c: 4, inv: 1, exp: 6 }
}
