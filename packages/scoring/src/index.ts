import type { ComparisonMode, ComparisonWinner, PreferenceWeights, RecommendationClassification, ScoreResult } from "@admitwise/shared-types";

type AdmissionChanceInput = {
  studentRank?: number;
  openingRank?: number;
  closingRank?: number;
};

type BranchFitInput = {
  branchName: string;
  preferredBranches: string[];
};

type FinancialFitInput = {
  maximumAnnualBudget?: number;
  annualCost?: number;
};

type OverallFitInput = {
  weights: PreferenceWeights;
  componentScores: {
    admission: number;
    branchFit: number;
    placement: number;
    affordability: number;
    scholarship: number;
    location: number;
    culture: number;
  };
};

type RecommendationFitInput = {
  weights: Pick<PreferenceWeights, "admissionChance" | "branchFit">;
  componentScores: {
    admission: number;
    branchFit: number;
  };
};

type FourYearCostInput = {
  tuitionFee?: number | null;
  hostelFee?: number | null;
  messFee?: number | null;
  admissionFee?: number | null;
  refundableDeposit?: number | null;
  otherCompulsoryFees?: number | null;
  estimatedFourYearCost?: number | null;
};

type EffectiveCostInput = {
  fourYearCost?: number | null;
  scholarshipAmount?: number | null;
};

type PlacementScoreInput = {
  placementPercentage?: number | null;
  medianPackage?: number | null;
  averagePackage?: number | null;
};

type RoiScoreInput = {
  fourYearCost?: number | null;
  medianPackage?: number | null;
  averagePackage?: number | null;
};

type AffordabilityScoreInput = {
  fourYearCost?: number | null;
  maximumAnnualBudget?: number | null;
};

type ComparisonValue = number | null | undefined;

export type ComparisonWeights = {
  branchFit: number;
  placement: number;
  admissionChance: number;
  affordability: number;
  dataConfidence: number;
};

export const comparisonModeWeights: Record<ComparisonMode, ComparisonWeights> = {
  student: {
    branchFit: 30,
    placement: 30,
    admissionChance: 25,
    affordability: 15,
    dataConfidence: 0
  },
  parent: {
    branchFit: 0,
    placement: 25,
    admissionChance: 20,
    affordability: 30,
    dataConfidence: 25
  }
};

const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

const hasValue = (value: number | null | undefined): value is number => value !== null && value !== undefined;

export function scoreAdmissionChance(input: AdmissionChanceInput): ScoreResult {
  if (!input.studentRank || !input.closingRank) {
    return { score: 0, missingData: ["rank_or_cutoff"], notes: ["Admission chance requires rank and cutoff."] };
  }

  const margin = input.closingRank - input.studentRank;
  const denominator = Math.max(input.closingRank, 1);

  if (margin >= 0) {
    const openingBonus = input.openingRank && input.studentRank <= input.openingRank ? 8 : 0;
    return {
      score: clampScore(70 + (margin / denominator) * 25 + openingBonus),
      missingData: [],
      notes: ["Rank is inside the published closing rank."]
    };
  }

  const overCutoffRatio = Math.abs(margin) / denominator;
  return {
    score: clampScore(70 - overCutoffRatio * 160),
    missingData: [],
    notes: [overCutoffRatio <= 0.15 ? "Rank is near the published closing rank." : "Rank is outside the published closing rank."]
  };
}

export function scoreBranchFit(input: BranchFitInput): ScoreResult {
  const normalizedBranch = input.branchName.trim().toLowerCase();
  const preferred = input.preferredBranches.map((branch) => branch.trim().toLowerCase());
  const isPreferred = preferred.some((branch) => normalizedBranch.includes(branch) || branch.includes(normalizedBranch));

  return {
    score: isPreferred ? 100 : 35,
    missingData: input.preferredBranches.length === 0 ? ["preferred_branches"] : [],
    notes: [isPreferred ? "Branch matches student preference." : "Branch is not in the student's preferred branch list."]
  };
}

export function scoreFinancialFit(input: FinancialFitInput): ScoreResult {
  if (!input.maximumAnnualBudget || !input.annualCost) {
    return { score: 0, missingData: ["budget_or_cost"], notes: ["Financial fit requires budget and annual cost."] };
  }

  return {
    score: clampScore((input.maximumAnnualBudget / input.annualCost) * 100),
    missingData: [],
    notes: ["Minimal affordability shell."]
  };
}

export function calculateTotalFourYearCost(input: FourYearCostInput): ScoreResult {
  if (hasValue(input.estimatedFourYearCost)) {
    return {
      score: Math.round(input.estimatedFourYearCost),
      missingData: [],
      notes: ["Using verified estimated four-year cost."]
    };
  }

  const missingData: string[] = [];
  if (!hasValue(input.tuitionFee)) missingData.push("tuition_fee");
  if (!hasValue(input.hostelFee)) missingData.push("hostel_fee");
  if (!hasValue(input.messFee)) missingData.push("mess_fee");

  const annualRecurring =
    (input.tuitionFee ?? 0) +
    (input.hostelFee ?? 0) +
    (input.messFee ?? 0);
  const oneTime =
    (input.admissionFee ?? 0) +
    (input.refundableDeposit ?? 0) +
    (input.otherCompulsoryFees ?? 0);

  return {
    score: Math.round(annualRecurring * 4 + oneTime),
    missingData,
    notes: ["Calculated from annual tuition, hostel, mess and one-time compulsory fees."]
  };
}

export function calculateEffectiveCost(input: EffectiveCostInput): ScoreResult {
  if (!hasValue(input.fourYearCost)) {
    return {
      score: 0,
      missingData: ["four_year_cost"],
      notes: ["Effective cost requires four-year cost."]
    };
  }

  return {
    score: Math.max(0, Math.round(input.fourYearCost - (input.scholarshipAmount ?? 0))),
    missingData: [],
    notes: [input.scholarshipAmount ? "Optional scholarship amount subtracted from four-year cost." : "No scholarship amount applied."]
  };
}

