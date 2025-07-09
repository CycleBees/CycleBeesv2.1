// Base types
export interface BaseRequest {
  id: number;
  user_name: string;
  user_phone: string;
  total_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
  payment_method: string;
  alternate_number?: string;
  email?: string;
  // Coupon information
  coupon_code?: string;
  coupon_discount_type?: string;
  coupon_discount_value?: number;
  coupon_discount_amount?: number;
}

export interface RepairRequest extends BaseRequest {
  services: Array<{
    id: number;
    name: string;
    description: string;
    special_instructions: string;
    price: number;
    discount_amount: number;
  }>;
  files: Array<{
    id: number;
    file_url: string;
    file_type: string;
    display_order: number;
  }>;
  preferred_date: string;
  preferred_time_slot: string;
  notes: string;
  address?: string;
  contact_number?: string;
  start_time?: string;
  end_time?: string;
}

export interface RentalRequest extends BaseRequest {
  bicycle_name: string;
  bicycle_model?: string;
  duration_type: string;
  duration_count: number;
  delivery_address: string;
  delivery_charge: number;
  special_instructions?: string;
}

export interface RepairService {
  id: number;
  name: string;
  description: string;
  special_instructions: string;
  price: number;
}

export interface Bicycle {
  id: number;
  name: string;
  model: string;
  description: string;
  special_instructions: string;
  daily_rate: number;
  weekly_rate: number;
  delivery_charge: number;
  specifications: string;
  photos: string[];
  is_available: boolean;
}

export interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
}

export interface Coupon {
  id: number;
  name: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  minimum_amount: number;
  maximum_discount?: number;
  usage_limit: number;
  used_count: number;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface PromotionalCard {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  link_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  total_repair_requests: number;
  total_rental_requests: number;
  profile_photo?: string;
}

export interface DashboardStats {
  total_users: number;
  total_repair_requests: number;
  total_rental_requests: number;
  pending_repair_requests: number;
  pending_rental_requests: number;
  total_revenue: number;
  active_rentals: number;
}

export interface RecentActivity {
  id: number;
  type: string;
  description: string;
  created_at: string;
}

// Action types for confirmation modals
export type ConfirmationAction = {
  type: 'status' | 'delete' | 'deleteService' | 'deleteTimeSlot' | 'deleteBicycle' | 'deleteCoupon';
  requestId?: number;
  serviceId?: number;
  timeSlotId?: number;
  bicycleId?: number;
  couponId?: number;
  newStatus?: string;
  currentStatus?: string;
};