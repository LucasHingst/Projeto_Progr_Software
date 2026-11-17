import { db } from "./db";

type JsonObject = Record<string, unknown>;

function errorResponse(message: string, status = 400) {
    return Response.json({ message }, { status });
}

async function readBody(req: Request): Promise<JsonObject | Response> {
    let value: unknown;
    try {
        value = await req.json();
    } catch {
        return errorResponse("O corpo da requisição deve conter JSON válido.");
    }

    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return errorResponse("O corpo da requisição deve ser um objeto JSON.");
    }
    return value as JsonObject;
}

function text(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function validEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function idFromParam(value: string): number | null {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function isUniqueError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("UNIQUE constraint failed");
}

function userById(id: number) {
    return db.query("SELECT id, username, email FROM users WHERE id = ?").get(id);
}

function stickerById(id: number) {
    return db.query("SELECT id, nome, imagem, categoria FROM stickers WHERE id = ?").get(id);
}

async function createUser(req: Request) {
    const body = await readBody(req);
    if (body instanceof Response) return body;

    const username = text(body.username);
    const email = text(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || username.length > 40) return errorResponse("Username deve ter entre 1 e 40 caracteres.");
    if (!validEmail(email)) return errorResponse("Informe um email válido.");
    if (password.length < 8 || password.length > 128) return errorResponse("A senha deve ter entre 8 e 128 caracteres.");

    try {
        const hash = await Bun.password.hash(password);
        const result = db.query(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)"
        ).run(username, email, hash);

        return Response.json({
            message: "Usuário cadastrado com sucesso.",
            user: { id: Number(result.lastInsertRowid), username, email }
        }, { status: 201 });
    } catch (error) {
        if (isUniqueError(error)) return errorResponse("Username ou email já cadastrado.", 409);
        console.error("Erro ao cadastrar usuário:", error);
        return errorResponse("Não foi possível cadastrar o usuário.", 500);
    }
}

async function replaceUser(req: Request, id: number) {
    const body = await readBody(req);
    if (body instanceof Response) return body;

    const username = text(body.username);
    const email = text(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || username.length > 40) return errorResponse("Username deve ter entre 1 e 40 caracteres.");
    if (!validEmail(email)) return errorResponse("Informe um email válido.");
    if (password.length < 8 || password.length > 128) return errorResponse("A senha deve ter entre 8 e 128 caracteres.");

    try {
        const hash = await Bun.password.hash(password);
        const result = db.query(
            "UPDATE users SET username = ?, email = ?, password_hash = ? WHERE id = ?"
        ).run(username, email, hash, id);

        if (result.changes === 0) return errorResponse("Usuário não encontrado.", 404);
        return Response.json({ message: "Usuário atualizado.", user: userById(id) });
    } catch (error) {
        if (isUniqueError(error)) return errorResponse("Username ou email já utilizado.", 409);
        console.error("Erro ao atualizar usuário:", error);
        return errorResponse("Não foi possível atualizar o usuário.", 500);
    }
}

async function patchUser(req: Request, id: number) {
    const body = await readBody(req);
    if (body instanceof Response) return body;

    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (body.username !== undefined) {
        const username = text(body.username);
        if (!username || username.length > 40) return errorResponse("Username deve ter entre 1 e 40 caracteres.");
        fields.push("username = ?");
        values.push(username);
    }
    if (body.email !== undefined) {
        const email = text(body.email).toLowerCase();
        if (!validEmail(email)) return errorResponse("Informe um email válido.");
        fields.push("email = ?");
        values.push(email);
    }
    if (body.password !== undefined) {
        const password = typeof body.password === "string" ? body.password : "";
        if (password.length < 8 || password.length > 128) return errorResponse("A senha deve ter entre 8 e 128 caracteres.");
        fields.push("password_hash = ?");
        values.push(await Bun.password.hash(password));
    }

    if (fields.length === 0) return errorResponse("Informe ao menos um campo para atualizar.");
    values.push(id);

    try {
        const result = db.query(
            `UPDATE users SET ${fields.join(", ")} WHERE id = ?`
        ).run(...values);

        if (result.changes === 0) return errorResponse("Usuário não encontrado.", 404);
        return Response.json({ message: "Usuário atualizado.", user: userById(id) });
    } catch (error) {
        if (isUniqueError(error)) return errorResponse("Username ou email já utilizado.", 409);
        console.error("Erro ao atualizar usuário:", error);
        return errorResponse("Não foi possível atualizar o usuário.", 500);
    }
}

function validateSticker(body: JsonObject) {
    const nome = text(body.nome);
    const imagem = text(body.imagem);
    const categoria = text(body.categoria);

    if (!nome || nome.length > 80) return { error: errorResponse("Nome deve ter entre 1 e 80 caracteres.") };
    if (!imagem || imagem.length > 2_000_000) return { error: errorResponse("Imagem obrigatória e limitada a 2 MB de texto.") };
    if (!categoria || categoria.length > 50) return { error: errorResponse("Categoria deve ter entre 1 e 50 caracteres.") };

    return { nome, imagem, categoria };
}

