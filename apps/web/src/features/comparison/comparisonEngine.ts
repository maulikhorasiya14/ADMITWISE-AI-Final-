import {
  assertExactlyTwoComparisonOptions,
  calculateEffectiveCost,
  calculateTotalFourYearCost,
  compareCategoryWinner,
  comparisonModeWeights,
  scoreAffordability,
  scorePlacement,
  scoreRoi,
  selectPlacementPackage
} from "@admitwise/scoring";
import type { ComparisonBranchOption, ComparisonMode, ComparisonResult, FeeRecord, PlacementRecord } from "./comparisonTypes.ts";

export function buildComparisonResult(
  options: ComparisonBranchOption[],
  mode: ComparisonMode,
  scholarshipAmount?: number,
  maximumAnnualBudget?: number
): ComparisonResult | null {
  const publishedOptions = filterPublishedComparisonOptions(options);
  const twoOptions = assertExactlyTwoComparisonOptions(publishedOptions.map((option) => option.optionId));

  if (twoOptions.score !== 100) {
    return null;
  }

  const [left, right] = publishedOptions;
  if (!left || !right) {
    return null;
  }

  const comparedOptions = [
    buildComparedOption("left", left, mode, scholarshipAmount, maximumAnnualBudget),
    buildComparedOption("right", right, mode, scholarshipAmount, maximumAnnualBudget)
  ];

  const categoryWinners = {
    admission: compareCategoryWinner(comparedOptions[0].admissionScore, comparedOptions[1].admissionScore),
    branchFit: compareCategoryWinner(comparedOptions[0].branchFitScore, comparedOptions[1].branchFitScore),
    fourYearCost: compareCategoryWinner(comparedOptions[0].fourYearCost, comparedOptions[1].fourYearCost, false),
    placementPercentage: compareCategoryWinner(comparedOptions[0].placementPercentage, comparedOptions[1].placementPercentage),
    package: compareCategoryWinner(
      comparedOptions[0].medianPackage ?? comparedOptions[0].averagePackage,
      comparedOptions[1].medianPackage ?? comparedOptions[1].averagePackage
    ),
    roi: compareCategoryWinner(comparedOptions[0].roiScore, comparedOptions[1].roiScore),
    affordability: compareCategoryWinner(comparedOptions[0].affordabilityScore, comparedOptions[1].affordabilityScore),
    dataConfidence: compareCategoryWinner(comparedOptions[0].dataConfidenceScore, comparedOptions[1].dataConfidenceScore)
  };

  return {
    mode,
    winner: compareCategoryWinner(comparedOptions[0].modeScore, comparedOptions[1].modeScore),
    options: comparedOptions,
    categoryWinners
  };
}

export function filterPublishedComparisonOptions(options: ComparisonBranchOption[]) {
  return options.map((option) => ({
    ...option,
    fee: option.fee && isPublishedFee(option.fee) ? option.fee : null,
    placement: option.placement && isPublishedPlacement(option.placement) ? option.placement : null
  })).filter((option) => option.collegeIsPublished && option.branchVerificationStatus === "published");
}

function buildComparedOption(
  side: "left" | "right",
  option: ComparisonBranchOption,
  mode: ComparisonMode,
  scholarshipAmount?: number,
  maximumAnnualBudget?: number
): ComparisonResult["options"][number] {
  const cost = option.fee ? calculateTotalFourYearCost({
    tuitionFee: option.fee.tuition_fee,
    hostelFee: option.fee.hostel_fee,
    messFee: option.fee.mess_fee,
    admissionFee: option.fee.admission_fee,
    refundableDeposit: option.fee.refundable_deposit,
    otherCompulsoryFees: option.fee.other_compulsory_fees,
    estimatedFourYearCost: option.fee.estimated_four_year_cost
  }) : null;
  const fourYearCost = cost ? cost.score : null;
  const effectiveCost = fourYearCost !== null ? calculateEffectiveCost({ fourYearCost, scholarshipAmount }).score : null;
  const placement = option.placement ? scorePlacement({
    placementPercentage: option.placement.placement_percentage,
    medianPackage: option.placement.median_package,
    averagePackage: option.placement.average_package
  }) : null;
  const roi = option.placement && fourYearCost !== null ? scoreRoi({
    fourYearCost,
    medianPackage: option.placement.median_package,
    averagePackage: option.placement.average_package
  }) : null;
  const affordability = fourYearCost !== null ? scoreAffordability({
    fourYearCost,
    maximumAnnualBudget
  }) : null;
  const selectedPackage = option.placement ? selectPlacementPackage({
    medianPackage: option.placement.median_package,
    averagePackage: option.placement.average_package
  }) : { source: "missing" as const };
  const dataConfidenceScore = confidenceScore(option.confidenceLevel);
  const weights = comparisonModeWeights[mode];
  const modeScore =
    ((option.branchFitScore ?? 0) * weights.branchFit +
      (placement?.score ?? 0) * weights.placement +
      (option.admissionScore ?? 0) * weights.admissionChance +
      (affordability?.score ?? 0) * weights.affordability +
      dataConfidenceScore * weights.dataConfidence) / 100;
  const missingInformation = [
    ...(cost?.missingData ?? ["fees"]),
    ...(placement?.missingData ?? ["placements"]),
    ...(roi?.missingData ?? []),
    option.admissionClassification ? null : "admission classification"
  ].filter((value): value is string => Boolean(value));

  return {
    side,
    optionId: option.optionId,
    collegeName: option.collegeName,
    collegeSlug: option.collegeSlug,
    branchName: option.branchName,
    admissionClassification: option.admissionClassification,
    admissionScore: option.admissionScore,
    branchFitScore: option.branchFitScore,
    fourYearCost,
    effectiveCost,
    placementPercentage: option.placement?.placement_percentage ?? null,
    medianPackage: option.placement?.median_package ?? null,
    averagePackage: option.placement?.average_package ?? null,
    preferredPackageSource: selectedPackage.source,
    roiScore: roi?.score ?? null,
    affordabilityScore: affordability?.score ?? null,
    placementScore: placement?.score ?? null,
    dataConfidenceScore,
    modeScore: Math.round(modeScore),
    missingInformation,
    sourceLabels: buildSourceLabels(option.fee, option.placement)
  };
}

function isPublishedFee(fee: FeeRecord) {
  return fee.is_published && fee.verification_status === "published";
}

function isPublishedPlacement(placement: PlacementRecord) {
  return placement.is_published && placement.verification_status === "published";
}

function confidenceScore(confidence: string | null) {
  switch (confidence) {
    case "A":
      return 100;
    case "B":
      return 85;
    case "C":
      return 70;
    case "D":
      return 50;
    default:
      return 30;
  }
}

function buildSourceLabels(fee: FeeRecord | null, placement: PlacementRecord | null) {
  return [fee?.sources, placement?.sources]
    .filter((source): source is NonNullable<FeeRecord["sources"]> => Boolean(source))
    .map((source) => `${source.title}${source.academic_year ? ` (${source.academic_year})` : ""}`);
}
