import type { TripPost } from "@/types";

function display(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function distance(value: number) {
  return `${display(value)} ${value === 1 ? "mile" : "miles"}`;
}

export function EntryStats({ post }: { post: TripPost }) {
  const stats = [
    { value: post.milesDrivenThisEntry, display: distance(post.milesDrivenThisEntry), label: "driven" },
    { value: post.milesWalked, display: distance(post.milesWalked), label: "walked" },
    { value: post.milesBiked, display: distance(post.milesBiked), label: "biked" },
    { value: post.milesRan, display: distance(post.milesRan), label: "ran" },
    { value: post.newStatesVisited, display: display(post.newStatesVisited), label: post.newStatesVisited === 1 ? "new state" : "new states" },
    { value: post.newNationalParksVisited, display: display(post.newNationalParksVisited), label: post.newNationalParksVisited === 1 ? "national park" : "national parks" },
    { value: post.majorCitiesVisited, display: display(post.majorCitiesVisited), label: post.majorCitiesVisited === 1 ? "major city" : "major cities" },
    { value: post.tanksOfGas, display: display(post.tanksOfGas), label: post.tanksOfGas === 1 ? "tank of gas" : "tanks of gas" },
  ].filter((stat) => stat.value > 0);

  if (!stats.length) return null;

  return <section className="entry-stats mx-auto mt-8 max-w-4xl" aria-labelledby="entry-stats-heading">
    <h2 id="entry-stats-heading">Added this day</h2>
    <div>
      {stats.map((stat) => <p key={stat.label}><strong>{stat.display}</strong><span>{stat.label}</span></p>)}
    </div>
  </section>;
}