async function createSticker(req: Request) {
    const body = await readBody(req);
    if (body instanceof Response) return body;

    const data = validateSticker(body);
    if ("error" in data) return data.error;

    const result = db.query(
        "INSERT INTO stickers (nome, imagem, categoria) VALUES (?, ?, ?)"
    ).run(data.nome, data.imagem, data.categoria);

    return Response.json({
        message: "Sticker cadastrado com sucesso.",
        sticker: {
            id: Number(result.lastInsertRowid),
            nome: data.nome,
            imagem: data.imagem,
            categoria: data.categoria
        }
    }, { status: 201 });
}

async function replaceSticker(req: Request, id: number) {
    const body = await readBody(req);
    if (body instanceof Response) return body;

    const data = validateSticker(body);
    if ("error" in data) return data.error;

    const result = db.query(
        "UPDATE stickers SET nome = ?, imagem = ?, categoria = ? WHERE id = ?"
    ).run(data.nome, data.imagem, data.categoria, id);

    if (result.changes === 0) return errorResponse("Sticker não encontrado.", 404);
    return Response.json({ message: "Sticker atualizado.", sticker: stickerById(id) });
}

async function patchSticker(req: Request, id: number) {
    const body = await readBody(req);
    if (body instanceof Response) return body;

    const fields: string[] = [];
    const values: string[] = [];

    if (body.nome !== undefined) {
        const nome = text(body.nome);
        if (!nome || nome.length > 80) return errorResponse("Nome deve ter entre 1 e 80 caracteres.");
        fields.push("nome = ?");
        values.push(nome);
    }
    if (body.imagem !== undefined) {
        const imagem = text(body.imagem);
        if (!imagem || imagem.length > 2_000_000) return errorResponse("Imagem inválida ou acima do limite.");
        fields.push("imagem = ?");
        values.push(imagem);
    }
    if (body.categoria !== undefined) {
        const categoria = text(body.categoria);
        if (!categoria || categoria.length > 50) return errorResponse("Categoria deve ter entre 1 e 50 caracteres.");
        fields.push("categoria = ?");
        values.push(categoria);
    }

    if (fields.length === 0) return errorResponse("Informe ao menos um campo para atualizar.");
    values.push(String(id));

    const result = db.query(
        `UPDATE stickers SET ${fields.join(", ")} WHERE id = ?`
    ).run(...values);

    if (result.changes === 0) return errorResponse("Sticker não encontrado.", 404);
    return Response.json({ message: "Sticker atualizado.", sticker: stickerById(id) });
}

const server = Bun.serve({
    port: Number(Bun.env.PORT ?? 3000),
    routes: {
        "/user": {
            GET: () => Response.json(
                db.query("SELECT id, username, email FROM users ORDER BY id DESC").all()
            ),
            POST: createUser
        },
        "/user/:id": {
            GET: (req) => {
                const id = idFromParam(req.params.id);
                if (id === null) return errorResponse("ID de usuário inválido.");
                const user = userById(id);
                return user ? Response.json(user) : errorResponse("Usuário não encontrado.", 404);
            },
            PUT: (req) => {
                const id = idFromParam(req.params.id);
                return id === null ? errorResponse("ID de usuário inválido.") : replaceUser(req, id);
            },
            PATCH: (req) => {
                const id = idFromParam(req.params.id);
                return id === null ? errorResponse("ID de usuário inválido.") : patchUser(req, id);
            },
            DELETE: (req) => {
                const id = idFromParam(req.params.id);
                if (id === null) return errorResponse("ID de usuário inválido.");
                const result = db.query("DELETE FROM users WHERE id = ?").run(id);
                return result.changes === 0
                    ? errorResponse("Usuário não encontrado.", 404)
                    : Response.json({ message: "Usuário excluído com sucesso." });
            }
        },
        "/sticker": {
            GET: (req) => {
                const category = new URL(req.url).searchParams.get("categoria");
                const query = category
                    ? db.query("SELECT id, nome, imagem, categoria FROM stickers WHERE categoria = ? ORDER BY id DESC").all(category)
                    : db.query("SELECT id, nome, imagem, categoria FROM stickers ORDER BY id DESC").all();
                return Response.json(query);
            },
            POST: createSticker
        },
        "/sticker/:id": {
            GET: (req) => {
                const id = idFromParam(req.params.id);
                if (id === null) return errorResponse("ID de sticker inválido.");
                const sticker = stickerById(id);
                return sticker ? Response.json(sticker) : errorResponse("Sticker não encontrado.", 404);
            },
            PUT: (req) => {
                const id = idFromParam(req.params.id);
                return id === null ? errorResponse("ID de sticker inválido.") : replaceSticker(req, id);
            },
            PATCH: (req) => {
                const id = idFromParam(req.params.id);
                return id === null ? errorResponse("ID de sticker inválido.") : patchSticker(req, id);
            },
            DELETE: (req) => {
                const id = idFromParam(req.params.id);
                if (id === null) return errorResponse("ID de sticker inválido.");
                const result = db.query("DELETE FROM stickers WHERE id = ?").run(id);
                return result.changes === 0
                    ? errorResponse("Sticker não encontrado.", 404)
                    : Response.json({ message: "Sticker excluído com sucesso." });
            }
        }
    },
    fetch() {
        return errorResponse("Rota não encontrada.", 404);
    }
});

console.log(`Sticker Mural API rodando em ${server.url}`);
