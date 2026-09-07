// API Types

export interface User {
  id: string
  email: string
  name?: string
  email_verified: boolean
  created_at: string
  updated_at: string
}

export interface Contract {
  id: string
  user_id: string
  name: string
  category: ContractCategory
  provider: string
  start_date: string
  renewal_date: string
  cancellation_deadline?: string
  cost: number
  currency: string
  billing_frequency: BillingFrequency
  status: ContractStatus
  notes?: string
  created_at: string
  updated_at: string
}

export type ContractCategory =
  | 'insurance'
  | 'electricity_contract'
  | 'gas_contract'
  | 'mobile_contract'
  | 'streaming_subscription'
  | 'other'

export type BillingFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual'

export type ContractStatus = 'active' | 'cancelled' | 'expired' | 'paused' | 'review_needed'

export interface ContractShare {
  id: string
  contract_id: string
  grantee_email: string
  role: 'viewer'
  granted_by: string
  granted_at: string
  revoked_at?: string
}

export interface AuditEntry {
  id: string
  entity_type: 'contract' | 'contract_share'
  entity_id: string
  actor_user_id?: string
  action: string
  field?: string
  before_value?: string
  after_value?: string
  created_at: string
}

export interface ConsentRecord {
  id: string
  consent_type: 'email_notifications'
  version: string
  granted_at: string
  withdrawn_at?: string
}

export interface Reminder {
  id: string
  contract_id: string
  reminder_type: 'renewal_date' | 'cancellation_deadline'
  scheduled_date: string
  sent_at?: string
  status: 'pending' | 'sent' | 'failed'
  days_before: number
  error_message?: string
  created_at: string
  updated_at: string
}

export interface ReminderPreference {
  reminder_windows: number[]
  email_enabled: boolean
  timezone: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface APIError {
  error: {
    code: string
    message: string
    details?: Array<{
      field: string
      message: string
    }>
  }
}
