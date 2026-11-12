import { Badge, Card } from "../ui";

function Skills({ items, empty }) {
  return items.length ? (
    <ul className="flex flex-wrap gap-2">
      {items.map((skill) => <li key={skill}><Badge className="break-all">{skill}</Badge></li>)}
    </ul>
  ) : <p className="text-sm text-ink/80">{empty}</p>;
}

export default function CareerPlanResults({ plan }) {
  const resolvedRole = plan.role_resolution.resolved;
  const roleChanged = resolvedRole !== plan.target_role.toLowerCase();
  return (
    <section aria-labelledby="career-plan-result" className="space-y-5">
      <Card className="space-y-3">
        <h2 id="career-plan-result" className="break-words font-display text-xl font-bold text-ink">
          Career plan for {resolvedRole}
        </h2>
        <p role="status" className="text-sm text-ink/80">
          Based on {plan.total_market_jobs.toLocaleString()} matching job postings.
        </p>
        {roleChanged && <p className="break-words text-sm text-ink/80">Requested role: {plan.target_role}</p>}
        <h3 className="font-semibold text-ink">Your saved skills</h3>
        <Skills items={plan.your_skills} empty="No skills saved in your profile." />
      </Card>

      <div className="space-y-3">
        <h3 className="font-display text-lg font-bold text-ink">Skill gaps and learning resources</h3>
        {!plan.skill_gaps.length && (
          <p className="text-sm text-ink/80">
            {plan.total_market_jobs === 0
              ? "No matching job postings are available to identify skill gaps."
              : "No skill gaps were returned for your saved skills in these postings."}
          </p>
        )}
        {plan.skill_gaps.map((gap) => (
          <Card key={gap.skill_id} className="space-y-2">
            <h4 className="break-words font-semibold text-ink">{gap.skill}</h4>
            <p className="text-sm text-ink/80">
              {gap.postings_mentioning_it.toLocaleString()} postings mention this skill ({gap.market_demand_pct}% of matching postings).
            </p>
            {gap.resources.length ? (
              <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink">
                {gap.resources.map((resource) => (
                  <li key={resource.url}>
                    <a href={resource.url} className="underline underline-offset-2">
                      {resource.platform}{resource.type === "search" ? ` search for ${gap.skill}` : ` for ${gap.skill}`}
                    </a>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink/80">No learning resources were returned.</p>}
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-lg font-bold text-ink">Adjacent roles</h3>
        {plan.adjacent_roles.length ? (
          <>
            <p className="text-sm text-ink/80">These comparisons use skills associated with each role in job postings.</p>
            {plan.adjacent_roles.map((role) => (
              <Card key={role.role} className="space-y-2">
                <h4 className="break-words font-semibold capitalize text-ink">{role.role}</h4>
                <p className="text-sm text-ink/80">Role similarity score: {role.similarity} out of 1</p>
                <h5 className="text-sm font-semibold text-ink">Skills shared by both roles</h5>
                <Skills items={role.skills_you_have} empty="No shared skills were returned." />
                <h5 className="text-sm font-semibold text-ink">Skills specific to the adjacent role</h5>
                <Skills items={role.skills_you_would_need} empty="No additional skills were returned." />
              </Card>
            ))}
          </>
        ) : <p className="text-sm text-ink/80">No adjacent roles were returned.</p>}
      </div>
    </section>
  );
}
