import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { hashPassword, verifyPassword } from '../auth/password';

export async function ensureSuperUser() {
  const email = process.env.SUPER_USER_EMAIL;
  const password = process.env.SUPER_USER_PASSWORD;
  const name = process.env.SUPER_USER_NAME || 'Super Administrador';

  if (!email || !password) {
    return;
  }

  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!existingUser) {
    await db.insert(users).values({
      name,
      email,
      password: hashPassword(password),
      role: 'admin',
    });
    return;
  }

  const needsPasswordUpdate = !verifyPassword(password, existingUser.password);
  const needsProfileUpdate = existingUser.name !== name || existingUser.role !== 'admin';

  if (!needsPasswordUpdate && !needsProfileUpdate) {
    return;
  }

  await db
    .update(users)
    .set({
      name,
      role: 'admin',
      password: needsPasswordUpdate ? hashPassword(password) : existingUser.password,
      updatedAt: new Date(),
    })
    .where(eq(users.id, existingUser.id));
}
