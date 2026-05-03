import fs from "fs/promises";
import path from "path";
import https from "https";

const API_TOKEN = process.env.FOOTBALL_DATA_API_KEY || process.env.FOOTBALL_DATA_API_TOKEN;

if (!API_TOKEN) {
  console.error("Missing FOOTBALL_DATA_API_KEY (or FOOTBALL_DATA_API_TOKEN).");
  console.error("Example:");
  console.error('export FOOTBALL_DATA_API_KEY="your_api_key_here"');
  process.exit(1);
}

const baseDir = path.join(process.cwd(), "public", "club-logos");

const englishCompetitions = [
  { code: "PL", slug: "premier-league", label: "Premier League" },
  { code: "ELC", slug: "championship", label: "Championship" },
  { code: "EL1", slug: "league-one", label: "League One" },
  { code: "EL2", slug: "league-two", label: "League Two" }
];

const big5Competitions = [
  { code: "PL", slug: "premier-league", label: "Premier League" },
  { code: "PD", slug: "la-liga", label: "La Liga" },
  { code: "BL1", slug: "bundesliga", label: "Bundesliga" },
  { code: "SA", slug: "serie-a", label: "Serie A" },
  { code: "FL1", slug: "ligue-1", label: "Ligue 1" }
];

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function ensurePngUrl(url) {
  if (!url) return null;
  if (url.endsWith(".svg")) {
    return url.replace(/\.svg(\?.*)?$/i, ".png");
  }
  return url;
}

function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { headers },
      (response) => {
        let body = "";

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          if (response.statusCode !== 200) {
            reject(
              new Error(
                "GET " + url + " failed: " + response.statusCode + " " + response.statusMessage + "\n" + body
              )
            );
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on("error", reject);
  });
}

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        downloadFile(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(response.statusCode + " " + response.statusMessage + " from " + url));
        return;
      }

      const chunks = [];

      response.on("data", (chunk) => {
        chunks.push(chunk);
      });

      response.on("end", async () => {
        try {
          await fs.writeFile(outputPath, Buffer.concat(chunks));
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on("error", reject);
  });
}

async function fetchCompetitionTeams(competitionCode) {
  const url = "https://api.football-data.org/v4/competitions/" + competitionCode + "/teams";
  const data = await httpsGetJson(url, {
    "X-Auth-Token": API_TOKEN
  });
  return data.teams || [];
}

async function saveCompetitionSet(groupFolder, competitions, manifestEntries, dedupeMap) {
  for (const competition of competitions) {
    const outDir = path.join(baseDir, groupFolder, competition.slug);
    await fs.mkdir(outDir, { recursive: true });

    console.log("");
    console.log("Fetching teams for " + competition.label + " (" + competition.code + ")...");

    let teams = [];
    try {
      teams = await fetchCompetitionTeams(competition.code);
    } catch (error) {
      console.error("Failed to fetch competition " + competition.code + ": " + (error instanceof Error ? error.message : String(error)));
      continue;
    }

    for (const team of teams) {
      const crestUrl = ensurePngUrl(team.crest);
      if (!crestUrl) {
        console.warn("No crest URL for " + team.name);
        continue;
      }

      const teamSlug = slugify(team.shortName || team.tla || team.name);
      const fileName = teamSlug + ".png";
      const outputPath = path.join(outDir, fileName);

      try {
        await downloadFile(crestUrl, outputPath);
        console.log("Saved " + team.name + " -> " + path.relative(process.cwd(), outputPath));

        const key = String(team.id || team.name);
        const existing = dedupeMap.get(key);

        const entry = existing || {
          team_id: team.id || null,
          name: team.name || null,
          short_name: team.shortName || null,
          tla: team.tla || null,
          area: team.area?.name || null,
          website: team.website || null,
          competitions: [],
          paths: []
        };

        entry.competitions.push({
          code: competition.code,
          label: competition.label,
          group: groupFolder
        });

        entry.paths.push({
          competition_code: competition.code,
          group: groupFolder,
          path: "/" + path.relative(path.join(process.cwd(), "public"), outputPath).replace(/\\/g, "/")
        });

        dedupeMap.set(key, entry);
      } catch (error) {
        console.error("Failed " + team.name + ": " + (error instanceof Error ? error.message : String(error)));
      }
    }
  }

  for (const value of dedupeMap.values()) {
    manifestEntries.push(value);
  }
}

async function main() {
  await fs.mkdir(baseDir, { recursive: true });

  const manifestEntries = [];
  const dedupeMap = new Map();

  await saveCompetitionSet("england", englishCompetitions, manifestEntries, dedupeMap);
  await saveCompetitionSet("big-5", big5Competitions, manifestEntries, dedupeMap);

  const finalManifest = Array.from(dedupeMap.values()).sort((a, b) => {
    return String(a.name).localeCompare(String(b.name));
  });

  const manifestPath = path.join(baseDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(finalManifest, null, 2), "utf8");

  console.log("");
  console.log("Saved manifest -> " + path.relative(process.cwd(), manifestPath));
  console.log("Total unique clubs: " + finalManifest.length);
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
