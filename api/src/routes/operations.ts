import { FastifyInstance, FastifyRequest } from 'fastify';
import { and, desc, eq, gte, ilike, isNull, lte, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import {
  auditLogs,
  branches,
  customers,
  fiscalDocuments,
  fiscalSettings,
  inventoryMovements,
  products,
  saleItems,
  sales,
  users,
} from '../db/schema';

type AuthUser = {
  id: string;
  role: string;
};

type UserRecord = typeof users.$inferSelect;
type ProductRecord = typeof products.$inferSelect;
type SaleRecord = typeof sales.$inferSelect;
type FiscalDocumentRecord = typeof fiscalDocuments.$inferSelect;
type FiscalSettingRecord = typeof fiscalSettings.$inferSelect;

type ScopeQuery = {
  companyId?: string;
  branchId?: string;
};

const moneySchema = z.number().int().min(0);

function isMasterUser(user: Pick<UserRecord, 'email' | 'username'>) {
  const masterEmail = process.env.SUPER_USER_EMAIL?.toLowerCase();
  const masterUsername = process.env.SUPER_USER_USERNAME?.toLowerCase();

  return user.email.toLowerCase() === masterEmail || (!!user.username && user.username.toLowerCase() === masterUsername);
}

function canManageCatalog(user: UserRecord) {
  return user.role === 'admin' || user.role === 'manager' || isMasterUser(user);
}

function canSeeCompanyConsolidated(user: UserRecord) {
  return user.role === 'admin' || user.role === 'manager' || isMasterUser(user);
}

function asStartDate(value?: string) {
  if (!value) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function asEndDate(value?: string) {
  if (!value) {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  }

  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function centsToCurrency(value: number) {
  return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function makeHomologationAccessKey(document: FiscalDocumentRecord, setting: FiscalSettingRecord) {
  const seed = `${document.id}${setting.nfceSeries}${setting.nextNfceNumber}`.replace(/\D/g, '').padEnd(44, '0');
  return seed.slice(0, 44);
}

function formatCsvValue(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  return [headers.join(','), ...rows.map((row) => headers.map((header) => formatCsvValue(row[header])).join(','))].join('\n');
}

function parseCsv(text: string) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  if (!headerLine) {
    return [];
  }

  const headers = headerLine.split(',').map((header) => header.trim());
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(',').map((value) => value.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    });
}

export async function operationRoutes(app: FastifyInstance) {
  async function authenticate(request: FastifyRequest) {
    await request.jwtVerify();
  }

  async function getLoggedUser(authUser: AuthUser) {
    const [user] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
    return user;
  }

  async function getScope(authUser: AuthUser, query: ScopeQuery = {}) {
    const user = await getLoggedUser(authUser);

    if (!user) {
      throw Object.assign(new Error('Usuario nao encontrado.'), { statusCode: 401 });
    }

    if (isMasterUser(user)) {
      return { user, companyId: query.companyId || user.companyId || null, branchId: query.branchId || null, isMaster: true };
    }

    if (!user.companyId) {
      throw Object.assign(new Error('Usuario sem empresa vinculada.'), { statusCode: 400 });
    }

    const branchId = user.branchId || (canSeeCompanyConsolidated(user) ? query.branchId || null : null);
    return { user, companyId: user.companyId, branchId, isMaster: false };
  }

  async function assertBranchInCompany(companyId: string, branchId?: string | null) {
    if (!branchId) {
      return;
    }

    const [branch] = await db.select().from(branches).where(and(eq(branches.id, branchId), eq(branches.companyId, companyId))).limit(1);
    if (!branch) {
      throw Object.assign(new Error('Filial nao pertence a empresa informada.'), { statusCode: 400 });
    }
  }

  function scopedProductFilter(companyId: string | null, branchId?: string | null) {
    if (!companyId) {
      return undefined;
    }

    return branchId ? and(eq(products.companyId, companyId), eq(products.branchId, branchId)) : eq(products.companyId, companyId);
  }

  function scopedCustomerFilter(companyId: string | null, branchId?: string | null) {
    if (!companyId) {
      return undefined;
    }

    return branchId ? and(eq(customers.companyId, companyId), eq(customers.branchId, branchId)) : eq(customers.companyId, companyId);
  }

  function scopedSalesFilter(companyId: string | null, branchId: string | null | undefined, start: Date, end: Date) {
    if (!companyId) {
      return and(gte(sales.createdAt, start), lte(sales.createdAt, end));
    }

    return branchId
      ? and(eq(sales.companyId, companyId), eq(sales.branchId, branchId), gte(sales.createdAt, start), lte(sales.createdAt, end))
      : and(eq(sales.companyId, companyId), gte(sales.createdAt, start), lte(sales.createdAt, end));
  }

  async function writeAudit(input: {
    user: UserRecord;
    action: string;
    entity: string;
    entityId?: string;
    companyId?: string | null;
    branchId?: string | null;
    summary?: string;
  }) {
    await db.insert(auditLogs).values({
      companyId: input.companyId || input.user.companyId,
      branchId: input.branchId || input.user.branchId,
      userId: input.user.id,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      summary: input.summary,
    });
  }

  async function getFiscalSetting(companyId: string, branchId?: string | null) {
    const [branchSetting] = branchId
      ? await db
          .select()
          .from(fiscalSettings)
          .where(and(eq(fiscalSettings.companyId, companyId), eq(fiscalSettings.branchId, branchId), eq(fiscalSettings.isActive, true)))
          .limit(1)
      : [];

    if (branchSetting) {
      return branchSetting;
    }

    const [companySetting] = await db
      .select()
      .from(fiscalSettings)
      .where(and(eq(fiscalSettings.companyId, companyId), eq(fiscalSettings.isActive, true)))
      .limit(1);

    return companySetting;
  }

  async function issueFiscalDocument(document: FiscalDocumentRecord, user: UserRecord) {
    const setting = await getFiscalSetting(document.companyId, document.branchId);

    if (!setting) {
      const [updated] = await db
        .update(fiscalDocuments)
        .set({
          status: 'rejected',
          errorMessage: 'Configuracao fiscal nao cadastrada para esta empresa/filial.',
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(fiscalDocuments.id, document.id))
        .returning();
      return updated;
    }

    if (setting.provider === 'manual' && setting.environment === 'production') {
      const [updated] = await db
        .update(fiscalDocuments)
        .set({
          status: 'rejected',
          errorMessage: 'Emissao real em producao exige provedor fiscal configurado.',
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(fiscalDocuments.id, document.id))
        .returning();
      return updated;
    }

    if (setting.provider === 'manual') {
      const issuedAt = new Date();
      const number = String(setting.nextNfceNumber);
      const series = setting.nfceSeries;
      const accessKey = makeHomologationAccessKey(document, setting);
      const [updated] = await db.transaction(async (tx) => {
        const [updatedDocument] = await tx
          .update(fiscalDocuments)
          .set({
            status: 'authorized',
            number,
            series,
            accessKey,
            protocol: `HOM-${Date.now()}`,
            errorMessage: null,
            issuedAt,
            updatedAt: issuedAt,
            updatedBy: user.id,
          })
          .where(eq(fiscalDocuments.id, document.id))
          .returning();
        await tx
          .update(fiscalSettings)
          .set({ nextNfceNumber: setting.nextNfceNumber + 1, updatedAt: issuedAt, updatedBy: user.id })
          .where(eq(fiscalSettings.id, setting.id));
        return [updatedDocument];
      });
      return updated;
    }

    const [updated] = await db
      .update(fiscalDocuments)
      .set({
        status: 'pending',
        errorMessage: `Provedor ${setting.provider} configurado. Implementar chamada HTTP com credenciais seguras.`,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(fiscalDocuments.id, document.id))
      .returning();
    return updated;
  }

  app.get('/products', { preHandler: authenticate }, async (request) => {
    const querySchema = z.object({
      companyId: z.string().uuid().optional(),
      branchId: z.string().uuid().optional(),
      search: z.string().optional(),
    });
    const query = querySchema.parse(request.query);
    const scope = await getScope(request.user as AuthUser, query);
    const filters = [scopedProductFilter(scope.companyId, scope.branchId), eq(products.isActive, true)];

    if (query.search) {
      const search = `%${query.search}%`;
      filters.push(or(ilike(products.name, search), ilike(products.barcode, search), ilike(products.sku, search)));
    }

    return db.select().from(products).where(and(...filters.filter(Boolean))).orderBy(products.name);
  });

  app.post('/products', { preHandler: authenticate }, async (request, reply) => {
    const authUser = request.user as AuthUser;
    const scope = await getScope(authUser);

    if (!canManageCatalog(scope.user)) {
      return reply.status(403).send({ message: 'Sem permissao para cadastrar produtos.' });
    }

    const bodySchema = z.object({
      companyId: z.string().uuid().optional(),
      branchId: z.string().uuid().nullable().optional(),
      name: z.string().min(2),
      barcode: z.string().optional(),
      sku: z.string().optional(),
      category: z.string().optional(),
      unit: z.string().default('un'),
      salePriceCents: moneySchema,
      costPriceCents: moneySchema.default(0),
      minStock: z.number().int().min(0).default(0),
      currentStock: z.number().int().min(0).default(0),
      ncm: z.string().optional(),
      cest: z.string().optional(),
      cfop: z.string().optional(),
      taxOrigin: z.string().optional(),
    });
    const body = bodySchema.parse(request.body);
    const companyId = scope.isMaster ? body.companyId || scope.companyId : scope.companyId;
    const branchId = scope.user.branchId || body.branchId || scope.branchId;

    if (!companyId) {
      return reply.status(400).send({ message: 'Informe a empresa do produto.' });
    }

    await assertBranchInCompany(companyId, branchId);
    const [product] = await db
      .insert(products)
      .values({
        ...body,
        companyId,
        branchId,
        barcode: body.barcode || null,
        sku: body.sku || null,
        createdBy: authUser.id,
        updatedBy: authUser.id,
      })
      .returning();

    await writeAudit({ user: scope.user, action: 'create', entity: 'product', entityId: product.id, companyId, branchId, summary: product.name });
    return reply.status(201).send(product);
  });

  app.put('/products/:id', { preHandler: authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const scope = await getScope(request.user as AuthUser);

    if (!canManageCatalog(scope.user)) {
      return reply.status(403).send({ message: 'Sem permissao para editar produtos.' });
    }

    const body = z
      .object({
        name: z.string().min(2).optional(),
        barcode: z.string().nullable().optional(),
        sku: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        unit: z.string().optional(),
        salePriceCents: moneySchema.optional(),
        costPriceCents: moneySchema.optional(),
        minStock: z.number().int().min(0).optional(),
        ncm: z.string().nullable().optional(),
        cest: z.string().nullable().optional(),
        cfop: z.string().nullable().optional(),
        taxOrigin: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(request.body);
    const [current] = await db.select().from(products).where(eq(products.id, params.id)).limit(1);

    if (!current || (scope.companyId && current.companyId !== scope.companyId) || (scope.branchId && current.branchId !== scope.branchId)) {
      return reply.status(404).send({ message: 'Produto nao encontrado.' });
    }

    const [product] = await db
      .update(products)
      .set({ ...body, updatedAt: new Date(), updatedBy: scope.user.id })
      .where(eq(products.id, params.id))
      .returning();

    await writeAudit({ user: scope.user, action: 'update', entity: 'product', entityId: product.id, companyId: product.companyId, branchId: product.branchId, summary: product.name });
    return product;
  });

  app.post('/products/import', { preHandler: authenticate }, async (request, reply) => {
    const scope = await getScope(request.user as AuthUser);

    if (!canManageCatalog(scope.user)) {
      return reply.status(403).send({ message: 'Sem permissao para importar produtos.' });
    }

    const body = z.object({ companyId: z.string().uuid().optional(), branchId: z.string().uuid().nullable().optional(), csv: z.string().min(1) }).parse(request.body);
    const companyId = scope.isMaster ? body.companyId || scope.companyId : scope.companyId;
    const branchId = scope.user.branchId || body.branchId || scope.branchId;

    if (!companyId) {
      return reply.status(400).send({ message: 'Informe a empresa da importacao.' });
    }

    const rows = parseCsv(body.csv);
    const inserted = [];
    for (const row of rows) {
      if (!row.nome && !row.name) {
        continue;
      }

      const [product] = await db
        .insert(products)
        .values({
          companyId,
          branchId,
          name: String(row.nome || row.name),
          barcode: String(row.codigo_barras || row.barcode || ''),
          sku: String(row.sku || ''),
          category: String(row.categoria || row.category || ''),
          unit: String(row.unidade || row.unit || 'un'),
          salePriceCents: Math.round(Number(row.preco_venda || row.salePrice || 0) * 100),
          costPriceCents: Math.round(Number(row.preco_custo || row.costPrice || 0) * 100),
          minStock: Number(row.estoque_minimo || row.minStock || 0),
          currentStock: Number(row.estoque_atual || row.currentStock || 0),
          ncm: String(row.ncm || ''),
          createdBy: scope.user.id,
          updatedBy: scope.user.id,
        })
        .returning();
      inserted.push(product);
    }

    await writeAudit({ user: scope.user, action: 'import', entity: 'product', companyId, branchId, summary: `${inserted.length} produtos importados` });
    return { imported: inserted.length };
  });

  app.get('/products/export', { preHandler: authenticate }, async (request, reply) => {
    const scope = await getScope(request.user as AuthUser, z.object({ companyId: z.string().uuid().optional(), branchId: z.string().uuid().optional() }).parse(request.query));
    const productList = await db.select().from(products).where(scopedProductFilter(scope.companyId, scope.branchId)).orderBy(products.name);
    const csv = toCsv(
      productList.map((product) => ({
        nome: product.name,
        codigo_barras: product.barcode,
        sku: product.sku,
        categoria: product.category,
        unidade: product.unit,
        preco_venda: product.salePriceCents / 100,
        preco_custo: product.costPriceCents / 100,
        estoque_minimo: product.minStock,
        estoque_atual: product.currentStock,
        ncm: product.ncm,
      }))
    );

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    return csv;
  });

  app.get('/customers', { preHandler: authenticate }, async (request) => {
    const query = z.object({ companyId: z.string().uuid().optional(), branchId: z.string().uuid().optional(), search: z.string().optional() }).parse(request.query);
    const scope = await getScope(request.user as AuthUser, query);
    const filters = [scopedCustomerFilter(scope.companyId, scope.branchId), eq(customers.isActive, true)];

    if (query.search) {
      const search = `%${query.search}%`;
      filters.push(or(ilike(customers.name, search), ilike(customers.document, search), ilike(customers.phone, search)));
    }

    return db.select().from(customers).where(and(...filters.filter(Boolean))).orderBy(customers.name);
  });

  app.post('/customers', { preHandler: authenticate }, async (request, reply) => {
    const scope = await getScope(request.user as AuthUser);
    const body = z
      .object({
        companyId: z.string().uuid().optional(),
        branchId: z.string().uuid().nullable().optional(),
        name: z.string().min(2),
        document: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
      })
      .parse(request.body);
    const companyId = scope.isMaster ? body.companyId || scope.companyId : scope.companyId;
    const branchId = scope.user.branchId || body.branchId || scope.branchId;

    if (!companyId) {
      return reply.status(400).send({ message: 'Informe a empresa do cliente.' });
    }

    const [customer] = await db
      .insert(customers)
      .values({ ...body, companyId, branchId, email: body.email || null, createdBy: scope.user.id, updatedBy: scope.user.id })
      .returning();
    await writeAudit({ user: scope.user, action: 'create', entity: 'customer', entityId: customer.id, companyId, branchId, summary: customer.name });
    return reply.status(201).send(customer);
  });

  app.post('/stock/movements', { preHandler: authenticate }, async (request, reply) => {
    const scope = await getScope(request.user as AuthUser);

    if (!canManageCatalog(scope.user)) {
      return reply.status(403).send({ message: 'Sem permissao para movimentar estoque.' });
    }

    const body = z
      .object({
        productId: z.string().uuid(),
        type: z.enum(['entry', 'loss', 'adjustment']),
        quantity: z.number().int(),
        reason: z.string().optional(),
      })
      .parse(request.body);
    const [product] = await db.select().from(products).where(eq(products.id, body.productId)).limit(1);

    if (!product || (scope.companyId && product.companyId !== scope.companyId) || (scope.branchId && product.branchId !== scope.branchId)) {
      return reply.status(404).send({ message: 'Produto nao encontrado.' });
    }

    const delta = body.type === 'entry' ? Math.abs(body.quantity) : body.type === 'loss' ? -Math.abs(body.quantity) : body.quantity;
    const nextStock = Math.max(0, product.currentStock + delta);
    const [movement] = await db.transaction(async (tx) => {
      await tx.update(products).set({ currentStock: nextStock, updatedAt: new Date(), updatedBy: scope.user.id }).where(eq(products.id, product.id));
      return tx
        .insert(inventoryMovements)
        .values({
          companyId: product.companyId,
          branchId: product.branchId,
          productId: product.id,
          userId: scope.user.id,
          type: body.type,
          quantity: delta,
          reason: body.reason,
        })
        .returning();
    });

    await writeAudit({ user: scope.user, action: body.type, entity: 'stock', entityId: product.id, companyId: product.companyId, branchId: product.branchId, summary: `${product.name}: ${delta}` });
    return reply.status(201).send(movement);
  });

  app.get('/stock/movements', { preHandler: authenticate }, async (request) => {
    const query = z.object({ companyId: z.string().uuid().optional(), branchId: z.string().uuid().optional() }).parse(request.query);
    const scope = await getScope(request.user as AuthUser, query);
    const filters = scope.companyId
      ? scope.branchId
        ? and(eq(inventoryMovements.companyId, scope.companyId), eq(inventoryMovements.branchId, scope.branchId))
        : eq(inventoryMovements.companyId, scope.companyId)
      : undefined;
    return db.select().from(inventoryMovements).where(filters).orderBy(desc(inventoryMovements.createdAt)).limit(100);
  });

  app.post('/sales', { preHandler: authenticate }, async (request, reply) => {
    const scope = await getScope(request.user as AuthUser);
    const body = z
      .object({
        companyId: z.string().uuid().optional(),
        branchId: z.string().uuid().nullable().optional(),
        customerId: z.string().uuid().nullable().optional(),
        paymentMethod: z.enum(['pix', 'debit', 'credit', 'cash', 'voucher', 'mixed']),
        discountCents: moneySchema.default(0),
        notes: z.string().optional(),
        items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1) })).min(1),
      })
      .parse(request.body);
    const companyId = scope.isMaster ? body.companyId || scope.companyId : scope.companyId;
    const branchId = scope.user.branchId || body.branchId || scope.branchId;

    if (!companyId) {
      return reply.status(400).send({ message: 'Informe a empresa da venda.' });
    }

    await assertBranchInCompany(companyId, branchId);
    const productList: ProductRecord[] = [];
    for (const item of body.items) {
      const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (!product || product.companyId !== companyId || (branchId && product.branchId !== branchId)) {
        return reply.status(400).send({ message: 'Produto fora do escopo da venda.' });
      }
      if (product.currentStock < item.quantity) {
        return reply.status(400).send({ message: `Estoque insuficiente para ${product.name}.` });
      }
      productList.push(product);
    }

    const totalCents = Math.max(
      0,
      body.items.reduce((total, item, index) => total + productList[index].salePriceCents * item.quantity, 0) - body.discountCents
    );

    const sale = await db.transaction(async (tx) => {
      const [createdSale] = await tx
        .insert(sales)
        .values({
          companyId,
          branchId,
          customerId: body.customerId || null,
          operatorId: scope.user.id,
          paymentMethod: body.paymentMethod,
          totalCents,
          discountCents: body.discountCents,
          notes: body.notes,
        })
        .returning();

      for (let index = 0; index < body.items.length; index += 1) {
        const item = body.items[index];
        const product = productList[index];
        await tx.insert(saleItems).values({
          saleId: createdSale.id,
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPriceCents: product.salePriceCents,
          totalCents: product.salePriceCents * item.quantity,
        });
        await tx.update(products).set({ currentStock: product.currentStock - item.quantity, updatedAt: new Date() }).where(eq(products.id, product.id));
        await tx.insert(inventoryMovements).values({
          companyId,
          branchId,
          productId: product.id,
          userId: scope.user.id,
          type: 'sale',
          quantity: -item.quantity,
          reason: `Venda ${createdSale.id}`,
        });
      }

      await tx.insert(fiscalDocuments).values({
        companyId,
        branchId,
        saleId: createdSale.id,
        type: 'nfce',
        status: 'pending',
        totalCents,
        updatedBy: scope.user.id,
      });

      return createdSale;
    });

    await writeAudit({ user: scope.user, action: 'complete', entity: 'sale', entityId: sale.id, companyId, branchId, summary: centsToCurrency(totalCents) });
    return reply.status(201).send(sale);
  });

  app.get('/sales', { preHandler: authenticate }, async (request) => {
    const query = z
      .object({ companyId: z.string().uuid().optional(), branchId: z.string().uuid().optional(), start: z.string().optional(), end: z.string().optional() })
      .parse(request.query);
    const scope = await getScope(request.user as AuthUser, query);
    return db.select().from(sales).where(scopedSalesFilter(scope.companyId, scope.branchId, asStartDate(query.start), asEndDate(query.end))).orderBy(desc(sales.createdAt)).limit(200);
  });

  app.get('/fiscal-settings', { preHandler: authenticate }, async (request) => {
    const query = z.object({ companyId: z.string().uuid().optional(), branchId: z.string().uuid().optional() }).parse(request.query);
    const scope = await getScope(request.user as AuthUser, query);
    const filters = scope.companyId
      ? scope.branchId
        ? and(eq(fiscalSettings.companyId, scope.companyId), eq(fiscalSettings.branchId, scope.branchId))
        : eq(fiscalSettings.companyId, scope.companyId)
      : undefined;
    return db.select().from(fiscalSettings).where(filters).orderBy(desc(fiscalSettings.updatedAt));
  });

  app.put('/fiscal-settings', { preHandler: authenticate }, async (request, reply) => {
    const scope = await getScope(request.user as AuthUser);

    if (!canManageCatalog(scope.user)) {
      return reply.status(403).send({ message: 'Sem permissao para configurar fiscal.' });
    }

    const body = z
      .object({
        companyId: z.string().uuid().optional(),
        branchId: z.string().uuid().nullable().optional(),
        provider: z.enum(['manual', 'focus', 'nfeio', 'tecnospeed', 'plugnotas']).default('manual'),
        environment: z.enum(['homologation', 'production']).default('homologation'),
        uf: z.string().min(2).max(2).optional(),
        stateRegistration: z.string().optional(),
        legalName: z.string().optional(),
        cscId: z.string().optional(),
        cscSecretRef: z.string().optional(),
        certificateRef: z.string().optional(),
        nfceSeries: z.string().default('1'),
        nextNfceNumber: z.number().int().min(1).default(1),
        isActive: z.boolean().default(true),
      })
      .parse(request.body);
    const companyId = scope.isMaster ? body.companyId || scope.companyId : scope.companyId;
    const branchId = scope.user.branchId || body.branchId || scope.branchId;

    if (!companyId) {
      return reply.status(400).send({ message: 'Informe a empresa da configuracao fiscal.' });
    }

    await assertBranchInCompany(companyId, branchId);
    const [existing] = await db
      .select()
      .from(fiscalSettings)
      .where(branchId ? and(eq(fiscalSettings.companyId, companyId), eq(fiscalSettings.branchId, branchId)) : and(eq(fiscalSettings.companyId, companyId), isNull(fiscalSettings.branchId)))
      .limit(1);
    const payload = {
      companyId,
      branchId,
      provider: body.provider,
      environment: body.environment,
      uf: body.uf,
      stateRegistration: body.stateRegistration,
      legalName: body.legalName,
      cscId: body.cscId,
      cscSecretRef: body.cscSecretRef,
      certificateRef: body.certificateRef,
      nfceSeries: body.nfceSeries,
      nextNfceNumber: body.nextNfceNumber,
      isActive: body.isActive,
      updatedAt: new Date(),
      updatedBy: scope.user.id,
    };
    const [setting] = existing
      ? await db.update(fiscalSettings).set(payload).where(eq(fiscalSettings.id, existing.id)).returning()
      : await db.insert(fiscalSettings).values(payload).returning();

    await writeAudit({ user: scope.user, action: 'upsert', entity: 'fiscal_setting', entityId: setting.id, companyId, branchId, summary: `${setting.provider}/${setting.environment}` });
    return setting;
  });

  app.get('/fiscal-documents', { preHandler: authenticate }, async (request) => {
    const query = z.object({ companyId: z.string().uuid().optional(), branchId: z.string().uuid().optional() }).parse(request.query);
    const scope = await getScope(request.user as AuthUser, query);
    const filters = scope.companyId
      ? scope.branchId
        ? and(eq(fiscalDocuments.companyId, scope.companyId), eq(fiscalDocuments.branchId, scope.branchId))
        : eq(fiscalDocuments.companyId, scope.companyId)
      : undefined;
    return db.select().from(fiscalDocuments).where(filters).orderBy(desc(fiscalDocuments.createdAt)).limit(100);
  });

  app.post('/fiscal-documents/:id/issue', { preHandler: authenticate }, async (request, reply) => {
    const scope = await getScope(request.user as AuthUser);

    if (!canManageCatalog(scope.user)) {
      return reply.status(403).send({ message: 'Sem permissao para emitir documento fiscal.' });
    }

    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [document] = await db.select().from(fiscalDocuments).where(eq(fiscalDocuments.id, params.id)).limit(1);

    if (!document || (scope.companyId && document.companyId !== scope.companyId) || (scope.branchId && document.branchId !== scope.branchId)) {
      return reply.status(404).send({ message: 'Documento fiscal nao encontrado.' });
    }

    if (document.status === 'authorized' || document.status === 'cancelled') {
      return reply.status(400).send({ message: 'Documento fiscal nao pode ser emitido neste status.' });
    }

    const updated = await issueFiscalDocument(document, scope.user);
    await writeAudit({ user: scope.user, action: updated.status, entity: 'fiscal_document', entityId: updated.id, companyId: updated.companyId, branchId: updated.branchId, summary: updated.accessKey || updated.errorMessage || updated.status });
    return updated;
  });

  app.put('/fiscal-documents/:id', { preHandler: authenticate }, async (request, reply) => {
    const scope = await getScope(request.user as AuthUser);

    if (!canManageCatalog(scope.user)) {
      return reply.status(403).send({ message: 'Sem permissao para atualizar documentos fiscais.' });
    }

    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        status: z.enum(['pending', 'authorized', 'rejected', 'cancelled']),
        number: z.string().optional(),
        series: z.string().optional(),
        accessKey: z.string().optional(),
        protocol: z.string().optional(),
        errorMessage: z.string().optional(),
      })
      .parse(request.body);
    const [document] = await db.update(fiscalDocuments).set({ ...body, issuedAt: body.status === 'authorized' ? new Date() : undefined, updatedAt: new Date(), updatedBy: scope.user.id }).where(eq(fiscalDocuments.id, params.id)).returning();

    if (!document) {
      return reply.status(404).send({ message: 'Documento fiscal nao encontrado.' });
    }

    await writeAudit({ user: scope.user, action: body.status, entity: 'fiscal_document', entityId: document.id, companyId: document.companyId, branchId: document.branchId, summary: document.accessKey || document.errorMessage || document.status });
    return document;
  });

  app.get('/dashboard', { preHandler: authenticate }, async (request) => {
    const query = z.object({ companyId: z.string().uuid().optional(), branchId: z.string().uuid().optional() }).parse(request.query);
    const scope = await getScope(request.user as AuthUser, query);
    const start = asStartDate();
    const end = asEndDate();
    const [saleList, productList, fiscalList, auditList] = await Promise.all([
      db.select().from(sales).where(scopedSalesFilter(scope.companyId, scope.branchId, start, end)).orderBy(desc(sales.createdAt)),
      db.select().from(products).where(scopedProductFilter(scope.companyId, scope.branchId)),
      db.select().from(fiscalDocuments).where(scope.companyId ? (scope.branchId ? and(eq(fiscalDocuments.companyId, scope.companyId), eq(fiscalDocuments.branchId, scope.branchId)) : eq(fiscalDocuments.companyId, scope.companyId)) : undefined),
      db.select().from(auditLogs).where(scope.companyId ? (scope.branchId ? and(eq(auditLogs.companyId, scope.companyId), eq(auditLogs.branchId, scope.branchId)) : eq(auditLogs.companyId, scope.companyId)) : undefined).orderBy(desc(auditLogs.createdAt)).limit(8),
    ]);
    const completedSales = saleList.filter((sale) => sale.status === 'completed');
    const totalCents = completedSales.reduce((total, sale) => total + sale.totalCents, 0);
    const paymentTotals = completedSales.reduce<Record<string, number>>((totals, sale) => ({ ...totals, [sale.paymentMethod]: (totals[sale.paymentMethod] || 0) + sale.totalCents }), {});
    const criticalStock = productList.filter((product) => product.currentStock <= product.minStock).length;
    const pendingFiscal = fiscalList.filter((document) => document.status === 'pending' || document.status === 'rejected').length;

    return {
      summary: {
        salesTodayCents: totalCents,
        salesCount: completedSales.length,
        averageTicketCents: completedSales.length ? Math.round(totalCents / completedSales.length) : 0,
        criticalStock,
        pendingFiscal,
      },
      paymentTotals,
      recentSales: completedSales.slice(0, 8),
      criticalProducts: productList.filter((product) => product.currentStock <= product.minStock).slice(0, 8),
      auditLogs: auditList,
    };
  });

  app.get('/reports/period', { preHandler: authenticate }, async (request) => {
    const query = z
      .object({ companyId: z.string().uuid().optional(), branchId: z.string().uuid().optional(), start: z.string().optional(), end: z.string().optional() })
      .parse(request.query);
    const scope = await getScope(request.user as AuthUser, query);
    const saleList: SaleRecord[] = await db.select().from(sales).where(scopedSalesFilter(scope.companyId, scope.branchId, asStartDate(query.start), asEndDate(query.end))).orderBy(desc(sales.createdAt));
    const totalCents = saleList.reduce((total, sale) => total + sale.totalCents, 0);
    const byPayment = saleList.reduce<Record<string, number>>((totals, sale) => ({ ...totals, [sale.paymentMethod]: (totals[sale.paymentMethod] || 0) + sale.totalCents }), {});

    return {
      totalCents,
      salesCount: saleList.length,
      averageTicketCents: saleList.length ? Math.round(totalCents / saleList.length) : 0,
      byPayment,
      sales: saleList,
    };
  });
}
