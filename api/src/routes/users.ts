import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../auth/password';

type AuthUser = {
  id: string;
  role: string;
};

export async function userRoutes(app: FastifyInstance) {
  async function authenticate(request: FastifyRequest) {
    await request.jwtVerify();
  }

  function canManageUsers(user: AuthUser) {
    return user.role === 'admin' || user.role === 'manager';
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  });

  app.post('/users', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = request.user as AuthUser;

    if (!canManageUsers(loggedUser)) {
      return reply.status(403).send({ message: 'Usuario sem permissao para criar colaboradores.' });
    }

    const createUserSchema = z.object({
      name: z.string(),
      email: z.string().email(),
      username: z.string().min(3).regex(/^[a-zA-Z0-9._-]+$/),
      password: z.string().min(6),
      role: z.enum(['admin', 'manager', 'cashier']),
    });

    const body = createUserSchema.parse(request.body);

    const [newUser] = await db
      .insert(users)
      .values({
        name: body.name,
        email: body.email.toLowerCase(),
        username: body.username.toLowerCase(),
        password: hashPassword(body.password),
        role: body.role,
        createdBy: loggedUser.id,
        updatedBy: loggedUser.id,
      })
      .returning();

    const { password: _password, ...safeUser } = newUser;

    return reply.status(201).send(safeUser);
  });

  app.get('/users', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = request.user as AuthUser;

    if (!canManageUsers(loggedUser)) {
      return reply.status(403).send({ message: 'Usuario sem permissao para listar colaboradores.' });
    }

    const userList = await db.select().from(users);

    return userList.map(({ password, ...user }) => user);
  });

  app.put('/users/:id', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = request.user as AuthUser;

    if (!canManageUsers(loggedUser)) {
      return reply.status(403).send({ message: 'Usuario sem permissao para atualizar colaboradores.' });
    }

    const paramsSchema = z.object({ id: z.string().uuid() });
    const updateUserSchema = z.object({
      name: z.string().optional(),
      username: z.string().min(3).regex(/^[a-zA-Z0-9._-]+$/).optional(),
      role: z.enum(['admin', 'manager', 'cashier']).optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const body = updateUserSchema.parse(request.body);

    const [updatedUser] = await db
      .update(users)
      .set({
        ...body,
        username: body.username?.toLowerCase(),
        updatedAt: new Date(),
        updatedBy: loggedUser.id,
      })
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      return reply.status(404).send({ message: 'Usuario nao encontrado.' });
    }

    const { password: _password, ...safeUser } = updatedUser;

    return safeUser;
  });

  app.delete('/users/:id', { preHandler: authenticate }, async (request, reply) => {
    const loggedUser = request.user as AuthUser;
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    if (!canManageUsers(loggedUser)) {
      return reply.status(403).send({ message: 'Usuario sem permissao para remover colaboradores.' });
    }

    if (id === loggedUser.id) {
      return reply.status(400).send({ message: 'O usuario logado nao pode remover a propria conta.' });
    }

    await db.delete(users).where(eq(users.id, id));
    return reply.status(204).send();
  });
}
