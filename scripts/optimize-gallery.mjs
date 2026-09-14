import sharp from "sharp";
import { rename, unlink } from "node:fs/promises";

const dir = "public/images/bull-riding";

const jobs = [
  { in: "2f7a8a78496a527448060cc845558b6e.jpeg", out: "gallery-01-aggies-buckles.jpg" },
  { in: "5709fabca69cad90e7ab659ef3188a1e.jpeg", out: "gallery-02-farm-city.jpg" },
  { in: "IMG_20260824_200252.jpg", out: "gallery-03-crowd-wide.jpg" },
  { in: "Messenger_creation_B23DDA64-52D9-436A-BEBA-9021A6B67489.jpeg", out: "gallery-04-higgins-chute.jpg" },
  { in: "a0d4f3725e1e001c5995a1e587ae3d78.jpeg", out: "gallery-05-crmp.jpg" },
  { in: "a292685428f8644d651ebcd848de1785.jpeg", out: "gallery-06-envy-farm.jpg" },
  { in: "f62e18dc5e68987c374449fa3453502f.jpeg", out: "gallery-07-tracies-boots.jpg" },
  { in: "received_795927472974355.jpeg", out: "gallery-08-golden-hour.jpg" },
];

for (const job of jobs) {
  const inPath = `${dir}/${job.in}`;
  const outPath = `${dir}/${job.out}`;
  const buf = await sharp(inPath).rotate().resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  await sharp(buf).toFile(outPath + ".tmp");
  await rename(outPath + ".tmp", outPath);
  if (inPath !== outPath) await unlink(inPath);
  console.log("optimized:", outPath, buf.length, "bytes");
}

// Drop the duplicate lower-res export of the same True Grit Rodeo moment we already
// have at full resolution as hero-true-grit-wide.jpg / hero-true-grit.jpg.
await unlink(`${dir}/received_24573782238978104.jpeg`);
console.log("removed duplicate: received_24573782238978104.jpeg");
