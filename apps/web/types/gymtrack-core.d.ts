// @gymtrack/core se publica como source JS sin tipos. Este proyecto Next usa TS
// estricto, así que declaramos acá los subpaths del core que consume la web.
// A medida que la web use más de core (hooks, utils) se van sumando módulos.

declare module "@gymtrack/core/supabase" {
  import type { SupabaseClient } from "@supabase/supabase-js";

  export function createSupabaseClient(opts: {
    url?: string;
    key?: string;
    storage?: unknown;
    auth?: Record<string, unknown>;
  }): SupabaseClient;

  export function setSupabaseClient(client: SupabaseClient): void;
  export function getSupabaseClient(): SupabaseClient;
  export const supabase: SupabaseClient;
}

declare module "@gymtrack/core" {
  export interface PaymentBadge {
    key: string;
    label: string;
    chip: string;
    text: string;
  }
  export function paymentBadge(dueDate: string | null | undefined): PaymentBadge;
  export function isOverdue(dueDate: string | null | undefined): boolean;
}

declare module "@gymtrack/core/hooks/activities/use-gym-subscriptions" {
  import type { UseQueryResult } from "@tanstack/react-query";
  export interface GymSubscription {
    id: string;
    user_id: string;
    price: number | string | null;
    due_date: string | null;
    status: string | null;
    activities: {
      name: string | null;
      color: string | null;
    } | null;
    activity_plans: { label: string | null; frequency_per_week: number | null } | null;
    member: {
      id: string;
      name: string | null;
      last_name: string | null;
      image_profile: string | null;
    } | null;
    [k: string]: unknown;
  }
  export function useGymSubscriptions(
    gymId: string | null
  ): UseQueryResult<GymSubscription[]>;
}

declare module "@gymtrack/core/hooks/activities/use-subscription-payments" {
  import type { UseQueryResult } from "@tanstack/react-query";
  export interface SubscriptionPayment {
    id: string;
    subscription_id: string;
    user_id: string;
    amount: number | string | null;
    paid_at: string | null;
    period_start: string | null;
    period_end: string | null;
    [k: string]: unknown;
  }
  export function useSubscriptionPayments(
    subscriptionId: string | null
  ): UseQueryResult<SubscriptionPayment[]>;
}

declare module "@gymtrack/core/colors" {
  export type Ramp = Record<number, string>;
  export const brandPrimary: Ramp;
  export const brandSecondary: Ramp;
  export const ui: {
    background: Record<string, string>;
    surface: Record<string, string>;
    surfaceSecondary: Record<string, string>;
    text: Record<string, string>;
    input: Record<string, string>;
    toggle: Record<string, string>;
    placeholder: Record<string, string>;
    overlay: Record<string, string>;
    status: Record<string, string>;
    decor: Record<string, Record<string, string>>;
    icon: Record<string, string>;
    border: Record<string, string>;
    arrow: Record<string, string>;
  };
  export const gradient: Record<string, unknown>;
}

declare module "@gymtrack/core/format-date" {
  export function formatDuration(seconds: number | null | undefined): string;
  export function startOfDay(d: Date): Date;
  export function startOfWeek(d: Date): Date;
  export function weekKey(d: Date): string;
}

declare module "@gymtrack/core/generate-ramp" {
  import type { Ramp } from "@gymtrack/core/colors";
  export function generateRamp(seed: string): Ramp;
  export function rampToChannels(ramp: Ramp): Record<number, string>;
  export const SHADES: number[];
}

declare module "@gymtrack/core/hooks/progress/use-attendance-streak" {
  import type { UseQueryResult } from "@tanstack/react-query";
  export interface HeatmapDay {
    date: string;
    count: number;
  }
  export interface HeatmapWeek {
    key: string;
    days: HeatmapDay[];
  }
  export interface AttendanceProgress {
    totalCheckins: number;
    thisWeek: number;
    weekStreak: number;
    weeks: HeatmapWeek[];
  }
  export function fetchAttendanceProgress(
    gymId: string | null
  ): Promise<AttendanceProgress>;
  export function useAttendanceStreak(
    gymId: string | null,
    userId: string | null
  ): UseQueryResult<AttendanceProgress>;
}

