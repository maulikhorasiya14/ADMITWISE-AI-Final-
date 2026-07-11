import type { CollegeListItem, Ownership } from "./collegeSchemas";

export type OwnershipFilter = Ownership | "ALL";

export function filterPublishedColleges(colleges: CollegeListItem[]) {
  return colleges.filter((college) => college.is_published);
}

export function filterCollegesBySearchAndOwnership(
  colleges: CollegeListItem[],
  search: string,
  ownership: OwnershipFilter
) {
  const normalizedSearch = search.trim().toLowerCase();

  return filterPublishedColleges(colleges).filter((college) => {
    const matchesSearch = normalizedSearch.length === 0 || college.name.toLowerCase().includes(normalizedSearch);
    const matchesOwnership = ownership === "ALL" || college.ownership === ownership;
    return matchesSearch && matchesOwnership;
  });
}

export function getCollegeEmptyStateMessage(search: string, ownership: OwnershipFilter) {
  if (search.trim() || ownership !== "ALL") {
    return "No published colleges match the current search or ownership filter.";
  }

  return "No published colleges are available yet. Draft colleges stay hidden until they are verified and published.";
}

