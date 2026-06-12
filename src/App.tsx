import React, { useState, useEffect } from "react";
import { Evaluation, CloudWatchLog } from "./types";
import { EvaluationTable } from "./components/EvaluationTable";
import { EvaluationForm } from "./components/EvaluationForm";
import { CloudWatchLogs } from "./components/CloudWatchLogs";
import { DynamoDBVisualizer } from "./components/DynamoDBVisualizer";
import { AwsArchitectureInfo } from "./components/AwsArchitectureInfo";
import { InteractiveTestSuite } from "./components/InteractiveTestSuite";
import {
  Layers,
  ShieldCheck,
  Terminal,
  Database,
  BookOpen,
  Plus,
  RefreshCw,
  Sparkles,
  Lock,
  Unlock,
  Info,
  Award,
  CircleAlert
} from "lucide-react";

export default function App() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [logs, setLogs] = useState<CloudWatchLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFormModal, setActiveFormModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

  // States for search and filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCourseId, setFilterCourseId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Authentication simulations
  const [userRole, setUserRole] = useState<'teacher' | 'student'>("teacher"); // 'teacher' (admin CRUD), 'student' (read only)
  const [authNotificationBox, setAuthNotificationBox] = useState<string | null>(null);

  // Custom visual view mode tabs: "dashboard" vs "architecture"
  const [activeViewMode, setActiveViewMode] = useState<"dashboard" | "architecture">("dashboard");

  // Fetch initial data
  useEffect(() => {
    fetchEvaluations();
    fetchLogs();
  }, []);

  const fetchEvaluations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/evaluations");
      if (response.ok) {
        const data = await response.json();
        setEvaluations(data);
      } else {
        console.error("Failed to fetch evaluations", response.statusText);
      }
    } catch (e) {
      console.error("Networking error occurred", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    setIsLogsLoading(true);
    try {
      const response = await fetch("/api/logs");
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLogsLoading(false);
    }
  };

  // Extract unique courses list for filter selection
  const coursesList: string[] = Array.from(new Set<string>(evaluations.map(e => e.courseId))).sort();

  // Handle Create or Update Submission
  const handleFormSubmit = async (formData: Omit<Evaluation, "evaluationId" | "createdAt"> & { evaluationId?: string }) => {
    // Auth Check
    if (userRole === "student") {
      triggerAuthViolation("AWS IAM Policy Violation: Principal 'student' is not authorized to perform action 'dynamodb:PutItem' on resource 'arn:aws:dynamodb:us-east-1:132664397554:table/Evaluations-Production'");
      setActiveFormModal(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const isEdit = !!formData.evaluationId;
      const url = isEdit ? `/evaluations/${formData.evaluationId}` : "/evaluations";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": userRole
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setActiveFormModal(false);
        setSelectedEvaluation(null);
        await fetchEvaluations();
        await fetchLogs();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.details?.join(" | ") || errorData.error}`);
      }
    } catch (e) {
      alert("Hubo un error de conexión con la API Gateway backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete item
  const handleDeleteItem = async (id: string) => {
    // Auth Check
    if (userRole === "student") {
      triggerAuthViolation("AWS IAM Policy Violation: Principal 'student' is not authorized to perform action 'dynamodb:DeleteItem' on resource 'arn:aws:dynamodb:us-east-1:132664397554:table/Evaluations-Production'");
      return;
    }

    try {
      const response = await fetch(`/evaluations/${id}`, {
        method: "DELETE",
        headers: {
          "X-User-Role": userRole
        }
      });
      if (response.ok) {
        await fetchEvaluations();
        await fetchLogs();
      } else {
        alert("No se pudo eliminar el registro en DynamoDB.");
      }
    } catch (e) {
      alert("Error de conexión al eliminar.");
    }
  };

  // Triggers dynamic auth alerts simulation
  const triggerAuthViolation = (message: string) => {
    setAuthNotificationBox(message);
    // Automatically clear after 6 seconds
    setTimeout(() => {
      setAuthNotificationBox(null);
    }, 6000);
  };

  const handleClearLogs = async () => {
    try {
      const response = await fetch("/api/logs/clear", { method: "POST" });
      if (response.ok) {
        await fetchLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetDatabase = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      if (response.ok) {
        await fetchEvaluations();
        await fetchLogs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (userRole === "student") {
      triggerAuthViolation("AWS IAM: No tienes permisos para crear evaluaciones. Configura tu rol a 'Profesor (Admin)' arriba para habilitar el CRUD completo.");
      return;
    }
    setSelectedEvaluation(null);
    setActiveFormModal(true);
  };

  const handleOpenEditModal = (item: Evaluation) => {
    if (userRole === "student") {
      triggerAuthViolation("AWS IAM: Denegado. Solo directivos con privilegios de escritura 'Profesor' pueden modificar los items evaluados.");
      return;
    }
    setSelectedEvaluation(item);
    setActiveFormModal(true);
  };

  // Filter local evaluations client-side to ensure search updates in real-time, matching backend scans.
  const filteredEvaluations = evaluations.filter((item) => {
    const matchSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.evaluationId.includes(searchQuery.toLowerCase());
    
    const matchCourse = filterCourseId === "all" || item.courseId === filterCourseId;
    const matchStatus = filterStatus === "all" || item.status === filterStatus;

    return matchSearch && matchCourse && matchStatus;
  });

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans selection:bg-indigo-100 flex flex-col antialiased">
      
      {/* Dynamic Security Policy alert */}
      {authNotificationBox && (
        <div id="auth-notification-banner" className="bg-red-600 text-white font-mono text-xs p-3.5 flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center space-x-2.5">
            <Lock className="h-4 w-4 text-red-200 shrink-0 animate-bounce" />
            <span className="leading-tight">
              <strong>[DENEGADO]</strong> {authNotificationBox}
            </span>
          </div>
          <button
            onClick={() => setAuthNotificationBox(null)}
            className="ml-3 hover:text-red-200 underline font-medium cursor-pointer shrink-0"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Styled Cloud Console Navbar */}
      <header className="bg-slate-900 text-slate-100 border-b border-slate-800 shadow-sm sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-500 rounded-lg p-2 flex items-center justify-center text-white shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                  AVACOM Evaluations Portal
                </span>
                <span className="text-[9px] bg-slate-800 text-orange-400 border border-slate-700 px-1.5 py-0.2 rounded font-mono">
                  Sandbox v1.2
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-xs md:max-w-md hidden sm:block">
                AWS Serverless (Lambda + DynamoDB) • Simulador e Panel de Control en Vivo
              </p>
            </div>
          </div>

          {/* Right actions: IAM Role and View Tab selectors */}
          <div className="flex items-center space-x-3">
            {/* IAM Role Switcher */}
            <div className="flex items-center space-x-1 bg-slate-950/60 p-1.2 rounded-lg border border-slate-800 text-xs">
              <span className="hidden lg:inline text-slate-500 font-mono text-[9px] uppercase px-1.5">Roles IAM:</span>
              <button
                id="role-teacher-btn"
                onClick={() => {
                  setUserRole("teacher");
                  fetchLogs();
                }}
                className={`px-2.5 py-1 rounded-md transition text-[11px] font-medium flex items-center space-x-1 ${
                  userRole === "teacher" 
                    ? "bg-amber-600/20 text-amber-400 font-bold border border-amber-65/30" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Habilita acciones POST, PUT y DELETE en DynamoDB"
              >
                <Unlock className="h-3 w-3 mr-0.5" />
                <span>Profesor (Admin)</span>
              </button>
              <button
                id="role-student-btn"
                onClick={() => {
                  setUserRole("student");
                  fetchLogs();
                }}
                className={`px-2.5 py-1 rounded-md transition text-[11px] font-medium flex items-center space-x-1 ${
                  userRole === "student" 
                    ? "bg-indigo-65/20 text-indigo-400 font-bold border border-indigo-65/30" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Simula restricciones de solo lectura AWS IAM"
              >
                <Lock className="h-3 w-3 mr-0.5" />
                <span>Estudiante (Lectura)</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Header Area */}
      <section className="bg-slate-900 text-slate-100 py-6 md:py-8 select-none border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <span>Gestor de Evaluaciones Serverless</span>
              </h2>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-3xl">
                Esta plataforma demuestra un CRUD de alto rendimiento preparado para la entrevista técnica de <strong>AVACOM</strong>. Integra una arquitectura reactiva simulada de AWS Lambda que responde con logs interactivos e indicadores de DynamoDB sobre cada transacción.
              </p>
            </div>

            {/* Quick stats and toggle view mode */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 shrink-0">
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                <button
                  id="tab-dashboard"
                  onClick={() => setActiveViewMode("dashboard")}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-medium transition flex items-center justify-center space-x-1.5 ${
                    activeViewMode === "dashboard"
                      ? "bg-slate-800 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Database className="h-3.5 w-3.5 text-orange-400" />
                  <span>Plataforma CRUD</span>
                </button>
                <button
                  id="tab-architecture"
                  onClick={() => setActiveViewMode("architecture")}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-medium transition flex items-center justify-center space-x-1.5 ${
                    activeViewMode === "architecture"
                      ? "bg-slate-800 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Award className="h-3.5 w-3.5 text-orange-400" />
                  <span>Infraestructura AWS</span>
                </button>
              </div>

              <button
                id="create-evaluation-hero-btn"
                onClick={handleOpenCreateModal}
                className="w-full sm:w-auto flex items-center justify-center space-x-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Crear Evaluación</span>
              </button>
            </div>
          </div>

          {/* Quick Informative Info strip */}
          <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-wrap gap-y-2 gap-x-5 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Gatillo de eventos: <strong className="text-slate-200">Active</strong></span>
            </span>
            <span>Tabla de DynamoDB: <span className="text-orange-400">Evaluations-Production</span></span>
            <span>API Gateway Endpoint: <a href="/evaluations" target="_blank" className="text-indigo-400 underline hover:text-indigo-300">/evaluations</a></span>
            <button
              id="global-reset-btn"
              onClick={handleResetDatabase}
              className="text-[10px] text-slate-400 hover:text-amber-400 underline cursor-pointer ml-auto flex items-center space-x-1"
              title="Factory reset DB state"
            >
              <RefreshCw className="h-2.5 w-2.5" />
              <span>Resetear Base de Datos</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
        {activeViewMode === "dashboard" ? (
          /* Dashboard columns layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left and Centered: Search, list and visuals */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Table section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                    <span>Listado de Evaluaciones</span>
                  </h3>
                  <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-medium">
                    Mostrando {filteredEvaluations.length} de {evaluations.length} items
                  </span>
                </div>

                <EvaluationTable
                  evaluations={filteredEvaluations}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteItem}
                  isLoading={isLoading}
                  filterCourseId={filterCourseId}
                  setFilterCourseId={setFilterCourseId}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onResetDatabase={handleResetDatabase}
                  coursesList={coursesList}
                />
              </div>

              {/* DynamoDB Live Visualizer */}
              <DynamoDBVisualizer items={evaluations} />
            </div>

            {/* Right Column: AWS Console live simulator & suite tests */}
            <div className="space-y-6">
              
              {/* CloudWatch log console */}
              <CloudWatchLogs
                logs={logs}
                onClear={handleClearLogs}
                onRefresh={fetchLogs}
                isLoading={isLogsLoading}
              />

              {/* Interactive test suite panel */}
              <InteractiveTestSuite
                evaluations={evaluations}
                onTriggerAction={fetchLogs}
              />

              {/* DevOps Tip card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex items-start space-x-3">
                <Info className="h-4.5 w-4.5 text-blue-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h5 className="font-semibold text-xs text-blue-900">Demostración en vivo de AVACOM</h5>
                  <p className="text-xs text-blue-700 leading-normal">
                    ¿Te pidieron realizar un cambio en vivo? Puedes alternar entre el rol de <strong>Estudiante</strong> (probando permisos IAM con la política de denegación por defecto) y <strong>Profesor</strong> para demostrar tu destreza en API Gateway ante la mesa del jurado de contratación.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* AWS Infrastructure Tab */
          <div className="max-w-4xl mx-auto">
            <AwsArchitectureInfo />
          </div>
        )}
      </main>

      {/* Create & Edit Modal Dialog Form */}
      <EvaluationForm
        isOpen={activeFormModal}
        onClose={() => {
          setActiveFormModal(false);
          setSelectedEvaluation(null);
        }}
        onSubmit={handleFormSubmit}
        evaluation={selectedEvaluation}
        isSubmitting={isSubmitting}
      />

      {/* Simple Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 select-none">
        <p>© 2026 Evaluations Portals • Built for AVACOM recruitment assessment</p>
        <p className="mt-1 font-mono text-[10px] text-slate-400">Powered by AWS Cloud / Node.js Express Simulators</p>
      </footer>
    </div>
  );
}
