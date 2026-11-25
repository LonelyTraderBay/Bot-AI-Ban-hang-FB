-- Record the registered sample size for new evaluations. Older runs retain unknown size.
ALTER TABLE evaluations
  ADD COLUMN planned_cases integer,
  ADD CONSTRAINT evaluation_planned_cases_positive CHECK (planned_cases IS NULL OR planned_cases > 0);
