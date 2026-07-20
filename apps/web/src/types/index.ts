// API Types

export interface User {
  id: string
  email: string
  email_verified: boolean
  created_at: string
  updated_at: string
}

export interface Commitment {
  id: string
  user_id: string
  name: string
  category: CommitmentCategory
  provider: string
  start_date: string
  renewal_date: string
  cancellation_deadline?: string
  cost: number
  currency: string
  billing_frequency: BillingFrequency
  status: CommitmentStatus
  notes?: string
  created_at: string
  updated_at: string
}

export type CommitmentCategory =
  | 'insurance'
  | 'streaming_subscription'
  | 'software_subscription'
  | 'mobile_contract'
  | 'internet_contract'
  | 'electricity_contract'
  | 'gas_contract'
  | 'gym_membership'
  | 'banking_product'
  | 'vehicle_obligation'
  | 'healthcare_reminder'
  | 'vaccination_reminder'
  | 'other'

export type BillingFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual'

export type CommitmentStatus = 'active' | 'cancelled' | 'expired' | 'paused' | 'review_needed'

export interface Reminder {
  id: string
  commitment_id: string
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
