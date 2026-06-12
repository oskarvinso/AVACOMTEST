import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Evaluation, CloudWatchLog } from "./src/types";

// Setup server state
let evaluations: Evaluation[] = [
  {
    evaluationId: "eval-9a8b7c",
    courseId: "CS-101",
    title: "Introducción a Algoritmos - Examen Parcial",
    description: "Evaluación teórica sobre complejidad algorítmica, arrays y recursividad.",
    dueDate: "2026-06-20T23:59:59.000Z",
    status: "active",
    createdAt: "2026-06-10T14:30:00.000Z"
  },
  {
    evaluationId: "eval-5d4e3f",
    courseId: "CS-101",
    title: "Estructuras de Datos - Taller Práctico",
    description: "Implementación de Listas Enlazadas, Pilas y Colas en TypeScript.",
    dueDate: "2026-06-25T18:00:00.000Z",
    status: "active",
    createdAt: "2026-06-11T09:12:00.000Z"
  },
  {
    evaluationId: "eval-1a2b3c",
    courseId: "BD-202",
    title: "Base de Datos I - Modelado Relacional",
    description: "Diseño de diagramas Entidad-Relación y normalización hasta 3FN.",
    dueDate: "2026-06-15T12:00:00.000Z",
    status: "completed",
    createdAt: "2026-06-01T10:00:00.000Z"
  },
  {
    evaluationId: "eval-7f8g9h",
    courseId: "MATH-301",
    title: "Cálculo Multivariable - Tarea 3",
    description: "Ejercicios de integrales dobles y triples en coordenadas polares.",
    dueDate: "2026-06-19T23:59:59.000Z",
    status: "cancelled",
    createdAt: "2026-06-05T08:00:00.000Z"
  }
];

let logs: CloudWatchLog[] = [
  {
    timestamp: new Date().toISOString(),
    level: "info",
    message: "Cold start completed. AWS Lambda simulator initialized.",
    requestId: "req-init-8x7a9",
    executionTimeMs: 145
  },
  {
    timestamp: new Date().toISOString(),
    level: "info",
    message: "DynamoDB client connected successfully to table 'Evaluations-Production'.",
    requestId: "req-init-8x7a9",
    executionTimeMs: 12
  }
];

