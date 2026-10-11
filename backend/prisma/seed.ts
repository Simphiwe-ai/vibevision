import { prisma } from "../src/db";

const cities = [
  "Johannesburg",
  "Soweto",
  "Sandton",
  "Pretoria",
  "Durban",
  "Cape Town",
  "Bloemfontein",
  "Polokwane",
  "East London",
  "Gqeberha",
];

async function main() {
  await prisma.venue.deleteMany({
    where: { description: { startsWith: "Sample venue" } },
  });

  const venues = cities.flatMap((city, index) => [
    {
      name: `${city} Sunset Grill`,
      type: "restaurant",
      city,
      address: `1 Main Street, ${city}`,
      description: "Sample venue for development: relaxed dining with a lively atmosphere.",
      isLive: index % 3 === 0,
    },
    {
      name: `The ${city} Tap House`,
      type: "pub",
      city,
      address: `22 Church Street, ${city}`,
      description: "Sample venue for development: craft drinks and good company.",
      isLive: index % 4 === 0,
    },
    {
      name: `${city} Skyline Lounge`,
      type: "club",
      city,
      address: `5 Rooftop Avenue, ${city}`,
      description: "Sample venue for development: music, dancing and late nights.",
      isLive: index % 2 === 0,
    },
  ]);

  const result = await prisma.venue.createMany({ data: venues });
  console.log(`Seeded ${result.count} sample venues`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
