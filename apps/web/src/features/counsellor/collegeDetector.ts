

export type CollegeSummaryForDetection = {
  id: string;
  name: string;
  shortName?: string | null;
  slug: string;
  city: string;
  state: string;
};

export type DetectionResult = {
  collegeIds: string[];
  detectedNames: string[];
  branchKeywords: string[];
};


const BRANCH_KEYWORD_MAP: Record<string, string[]> = {
  "Computer Science": ["cse", "cs", "computer science", "computer engineering", "comps", "b.tech cse"],
  "Information Technology": ["it", "information technology", "infotech"],
  "Electronics": ["ece", "electronics", "electrical and electronics", "e&tc", "entc", "extc"],
  "Electrical": ["eee", "electrical engineering", "ee"],
  "Mechanical": ["mechanical", "mech", "me"],
  "Civil": ["civil", "civil engineering", "ce"],
  "Chemical": ["chemical", "chem eng"],
  "Aerospace": ["aerospace", "aeronautical", "aero"],
  "Biotechnology": ["biotech", "biotechnology", "bioinformatics"],
  "Data Science": ["data science", "ds", "ai", "artificial intelligence", "machine learning", "ml"]
};


function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}


function collegeTokens(college: CollegeSummaryForDetection): string[] {
  const tokens: string[] = [
    normalise(college.name),
    normalise(college.slug.replace(/-/g, " ")),
    normalise(college.city)
  ];
  if (college.shortName) {
    tokens.push(normalise(college.shortName));
  }

  const abbrev = college.name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toLowerCase();
  if (abbrev.length >= 2) {
    tokens.push(abbrev);
  }
  return tokens.filter((t) => t.length >= 2);
}


export function detectCollegesInQuestion(
  question: string,
  colleges: CollegeSummaryForDetection[]
): DetectionResult {
  const normQuestion = normalise(question);
  const matched: CollegeSummaryForDetection[] = [];

  for (const college of colleges) {
    const tokens = collegeTokens(college);
    const isMatch = tokens.some((token) => {

      if (normQuestion.includes(token)) return true;

      if (token.length <= 6) {
        const wordBoundaryRegex = new RegExp(`\\b${token}\\b`);
        return wordBoundaryRegex.test(normQuestion);
      }
      return false;
    });

    if (isMatch) {
      matched.push(college);
    }
  }

  const detectedBranches: string[] = [];
  for (const [branchName, aliases] of Object.entries(BRANCH_KEYWORD_MAP)) {
    const found = aliases.some((alias) => normQuestion.includes(alias));
    if (found) {
      detectedBranches.push(branchName);
    }
  }

  return {
    collegeIds: matched.map((c) => c.id),
    detectedNames: matched.map((c) => c.name),
    branchKeywords: detectedBranches
  };
}


export function buildCollegeDetectionIndex(
  colleges: CollegeSummaryForDetection[]
): CollegeSummaryForDetection[] {
  return colleges;
}
