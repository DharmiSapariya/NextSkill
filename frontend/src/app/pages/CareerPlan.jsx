import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getCareerPlan } from "../../lib/api";
import { TRACKED_ROLES } from "../../lib/roles";
import { Button, Card, EmptyState, ErrorState, Input, PageHeader } from "../ui";
import CareerPlanResults from "./CareerPlanResults";

export default function CareerPlan() {
  const { refreshUser } = useAuth();
  const [role, setRole] = useState("");
  const [validation, setValidation] = useState("");
  const [plan, setPlan] = useState(null);
  const [failure, setFailure] = useState(null);
  const [loading, setLoading] = useState(false);
  const pending = useRef(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function generate(targetRole) {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setFailure(null);
    setPlan(null);
    setLoading(true);

    try {
      const result = await getCareerPlan(targetRole, controller.signal);
      if (!controller.signal.aborted) setPlan(result);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.status === 401) await refreshUser();
      if (controller.signal.aborted) return;
      const message = error.status === 401
        ? "Your session couldn’t be confirmed for this request. Try again."
        : error.status === 403
          ? "You don’t have permission to generate this plan."
          : error.status === 429
            ? "Too many requests. Wait a minute and try again."
            : "We couldn’t load your career plan. Try again.";
      setFailure({ targetRole, message });
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    const targetRole = role.trim();
    if (!targetRole) {
      setValidation("Enter a target role.");
      event.currentTarget.elements.target_role.focus();
      return;
    }
    setValidation("");
    void generate(targetRole);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Analyze"
        title="Career Plan"
        description="Explore skill gaps, learning resources, and adjacent roles using your saved skills and ingested job postings."
      />
      <Card>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <Input
              label="Target role"
              name="target_role"
              list="career-plan-roles"
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setValidation("");
              }}
              aria-required="true"
              aria-invalid={Boolean(validation)}
              aria-describedby={validation ? "career-plan-validation" : undefined}
              placeholder="e.g. software engineer"
            />
            <datalist id="career-plan-roles">
              {TRACKED_ROLES.map((option) => <option key={option} value={option} />)}
            </datalist>
            {validation && <p id="career-plan-validation" role="alert" className="mt-2 text-sm text-red-700">{validation}</p>}
          </div>
          <Button type="submit" disabled={loading}>Generate plan</Button>
        </form>
      </Card>

      {loading && <p role="status" className="py-8 text-center text-sm text-ink/80">Generating career plan…</p>}
      {failure && (
        <div role="region" aria-label="Career plan error">
          <p role="alert" className="sr-only">{failure.message}</p>
          <ErrorState message={failure.message} onRetry={() => generate(failure.targetRole)} />
        </div>
      )}
      {plan && <CareerPlanResults plan={plan} />}
      {!loading && !failure && !plan && (
        <EmptyState title="Choose a target role" description="Generate a plan to see how your saved skills compare with the role’s job postings." />
      )}
    </div>
  );
}
