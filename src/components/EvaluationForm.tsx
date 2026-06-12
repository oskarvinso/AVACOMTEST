import React, { useState, useEffect } from "react";
import { Evaluation } from "../types";
import { X, Calendar, BookOpen, AlertTriangle, CheckSquare, RefreshCw } from "lucide-react";

interface EvaluationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Evaluation, "evaluationId" | "createdAt"> & { evaluationId?: string }) => Promise<void>;
  evaluation?: Evaluation | null; // If provided, we are in edit mode
  isSubmitting: boolean;
}

export function EvaluationForm({ isOpen, onClose, onSubmit, evaluation, isSubmitting }: EvaluationFormProps) {
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<'active' | 'completed' | 'cancelled'>("active");
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset/populate form when evaluation or isOpen changes
  useEffect(() => {
    if (evaluation) {
      setCourseId(evaluation.courseId);
      setTitle(evaluation.title);
      setDescription(evaluation.description);
      // Format ISO 8601 string to datetime-local friendly format (YYYY-MM-DDTHH:MM)
      try {
        const dateObj = new Date(evaluation.dueDate);
        const isoString = dateObj.toISOString();
        setDueDate(isoString.substring(0, 16));
      } catch (e) {
        setDueDate("");
      }
      setStatus(evaluation.status);
    } else {
      setCourseId("");
      setTitle("");
      setDescription("");
      
      // Default due date to 7 days in the future at 23:59
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      futureDate.setHours(23, 59, 0, 0);
      try {
        // Adjust client timezone
        const offset = futureDate.getTimezoneOffset();
        const adjustedDate = new Date(futureDate.getTime() - (offset * 60 * 1000));
        setDueDate(adjustedDate.toISOString().substring(0, 16));
      } catch (e) {
        setDueDate("");
      }
      setStatus("active");
    }
    setErrors({});
  }, [evaluation, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!courseId.trim()) {
      newErrors.courseId = "El código de curso es obligatorio (ej: CS-101).";
    } else if (courseId.trim().length > 15) {
      newErrors.courseId = "El código no debe exceder los 15 caracteres.";
    }

    if (!title.trim()) {
      newErrors.title = "El título de la evaluación es obligatorio.";
    } else if (title.trim().length < 5) {
      newErrors.title = "El título debe tener al menos 5 caracteres.";
    }

    if (!description.trim()) {
      newErrors.description = "La descripción de la evaluación es obligatoria.";
    } else if (description.trim().length < 10) {
      newErrors.description = "La descripción debe tener al menos 10 caracteres.";
    }

    if (!dueDate) {
      newErrors.dueDate = "La fecha y hora de vencimiento es obligatoria.";
    } else {
      const parsed = Date.parse(dueDate);
      if (isNaN(parsed)) {
        newErrors.dueDate = "La fecha proporcionada no es válida.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Convert date string back into standard ISO 8601 string
    const isoDueDate = new Date(dueDate).toISOString();

    onSubmit({
      evaluationId: evaluation?.evaluationId,
      courseId: courseId.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
      dueDate: isoDueDate,
      status
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300">
      <div 
        className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-slate-200 overflow-hidden" 
        role="dialog" 
        aria-modal="true"
        id="evaluation-modal-container"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-base flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            <span>{evaluation ? "Editar Evaluación" : "Crear Nueva Evaluación"}</span>
          </h3>
          <button
            id="close-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
            title="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Row: Course ID & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="courseId" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                ID del Curso *
              </label>
              <input
                id="courseId"
                type="text"
                placeholder="Ej: CS-101"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className={`w-full text-xs font-mono tracking-wide rounded-lg border px-3 py-2.5 text-slate-800 outline-hidden transition focus:ring-1 focus:ring-indigo-500 ${
                  errors.courseId ? "border-red-300 bg-red-50/20 focus:border-red-500" : "border-slate-200 focus:border-indigo-500"
                }`}
              />
              {errors.courseId && (
                <p className="mt-1 text-xs text-red-600 flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>{errors.courseId}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="status" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Estado *
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2.5 text-slate-800 outline-hidden bg-white transition focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="active">Activo (Active)</option>
                <option value="completed">Completado (Completed)</option>
                <option value="cancelled">Cancelado (Cancelled)</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Título de Evaluación *
            </label>
            <input
              id="title"
              type="text"
              placeholder="Ej: Proyecto de Programación Orientada a Objetos"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full text-xs rounded-lg border px-3 py-2.5 text-slate-800 outline-hidden transition focus:ring-1 focus:ring-indigo-500 ${
                errors.title ? "border-red-300 bg-red-50/20 focus:border-red-500" : "border-slate-200 focus:border-indigo-500"
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600 flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Descripción Completa *
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="Describe detalladamente los criterios de la evaluación, ponderación y rúbrica para los estudiantes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full text-xs rounded-lg border px-3 py-2 text-slate-800 outline-hidden transition focus:ring-1 focus:ring-indigo-500 ${
                errors.description ? "border-red-300 bg-red-50/20 focus:border-red-500" : "border-slate-200 focus:border-indigo-500"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600 flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{errors.description}</span>
              </p>
            )}
          </div>

          {/* Due Date (ISO-friendly local picker) */}
          <div>
            <label htmlFor="dueDate" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Fecha y Hora de Límite (Due Date) *
            </label>
            <div className="relative">
              <input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full text-xs rounded-lg border pl-10 pr-3 py-2.5 text-slate-800 outline-hidden transition focus:ring-1 focus:ring-indigo-500 ${
                  errors.dueDate ? "border-red-300 bg-red-50/20 focus:border-red-500" : "border-slate-200 focus:border-indigo-500"
                }`}
              />
              <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            </div>
            {errors.dueDate ? (
              <p className="mt-1 text-xs text-red-600 flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{errors.dueDate}</span>
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-slate-400">
                La fecha se convertirá automáticamente a formato ISO 8601 estandarizado antes de guardarse en DynamoDB.
              </p>
            )}
          </div>

          {/* Buttons Footer */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              id="cancel-modal-btn"
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              id="submit-modal-btn"
              type="submit"
              disabled={isSubmitting}
              className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>{evaluation ? "Actualizar Registro" : "Crear Evaluación"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
