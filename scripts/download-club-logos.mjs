import fs from "fs/promises";
import path from "path";
import https from "https";

const outputDir = path.join(process.cwd(), "public", "club-logos");

const clubs = [
  ["arsenal", "Arsenal", "https://crests.football-data.org/57.png"],
  ["aston-villa", "Aston Villa", "https://crests.football-data.org/58.png"],
  ["bournemouth", "Bournemouth", "https://crests.football-data.org/1044.png"],
  ["brentford", "Brentford", "https://crests.football-data.org/402.png"],
  ["brighton", "Brighton", "https://crests.football-data.org/397.png"],
  ["burnley", "Burnley", "https://crests.football-data.org/328.png"],
  ["chelsea", "Chelsea", "https://crests.football-data.org/61.png"],
  ["crystal-palace", "Crystal Palace", "https://crests.football-data.org/354.png"],
  ["everton", "Everton", "https://crests.football-data.org/62.png"],
  ["fulham", "Fulham", "https://crests.football-data.org/63.png"],
  ["leeds", "Leeds United", "https://crests.football-data.org/341.png"],
  ["liverpool", "Liverpool", "https://crests.football-data.org/64.png"],
  ["man-city", "Manchester City", "https://crests.football-data.org/65.png"],
  ["man-united", "Manchester United", "https://crests.football-data.org/66.png"],
  ["newcastle", "Newcastle United", "https://crests.football-data.org/67.png"],
  ["nottingham-forest", "Nottingham Forest", "https://crests.football-data.org/351.png"],
  ["sunderland", "Sunderland", "https://crests.football-data.org/71.png"],
  ["tottenham", "Tottenham Hotspur", "https://crests.football-data.org/73.png"],
  ["west-ham", "West Ham United", "https://crests.football-data.org/563.png"],
  ["wolves", "Wolverhampton Wanderers", "https://crests.football-data.org/76.png"]
];

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
        reject(new Error(`${response.statusCode} ${response.statusMessage}`));
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

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const failures = [];

  for (const [slug, name, url] of clubs) {
    const outputPath = path.join(outputDir, `${slug}.png`);

    try {
      await downloadFile(url, outputPath);
      console.log(`Saved ${name} -> public/club-logos/${slug}.png`);
    } catch (error) {
      failures.push({
        slug,
        name,
        url,
        error: error instanceof Error ? error.message : String(error)
      });

      console.error(`Failed ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures.length) {
    console.error("");
    console.error("Some logos failed:");
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log("");
  console.log("All club logos downloaded.");
}

main();
