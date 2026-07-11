"use client";

import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";
import { Controller, useForm, useFieldArray, type FieldPath, type UseFormReturn } from "react-hook-form";
import {
  defaultProfileValues,
  getPreferenceWeightTotal,
  preferenceWeightKeys,
  studentProfileSchema,
  type SavedStudentProfile,
  type StudentProfileFormValues
} from "@/features/profile/profileSchema";
import { saveGuestProfile } from "@/features/profile/profileStorage";
import { ProfileSummary } from "@/features/profile/ProfileSummary";

const steps = ["Exam", "Preferences", "Weights", "Review"] as const;
const branchOptions = ["Computer Science", "Electronics", "Mechanical", "Civil", "Electrical", "AI / Data Science"];
const stateOptions = ["Maharashtra", "Karnataka", "Delhi", "Gujarat", "Rajasthan", "Telangana", "Tamil Nadu"];

export function ProfileWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submittedProfile, setSubmittedProfile] = useState<SavedStudentProfile | null>(null);
  const form = useForm<StudentProfileFormValues, unknown, SavedStudentProfile>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: defaultProfileValues,
    mode: "onBlur"
  });

  const watchedWeights = form.watch("weights");
  const parsedPreview = studentProfileSchema.safeParse(form.watch());
  const weightTotal = watchedWeights ? getPreferenceWeightTotal(watchedWeights as SavedStudentProfile["weights"]) : 0;

  async function goNext() {
    const fieldsByStep: Array<Array<FieldPath<StudentProfileFormValues>>> = [
      ["exams", "category", "gender", "homeState", "homeCity"],
      ["preferredBranches", "preferredStates", "collegeTypePreference", "hostelRequired", "maximumAnnualBudget", "familyIncomeBand", "careerGoal"],
      ["weights"],
      []
    ];
    const valid = await form.trigger(fieldsByStep[step]);
    if (valid) {
      setStep((current) => Math.min(current + 1, steps.length - 1));
    }
  }

  function onSubmit(profile: SavedStudentProfile) {
    saveGuestProfile(profile);
    setSubmittedProfile(profile);
    router.push("/dashboard");
  }

  return (
    <div className="space-y-6">
      <ol className="grid gap-2 sm:grid-cols-4">
        {steps.map((label, index) => (
          <li key={label} className={`rounded-md border px-3 py-2 text-sm ${index === step ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <form onSubmit={form.handleSubmit(onSubmit)} className="rounded-lg border bg-card p-5 shadow-sm">
        {step === 0 ? <ExamStep form={form} /> : null}
        {step === 1 ? <PreferenceStep form={form} /> : null}
        {step === 2 ? <WeightsStep form={form} total={weightTotal} /> : null}
        {step === 3 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Review profile</h2>
            {parsedPreview.success ? (
              <ProfileSummary profile={parsedPreview.data} />
            ) : (
              <p className="rounded-md border border-warning bg-warning/20 p-3 text-sm">Some profile details still need attention before submission.</p>
            )}
          </div>
        ) : null}

        {form.formState.errors.root ? <p className="mt-4 text-sm text-destructive">{form.formState.errors.root.message}</p> : null}
        {form.formState.errors.weights ? <p className="mt-4 text-sm text-destructive">{form.formState.errors.weights.message}</p> : null}

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(current - 1, 0))}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          {step < steps.length - 1 ? (
            <button type="button" onClick={goNext} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-positive px-4 py-2 text-sm font-medium text-positive-foreground">
              <Check className="h-4 w-4" aria-hidden="true" />
              Save profile
            </button>
          )}
        </div>
      </form>

      {submittedProfile ? <p className="text-sm text-positive">Profile saved locally. Opening dashboard...</p> : null}
    </div>
  );
}

type FormApi = UseFormReturn<StudentProfileFormValues, unknown, SavedStudentProfile>;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-destructive" role="alert">{message}</p> : null;
}

function Label({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">{children}</label>;
}

function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm ${className}`} />;
}

function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">{children}</select>;
}

function ExamStep({ form }: { form: FormApi }) {
  const { register, control, formState } = form;
  const { errors } = formState;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "exams"
  });

  return (
    <section className="space-y-5">
      <h2 className="text-xl font-semibold">Exams and basics</h2>
      
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-md border p-4 relative bg-muted/20">
            {index > 0 && (
              <button 
                type="button" 
                onClick={() => remove(index)}
                className="absolute top-2 right-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                aria-label="Remove exam"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`exams.${index}.exam`}>Exam</Label>
                <Select id={`exams.${index}.exam`} {...register(`exams.${index}.exam` as const)}>
                  <option value="JEE Main">JEE Main</option>
                  <option value="JEE Advanced">JEE Advanced</option>
                  <option value="BITSAT">BITSAT</option>
                  <option value="VITEEE">VITEEE</option>
                  <option value="MHT-CET">MHT-CET</option>
                  <option value="Other">Other</option>
                </Select>
                <FieldError message={errors.exams?.[index]?.exam?.message} />
              </div>
              <div>
                <Label htmlFor={`exams.${index}.examYear`}>Exam year</Label>
                <Input id={`exams.${index}.examYear`} type="number" {...register(`exams.${index}.examYear` as const, { valueAsNumber: true })} />
                <FieldError message={errors.exams?.[index]?.examYear?.message} />
              </div>
              <div>
                <Label htmlFor={`exams.${index}.rank`}>Rank</Label>
                <Input id={`exams.${index}.rank`} type="number" {...register(`exams.${index}.rank` as const, { valueAsNumber: true })} placeholder="Optional" />
                <FieldError message={errors.exams?.[index]?.rank?.message} />
              </div>
              <div>
                <Label htmlFor={`exams.${index}.percentile`}>Percentile</Label>
                <Input id={`exams.${index}.percentile`} type="number" step="0.001" {...register(`exams.${index}.percentile` as const, { valueAsNumber: true })} placeholder="Optional" />
                <FieldError message={errors.exams?.[index]?.percentile?.message} />
              </div>
              <div>
                <Label htmlFor={`exams.${index}.marks`}>Marks</Label>
                <Input id={`exams.${index}.marks`} type="number" {...register(`exams.${index}.marks` as const, { valueAsNumber: true })} placeholder="Optional" />
                <FieldError message={errors.exams?.[index]?.marks?.message} />
              </div>
            </div>
            <FieldError message={errors.exams?.[index]?.root?.message} />
          </div>
        ))}
        <button 
          type="button"
          onClick={() => append({ exam: "JEE Main", examYear: new Date().getFullYear(), rank: undefined, percentile: undefined, marks: undefined })}
          className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add another exam
        </button>
        <FieldError message={errors.exams?.root?.message || errors.exams?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
        <div>
          <Label htmlFor="profile-category">Category</Label>
          <Select id="profile-category" {...register("category")}>
            {["GENERAL", "EWS", "OBC_NCL", "SC", "ST", "OTHER"].map((value) => <option key={value}>{value}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="profile-gender">Gender</Label>
          <Select id="profile-gender" {...register("gender")}>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
            <option value="OTHER">Other</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="profile-home-state">Home state</Label>
          <Input id="profile-home-state" {...register("homeState")} placeholder="Maharashtra" />
          <FieldError message={formState.errors.homeState?.message} />
        </div>
        <div>
          <Label htmlFor="profile-home-city">Home city</Label>
          <Input id="profile-home-city" {...register("homeCity")} placeholder="Pune" />
        </div>
      </div>
    </section>
  );
}

function PreferenceStep({ form }: { form: FormApi }) {
  const { control, register, formState } = form;
  return (
    <section className="space-y-5">
      <h2 className="text-xl font-semibold">Preferences</h2>
      <Controller
        control={control}
        name="preferredBranches"
        render={({ field }) => (
          <CheckboxGroup label="Preferred branches" options={branchOptions} values={field.value} onChange={field.onChange} />
        )}
      />
      <FieldError message={formState.errors.preferredBranches?.message} />
      <Controller
        control={control}
        name="preferredStates"
        render={({ field }) => (
          <CheckboxGroup label="Preferred states" options={stateOptions} values={field.value} onChange={field.onChange} />
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="profile-college-type">College type</Label>
          <Select id="profile-college-type" {...register("collegeTypePreference")}>
            <option value="GOVERNMENT">Government</option>
            <option value="PRIVATE">Private</option>
            <option value="BOTH">Both</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="profile-hostel-required">Hostel requirement</Label>
          <Select id="profile-hostel-required" {...register("hostelRequired", { setValueAs: (value) => value === "true" })}>
            <option value="true">Hostel required</option>
            <option value="false">Hostel not required</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="profile-maximum-budget">Maximum annual budget</Label>
          <Input id="profile-maximum-budget" type="number" {...register("maximumAnnualBudget")} placeholder="Optional" />
          <FieldError message={formState.errors.maximumAnnualBudget?.message} />
        </div>
        <div>
          <Label htmlFor="profile-income-band">Family income band</Label>
          <Input id="profile-income-band" {...register("familyIncomeBand")} placeholder="Example: 5L-8L" />
        </div>
        <div>
          <Label htmlFor="profile-career-goal">Career goal</Label>
          <Select id="profile-career-goal" {...register("careerGoal")}>
            <option value="SOFTWARE">Software</option>
            <option value="CORE">Core engineering</option>
            <option value="HIGHER_STUDIES">Higher studies</option>
            <option value="STARTUP">Startup</option>
            <option value="UNDECIDED">Undecided</option>
          </Select>
        </div>
      </div>
    </section>
  );
}

function CheckboxGroup({ label, options, values, onChange }: { label: string; options: string[]; values: string[]; onChange: (value: string[]) => void }) {
  function toggle(option: string) {
    onChange(values.includes(option) ? values.filter((value) => value !== option) : [...values, option]);
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(option)}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${selected ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}
            >
              {selected ? <X className="h-3 w-3" aria-hidden="true" /> : <Plus className="h-3 w-3" aria-hidden="true" />}
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function WeightsStep({ form, total }: { form: FormApi; total: number }) {
  const { register } = form;
  const labels: Record<(typeof preferenceWeightKeys)[number], string> = {
    admissionChance: "Admission chance",
    branchFit: "Branch fit",
    placement: "Placement",
    affordability: "Affordability",
    scholarship: "Scholarship",
    location: "Location",
    culture: "Culture"
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Preference weights</h2>
        <span className={`rounded-md px-3 py-1 text-sm font-medium ${total === 100 ? "bg-positive text-positive-foreground" : "bg-warning text-warning-foreground"}`}>
          Total {total}/100
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {preferenceWeightKeys.map((key) => (
          <div key={key}>
            <Label htmlFor={`profile-weight-${key}`}>{labels[key]}</Label>
            <Input id={`profile-weight-${key}`} type="number" min={0} max={100} {...register(`weights.${key}`)} />
          </div>
        ))}
      </div>
    </section>
  );
}