export function selectPlacementPackage(input: PlacementScoreInput): {
  packageLpa?: number;
  source: "median" | "average" | "missing";
} {
  if (hasValue(input.medianPackage)) {
    return { packageLpa: input.medianPackage, source: "median" };
  }

  if (hasValue(input.averagePackage)) {
    return { packageLpa: input.averagePackage, source: "average" };
  }

  return { source: "missing" };
}

export function scorePlacement(input: PlacementScoreInput): ScoreResult {
  const selectedPackage = selectPlacementPackage(input);
  const missingData: string[] = [];
  if (!hasValue(input.placementPercentage)) missingData.push("placement_percentage");
  if (!selectedPackage.packageLpa) missingData.push("median_or_average_package");

  const placementComponent = hasValue(input.placementPercentage) ? input.placementPercentage : 0;
  const packageComponent = selectedPackage.packageLpa ? clampScore((selectedPackage.packageLpa / 20) * 100) : 0;

  return {
    score: clampScore(placementComponent * 0.6 + packageComponent * 0.4),
    missingData,
    notes: [selectedPackage.source === "median" ? "Median package preferred over average package." : "Placement score uses available placement percentage and package data."]
  };
}

export function scoreRoi(input: RoiScoreInput): ScoreResult {
  if (!hasValue(input.fourYearCost) || input.fourYearCost <= 0) {
    return {
      score: 0,
      missingData: ["four_year_cost"],
      notes: ["ROI requires verified cost data."]
    };
  }

  const selectedPackage = selectPlacementPackage(input);
  if (!selectedPackage.packageLpa) {
    return {
      score: 0,
      missingData: ["median_or_average_package"],
      notes: ["ROI requires median package when available, otherwise average package."]
    };
  }

  return {
    score: clampScore(((selectedPackage.packageLpa * 100000) / input.fourYearCost) * 100),
    missingData: [],
    notes: [`ROI uses ${selectedPackage.source} package as an annual package proxy; it is not a salary guarantee.`]
  };
}

export function scoreAffordability(input: AffordabilityScoreInput): ScoreResult {
  if (!hasValue(input.fourYearCost) || input.fourYearCost <= 0) {
    return {
      score: 0,
      missingData: ["four_year_cost"],
      notes: ["Affordability requires verified cost data."]
    };
  }

  if (!hasValue(input.maximumAnnualBudget) || input.maximumAnnualBudget <= 0) {
    return {
      score: 50,
      missingData: ["maximum_annual_budget"],
      notes: ["No budget was supplied; showing a neutral affordability score."]
    };
  }

  return {
    score: clampScore(((input.maximumAnnualBudget * 4) / input.fourYearCost) * 100),
    missingData: [],
    notes: ["Affordability compares four-year budget with verified four-year cost."]
  };
}

export function scoreOverallFit(input: OverallFitInput): ScoreResult {
  const totalWeight = Object.values(input.weights).reduce((sum, weight) => sum + weight, 0);

  if (totalWeight !== 100) {
    return { score: 0, missingData: ["valid_preference_weights"], notes: ["Preference weights must total 100."] };
  }

  const weightedScore =
    input.componentScores.admission * input.weights.admissionChance +
    input.componentScores.branchFit * input.weights.branchFit +
    input.componentScores.placement * input.weights.placement +
    input.componentScores.affordability * input.weights.affordability +
    input.componentScores.scholarship * input.weights.scholarship +
    input.componentScores.location * input.weights.location +
    input.componentScores.culture * input.weights.culture;

  return {
    score: clampScore(weightedScore / 100),
    missingData: [],
    notes: ["Weighted shell; missing-input penalties are deferred."]
  };
}

export function scoreRecommendationFit(input: RecommendationFitInput): ScoreResult {
  const availableWeight = input.weights.admissionChance + input.weights.branchFit;

  if (availableWeight <= 0) {
    return {
      score: 0,
      missingData: ["admission_or_branch_weight"],
      notes: ["Recommendation fit requires a non-zero admission or branch preference weight."]
    };
  }

  const weightedScore =
    input.componentScores.admission * input.weights.admissionChance +
    input.componentScores.branchFit * input.weights.branchFit;

  const admissionCappedScore = Math.min(weightedScore / availableWeight, input.componentScores.admission + 15);

  return {
    score: clampScore(admissionCappedScore),
    missingData: [],
    notes: ["Overall fit uses currently available admission and branch signals only."]
  };
}

export function classifyRecommendation(score: number): RecommendationClassification {
  if (score >= 75) return "SAFE";
  if (score >= 55) return "SMART";
  if (score >= 35) return "AMBITIOUS";
  return "UNLIKELY";
}

export const classifyAdmissionChance = classifyRecommendation;

export function compareCategoryWinner(left: ComparisonValue, right: ComparisonValue, higherIsBetter = true): ComparisonWinner {
  if (!hasValue(left) && !hasValue(right)) return "insufficient_data";
  if (!hasValue(left)) return "right";
  if (!hasValue(right)) return "left";
  if (left === right) return "tie";

  if (higherIsBetter) {
    return left > right ? "left" : "right";
  }

  return left < right ? "left" : "right";
}

export function assertExactlyTwoComparisonOptions(optionIds: string[]): ScoreResult {
  return {
    score: optionIds.length === 2 ? 100 : 0,
    missingData: optionIds.length === 2 ? [] : ["exactly_two_options"],
    notes: [optionIds.length === 2 ? "Exactly two options selected." : "Comparison requires exactly two college-branch options."]
  };
}
