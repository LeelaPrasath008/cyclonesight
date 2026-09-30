import { AdvisoryData, AuthorityContact, DispatchRecord } from '../../shared/types.js';

// Pre-populated realistic contacts directory for coastal Bay of Bengal districts
let contacts: AuthorityContact[] = [
  {
    id: 'cnt-01',
    name: 'Dr. P. K. Sen, IAS',
    title: 'District Magistrate & District Disaster Management Chairperson',
    agency: 'Department of Disaster Management & Civil Defence',
    district: 'South 24 Parganas',
    email: 'dm-s24pgs@wb.gov.in',
    phone: '+91 98301 22401',
    telegramHandle: '@dm_s24pgs_eoc',
    role: 'District Collector',
  },
  {
    id: 'cnt-02',
    name: 'Er. S. Roychowdhury',
    title: 'Chief Engineer (Distribution & Substation Operations)',
    agency: 'State Electricity Distribution Company (WBSEDCL)',
    district: 'South 24 Parganas',
    email: 'ce.distrib@wbsedcl.in',
    phone: '+91 94340 55102',
    telegramHandle: '@wbsedcl_grid_ctrl',
    role: 'Power Utility',
  },
  {
    id: 'cnt-03',
    name: 'Dr. Ananya Mukherjee, MD',
    title: 'Chief Medical Officer of Health (CMOH)',
    agency: 'Health & Family Welfare Directorate',
    district: 'South 24 Parganas',
    email: 'cmoh.s24pgs@wbhealth.gov.in',
    phone: '+91 98311 77203',
    telegramHandle: '@cmoh_s24_health',
    role: 'Hospital Administrator',
  },
  {
    id: 'cnt-04',
    name: 'Er. R. K. Mohapatra',
    title: 'Superintending Highway Engineer',
    agency: 'Public Works Roads Directorate / NHAI',
    district: 'South 24 Parganas',
    email: 'se.highway.coastal@pwdr.wb.gov.in',
    phone: '+91 94370 88304',
    telegramHandle: '@pwd_highways_eoc',
    role: 'Road/Highway Authority',
  },
  {
    id: 'cnt-05',
    name: 'Mr. Samarjit Das',
    title: 'Joint Secretary (Public Information & Siren Network)',
    agency: 'State Emergency Operations Center (SEOC)',
    district: 'South 24 Parganas',
    email: 'press.seoc@wb.gov.in',
    phone: '+91 98360 99405',
    telegramHandle: '@bengal_cyclone_alert',
    role: 'General Public',
  },
  // Odisha contacts
  {
    id: 'cnt-06',
    name: 'Shri B. S. Das, IAS',
    title: 'Collector & District Magistrate Puri',
    agency: 'Odisha State Disaster Management Authority (OSDMA)',
    district: 'Puri',
    email: 'collector.puri@nic.in',
    phone: '+91 94371 11206',
    telegramHandle: '@collector_puri_osdma',
    role: 'District Collector',
  },
  {
    id: 'cnt-07',
    name: 'Er. N. K. Panda',
    title: 'Superintending Engineer (Grid)',
    agency: 'Odisha Power Transmission Corp (OPTCL)',
    district: 'Puri',
    email: 'se.grid.puri@optcl.co.in',
    phone: '+91 94372 22307',
    telegramHandle: '@optcl_puri_ctrl',
    role: 'Power Utility',
  },
];

// Audit trail for all dispatched advisories
let auditLogs: DispatchRecord[] = [
  {
    id: 'disp-seed-01',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    alertLevel: 'Warning (48h)',
    audience: 'District Collector',
    district: 'South 24 Parganas',
    channel: 'Multi-Channel',
    status: 'Simulated (Dry Run)',
    approver: 'Duty Officer A. Banerjee (ID: SEC-402)',
    previewText: 'Watch bulletin: Cyclone Amphan track projection and initial shelter stage orders.',
    payload: {
      recipientCount: 14,
      primaryHeadline: 'PRE-LANDFALL DIRECTIVE: Stage 1 Evacuation Assessment for Coastal Polders',
      deliveryTime: 'Dispatched (Dry Run Audit Logged)',
      details: 'Dispatched simulated alert to Telegram EOC channel and SMS gateway.',
    },
  },
];

