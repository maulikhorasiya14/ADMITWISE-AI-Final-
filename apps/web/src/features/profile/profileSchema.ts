import { z } from "zod";

export const profileStorageKey = "admitwise.guestProfile.v2";

export const preferenceWeightKeys = [
  "admissionChance",
  "branchFit",
  "placement",
  "affordability",
  "scholarship",
  "location",
  "culture"
] as const;

const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    const num = Number(value);
    if (Number.isNaN(num)) return undefined;
    return num;
  }, schema.optional());

const requiredNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    return Number(value);
  }, schema);

export const preferenceWeightsSchema = z.object({
  admissionChance: requiredNumber(z.number().int().min(0).max(100)),
  branchFit: requiredNumber(z.number().int().min(0).max(100)),
  placement: requiredNumber(z.number().int().min(0).max(100)),
  affordability: requiredNumber(z.number().int().min(0).max(100)),
  scholarship: requiredNumber(z.number().int().min(0).max(100)),
  location: requiredNumber(z.number().int().min(0).max(100)),
  culture: requiredNumber(z.number().int().min(0).max(100))
});

export const examScoreSchema = z.object({
  exam: z.string().trim().min(1, "Exam is required"),
  examYear: requiredNumber(z.number().int().min(2000).max(2100)),
  rank: optionalNumber(z.number().int().positive("Rank must be positive")),
  categoryRank: optionalNumber(z.number().int().positive("Category rank must be positive")),
  percentile: optionalNumber(z.number().min(0).max(100, "Percentile must be between 0 and 100")),
  marks: optionalNumber(z.number().min(0, "Marks cannot be negative")),
});

export const studentProfileSchema = z
  .object({
    id: z.string().min(1),
    exams: z.array(examScoreSchema).min(1, "Add at least one exam score"),
    category: z.enum(["GENERAL", "EWS", "OBC_NCL", "SC", "ST", "OTHER"]),
    gender: z.enum(["FEMALE", "MALE", "OTHER", "PREFER_NOT_TO_SAY"]),
    homeState: z.string().trim().min(1, "Home state is required"),
    homeCity: z.string().trim().optional(),
    preferredBranches: z.array(z.string().trim().min(1)).min(1, "Choose at least one branch"),
    preferredStates: z.array(z.string().trim().min(1)),
    collegeTypePreference: z.enum(["GOVERNMENT", "PRIVATE", "BOTH"]),
    hostelRequired: z.boolean(),
    maximumAnnualBudget: optionalNumber(z.number().min(0, "Budget cannot be negative")),
    familyIncomeBand: z.string().trim().optional(),
    careerGoal: z.enum(["SOFTWARE", "CORE", "HIGHER_STUDIES", "STARTUP", "UNDECIDED"]),
    weights: preferenceWeightsSchema
  })
  .superRefine((profile, context) => {
    const total = getPreferenceWeightTotal(profile.weights);
    if (total !== 100) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Preference weights must total exactly 100",
        path: ["weights"]
      });
    }
  });

export type StudentProfileFormValues = z.input<typeof studentProfileSchema>;
export type SavedStudentProfile = z.output<typeof studentProfileSchema>;

export const defaultProfileValues: StudentProfileFormValues = {
  id: "guest-profile",
  exams: [
    {
      exam: "JEE Main",
      examYear: new Date().getFullYear(),
      rank: undefined,
      categoryRank: undefined,
      percentile: undefined,
      marks: undefined,
    }
  ],
  category: "GENERAL",
  gender: "PREFER_NOT_TO_SAY",
  homeState: "",
  homeCity: "",
  preferredBranches: [],
  preferredStates: [],
  collegeTypePreference: "BOTH",
  hostelRequired: true,
  maximumAnnualBudget: undefined,
  familyIncomeBand: "",
  careerGoal: "UNDECIDED",
  weights: {
    admissionChance: 20,
    branchFit: 20,
    placement: 20,
    affordability: 15,
    scholarship: 10,
    location: 10,
    culture: 5
  }
};

export function getPreferenceWeightTotal(weights: z.output<typeof preferenceWeightsSchema>) {
  return preferenceWeightKeys.reduce((total, key) => total + weights[key], 0);
}

export function parseStudentProfile(input: unknown) {
  return studentProfileSchema.safeParse(input);
}
