/**
 * prisma/seed-account-managers.ts
 *
 * One-off script to create User logins for the 15 Account Managers who
 * already exist as plain-text strings on Contract.accountManager but have
 * never had a login before.
 *
 * CRITICAL: the `accountManager` value for each user below must match
 * EXACTLY (case + spacing) what's already stored on your Contract rows,
 * or that person's scoping will silently show them zero contracts.
 * The 15 names below were taken directly from the Insights AM filter list.
 *
 * Run once from the `backend/` folder:
 *   npx ts-node prisma/seed-account-managers.ts
 * (or `npx tsx prisma/seed-account-managers.ts` if this repo uses tsx —
 * check package.json's existing "prisma seed" script to see which runner
 * seed.ts already uses, and use the same one here.)
 *
 * Safe to re-run: existing emails are skipped, not duplicated or overwritten.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// name -> accountManager string must match Contract.accountManager exactly.
// email/password are auto-derived from name per your requested format:
//   name@zribble.com / name123
// "Danish S" is the one exception — spaces aren't valid in emails, so its
// slug is "danishs". Change AM_LIST below if you want a different email.
const AM_LIST: { name: string; accountManager: string; emailSlug: string }[] = [
  { name: "Chetan",  accountManager: "Chetan",   emailSlug: "chetan"  },
  { name: "Danish",  accountManager: "Danish",   emailSlug: "danish"  },
  { name: "Danish S",accountManager: "Danish S", emailSlug: "danishs" },
  { name: "Gaurav",  accountManager: "Gaurav",   emailSlug: "gaurav"  },
  { name: "Gunjan",  accountManager: "Gunjan",   emailSlug: "gunjan"  },
  { name: "Hamza",   accountManager: "Hamza",    emailSlug: "hamza"   },
  { name: "Hitesh",  accountManager: "Hitesh",   emailSlug: "hitesh"  },
  { name: "Jenil",   accountManager: "Jenil",    emailSlug: "jenil"   },
  { name: "Khasim",  accountManager: "Khasim",   emailSlug: "khasim"  },
  { name: "Khushi",  accountManager: "Khushi",   emailSlug: "khushi"  },
  { name: "Kritika", accountManager: "Kritika",  emailSlug: "kritika" },
  { name: "Kshitiz", accountManager: "Kshitiz",  emailSlug: "kshitiz" },
  { name: "Latika",  accountManager: "Latika",   emailSlug: "latika"  },
  { name: "Rayyan",  accountManager: "Rayyan",   emailSlug: "rayyan"  },
  { name: "Saanya",  accountManager: "Saanya",   emailSlug: "saanya"  },
];

async function main() {
  console.log(`Seeding ${AM_LIST.length} account manager users...\n`);

  let created = 0;
  let skipped = 0;

  for (const am of AM_LIST) {
    const email = `${am.emailSlug}@zribble.com`;
    const password = `${am.emailSlug}123`;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`SKIP   ${email} — already exists (id: ${existing.id})`);
      skipped++;
      continue;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: am.name,
        email,
        passwordHash,
        role: "account_manager",
        mode: "view_edit",
        accountManager: am.accountManager,
        createdBy: "seed-script",
      },
    });

    console.log(`CREATED ${email} / ${password}  ->  accountManager: "${am.accountManager}"  (id: ${user.id})`);
    created++;
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped} (already existed).`);
  console.log(`\nLogin format for all: <slug>@zribble.com / <slug>123`);
  console.log(`e.g. Gaurav -> gaurav@zribble.com / gaurav123`);
  console.log(`Exception: "Danish S" -> danishs@zribble.com / danishs123`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });