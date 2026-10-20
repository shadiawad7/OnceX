import type { TeamPlan } from '../data/teamPlans';

// Display matches the server's effective plan, including the interval between cron runs.
export function effectiveTeamPlan(team:{plan_code?:string;pending_plan_code?:string|null;plan_period_ends_at?:string}):TeamPlan {
 const pendingDue=team.pending_plan_code&&team.plan_period_ends_at&&Date.parse(team.plan_period_ends_at)<=Date.now();
 return (pendingDue?team.pending_plan_code:team.plan_code)==='pro'?'pro':'basic';
}
