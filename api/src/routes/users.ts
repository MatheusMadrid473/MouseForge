import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { branches, termAcceptances, terms, users } from '../db/schema';
import { and, eq, or } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../auth/password';

type AuthUser = {
  id: string;
  role: string;
};

type UserRecord = typeof users.$inferSelect;

export async function userRoutes(app: FastifyInstance) {
  async function authenticate(request: FastifyRequest) {
    await request.jwtVerify();
  }

  function canManageUsers(user: AuthUser) {
    return user.role === 'admin' || user.role === 'manager';
  }

  function isAdmin(user: AuthUser) {
    return user.role === 'admin';
  }

  function isMasterUser(user: Pick<UserRecord, 'email' | 'username'>) {
    const masterEmail = process.env.SUPER_USER_EMAIL?.toLowerCase();
    const masterUsername = process.env.SUPER_USER_USERNAME?.toLowerCase();

    return user.email.toLowerCase() === masterEmail || (!!user.username && user.username.toLowerCase() === masterUsername);
  }

  function toSafeUser(user: UserRecord) {
    const { password: _password, ...safeUser } = user;

    return {
      ...safeUser,
      isMaster: isMasterUser(user),
    };
  }

  async function getLoggedUser(authUser: AuthUser) {
    const [user] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
    return user;
  }

  function canAccessUser(loggedUser: UserRecord, targetUser: UserRecord) {
    if (isMasterUser(loggedUser)) {
      return true;
    }

    if (!loggedUser.companyId) {
      return targetUser.id === loggedUser.id;
    }

    if (targetUser.companyId !== loggedUser.companyId) {
      return false;
    }

    return !loggedUser.branchId || targetUser.branchId === loggedUser.branchId;
  }

  async function getPendingTerms(userId: string) {
    const activeTerms = await db.select().from(terms).where(eq(terms.isActive, true));
    const acceptances = await db.select().from(termAcceptances).where(eq(termAcceptances.userId, userId));
    const acceptedTermIds = new Set(acceptances.map((acceptance) => acceptance.termId));

    return activeTerms.filter((term) => !acceptedTermIds.has(term.id));
  }

  async function branchBelongsToCompany(branchId: string | null | undefined, companyId: string | null | undefined) {
    if (!branchId) {
      return true;
    }

    if (!companyId) {
      return false;
    }

    const [branch] = await db.select().from(branches).where(and(eq(branches.id, branchId), eq(branches.companyId, companyId))).limit(1);
    return !!branch;
  }

  app.post('/auth/login', async (request, reply) => {
    const loginSchema = z.object({
      login: z.string().min(3),
      password: z.string().min(6),
    });

    const { login, password } = loginSchema.parse(request.body);
    const normalizedLogin = login.trim().toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, normalizedLogin), eq(users.username, normalizedLogin)))
      .limit(1);

    if (!user || !verifyPassword(password, user.password)) {
      return reply.status(401).send({ message: 'Credenciais invalidas.' });
    }

    const token = app.jwt.sign({ id: user.id, role: user.role });

    return {
      token,
      user: toSafeUser(user),
      pendingTerms: await getPendingTerms(user.id),
    };
  });

  app.post('/users', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = request.user as AuthUser;
    const loggedUserRecord = await getLoggedUser(loggedUser);

    if (!loggedUserRecord || !canManageUsers(loggedUser)) {
      return reply.status(403).send({ message: 'Usuario sem permissao para criar colaboradores.' });
    }

    const createUserSchema = z.object({
      name: z.string(),
      email: z.string().email(),
      username: z.string().min(3).regex(/^[a-zA-Z0-9._-]+$/),
      password: z.string().min(6),
      role: z.enum(['admin', 'manager', 'cashier']),
      companyId: z.string().uuid().optional(),
      branchId: z.string().uuid().optional(),
    });

    const body = createUserSchema.parse(request.body);
    const companyId = isMasterUser(loggedUserRecord) ? body.companyId : loggedUserRecord.companyId;
    const branchId = isMasterUser(loggedUserRecord) ? body.branchId : loggedUserRecord.branchId;

    if (!companyId && !isMasterUser(loggedUserRecord)) {
      return reply.status(400).send({ message: 'Usuario gestor sem empresa vinculada.' });
    }

    if (!(await branchBelongsToCompany(branchId, companyId))) {
      return reply.status(400).send({ message: 'Filial nao pertence a empresa informada.' });
    }

    const [newUser] = await db
      .insert(users)
      .values({
        name: body.name,
        email: body.email.toLowerCase(),
        username: body.username.toLowerCase(),
        password: hashPassword(body.password),
        role: body.role,
        companyId,
        branchId,
        createdBy: loggedUser.id,
        updatedBy: loggedUser.id,
      })
      .returning();

    return reply.status(201).send(toSafeUser(newUser));
  });

  app.get('/users', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = request.user as AuthUser;
    const loggedUserRecord = await getLoggedUser(loggedUser);

    if (!loggedUserRecord || !canManageUsers(loggedUser)) {
      return reply.status(403).send({ message: 'Usuario sem permissao para listar colaboradores.' });
    }

    const userList = await db.select().from(users);

    return userList.filter((user) => canAccessUser(loggedUserRecord, user)).map((user) => toSafeUser(user));
  });

  app.put('/users/:id', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = request.user as AuthUser;
    const loggedUserRecord = await getLoggedUser(loggedUser);

    if (!loggedUserRecord || !canManageUsers(loggedUser)) {
      return reply.status(403).send({ message: 'Usuario sem permissao para atualizar colaboradores.' });
    }

    const paramsSchema = z.object({ id: z.string().uuid() });
    const updateUserSchema = z.object({
      name: z.string().optional(),
      username: z.string().min(3).regex(/^[a-zA-Z0-9._-]+$/).optional(),
      role: z.enum(['admin', 'manager', 'cashier']).optional(),
      companyId: z.string().uuid().nullable().optional(),
      branchId: z.string().uuid().nullable().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const body = updateUserSchema.parse(request.body);
    const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!targetUser) {
      return reply.status(404).send({ message: 'Usuario nao encontrado.' });
    }

    if (!canAccessUser(loggedUserRecord, targetUser)) {
      return reply.status(403).send({ message: 'Usuario fora do escopo permitido.' });
    }

    const scopedBody = isMasterUser(loggedUserRecord)
      ? body
      : {
          name: body.name,
          username: body.username,
          role: body.role,
        };

    if (isMasterUser(loggedUserRecord) && !(await branchBelongsToCompany(scopedBody.branchId, scopedBody.companyId ?? targetUser.companyId))) {
      return reply.status(400).send({ message: 'Filial nao pertence a empresa informada.' });
    }

    if (isMasterUser(loggedUserRecord) && scopedBody.companyId !== undefined && scopedBody.companyId !== targetUser.companyId && scopedBody.branchId === undefined) {
      scopedBody.branchId = null;
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        ...scopedBody,
        username: scopedBody.username?.toLowerCase(),
        updatedAt: new Date(),
        updatedBy: loggedUser.id,
      })
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      return reply.status(404).send({ message: 'Usuario nao encontrado.' });
    }

    return toSafeUser(updatedUser);
  });

  app.post('/users/:id/reset-password', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = request.user as AuthUser;
    const loggedUserRecord = await getLoggedUser(loggedUser);

    if (!loggedUserRecord || !isAdmin(loggedUser)) {
      return reply.status(403).send({ message: 'Apenas administradores podem redefinir senhas.' });
    }

    const paramsSchema = z.object({ id: z.string().uuid() });
    const resetPasswordSchema = z.object({
      password: z.string().min(6),
    });

    const { id } = paramsSchema.parse(request.params);
    const body = resetPasswordSchema.parse(request.body);
    const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!targetUser) {
      return reply.status(404).send({ message: 'Usuario nao encontrado.' });
    }

    if (!canAccessUser(loggedUserRecord, targetUser)) {
      return reply.status(403).send({ message: 'Usuario fora do escopo permitido.' });
    }

    if (isMasterUser(targetUser) && targetUser.id !== loggedUser.id) {
      return reply.status(403).send({ message: 'A senha do usuario mestre nao pode ser redefinida por outro usuario.' });
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        password: hashPassword(body.password),
        updatedAt: new Date(),
        updatedBy: loggedUser.id,
      })
      .where(eq(users.id, id))
      .returning();

    return toSafeUser(updatedUser);
  });

  app.delete('/users/:id', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = request.user as AuthUser;
    const loggedUserRecord = await getLoggedUser(loggedUser);
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    if (!loggedUserRecord || !canManageUsers(loggedUser)) {
      return reply.status(403).send({ message: 'Usuario sem permissao para remover colaboradores.' });
    }

    if (id === loggedUser.id) {
      return reply.status(400).send({ message: 'O usuario logado nao pode remover a propria conta.' });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!targetUser) {
      return reply.status(404).send({ message: 'Usuario nao encontrado.' });
    }

    if (!canAccessUser(loggedUserRecord, targetUser)) {
      return reply.status(403).send({ message: 'Usuario fora do escopo permitido.' });
    }

    if (isMasterUser(targetUser)) {
      return reply.status(400).send({ message: 'O usuario mestre nao pode ser removido.' });
    }

    await db.delete(users).where(eq(users.id, id));
    return reply.status(204).send();
  });
}