declare module "@gymtrack/core/hooks/activities/use-activities" {
  import type { UseQueryResult } from "@tanstack/react-query";
  export interface ActivityPlan {
    id: string;
    label: string | null;
    frequency_per_week: number | null;
    is_active: boolean | null;
    price: number | string | null;
    sort_order: number | null;
    [k: string]: unknown;
  }
  export interface ActivityCoach {
    id: string;
    coach_id: string;
    monthly_fee: number | string | null;
    revenue_share_pct: number | string | null;
    rate_per_class: number | string | null;
    is_active: boolean | null;
    coach: { id: string; name: string | null; last_name: string | null } | null;
    [k: string]: unknown;
  }
  export interface Activity {
    id: string;
    name: string | null;
    description: string | null;
    color: string | null;
    is_active: boolean | null;
    activity_coaches: ActivityCoach[];
    activity_plans: ActivityPlan[];
    [k: string]: unknown;
  }
  export function useActivities(gymId: string | null): UseQueryResult<Activity[]>;
  export function useActivityPlans(
    activityId: string | null
  ): UseQueryResult<ActivityPlan[]>;
}

declare module "@gymtrack/core/hooks/users/use-member-detail" {
  import type { UseQueryResult } from "@tanstack/react-query";
  export interface MemberProfile {
    id: string;
    user_id: string;
    name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    document_number: string | null;
    address: string | null;
    gender: string | null;
    image_profile: string | null;
    role: string | null;
    membership_status: string | null;
    is_active: boolean | null;
    created_at: string | null;
    [k: string]: unknown;
  }
  export interface MemberAssignment {
    id: string;
    status: string | null;
    is_custom: boolean;
    plan: {
      id: string;
      name: string | null;
      objective: string | null;
      level: string | null;
      weekly_days: number | null;
      duration_weeks: number | null;
      cover_image_uri: string | null;
    } | null;
    [k: string]: unknown;
  }
  export interface MemberHistoryLog {
    id: string;
    session_id: string | null;
    session_name: string | null;
    completed_at: string | null;
    [k: string]: unknown;
  }
  export interface MemberDetail {
    profile: MemberProfile;
    activePlan: MemberAssignment | null;
    pastPlans: MemberAssignment[];
    history: MemberHistoryLog[];
  }
  export function useMemberDetail(
    memberId: string | null,
    gymId: string | null
  ): UseQueryResult<MemberDetail>;
}

declare module "@gymtrack/core/hooks/activities/use-member-subscriptions" {
  import type { UseQueryResult } from "@tanstack/react-query";
  export interface MemberSubscription {
    id: string;
    status: string | null;
    activities: { name: string | null; color: string | null } | null;
    activity_plans: {
      label: string | null;
      frequency_per_week: number | null;
    } | null;
    [k: string]: unknown;
  }
  export function useMemberSubscriptions(
    memberId: string | null,
    gymId: string | null
  ): UseQueryResult<{
    active: MemberSubscription[];
    past: MemberSubscription[];
  }>;
}

declare module "@gymtrack/core/hooks/users/use-gym-staff" {
  import type { UseQueryResult } from "@tanstack/react-query";
  export interface StaffMember {
    id: string;
    name: string | null;
    last_name: string | null;
    role: string | null;
    image_profile: string | null;
    [k: string]: unknown;
  }
  export function useGymStaff(
    gymId: string | null
  ): UseQueryResult<StaffMember[]>;
}

declare module "@gymtrack/core/hooks/activities/use-activity-mutations" {
  import type { UseMutationResult } from "@tanstack/react-query";
  export interface ActivityInput {
    name: string;
    description?: string | null;
    color?: string | null;
    is_active?: boolean;
  }
  export interface ActivityRow {
    id: string;
    name: string;
    [k: string]: unknown;
  }
  export function useActivityMutations(gymId: string | null): {
    create: UseMutationResult<ActivityRow, Error, ActivityInput>;
    update: UseMutationResult<ActivityRow, Error, ActivityInput & { id: string }>;
    remove: UseMutationResult<string, Error, string>;
  };
}

declare module "@gymtrack/core/hooks/activities/use-activity-coaches" {
  import type { UseQueryResult } from "@tanstack/react-query";
  import type { ActivityCoach } from "@gymtrack/core/hooks/activities/use-activities";
  export function useActivityCoaches(
    activityId: string | null
  ): UseQueryResult<ActivityCoach[]>;
}

