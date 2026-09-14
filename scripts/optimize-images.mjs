import sharp from "sharp";
import { existsSync } from "node:fs";

const jobs = [
  { in: "public/images/bull-riding/hero-true-grit-wide.jpg", out: "public/images/bull-riding/hero-true-grit-wide.jpg", width: 2400, quality: 78 },
  { in: "public/images/bull-riding/hero-true-grit.jpg", out: "public/images/bull-riding/hero-true-grit.jpg", width: 1400, quality: 80 },
  { in: "public/images/bull-riding/qualified-ride.jpg", out: "public/images/bull-riding/qualified-ride.jpg", width: 1400, quality: 80 },
  { in: "public/images/logos/amp-titans.jpg", out: "public/images/logos/amp-titans.jpg", width: 800, quality: 85 },
];

for (const job of jobs) {
  if (!existsSync(job.in)) {
    console.log("skip (missing):", job.in);
    continue;
  }
  const buf = await sharp(job.in).rotate().resize({ width: job.width, withoutEnlargement: true }).jpeg({ quality: job.quality, mozjpeg: true }).toBuffer();
  await sharp(buf).toFile(job.out + ".tmp");
  const fs = await import("node:fs/promises");
  await fs.rename(job.out + ".tmp", job.out);
  console.log("optimized:", job.out, buf.length, "bytes");
}
