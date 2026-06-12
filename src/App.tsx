import React, { useState, useEffect } from "react";
import { Evaluation } from "./types";
import { EvaluationTable } from "./components/EvaluationTable";
import { EvaluationForm } from "./components/EvaluationForm";
import { Plus, BookOpen, Database, RefreshCw } from "lucide-react";

export default function App() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFormModal, setActiveFormModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

  // States for search and filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCourseId, setFilterCourseId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch initial data
  useEffect(() => {
    fetchEvaluations();
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

  // Extract unique courses list for filter selection
  const coursesList: string[] = Array.from(new Set<string>(evaluations.map(e => e.courseId))).sort();

  // Handle Create or Update Submission
  const handleFormSubmit = async (formData: Omit<Evaluation, "evaluationId" | "createdAt"> & { evaluationId?: string }) => {
    setIsSubmitting(true);
    try {
      const isEdit = !!formData.evaluationId;
      const url = isEdit ? `/evaluations/${formData.evaluationId}` : "/evaluations";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setActiveFormModal(false);
        setSelectedEvaluation(null);
        await fetchEvaluations();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.details?.join(" | ") || errorData.error}`);
      }
    } catch (e) {
      alert("Hubo un error de conexión con la API backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete item
  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`/evaluations/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        await fetchEvaluations();
      } else {
        alert("No se pudo eliminar el registro en la base de datos.");
      }
    } catch (e) {
      alert("Error de conexión al eliminar.");
    }
  };

  const handleResetDatabase = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      if (response.ok) {
        await fetchEvaluations();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedEvaluation(null);
    setActiveFormModal(true);
  };

  const handleOpenEditModal = (item: Evaluation) => {
    setSelectedEvaluation(item);
    setActiveFormModal(true);
  };

  // Filter local evaluations client-side to ensure search updates in real-time
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
    <div className="bg-slate-55 min-h-screen text-slate-900 font-sans selection:bg-indigo-100 flex flex-col antialiased">
      
      {/* Top Header Dark Background Bar with Orange "Crear Evaluación" Button */}
      <header className="bg-[#0a0f1d] py-5 px-6 md:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 select-none">
            <div className="bg-[#f97316] rounded-lg p-2.5 flex items-center justify-center text-white shadow-sm">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-wide text-sm md:text-base">
                AVACOM Evaluations
              </h1>
              <p className="text-[10px] text-slate-400">
                Sistema de Gestión de Evaluaciones Académicas
              </p>
            </div>
          </div>

          <button
            id="header-create-evaluation-btn"
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-1.5 text-xs font-semibold bg-[#ff6c00] hover:bg-[#e05e00] text-white px-5 py-2.5 rounded-lg shadow-sm active:scale-98 transition duration-150 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Crear Evaluación</span>
          </button>
        </div>
      </header>

      {/* Main Container Area with light background */}
      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-8 w-full">
        <div className="space-y-6">
          
          {/* Table section title and counter */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center space-x-2 select-none">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <span>Listado de Evaluaciones</span>
            </h3>
            <span className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium shadow-2xs select-none">
              Mostrando {filteredEvaluations.length} de {evaluations.length} items
            </span>
          </div>

          {/* Core CRUD Table List */}
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
        <p>© 2026 Sandbox Portal • Built for AVACOM recruitment assessment</p>
      </footer>
    </div>
  );
}