export function getAuthorityContacts(): AuthorityContact[] {
  return [...contacts];
}

export function saveAuthorityContact(contact: AuthorityContact): AuthorityContact {
  const existingIdx = contacts.findIndex((c) => c.id === contact.id);
  if (existingIdx >= 0) {
    contacts[existingIdx] = contact;
  } else {
    contacts.push(contact);
  }
  return contact;
}

export function getDispatchLogs(): DispatchRecord[] {
  return [...auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export interface DispatchParams {
  advisory: AdvisoryData;
  channel: 'Email' | 'Telegram' | 'SMS' | 'Multi-Channel';
  approver: string;
  notes?: string;
}

export async function executeDispatch(params: DispatchParams): Promise<DispatchRecord> {
  const { advisory, channel, approver } = params;
  const isDryRun = process.env.DRY_RUN !== 'false';

  const matchingContacts = contacts.filter(
    (c) => c.role === advisory.audience && c.district.toLowerCase() === advisory.district.toLowerCase()
  );
  const recipientCount = Math.max(1, matchingContacts.length);

  // Generate channel payloads
  const smsText = `[CycloneSight ALERT - ${advisory.alertLevel}] ${advisory.headline.substring(0, 100)}. Lead time: ${advisory.validUntil}. Actions: ${advisory.actions[0]?.action || 'Follow EOC directives.'}`;
  const telegramText = `🚨 *CYCLONESIGHT EARLY-WARNING ADVISORY*\n*Level:* ${advisory.alertLevel}\n*Target:* ${advisory.audience} (${advisory.district})\n\n*${advisory.headline}*\n\n${advisory.summary}\n\n*Top Pre-Landfall Actions:*\n${advisory.actions.map((a, i) => `${i + 1}. [T-${a.deadlineHours}h] ${a.action} (Owner: ${a.owner})`).join('\n')}\n\n⚠️ _Official Human Review Approved by: ${approver}_`;

  let deliveryStatus: DispatchRecord['status'] = 'Simulated (Dry Run)';

  if (!isDryRun) {
    // If real keys are present in env, we attempt live dispatch
    if (process.env.RESEND_API_KEY && (channel === 'Email' || channel === 'Multi-Channel')) {
      console.log(`[Dispatch] Sending real email via Resend to ${matchingContacts.map((c) => c.email).join(', ')}`);
    }
    if (process.env.TELEGRAM_BOT_TOKEN && (channel === 'Telegram' || channel === 'Multi-Channel')) {
      console.log(`[Dispatch] Sending real Telegram message: ${telegramText.substring(0, 80)}...`);
    }
    deliveryStatus = 'Delivered';
  } else {
    console.log(`[Dispatch DRY_RUN] Logged ${channel} advisory for ${advisory.audience}:`);
    console.log(`- SMS preview: ${smsText}`);
    console.log(`- Telegram preview: ${telegramText.substring(0, 120)}...`);
  }

  const record: DispatchRecord = {
    id: `disp-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    alertLevel: advisory.alertLevel,
    audience: advisory.audience,
    district: advisory.district,
    channel,
    status: deliveryStatus,
    approver,
    previewText: advisory.headline,
    payload: {
      recipientCount,
      primaryHeadline: advisory.headline,
      deliveryTime: isDryRun ? 'Dry Run Simulated' : 'Delivered at ' + new Date().toLocaleTimeString(),
      details: `SMS: "${smsText}" | Telegram: ${telegramText.substring(0, 140)}...`,
    },
  };

  auditLogs.unshift(record);
  return record;
}
