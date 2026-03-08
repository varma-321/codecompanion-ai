
ALTER TABLE public.test_cases ADD COLUMN IF NOT EXISTS inputs jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Migrate existing data: convert old single input/variable_name to new JSON inputs format
UPDATE public.test_cases 
SET inputs = jsonb_build_object(variable_name, input)
WHERE inputs = '{}'::jsonb AND input != '';
