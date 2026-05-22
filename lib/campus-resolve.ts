import { DEFAULT_SPOTS, getCampusCandidate } from "@/lib/henan-campuses";
import { prisma } from "@/lib/prisma";

export async function ensureCampusWithDefaultSpots(sourceCode: string) {
  const candidate = getCampusCandidate(sourceCode);
  if (!candidate) return null;

  const campus = await prisma.campus.upsert({
    where: { sourceCode: candidate.sourceCode },
    update: {
      schoolName: candidate.schoolName,
      campusName: candidate.campusName,
      displayName: candidate.displayName,
      city: candidate.city,
      level: candidate.level,
      ownership: candidate.ownership
    },
    create: {
      schoolName: candidate.schoolName,
      campusName: candidate.campusName,
      displayName: candidate.displayName,
      city: candidate.city,
      level: candidate.level,
      ownership: candidate.ownership,
      sourceCode: candidate.sourceCode
    }
  });

  await Promise.all(
    DEFAULT_SPOTS.map((name) =>
      prisma.spot.upsert({
        where: {
          campusId_name: {
            campusId: campus.id,
            name
          }
        },
        update: {},
        create: {
          campusId: campus.id,
          name
        }
      })
    )
  );

  return campus;
}
