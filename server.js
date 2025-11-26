// server.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");

const { log } = require("./logger");
const { recordRequest, getMetrics } = require("./metrics");
const { pacientes } = require("./pacientes");

const app = express();
app.use(express.json());

// Armazena "traces" simples em memória
const traces = [];

// Middleware para timing + métricas por requisição
app.use((req, res, next) => {
  const start = Date.now();
  const traceId = uuidv4();
  req.traceId = traceId;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const isError = res.statusCode >= 500;
    recordRequest(duration, isError);

    traces.push({
      traceId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration_ms: duration
    });

    if (traces.length > 200) {
      traces.shift();
    }
  });

  next();
});

// ========= ENDPOINTS =========

// Health check
app.get("/", (req, res) => {
  res.send("API de Saúde — Online");
});

// Lista TODOS os pacientes (cuidado: 1000 registros)
app.get("/pacientes", (req, res) => {
  const { nome, cidade, uf, ativo } = req.query;

  let resultado = [...pacientes];

  if (nome) {
    resultado = resultado.filter((p) =>
      p.nome.toLowerCase().includes(nome.toLowerCase())
    );
  }

  if (cidade) {
    resultado = resultado.filter(
      (p) => p.cidade.toLowerCase() === cidade.toLowerCase()
    );
  }

  if (uf) {
    resultado = resultado.filter(
      (p) => p.uf.toLowerCase() === uf.toLowerCase()
    );
  }

  if (ativo === "true") {
    resultado = resultado.filter((p) => p.ativo);
  } else if (ativo === "false") {
    resultado = resultado.filter((p) => !p.ativo);
  }

  log("Lista de pacientes consultada", {
    traceId: req.traceId,
    total_retornado: resultado.length
  });

  res.json(resultado);
});

// Detalhe de paciente por ID
app.get("/pacientes/:id", (req, res) => {
  const id = Number(req.params.id);
  const paciente = pacientes.find((p) => p.id === id);

  if (!paciente) {
    log("Paciente não encontrado", { traceId: req.traceId, id });
    return res.status(404).json({ erro: "Paciente não encontrado" });
  }

  log("Paciente consultado", { traceId: req.traceId, id });
  res.json(paciente);
});

// Cria paciente em memória (não persiste entre restarts)
app.post("/pacientes", (req, res) => {
  const body = req.body || {};
  const novoId = pacientes.length + 1;

  const novo = {
    id: novoId,
    nome: body.nome || `Paciente ${novoId}`,
    idade: body.idade || 30,
    sexo: body.sexo || "F",
    cpf: body.cpf || `000.000.000-${String(novoId).padStart(2, "0")}`,
    cidade: body.cidade || "Aracaju",
    uf: body.uf || "SE",
    comorbidades: body.comorbidades || ["nenhuma"],
    ativo: body.ativo !== undefined ? body.ativo : true
  };

  pacientes.push(novo);

  log("Paciente criado", { traceId: req.traceId, id: novo.id });

  res.status(201).json(novo);
});

// Resumo estatístico
app.get("/estatisticas/resumo", (req, res) => {
  const total = pacientes.length;
  const ativos = pacientes.filter((p) => p.ativo).length;
  const mediaIdade =
    pacientes.reduce((acc, p) => acc + p.idade, 0) / pacientes.length;

  const porUF = pacientes.reduce((acc, p) => {
    acc[p.uf] = (acc[p.uf] || 0) + 1;
    return acc;
  }, {});

  log("Resumo estatístico consultado", { traceId: req.traceId });

  res.json({
    total_pacientes: total,
    pacientes_ativos: ativos,
    pacientes_inativos: total - ativos,
    media_idade: Number(mediaIdade.toFixed(2)),
    por_uf: porUF
  });
});

// Métricas
app.get("/metrics", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(getMetrics());
});

// Traces simples (últimos 200)
app.get("/traces", (req, res) => {
  res.json(traces);
});

// ========= START =========
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  log(`API rodando na porta ${PORT}`, { port: PORT });
});