declare module "@gymtrack/core/hooks/activities/use-activity-coach-mutations" {
  import type { UseMutationResult } from "@tanstack/react-query";
  export interface ActivityCoachInput {
    coach_id: string;
    monthly_fee?: number | string | null;
    revenue_share_pct?: number | string | null;
    rate_per_class?: number | string | null;
    is_active?: boolean;
  }
  export interface ActivityCoachRow {
    id: string;
    [k: string]: unknown;
  }
  export function useActivityCoachMutations(
    activityId: string | null,
    gymId: string | null
  ): {
    create: UseMutationResult<ActivityCoachRow, Error, ActivityCoachInput>;
    update: UseMutationResult<
      ActivityCoachRow,
      Error,
      ActivityCoachInput & { id: string }
    >;
    remove: UseMutationResult<string, Error, string>;
  };
}

declare module "@gymtrack/core/hooks/activities/use-activity-plan-mutations" {
  import type { UseMutationResult } from "@tanstack/react-query";
  export interface ActivityPlanInput {
    label: string;
    frequency_per_week?: number | null;
    price?: number | string | null;
    is_active?: boolean;
    sort_order?: number;
  }
  export interface ActivityPlanRow {
    id: string;
    [k: string]: unknown;
  }
  export function useActivityPlanMutations(
    activityId: string | null,
    gymId: string | null
  ): {
    create: UseMutationResult<ActivityPlanRow, Error, ActivityPlanInput>;
    update: UseMutationResult<
      ActivityPlanRow,
      Error,
      ActivityPlanInput & { id: string }
    >;
    remove: UseMutationResult<string, Error, string>;
  };
}

declare module "@gymtrack/core/hooks/activities/use-activity-income-summary" {
  import type { UseQueryResult } from "@tanstack/react-query";
  export interface ActivityIncomeRow {
    activity_id: string;
    activity_name: string | null;
    activity_color: string | null;
    payments_count: number;
    total: number | string;
    active_students: number;
    [k: string]: unknown;
  }
  export function useActivityIncomeSummary(
    gymId: string | null,
    fromISO: string | null,
    toISO: string | null
  ): UseQueryResult<ActivityIncomeRow[]>;
}

declare module "@gymtrack/core/hooks/coaches/use-coach-payment-summary" {
  import type { UseQueryResult } from "@tanstack/react-query";
  export interface CoachPaymentSummaryRow {
    coach_id: string;
    fixed_total: number | string;
    revenue_total: number | string;
    classes_count: number;
    classes_total: number | string;
    total: number | string;
    coach: {
      id: string;
      name: string | null;
      last_name: string | null;
      image_profile: string | null;
    } | null;
    [k: string]: unknown;
  }
  export function useCoachPaymentSummary(
    gymId: string | null,
    fromISO: string | null,
    toISO: string | null
  ): UseQueryResult<CoachPaymentSummaryRow[]>;
}

declare module "@gymtrack/core/hooks/coaches/use-coach-payments" {
  import type { UseQueryResult } from "@tanstack/react-query";
  export interface CoachPayment {
    id: string;
    coach_id: string;
    period_start: string;
    period_end: string;
    fixed_amount: number | string;
    revenue_share_amount: number | string;
    classes_count: number;
    classes_amount: number | string;
    total_amount: number | string;
    notes: string | null;
    paid_at: string | null;
    coach: { id: string; name: string | null; last_name: string | null } | null;
    [k: string]: unknown;
  }
  export function useCoachPayments(
    gymId: string | null,
    fromISO: string | null,
    toISO: string | null
  ): UseQueryResult<CoachPayment[]>;
}

declare module "@gymtrack/core/hooks/users/use-gym-members" {
  import type { UseQueryResult } from "@tanstack/react-query";
  export interface GymMember {
    id: string;
    user_id: string;
    name: string | null;
    last_name: string | null;
    email: string | null;
    role: string | null;
    is_active: boolean | null;
    image_profile: string | null;
    created_at: string | null;
    [k: string]: unknown;
  }
  export function useGymMembers(
    gymId: string | null,
    currentUserId: string | null,
    opts?: { onlyRole?: string | null }
  ): UseQueryResult<GymMember[]>;
}
