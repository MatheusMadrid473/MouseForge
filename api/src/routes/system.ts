import { FastifyInstance, FastifyRequest } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { branches, companies, termAcceptances, terms, users } from '../db/schema';

type AuthUser = {
  id: string;
  role: string;
};

type UserRecord = typeof users.$inferSelect;

function isMasterUser(user: Pick<UserRecord, 'email' | 'username'>) {
  const masterEmail = process.env.SUPER_USER_EMAIL?.toLowerCase();
  const masterUsername = process.env.SUPER_USER_USERNAME?.toLowerCase();

  return user.email.toLowerCase() === masterEmail || (!!user.username && user.username.toLowerCase() === masterUsername);
}

export async function systemRoutes(app: FastifyInstance) {
  async function authenticate(request: FastifyRequest) {
    await request.jwtVerify();
  }

  async function getLoggedUser(authUser: AuthUser) {
    const [user] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
    return user;
  }

  async function requireMaster(request: FastifyRequest) {
    const loggedUser = await getLoggedUser(request.user as AuthUser);

    if (!loggedUser || !isMasterUser(loggedUser)) {
      const error = new Error('Apenas o usuario mestre pode acessar este recurso.');
      (error as Error & { statusCode: number }).statusCode = 403;
      throw error;
    }

    return loggedUser;
  }

  app.get('/companies', { preHandler: authenticate }, async (request) => {
    await requireMaster(request);
    return db.select().from(companies);
  });

  app.post('/companies', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = await requireMaster(request);
    const createCompanySchema = z.object({
      name: z.string().min(2),
      document: z.string().optional(),
    });
    const body = createCompanySchema.parse(request.body);
    const [company] = await db
      .insert(companies)
      .values({
        name: body.name,
        document: body.document,
        createdBy: loggedUser.id,
        updatedBy: loggedUser.id,
      })
      .returning();

    return reply.status(201).send(company);
  });

  app.put('/companies/:id', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = await requireMaster(request);
    const paramsSchema = z.object({ id: z.string().uuid() });
    const updateCompanySchema = z.object({
      name: z.string().min(2).optional(),
      document: z.string().optional(),
      isActive: z.boolean().optional(),
    });
    const { id } = paramsSchema.parse(request.params);
    const body = updateCompanySchema.parse(request.body);
    const [company] = await db
      .update(companies)
      .set({
        ...body,
        updatedAt: new Date(),
        updatedBy: loggedUser.id,
      })
      .where(eq(companies.id, id))
      .returning();

    if (!company) {
      return reply.status(404).send({ message: 'Empresa nao encontrada.' });
    }

    return company;
  });

  app.get('/branches', { preHandler: authenticate }, async (request) => {
    await requireMaster(request);
    const querySchema = z.object({ companyId: z.string().uuid().optional() });
    const query = querySchema.parse(request.query);

    if (query.companyId) {
      return db.select().from(branches).where(eq(branches.companyId, query.companyId));
    }

    return db.select().from(branches);
  });

  app.post('/branches', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = await requireMaster(request);
    const createBranchSchema = z.object({
      companyId: z.string().uuid(),
      name: z.string().min(2),
      document: z.string().optional(),
    });
    const body = createBranchSchema.parse(request.body);
    const [branch] = await db
      .insert(branches)
      .values({
        companyId: body.companyId,
        name: body.name,
        document: body.document,
        createdBy: loggedUser.id,
        updatedBy: loggedUser.id,
      })
      .returning();

    return reply.status(201).send(branch);
  });

  app.put('/branches/:id', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = await requireMaster(request);
    const paramsSchema = z.object({ id: z.string().uuid() });
    const updateBranchSchema = z.object({
      companyId: z.string().uuid().optional(),
      name: z.string().min(2).optional(),
      document: z.string().optional(),
      isActive: z.boolean().optional(),
    });
    const { id } = paramsSchema.parse(request.params);
    const body = updateBranchSchema.parse(request.body);
    const [branch] = await db
      .update(branches)
      .set({
        ...body,
        updatedAt: new Date(),
        updatedBy: loggedUser.id,
      })
      .where(eq(branches.id, id))
      .returning();

    if (!branch) {
      return reply.status(404).send({ message: 'Filial nao encontrada.' });
    }

    return branch;
  });

  app.get('/terms', { preHandler: authenticate }, async (request) => {
    await requireMaster(request);
    return db.select().from(terms);
  });

  app.post('/terms', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = await requireMaster(request);
    const createTermSchema = z.object({
      title: z.string().min(2),
      version: z.string().min(1),
      content: z.string().min(10),
    });
    const body = createTermSchema.parse(request.body);
    const [term] = await db
      .insert(terms)
      .values({
        title: body.title,
        version: body.version,
        content: body.content,
        createdBy: loggedUser.id,
        updatedBy: loggedUser.id,
      })
      .returning();

    return reply.status(201).send(term);
  });

  app.put('/terms/:id', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = await requireMaster(request);
    const paramsSchema = z.object({ id: z.string().uuid() });
    const updateTermSchema = z.object({
      title: z.string().min(2).optional(),
      version: z.string().min(1).optional(),
      content: z.string().min(10).optional(),
      isActive: z.boolean().optional(),
    });
    const { id } = paramsSchema.parse(request.params);
    const body = updateTermSchema.parse(request.body);
    const [term] = await db
      .update(terms)
      .set({
        ...body,
        updatedAt: new Date(),
        updatedBy: loggedUser.id,
      })
      .where(eq(terms.id, id))
      .returning();

    if (!term) {
      return reply.status(404).send({ message: 'Termo nao encontrado.' });
    }

    return term;
  });

  app.get('/terms/:id/acceptances', { preHandler: authenticate }, async (request, reply) => {
    await requireMaster(request);
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const [term] = await db.select().from(terms).where(eq(terms.id, id)).limit(1);

    if (!term) {
      return reply.status(404).send({ message: 'Termo nao encontrado.' });
    }

    const [userList, acceptanceList] = await Promise.all([
      db.select().from(users),
      db.select().from(termAcceptances).where(eq(termAcceptances.termId, id)),
    ]);
    const acceptedAtByUser = new Map(acceptanceList.map((acceptance) => [acceptance.userId, acceptance.acceptedAt]));

    return {
      term,
      users: userList.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        companyId: user.companyId,
        branchId: user.branchId,
        acceptedAt: acceptedAtByUser.get(user.id) ?? null,
      })),
    };
  });

  app.get('/terms/pending', { preHandler: authenticate }, async (request) => {
    const authUser = request.user as AuthUser;
    const activeTerms = await db.select().from(terms).where(eq(terms.isActive, true));
    const acceptances = await db.select().from(termAcceptances).where(eq(termAcceptances.userId, authUser.id));
    const acceptedTermIds = new Set(acceptances.map((acceptance) => acceptance.termId));

    return activeTerms.filter((term) => !acceptedTermIds.has(term.id));
  });

  app.post('/terms/:id/accept', { preHandler: authenticate }, async (request, reply) => {
    const authUser = request.user as AuthUser;
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const [term] = await db.select().from(terms).where(and(eq(terms.id, id), eq(terms.isActive, true))).limit(1);

    if (!term) {
      return reply.status(404).send({ message: 'Termo ativo nao encontrado.' });
    }

    const [existingAcceptance] = await db
      .select()
      .from(termAcceptances)
      .where(and(eq(termAcceptances.termId, id), eq(termAcceptances.userId, authUser.id)))
      .limit(1);

    if (existingAcceptance) {
      return existingAcceptance;
    }

    const [acceptance] = await db
      .insert(termAcceptances)
      .values({
        termId: id,
        userId: authUser.id,
      })
      .returning();

    return reply.status(201).send(acceptance);
  });
}
