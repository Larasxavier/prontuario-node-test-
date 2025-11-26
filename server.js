const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { log } = require("./logger");
const { recordRequest, recordError, getMetrics } = require("./metrics");

const app = express();
app.use(express.json());

function generateTraceId() {
  return uuidv4();
}

const traces = [];

function recordTrace(trace) {
  traces.push(trace);
}

app.use((req, res, next) => {
  req.traceId = generateTraceId();
  req.startTime = Date.now();
  next();
});

app.get("/", (req, res) => {
  res.send("API de Saúde — Online");
});

// GET pacientes
app.get("/pacientes", (req, res) => {
  const start = Date.now();

  const trace = {
    id: req.traceId,
    route: "/pacientes",
    step: "FAKE_DB_CALL",
    duration_ms: Math.floor(Math.random() * 50) + 10
  };

  recordTrace(trace);

  recordRequest(Date.now() - req.startTime);
  log("Paciente listado", { traceId: req.traceId });

  res.json([{ id: 1, nome: "Maria", idade: 32 }]);
});

// endpoint de métricas
app.get("/metrics", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(getMetrics());
});

// endpoint de traces
app.get("/traces", (req, res) => {
  res.json(traces.slice(-20)); // últimos 20
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => log(`API rodando na porta ${PORT}`));