const appendLog = (level: 'info' | 'warn' | 'error', message: string, requestId?: string, executionTimeMs?: number) => {
  const reqId = requestId || `req-${Math.random().toString(36).substring(2, 10)}`;
  logs.push({
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId: reqId,
    executionTimeMs
  });
  // Keep logs under 100 entries to prevent memory leak
  if (logs.length > 100) {
    logs.shift();
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Log middleware to capture AWS-style execution context
  app.use((req, res, next) => {
    const route = req.path;
    if (route.startsWith("/api/logs") || route.startsWith("/@vite") || route.startsWith("/src") || route.includes(".")) {
      return next();
    }
    const requestId = `req-${Math.random().toString(36).substring(2, 10)}`;
    const start = Date.now();
    
    // Attach details to res so we can access on completion
    res.on("finish", () => {
      const duration = Date.now() - start;
      const userRole = req.headers["x-user-role"] || "anonymous";
      appendLog(
        res.statusCode >= 400 ? "error" : "info",
        `Lambda Execution: Method=${req.method} Path=${req.path} Status=${res.statusCode} Role=${userRole}`,
        requestId,
        duration
      );
    });
    
    next();
  });

  // API Endpoints
  
  // GET Evaluations (List with filtering support)
  const getEvaluationsHandler = (req: express.Request, res: express.Response) => {
    const { courseId, status, search } = req.query;
    
    let filtered = [...evaluations];
    
    if (courseId && typeof courseId === "string" && courseId !== "all") {
      filtered = filtered.filter(e => e.courseId.toLowerCase() === courseId.toLowerCase());
    }
    
    if (status && typeof status === "string" && status !== "all") {
      filtered = filtered.filter(e => e.status === status);
    }
    
    if (search && typeof search === "string" && search.trim() !== "") {
      const q = search.toLowerCase();
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(q) || 
        e.description.toLowerCase().includes(q) ||
        e.evaluationId.toLowerCase().includes(q)
      );
    }
    
    // Simulate DynamoDB Scan Log
    const reqId = `req-scan-${Math.random().toString(36).substring(2, 10)}`;
    appendLog(
      "info", 
      `DynamoDB Scan: FilterExpressions applied: { courseId: "${courseId || 'all'}", status: "${status || 'all'}", search: "${search || ''}" }. ScannedCount=${evaluations.length} Count=${filtered.length}`,
      reqId,
      8
    );

    res.json(filtered);
  };
  
  app.get("/evaluations", getEvaluationsHandler);
  app.get("/api/evaluations", getEvaluationsHandler);

  // GET Evaluation by ID (Get)
  const getEvaluationByIdHandler = (req: express.Request, res: express.Response): void => {
    const { id } = req.params;
    const evaluation = evaluations.find(e => e.evaluationId === id);
    
    const reqId = `req-getitem-${Math.random().toString(36).substring(2, 10)}`;
    
    if (!evaluation) {
      appendLog("warn", `DynamoDB GetItem: Key { evaluationId: "${id}" } not found.`, reqId, 4);
      res.status(404).json({ error: `Evaluation with ID ${id} not found.` });
      return;
    }
    
    appendLog("info", `DynamoDB GetItem: Retrieved record for ID "${id}" { title: "${evaluation.title}" }`, reqId, 5);
    res.json(evaluation);
  };

  app.get("/evaluations/:id", getEvaluationByIdHandler);
  app.get("/api/evaluations/:id", getEvaluationByIdHandler);

  // POST Evaluation (Create)
  const createEvaluationHandler = (req: express.Request, res: express.Response): void => {
    const { courseId, title, description, dueDate, status } = req.body;
    
    // Validation
    const errors: string[] = [];
    if (!courseId || typeof courseId !== "string" || courseId.trim() === "") {
      errors.push("El código del curso (courseId) es requerido.");
    }
    if (!title || typeof title !== "string" || title.trim() === "") {
      errors.push("El título es requerido.");
    }
    if (!description || typeof description !== "string" || description.trim() === "") {
      errors.push("La descripción es requerida.");
    }
    if (!dueDate || isNaN(Date.parse(dueDate))) {
      errors.push("La fecha de vencimiento (dueDate) debe ser una fecha ISO 8601 válida.");
    }
    if (!status || !["active", "completed", "cancelled"].includes(status)) {
      errors.push("El estado debe ser 'active', 'completed' o 'cancelled'.");
    }

    const reqId = `req-putitem-${Math.random().toString(36).substring(2, 10)}`;

    if (errors.length > 0) {
      appendLog("error", `Lambda Validation Failure: ${errors.join(" | ")}`, reqId, 3);
      res.status(400).json({ error: "Validation Error", details: errors });
      return;
    }

    const newEvaluation: Evaluation = {
      evaluationId: `eval-${Math.random().toString(36).substring(2, 8)}`,
      courseId: courseId.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
      dueDate: new Date(dueDate).toISOString(),
      status: status as 'active' | 'completed' | 'cancelled',
      createdAt: new Date().toISOString()
    };

    evaluations.unshift(newEvaluation);
    appendLog("info", `DynamoDB PutItem: Created evaluation ID "${newEvaluation.evaluationId}" under Course "${newEvaluation.courseId}"`, reqId, 12);
    
    res.status(201).json(newEvaluation);
  };

  app.post("/evaluations", createEvaluationHandler);
  app.post("/api/evaluations", createEvaluationHandler);

  // PUT Evaluation (Update)
  const updateEvaluationHandler = (req: express.Request, res: express.Response): void => {
    const { id } = req.params;
    const { courseId, title, description, dueDate, status } = req.body;
    
    const index = evaluations.findIndex(e => e.evaluationId === id);
    const reqId = `req-update-${Math.random().toString(36).substring(2, 10)}`;

    if (index === -1) {
      appendLog("warn", `DynamoDB UpdateItem: Key { evaluationId: "${id}" } not found for update.`, reqId, 4);
      res.status(404).json({ error: `Evaluation with ID ${id} not found.` });
      return;
    }

    // Validation
    const errors: string[] = [];
    if (!courseId || typeof courseId !== "string" || courseId.trim() === "") {
      errors.push("El código del curso (courseId) es requerido.");
    }
    if (!title || typeof title !== "string" || title.trim() === "") {
      errors.push("El título es requerido.");
    }
    if (!description || typeof description !== "string" || description.trim() === "") {
      errors.push("La descripción es requerida.");
    }
    if (!dueDate || isNaN(Date.parse(dueDate))) {
      errors.push("La fecha de vencimiento (dueDate) debe ser una fecha ISO 8601 válida.");
    }
    if (!status || !["active", "completed", "cancelled"].includes(status)) {
      errors.push("El estado debe ser 'active', 'completed' o 'cancelled'.");
    }

    if (errors.length > 0) {
      appendLog("error", `Lambda Validation Failure on Update: ${errors.join(" | ")}`, reqId, 2);
      res.status(400).json({ error: "Validation Error", details: errors });
      return;
    }

    const updated: Evaluation = {
      ...evaluations[index],
      courseId: courseId.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
      dueDate: new Date(dueDate).toISOString(),
      status: status as 'active' | 'completed' | 'cancelled'
    };

    evaluations[index] = updated;
    appendLog("info", `DynamoDB UpdateItem: Updated ID "${id}" { title: "${updated.title}" } successful`, reqId, 15);
    
    res.json(updated);
  };

  app.put("/evaluations/:id", updateEvaluationHandler);
  app.put("/api/evaluations/:id", updateEvaluationHandler);

  // DELETE Evaluation (Delete)
  const deleteEvaluationHandler = (req: express.Request, res: express.Response): void => {
    const { id } = req.params;
    const index = evaluations.findIndex(e => e.evaluationId === id);
    const reqId = `req-delete-${Math.random().toString(36).substring(2, 10)}`;

    if (index === -1) {
      appendLog("warn", `DynamoDB DeleteItem: Key { evaluationId: "${id}" } not found for deletion.`, reqId, 4);
      res.status(404).json({ error: `Evaluation with ID ${id} not found.` });
      return;
    }

    const deletedTitle = evaluations[index].title;
    evaluations.splice(index, 1);
    
    appendLog("info", `DynamoDB DeleteItem: Deleted record for ID "${id}" ("${deletedTitle}")`, reqId, 14);
    res.json({ message: `Evaluation with ID ${id} deleted successfully.`, success: true });
  };

  app.delete("/evaluations/:id", deleteEvaluationHandler);
  app.delete("/api/evaluations/:id", deleteEvaluationHandler);

  // CloudWatch Log stream endpoints
  app.get("/api/logs", (req, res) => {
    res.json(logs);
  });

  app.post("/api/logs/clear", (req, res) => {
    logs = [
      {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "CloudWatch logs cleared by administrative client request.",
        requestId: `req-clear-${Math.random().toString(36).substring(2, 10)}`,
        executionTimeMs: 1
      }
    ];
    res.json({ success: true, message: "Logs cleared.", logs });
  });

  // Reset database state handler (factory reset)
  app.post("/api/reset", (req, res) => {
    evaluations = [
      {
        evaluationId: "eval-9a8b7c",
        courseId: "CS-101",
        title: "Introducción a Algoritmos - Examen Parcial",
        description: "Evaluación teórica sobre complejidad algorítmica, arrays y recursividad.",
        dueDate: "2026-06-20T23:59:59.000Z",
        status: "active",
        createdAt: "2026-06-10T14:30:00.000Z"
      },
      {
        evaluationId: "eval-5d4e3f",
        courseId: "CS-101",
        title: "Estructuras de Datos - Taller Práctico",
        description: "Implementación de Listas Enlazadas, Pilas y Colas en TypeScript.",
        dueDate: "2026-06-25T18:00:00.000Z",
        status: "active",
        createdAt: "2026-06-11T09:12:00.000Z"
      },
      {
        evaluationId: "eval-1a2b3c",
        courseId: "BD-202",
        title: "Base de Datos I - Modelado Relacional",
        description: "Diseño de diagramas Entidad-Relación y normalización hasta 3FN.",
        dueDate: "2026-06-15T12:00:00.000Z",
        status: "completed",
        createdAt: "2026-06-01T10:00:00.000Z"
      },
      {
        evaluationId: "eval-7f8g9h",
        courseId: "MATH-301",
        title: "Cálculo Multivariable - Tarea 3",
        description: "Ejercicios de integrales dobles y triples en coordenadas polares.",
        dueDate: "2026-06-19T23:59:59.000Z",
        status: "cancelled",
        createdAt: "2026-06-05T08:00:00.000Z"
      }
    ];

    logs = [
      {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "DynamoDB Table re-seeded to factory standard. 4 templates loaded.",
        requestId: `req-reset-${Math.random().toString(36).substring(2, 10)}`,
        executionTimeMs: 15
      }
    ];

    res.json({ success: true, message: "Database re-seeded.", evaluations });
  });

  // Vite development integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
