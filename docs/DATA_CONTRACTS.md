# AdmitWise AI — Data Contracts

These contracts define what the application stores and what every API must validate.

## 1. Shared metadata for factual records

Every factual record should include:

```ts
type VerificationStatus =
  | "extracted"
  | "needs_review"
  | "approved"
  | "published"
  | "rejected"
  | "archived";

type SourceType =
  | "government"
  | "counselling_authority"
  | "official_college"
  | "verified_student"
  | "public_unverified"
  | "inference";

type ConfidenceLevel = "A" | "B" | "C" | "D" | "E";

interface FactMetadata {
  sourceId: string;
  sourceType: SourceType;
  academicYear?: string;
  collectedAt: string;
  lastVerifiedAt?: string;
  verificationStatus: VerificationStatus;
  confidenceLevel: ConfidenceLevel;
  verifiedBy?: string;
}
```

## 2. Student profile

```ts
interface StudentProfile {
  id: string;
  userId?: string;
  exam: string;
  examYear: number;
  rank?: number;
  percentile?: number;
  category: "GENERAL" | "EWS" | "OBC_NCL" | "SC" | "ST" | "OTHER";
  gender: "FEMALE" | "MALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  homeState: string;
  homeCity?: string;
  preferredBranches: string[];
  preferredStates: string[];
  collegeTypePreference: "GOVERNMENT" | "PRIVATE" | "BOTH";
  maximumAnnualBudget?: number;
  familyIncomeBand?: string;
  hostelRequired?: boolean;
  careerGoal?: "SOFTWARE" | "CORE" | "HIGHER_STUDIES" | "STARTUP" | "UNDECIDED";
  weights: PreferenceWeights;
}
```

## 3. Preference weights

Weights should total 100.

```ts
interface PreferenceWeights {
  admissionChance: number;
  branchFit: number;
  placement: number;
  affordability: number;
  scholarship: number;
  location: number;
  culture: number;
}
```

## 4. College

```ts
interface College {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  ownership: "GOVERNMENT" | "PRIVATE" | "DEEMED" | "OTHER";
  instituteType?: string;
  affiliatedUniversity?: string;
  establishedYear?: number;
  officialWebsite?: string;
  admissionWebsite?: string;
  placementWebsite?: string;
  address?: string;
  city: string;
  state: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  isPublished: boolean;
}
```

## 5. Branch and cutoff

```ts
interface CollegeBranch {
  id: string;
  collegeId: string;
  name: string;
  degree: string;
  durationYears: number;
  intake?: number;
  nbaAccredited?: boolean;
  metadata: FactMetadata;
}

interface CutoffRecord {
  id: string;
  collegeId: string;
  branchId: string;
  exam: string;
  year: number;
  round: string;
  category: string;
  quota: string;
  genderPool?: string;
  openingRank?: number;
  closingRank: number;
  metadata: FactMetadata;
}
```

## 6. Fees

```ts
interface FeeRecord {
  id: string;
  collegeId: string;
  academicYear: string;
  annualTuition?: number;
  totalTuition?: number;
  annualHostel?: number;
  annualMess?: number;
  admissionFee?: number;
  refundableDeposit?: number;
  examFee?: number;
  otherCompulsoryFees?: number;
  estimatedFourYearCost?: number;
  currency: "INR";
  metadata: FactMetadata;
}
```

## 7. Placement

```ts
interface PlacementRecord {
  id: string;
  collegeId: string;
  branchId?: string;
  placementYear: string;
  graduatingStudents?: number;
  eligibleStudents?: number;
  studentsPlaced?: number;
  placementPercentage?: number;
  averagePackageLpa?: number;
  medianPackageLpa?: number;
  highestPackageLpa?: number;
  internshipPpoNotes?: string;
  metadata: FactMetadata;
}

interface RecruiterRecord {
  id: string;
  collegeId: string;
  companyName: string;
  year: string;
  role?: string;
  eligibleBranches?: string[];
  hiringType?: "FULL_TIME" | "INTERNSHIP" | "PPO" | "UNKNOWN";
  campusStatus?: "ON_CAMPUS" | "OFF_CAMPUS" | "UNKNOWN";
  metadata: FactMetadata;
}
```

## 8. Scholarship

```ts
interface Scholarship {
  id: string;
  name: string;
  provider: string;
  applicableCollegeIds?: string[];
  applicableStates?: string[];
  categories?: string[];
  genderRequirement?: string;
  maximumFamilyIncome?: number;
  minimumMarks?: number;
  examRequirements?: string[];
  benefitDescription: string;
  benefitAmount?: number;
  requiredDocuments: string[];
  renewalConditions?: string[];
  applicationDeadline?: string;
  officialUrl?: string;
  metadata: FactMetadata;
}
```

## 9. Location metrics

```ts
interface LocationMetrics {
  collegeId: string;
  nearestRailwayStation?: string;
  railwayDistanceKm?: number;
  nearestAirport?: string;
  airportDistanceKm?: number;
  nearestMajorHospital?: string;
  hospitalDistanceKm?: number;
  publicTransportScore?: number;
  cityCentreDistanceKm?: number;
  technologyEcosystemScore?: number;
  costOfLivingBand?: "LOW" | "MEDIUM" | "HIGH";
  metadata: FactMetadata;
}
```

## 10. Student-reported campus reality

```ts
interface StudentReview {
  id: string;
  collegeId: string;
  branch?: string;
  graduationYear?: number;
  hostelStatus?: "HOSTELLER" | "DAY_SCHOLAR";
  verifiedStudent: boolean;
  seniorSupport?: number;
  academicStrictness?: number;
  facultyAccessibility?: number;
  hostelQuality?: number;
  messQuality?: number;
  clubActivity?: number;
  codingCulture?: number;
  placementSupport?: number;
  eveningTravelComfort?: number;
  overallSatisfaction?: number;
  wouldChooseAgain?: boolean;
  freeText?: string;
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
}
```

## 11. Recommendation output

```ts
interface RecommendationScore {
  collegeId: string;
  branchId: string;
  overallScore: number;
  classification: "SAFE" | "SMART" | "AMBITIOUS" | "AVOID";
  componentScores: {
    admission: number;
    branchFit: number;
    placement: number;
    affordability: number;
    scholarship: number;
    location: number;
    culture: number;
    confidence: number;
  };
  decisionRisks: DecisionRisk[];
  missingData: string[];
}
```

## 12. AI explanation output

```ts
interface AIExplanation {
  directAnswer: string;
  reasons: string[];
  risks: string[];
  missingData: string[];
  evidenceSourceIds: string[];
  nextAction?: string;
  insufficientData: boolean;
}
```

## 13. API rule

Every API response must either return:

```ts
{ success: true, data: ... }
```

or:

```ts
{
  success: false,
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  }
}
```
