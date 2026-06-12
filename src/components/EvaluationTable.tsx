import React, { useState } from "react";
import { Evaluation } from "../types";
import { Edit, Trash2, Search, Filter, Calendar, Clock, AlertTriangle, RefreshCw, Layers } from "lucide-react";

interface EvaluationTableProps {
  evaluations: Evaluation[];
  onEdit: (evaluation: Evaluation) => void;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
  filterCourseId: string;
  setFilterCourseId: (courseId: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onResetDatabase: () => void;
  coursesList: string[];
}

export function EvaluationTable({
  evaluations,
  onEdit,
  onDelete,
  isLoading,
  filterCourseId,
  setFilterCourseId,
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
  onResetDatabase,
  coursesList
}: EvaluationTableProps) {
  // Delete Confirmation Dialog State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteTrigger = (item: Evaluation) => {
    setDeleteConfirmId(item.evaluationId);
    setDeleteConfirmTitle(item.title);
  };

  const handleConfirmDeleteSubmit = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    await onDelete(deleteConfirmId);
    setIsDeleting(false);
    setDeleteConfirmId(null);
  };

  const formatFriendlyDate = (dateIso: string) => {
    try {
      const date = new Date(dateIso);
      // Use Spanish friendly date format
      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return dateIso;
    }
  };

  const getDaysRemainingText = (dateIso: string, status: string) => {
    if (status !== 'active') return null;
    try {
      const differenceMs = new Date(dateIso).getTime() - new Date().getTime();
      const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));
      
      if (differenceDays < 0) {
        return <span className="text-red-500 font-medium">Vencido</span>;
      } else if (differenceDays === 0) {
        return <span className="text-amber-600 font-semibold">Vence hoy</span>;
      } else if (differenceDays === 1) {
        return <span className="text-amber-500 font-medium">Vence mañana</span>;
      } else {
        return <span className="text-slate-500 font-medium">Vence en {differenceDays} días</span>;
      }
    } catch (e) {
      return null;
    }
  };

  return (
    <div className="space-y-4" id="evaluation-table-wrapper">
      
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search query input */}
        <div className="relative flex-1">
          <input
            id="search-input"
            type="text"
            placeholder="Buscar por título, descripción o ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-200 pl-10 pr-4 py-2.5 outline-hidden transition focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
          />
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Course ID */}
          <div className="flex items-center space-x-1">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <select
              id="filter-course-id"
              value={filterCourseId}
              onChange={(e) => setFilterCourseId(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todos los Cursos</option>
              {coursesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="flex items-center space-x-1">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Activo (Active)</option>
              <option value="completed">Completado (Completed)</option>
              <option value="cancelled">Cancelado (Cancelled)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Screen */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[250px] relative">
        {isLoading ? (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center z-10 space-y-2">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
            <span className="text-xs font-medium text-slate-600">Conectando con AWS API Gateway...</span>
          </div>
        ) : null}

        {evaluations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="text-slate-300 text-5xl">📋</div>
            <div className="text-sm font-medium text-slate-600">No se encontraron evaluaciones</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Intenta cambiar los filtros o el término de búsqueda de arriba, o haz clic en "Crear Evaluación" para agregar tu primer registro sobre DynamoDB.
            </p>
            <button
              id="empty-reset-db-btn"
              onClick={onResetDatabase}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 hover:underline bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg font-medium transition"
            >
              Cargar Plantillas de Demostración (Reiniciar BD)
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse" id="main-listings-table">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-200 select-none">
                  <tr>
                    <th className="py-3 px-4 w-[120px]">Curso</th>
                    <th className="py-3 px-5">Evaluación</th>
                    <th className="py-3 px-4 w-[170px]">Fecha Límite</th>
                    <th className="py-3 px-4 w-[130px]">Estado</th>
                    <th className="py-3 px-4 w-[110px] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {evaluations.map((item) => (
                    <tr key={item.evaluationId} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="py-4 px-4 font-mono font-bold text-indigo-600">
                        <span className="bg-indigo-50 px-2.5 py-1 rounded-md text-nowrap select-all">{item.courseId}</span>
                      </td>
                      <td className="py-4 px-5 space-y-1">
                        <div className="font-semibold text-slate-800 text-sm leading-tight select-all">
                          {item.title}
                        </div>
                        <p className="text-slate-500 leading-normal max-w-lg">
                          {item.description}
                        </p>
                        <div className="text-[10px] text-slate-400 select-none">
                          ID: <span className="font-mono text-[9px] text-slate-500">{item.evaluationId}</span> • Creado el {formatFriendlyDate(item.createdAt)}
                        </div>
                      </td>
                      <td className="py-4 px-4 space-y-1 select-none">
                        <div className="text-slate-700 font-medium flex items-center space-x-1 text-[11px]">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatFriendlyDate(item.dueDate)}</span>
                        </div>
                        <div className="text-[10px]">
                          {getDaysRemainingText(item.dueDate, item.status)}
                        </div>
                      </td>
                      <td className="py-4 px-4 select-none">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          item.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          item.status === 'completed' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            item.status === 'active' ? 'bg-emerald-500' :
                            item.status === 'completed' ? 'bg-indigo-500' : 'bg-slate-400'
                          }`} />
                          <span className="capitalize">{item.status === "active" ? "Activo" : item.status === "completed" ? "Completado" : "Cancelado"}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            id={`edit-item-btn-${item.evaluationId}`}
                            onClick={() => onEdit(item)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition"
                            title="Editar evaluación"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            id={`delete-item-btn-${item.evaluationId}`}
                            onClick={() => confirmDeleteTrigger(item)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                            title="Eliminar de DynamoDB"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Grid View */}
            <div className="md:hidden divide-y divide-slate-100">
              {evaluations.map((item) => (
                <div key={item.evaluationId} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="bg-indigo-50 font-mono font-semibold text-indigo-700 px-2.5 py-0.5 rounded text-[11px]">
                      {item.courseId}
                    </span>
                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      item.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                      item.status === 'completed' ? 'bg-indigo-50 text-indigo-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      <span className="capitalize">{item.status === "active" ? "Activo" : item.status === "completed" ? "Completado" : "Cancelado"}</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-800 text-xs text-sm">{item.title}</h4>
                    <p className="text-slate-500 text-[11px] leading-relaxed">{item.description}</p>
                  </div>

                  <div className="text-[10px] space-y-1 text-slate-500 pt-1 border-t border-slate-55/40">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                      <strong>Due:</strong>
                      <span>{formatFriendlyDate(item.dueDate)}</span>
                    </div>
                    <div>
                      {getDaysRemainingText(item.dueDate, item.status)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 select-none">
                    <span className="text-[9px] font-mono text-slate-400">ID: {item.evaluationId}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        id={`mob-edit-${item.evaluationId}`}
                        onClick={() => onEdit(item)}
                        className="text-xs text-indigo-600 font-medium hover:underline flex items-center space-x-1 bg-indigo-50 px-2 py-1 rounded"
                      >
                        <Edit className="h-3 w-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        id={`mob-delete-${item.evaluationId}`}
                        onClick={() => confirmDeleteTrigger(item)}
                        className="text-xs text-red-600 font-medium hover:underline flex items-center space-x-1 bg-red-50 px-2 py-1 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300">
          <div 
            className="bg-white w-full max-w-sm rounded-xl shadow-xl border border-slate-200 overflow-hidden p-5 space-y-4"
            role="dialog"
            aria-modal="true"
            id="delete-confirmation-dialog"
          >
            <div className="flex items-center space-x-3 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold">Confirmar Eliminación de Registro</p>
                <p className="text-red-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="space-y-1.5 pl-1.5">
              <p className="text-xs text-slate-600 leading-relaxed">
                ¿Estás seguro de que deseas eliminar permanentemente de <strong>DynamoDB NoSQL</strong> la siguiente evaluación académica?
              </p>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-[11px] text-slate-700 leading-normal truncate font-medium">
                {deleteConfirmTitle}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 select-none">
              <button
                id="cancel-delete-btn"
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3.5 py-2 rounded-lg font-medium transition"
                disabled={isDeleting}
              >
                No, Mantener
              </button>
              <button
                id="confirm-delete-action-btn"
                type="button"
                onClick={handleConfirmDeleteSubmit}
                disabled={isDeleting}
                className="text-xs bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm transition flex items-center space-x-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Sí, Eliminar de DynamoDB</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
